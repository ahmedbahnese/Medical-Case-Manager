import { useState, useEffect, useCallback } from "react";
import { Download, X, Share, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Platform detection ────────────────────────────────────────────────────────
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as any).standalone === true)
  );
}

// ── SW Update Toast ───────────────────────────────────────────────────────────
// Shown automatically when a new SW version is detected
export function useSwUpdateToast() {
  useEffect(() => {
    const handler = (event: Event) => {
      const { waiting } = (event as CustomEvent).detail as { waiting: ServiceWorker };
      toast.info('تحديث جديد متاح', {
        description: 'نسخة جديدة من التطبيق جاهزة للتثبيت.',
        duration: Infinity,
        action: {
          label: 'تحديث الآن',
          onClick: () => {
            waiting.postMessage({ type: 'SKIP_WAITING' });
          },
        },
      });
    };
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);
}

// ── Install Prompt ────────────────────────────────────────────────────────────
const DISMISSED_KEY = 'bsch-pwa-install-dismissed';

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed — don't show prompt
    if (isInStandaloneMode()) return;

    // Already dismissed by user
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Android / Chrome / Edge / Windows — use beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari — show manual instructions
    if (isIos() && !localStorage.getItem(DISMISSED_KEY)) {
      // Small delay so it doesn't pop immediately on first load
      const timer = setTimeout(() => setShowIosHint(true), 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    (installEvent as any).prompt();
    const { outcome } = await (installEvent as any).userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setInstallEvent(null);
  }, [installEvent]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setShowIosHint(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }, []);

  // ── Android / Windows install banner ────────────────────────────────────────
  if (visible && installEvent) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-3 md:p-4 no-print">
        <div className="max-w-sm mx-auto bg-white dark:bg-neutral-900 border border-teal-200 dark:border-teal-800 rounded-xl shadow-lg p-4 flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">تثبيت التطبيق</p>
            <p className="text-xs text-muted-foreground">
              أضف BSCH إلى الشاشة الرئيسية للوصول السريع
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" onClick={handleInstall} className="bg-teal-600 hover:bg-teal-700 text-white">
              تثبيت
            </Button>
            <Button size="icon" variant="ghost" onClick={dismiss} className="h-8 w-8 text-muted-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS Safari instructions ──────────────────────────────────────────────────
  if (showIosHint && isIos()) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-3 no-print">
        <div className="max-w-sm mx-auto bg-white dark:bg-neutral-900 border border-teal-200 dark:border-teal-800 rounded-xl shadow-lg p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Download className="h-4 w-4 text-teal-600" />
              تثبيت التطبيق على iPhone / iPad
            </p>
            <Button size="icon" variant="ghost" onClick={dismiss} className="h-7 w-7 shrink-0 text-muted-foreground -mt-0.5">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ol className="text-xs text-muted-foreground space-y-1 list-none">
            <li className="flex items-center gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">١</span>
              اضغط على زر المشاركة
              <Share className="h-3.5 w-3.5 text-blue-500 inline" />
              في شريط Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">٢</span>
              اختر «إضافة إلى الشاشة الرئيسية»
            </li>
            <li className="flex items-center gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">٣</span>
              اضغط «إضافة» للتأكيد
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return null;
}

// ── Push notification permission request ─────────────────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}
