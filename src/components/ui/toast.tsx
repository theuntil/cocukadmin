"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconAlert, IconClose, IconInfo } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  ÜSTTEN İNEN BİLDİRİM
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Eksik alan, ödeme hatası, kayıt başarısı gibi durumlarda ekranın
 *  üstünden küçük bir şerit iner, işi bitince yukarı kayıp kaybolur.
 *
 *  ┌─ NEDEN SAYFA İÇİ UYARI KUTUSU YETMİYOR ───────────────────────┐
 *  │ Form uzunsa uyarı ekranın dışında kalıyor: kullanıcı düğmeye   │
 *  │ basıyor, hiçbir şey olmamış gibi görünüyor, tekrar basıyor.    │
 *  │ Üstten inen şerit nerede olursanız olun görünür.               │
 *  └────────────────────────────────────────────────────────────────┘
 *
 *  ★ `position: fixed` ve portal ile <body>'ye basılır: içinde
 *    bulunduğu kartın `overflow: hidden` kuralı bildirimi kırpamaz.
 *
 *  ★ Hata bildirimleri KENDİLİĞİNDEN KAPANMAZ. Başarı mesajı üç
 *    saniye sonra kaybolur; hata ekranda kalır ki kullanıcı okuyup
 *    ne yapacağına karar verebilsin.
 */

export type ToastTone = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContext {
  show: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const Ctx = React.createContext<ToastContext | null>(null);

/** Bildirim göstermek için: `const toast = useToast()` */
export function useToast(): ToastContext {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    /* Sağlayıcı yoksa uygulama ÇÖKMEZ: bildirim yardımcı bir şey,
       ana işi engellememeli. Geliştirici konsolda uyarılır. */
    return {
      show: () => console.warn("[toast] ToastProvider bulunamadı"),
      success: () => console.warn("[toast] ToastProvider bulunamadı"),
      error: () => console.warn("[toast] ToastProvider bulunamadı"),
      warning: () => console.warn("[toast] ToastProvider bulunamadı"),
      info: () => console.warn("[toast] ToastProvider bulunamadı"),
    };
  }
  return ctx;
}

/*
 * ┌─ HEPSİ KAPANIR ⚠️ ────────────────────────────────────────────┐
 * │ Önce hata bildirimleri `0` süreyle kalıcıydı: "kullanıcı okuyup │
 * │ karar versin" diye. Uygulamada ekranda birikip duruyorlardı,    │
 * │ kapatmak için tek tek tıklamak gerekiyordu.                     │
 * │                                                                  │
 * │ Beş saniye okumak için yeterli; ayrıntı zaten sayfa içinde de   │
 * │ yazıyor. Kalıcı bildirim, bildirim olmaktan çıkıp engel oluyor. │
 * └──────────────────────────────────────────────────────────────────┘
 */
const SURE: Record<ToastTone, number> = {
  success: 5000,
  info: 5000,
  warning: 5000,
  error: 5000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const sayacRef = React.useRef(0);

  const kapat = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback((t: Omit<Toast, "id">) => {
    const id = ++sayacRef.current;
    /* En fazla üç bildirim: daha fazlası ekranın üstünü kaplıyor ve
       sonuncusu okunmadan kayboluyor. Eskiler düşer. */
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);

  }, []);

  const value = React.useMemo<ToastContext>(() => ({
    show,
    success: (title, description) => show({ tone: "success", title, description }),
    error: (title, description) => show({ tone: "error", title, description }),
    warning: (title, description) => show({ tone: "warning", title, description }),
    info: (title, description) => show({ tone: "info", title, description }),
  }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastViewport items={items} onClose={kapat} />
    </Ctx.Provider>
  );
}

/* ═══════════════════ GÖRÜNÜM ═══════════════════ */

const IKON: Record<ToastTone, Parameters<typeof Icon>[0]["icon"]> = {
  success: IconCheck,
  error: IconAlert,
  warning: IconAlert,
  info: IconInfo,
};

const RENK: Record<ToastTone, string> = {
  success: "border-green/40 bg-green-soft text-green",
  error: "border-danger/40 bg-danger-soft text-danger",
  warning: "border-orange-line bg-orange-soft text-orange-ink",
  info: "border-line bg-surface text-ink2",
};

function ToastViewport({ items, onClose }: { items: Toast[]; onClose: (id: number) => void }) {
  const [monte, setMonte] = React.useState(false);
  React.useEffect(() => setMonte(true), []);

  if (!monte || typeof document === "undefined") return null;

  return createPortal(
    <div
      /* `pointer-events-none` kapsayıcıda: bildirim yokken altındaki
         sayfaya tıklanabilsin. Şeridin kendisi olayları geri açıyor. */
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-3 pt-3 sm:pt-4"
      role="region" aria-label="Bildirimler"
    >
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>,
    document.body,
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [cikiyor, setCikiyor] = React.useState(false);

  /* Kapanış animasyonu bitmeden kaldırılırsa şerit birden yok oluyor.
     Önce yukarı kaydırılır, sonra listeden düşürülür. */
  const kapat = React.useCallback(() => {
    setCikiyor(true);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  /* ┌─ SAYAÇ NEDEN BURADA ──────────────────────────────────────┐
     │ Önce sağlayıcıda `kapat(id)` doğrudan çağrılıyordu: şerit  │
     │ animasyonsuz, birden kayboluyordu. Sayaç bileşenin içinde   │
     │ olunca aynı `kapat()` çalışıyor — el ile kapatmayla         │
     │ birebir aynı yukarı kayma animasyonu oynuyor.              │
     └────────────────────────────────────────────────────────────┘ */
  React.useEffect(() => {
    const sure = SURE[toast.tone] ?? 5000;
    if (sure <= 0) return;

    const t = window.setTimeout(kapat, sure);
    return () => window.clearTimeout(t);
  }, [toast.tone, kapat]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-[16px] border px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-xl",
        RENK[toast.tone],
        cikiyor ? "ct-toast-out" : "ct-toast-in",
      )}
    >
      <Icon icon={IKON[toast.tone]} size={17} className="mt-[2px] shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13.5px] font-semibold leading-snug text-ink">{toast.title}</span>
        {toast.description && (
          <span className="text-[12.5px] leading-[1.5] text-ink2">{toast.description}</span>
        )}
      </div>

      <button type="button" onClick={kapat} aria-label="Kapat"
        className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink2 transition-colors hover:bg-black/5">
        <Icon icon={IconClose} size={14} />
      </button>
    </div>
  );
}
