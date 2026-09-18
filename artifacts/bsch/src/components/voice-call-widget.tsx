import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

type User = { name: string; isOnline: boolean };
type CallInfo = { id: string; owner: string; createdAt: number; recipients?: string[] };
type PeerMap = Record<string, RTCPeerConnection>;
const rtcConfig: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

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
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setActive(call); setOpen(false); setStatus("جاري الاتصال...");
      for (const user of recipients.filter(name => name !== "المؤسس")) {
        const pc = new RTCPeerConnection(rtcConfig); pcs.current[user] = pc;
        stream.current.getTracks().forEach(track => pc.addTrack(track, stream.current!));
        pc.ontrack = e => { if (audio.current) { audio.current.srcObject = e.streams[0]; void audio.current.play().catch(() => {}); } };
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await waitForIce(pc);
        await sendSignal(call.id, user, "offer", pc.localDescription);
      }
      setStatus("المكالمة جارية");
    } catch (e: any) { stopLocal(); toast.error(e?.message ?? "تعذر بدء المكالمة"); }
  };

  const acceptIncoming = async (call: CallInfo) => {
    try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); await apiPost(`/api/calls/${call.id}/join`, {}); setIncoming(call); setStatus("جاري الاتصال..."); }
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
          const pc = new RTCPeerConnection(rtcConfig); pcs.current[signal.from] = pc;
          stream.current?.getTracks().forEach(track => pc.addTrack(track, stream.current!));
          pc.ontrack = e => { if (audio.current) { audio.current.srcObject = e.streams[0]; void audio.current.play().catch(() => {}); } };
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
    <audio ref={audio} autoPlay />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl" className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> بدء مكالمة صوتية</DialogTitle></DialogHeader><div className="space-y-3"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={audience === "all_online"} onChange={() => setAudience("all_online")} /> جميع المتصلين الآن</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={audience === "selected"} onChange={() => setAudience("selected")} /> مستخدمون محددون</label>{audience === "selected" && <div className="grid grid-cols-2 gap-2 border rounded-md p-2 max-h-40 overflow-y-auto">{users.map(u => <label key={u.name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(u.name)} onChange={e => setSelected(p => e.target.checked ? [...p, u.name] : p.filter(n => n !== u.name))} />{u.name}{u.isOnline ? <span className="text-green-600">●</span> : <span className="text-muted-foreground">(غير متصل)</span>}</label>)}</div>}<p className="text-xs text-muted-foreground">سيطلب المتصفح إذن الميكروفون عند بدء المكالمة. لا يتم حفظ الصوت في قاعدة البيانات.</p></div><DialogFooter><Button onClick={() => void startCall()}><Phone className="ml-2 h-4 w-4" /> بدء المكالمة</Button></DialogFooter></DialogContent></Dialog>
    {(incoming || active) && <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg"><Users className="h-5 w-5 text-green-600" /><span className="text-sm">{status || "مكالمة صوتية"}</span><Button size="sm" variant="destructive" onClick={() => void closeCall()}><PhoneOff className="ml-1 h-4 w-4" /> إنهاء</Button></div>}
  </>;
}
