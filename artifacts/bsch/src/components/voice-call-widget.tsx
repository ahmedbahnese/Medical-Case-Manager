import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

type User = { name: string; isOnline: boolean };
type CallInfo = { id: string; owner: string; createdAt: number; recipients?: string[] };
type LegacyNavigator = Navigator & { getUserMedia?: (constraints: MediaStreamConstraints, success: (stream: MediaStream) => void, failure: (error: unknown) => void) => void; webkitGetUserMedia?: (constraints: MediaStreamConstraints, success: (stream: MediaStream) => void, failure: (error: unknown) => void) => void };
type LegacyWindow = Window & { webkitRTCPeerConnection?: typeof RTCPeerConnection };
type PeerMap = Record<string, RTCPeerConnection>;
const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
if (import.meta.env.VITE_TURN_URL) {
  iceServers.push({
    urls: String(import.meta.env.VITE_TURN_URL),
    username: import.meta.env.VITE_TURN_USERNAME ? String(import.meta.env.VITE_TURN_USERNAME) : undefined,
    credential: import.meta.env.VITE_TURN_CREDENTIAL ? String(import.meta.env.VITE_TURN_CREDENTIAL) : undefined,
  });
}
const rtcConfig: RTCConfiguration = { iceServers };

function createPeerConnection(): RTCPeerConnection {
  const Peer = window.RTCPeerConnection || (window as LegacyWindow).webkitRTCPeerConnection;
  if (!Peer) throw new Error("هذا الإصدار من Chromium لا يدعم WebRTC");
  return new Peer(rtcConfig);
}

function getUserMediaCompat(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const isNativeMobileApp = /BSCH-(Android-Founder|Mobile-App)/i.test(navigator.userAgent);
  if (!isNativeMobileApp && window.isSecureContext === false && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return Promise.reject(new Error("لا يمكن تشغيل الميكروفون من الهاتف عبر HTTP. افتح النظام عبر HTTPS ثم اسمح بالميكروفون."));
  }
  const modern = navigator.mediaDevices?.getUserMedia;
  if (modern) return modern.call(navigator.mediaDevices, constraints);
  const legacy = (navigator as LegacyNavigator).getUserMedia || (navigator as LegacyNavigator).webkitGetUserMedia;
  if (!legacy) return Promise.reject(new Error("لا يمكن الوصول إلى الميكروفون في هذا الإصدار من Chromium"));
  return new Promise((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
}

function attachLocalStream(pc: RTCPeerConnection, local: MediaStream) {
  if (typeof pc.addTrack === "function") local.getTracks().forEach(track => pc.addTrack(track, local));
  else (pc as RTCPeerConnection & { addStream?: (stream: MediaStream) => void }).addStream?.(local);
}

function attachRemoteAudio(pc: RTCPeerConnection, audio: HTMLAudioElement | null) {
  pc.ontrack = event => { if (audio && event.streams[0]) { audio.srcObject = event.streams[0]; void audio.play().catch(() => {}); } };
  (pc as RTCPeerConnection & { onaddstream?: (event: { stream: MediaStream }) => void }).onaddstream = event => {
    if (audio) { audio.srcObject = event.stream; void audio.play().catch(() => {}); }
  };
}

async function waitForIce(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>(resolve => {
    const timer = window.setTimeout(() => { pc.removeEventListener("icegatheringstatechange", done); resolve(); }, 5000);
    const done = () => { if (pc.iceGatheringState === "complete") { window.clearTimeout(timer); pc.removeEventListener("icegatheringstatechange", done); resolve(); } };
    pc.addEventListener("icegatheringstatechange", done);
  });
}

export function VoiceCallWidget({ isFounder }: { isFounder: boolean }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [audience, setAudience] = useState<"selected" | "all_online">("selected");
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<CallInfo | null>(null);
  const [incoming, setIncoming] = useState<CallInfo | null>(null);
  const [status, setStatus] = useState("");
  const pcs = useRef<PeerMap>({});
  const stream = useRef<MediaStream | null>(null);
  const lastSignal = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  const stopLocal = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; Object.values(pcs.current).forEach(pc => pc.close()); pcs.current = {}; if (audio.current) audio.current.srcObject = null; };
  const closeCall = async (remote = false) => { const id = active?.id ?? incoming?.id; if (!remote && isFounder && id) await apiPost(`/api/calls/${id}/close`, {}).catch(() => {}); stopLocal(); setActive(null); setIncoming(null); setStatus(""); };

  const sendSignal = async (callId: string, to: string, type: string, payload: unknown) => apiPost(`/api/calls/${callId}/signals`, { to, type, payload });

  const startCall = async () => {
    const recipients = audience === "all_online" ? users.filter(u => u.isOnline).map(u => u.name) : selected;
    if (!recipients.length) { toast.error("حدد مستخدمًا واحدًا على الأقل للمكالمة"); return; }
    try {
      const call = await apiPost<CallInfo>("/api/calls", { audience, recipients });
      stream.current = await getUserMediaCompat({ audio: true, video: false });
      setActive(call); setOpen(false); setStatus("جاري الاتصال...");
      for (const user of recipients.filter(name => name !== "المؤسس")) {
        const pc = createPeerConnection(); pcs.current[user] = pc;
        attachLocalStream(pc, stream.current);
        attachRemoteAudio(pc, audio.current);
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await waitForIce(pc);
        await sendSignal(call.id, user, "offer", pc.localDescription);
      }
      setStatus("المكالمة جارية");
    } catch (e: any) { stopLocal(); toast.error(e?.message ?? "تعذر بدء المكالمة"); }
  };

  const acceptIncoming = async (call: CallInfo) => {
    try { stream.current = await getUserMediaCompat({ audio: true, video: false }); await apiPost(`/api/calls/${call.id}/join`, {}); setIncoming(call); setStatus("جاري الاتصال..."); }
    catch (e: any) { toast.error(e?.message ?? "تعذر تشغيل الميكروفون"); }
  };

  useEffect(() => {
    if (isFounder) return;
    const poll = async () => {
      const calls = await apiGet<CallInfo[]>("/api/calls/incoming").catch(() => []);
      if (calls[0] && !incoming && !active) void acceptIncoming(calls[0]);
    };
    void poll(); const timer = window.setInterval(() => void poll(), 2000); return () => window.clearInterval(timer);
  }, [isFounder, incoming, active]);

  useEffect(() => {
    const call = active ?? incoming; if (!call) return;
    const poll = async () => {
      const result = await apiGet<{ closed: boolean; signals: Array<{ id: number; from: string; type: string; payload: RTCSessionDescriptionInit }> }>(`/api/calls/${call.id}/signals?after=${lastSignal.current}`).catch(() => null);
      if (!result) return;
      if (result.closed) { await closeCall(true); return; }
      for (const signal of result.signals) {
        lastSignal.current = Math.max(lastSignal.current, signal.id);
        if (signal.type === "answer" && isFounder) { const pc = pcs.current[signal.from]; if (pc && signal.payload) await pc.setRemoteDescription(signal.payload); }
        if (signal.type === "offer" && !isFounder) {
          const pc = createPeerConnection(); pcs.current[signal.from] = pc;
          if (stream.current) attachLocalStream(pc, stream.current);
          attachRemoteAudio(pc, audio.current);
          await pc.setRemoteDescription(signal.payload); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await waitForIce(pc);
          await sendSignal(call.id, signal.from, "answer", pc.localDescription);
          setStatus("المكالمة جارية");
        }
      }
    };
    void poll(); const timer = window.setInterval(() => void poll(), 700); return () => window.clearInterval(timer);
  }, [active, incoming, isFounder]);

  useEffect(() => () => stopLocal(), []);

  if (!isFounder && !incoming && !active) return null;
  return <>
    {isFounder && <Button variant="outline" className="ml-2 gap-2" onClick={async () => { const list = await apiGet<User[]>("/api/presence/users").catch(() => []); setUsers(list); setOpen(true); }}><Phone className="h-4 w-4" /> مكالمة صوتية</Button>}
    <audio ref={audio} autoPlay playsInline />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl" className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> بدء مكالمة صوتية</DialogTitle></DialogHeader><div className="space-y-3"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={audience === "all_online"} onChange={() => setAudience("all_online")} /> جميع المتصلين الآن</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={audience === "selected"} onChange={() => setAudience("selected")} /> مستخدمون محددون</label>{audience === "selected" && <div className="grid grid-cols-2 gap-2 border rounded-md p-2 max-h-40 overflow-y-auto">{users.map(u => <label key={u.name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(u.name)} onChange={e => setSelected(p => e.target.checked ? [...p, u.name] : p.filter(n => n !== u.name))} />{u.name}{u.isOnline ? <span className="text-green-600">●</span> : <span className="text-muted-foreground">(غير متصل)</span>}</label>)}</div>}<p className="text-xs text-muted-foreground">سيطلب المتصفح إذن الميكروفون عند بدء المكالمة. لا يتم حفظ الصوت في قاعدة البيانات.</p></div><DialogFooter><Button onClick={() => void startCall()}><Phone className="ml-2 h-4 w-4" /> بدء المكالمة</Button></DialogFooter></DialogContent></Dialog>
    {(incoming || active) && <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg"><Users className="h-5 w-5 text-green-600" /><span className="text-sm">{status || "مكالمة صوتية"}</span><Button size="sm" variant="destructive" onClick={() => void closeCall()}><PhoneOff className="ml-1 h-4 w-4" /> إنهاء</Button></div>}
  </>;
}
