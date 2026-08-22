"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconClose, IconSearch } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Trademark } from "@/lib/branding";

/**
 * TESCİL BELGESİ KARTLARI
 *
 * ┌─ BELGE YOKSA "YOK" DENMEZ ────────────────────────────────────┐
 * │ Üç kurum da her zaman görünür. Belge yüklenmemişse kartta      │
 * │ kurumun BAYRAĞI durur — eksik bir şey varmış izlenimi          │
 * │ vermez, kart yine dolu ve dengeli görünür.                     │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Belge varsa üstüne tıklanınca tam ekran önizleme açılır.
 */

/* Bayraklar SVG olarak gömülü: üç küçük görsel için ağ isteği
   yapmaya değmez, çevrimdışıyken de çıkar. */
function Bayrak({ code, className }: { code: Trademark["code"]; className?: string }) {
  if (code === "tr") {
    return (
      <svg viewBox="0 0 60 40" className={className} role="img" aria-label="Türkiye bayrağı">
        <rect width="60" height="40" rx="4" fill="#E30A17" />
        <circle cx="22" cy="20" r="9" fill="#fff" />
        <circle cx="25" cy="20" r="7.2" fill="#E30A17" />
        <path fill="#fff" d="M33.6 20l7.2-2.3-4.5 6.1V13.9l4.5 6.1z" />
      </svg>
    );
  }
  if (code === "eu") {
    return (
      <svg viewBox="0 0 60 40" className={className} role="img" aria-label="Avrupa Birliği bayrağı">
        <rect width="60" height="40" rx="4" fill="#003399" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <circle key={i} r="1.9" fill="#FFCC00"
              cx={30 + 11 * Math.sin(a)} cy={20 - 11 * Math.cos(a)} />
          );
        })}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 40" className={className} role="img" aria-label="Amerika Birleşik Devletleri bayrağı">
      <rect width="60" height="40" rx="4" fill="#fff" />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x="0" y={i * 5.72} width="60" height="2.86" fill="#B22234" />
      ))}
      <rect width="26" height="20" fill="#3C3B6E" rx="4" />
      <rect width="26" height="20" fill="#3C3B6E" />
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 6 }).map((_, c) => (
          <circle key={`${r}-${c}`} r="0.85" fill="#fff"
            cx={2.5 + c * 4.2} cy={3 + r * 4.6} />
        )),
      )}
    </svg>
  );
}

export function TrademarkCards({ items }: { items: Trademark[] }) {
  const [acik, setAcik] = React.useState<Trademark | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
        {items.map((t) => {
          const belgeVar = Boolean(t.image);

          return (
            <article key={t.code}
              className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-page">
              {/* Görsel alanı */}
              <button
                type="button"
                onClick={() => belgeVar && setAcik(t)}
                aria-label={belgeVar ? `${t.office} belgesini büyüt` : t.office}
                disabled={!belgeVar}
                className={cn(
                  "group relative block aspect-[3/4] w-full overflow-hidden bg-surface",
                  belgeVar ? "cursor-zoom-in" : "cursor-default",
                )}
              >
                {belgeVar ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.image} alt={`${t.office} tescil belgesi`} loading="lazy"
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />

                    {/* Rozetler — ekran görüntüsündeki gibi köşelerde */}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1.5 text-[11.5px] font-bold tracking-[.06em] text-green">
                      <Icon icon={IconCheck} size={12} /> TESCİLLİ
                    </span>
                    {t.year && (
                      <span className="absolute right-3 top-3 rounded-full bg-solid px-3 py-1.5 text-[11.5px] font-bold text-on-solid">
                        {t.year}
                      </span>
                    )}

                    {/* Büyüteç — belgenin tıklanabilir olduğunu belli eder */}
                    <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-page/90 text-ink opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                      <Icon icon={IconSearch} size={15} />
                    </span>
                  </>
                ) : (
                  /* Belge yok: bayrak + kısaltma. "Belge yok" yazmaz. */
                  <span
                    className="flex h-full w-full flex-col items-center justify-center gap-5"
                    style={{
                      backgroundImage: "radial-gradient(circle, var(--line) 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }}
                  >
                    <Bayrak code={t.code}
                      className="h-auto w-[38%] max-w-[130px] rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,.14)]" />
                    <span className="flex flex-col items-center gap-1">
                      <span className="font-display text-[20px] font-bold tracking-[-.01em]">
                        {t.short}
                      </span>
                      <span className="text-[12.5px] text-muted">{t.short}</span>
                    </span>
                    <span className="flex w-full items-center gap-3 px-8">
                      <span className="h-px flex-1 bg-line" />
                      <span className="text-[10.5px] font-semibold tracking-[.14em] text-muted2">
                        {t.country}
                      </span>
                      <span className="h-px flex-1 bg-line" />
                    </span>
                  </span>
                )}
              </button>

              {/* Alt bilgi */}
              <div className="flex flex-col gap-1.5 border-t border-line2 px-5 py-4">
                <span className="text-[10.5px] font-bold tracking-[.14em] text-muted2">
                  {t.country}
                </span>
                <span className="text-[15px] font-semibold leading-[1.3]">{t.office}</span>
                {t.no && (
                  <span className="text-[12.5px] text-muted">Marka No: {t.no}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {acik && <Onizleme item={acik} onClose={() => setAcik(null)} />}
    </>
  );
}

/**
 * TAM EKRAN ÖNİZLEME
 *
 * ★ `object-contain` ve `max-h-[90dvh]`: belge hangi orana sahip olursa
 *   olsun tamamı ekrana sığar, kırpılmaz. `dvh` kullanılıyor çünkü
 *   mobil tarayıcıların adres çubuğu `vh` ölçüsünü bozuyor ve görselin
 *   altı kesiliyordu.
 *
 * ★ Escape, arka plana dokunma ve kapat düğmesi — üçü de kapatır.
 *   Açıkken arkadaki sayfa kaydırılmaz.
 */
/**
 * TAM EKRAN GALERİ
 *
 * ┌─ NEDEN PORTAL ⚠️ ──────────────────────────────────────────────┐
 * │ Önce doğrudan burada çiziliyordu ve `position: fixed` olmasına  │
 * │ rağmen ekranı KAPLAMIYORDU: üstte başlık görünüyor, kenarlarda  │
 * │ boşluk kalıyordu.                                               │
 * │                                                                  │
 * │ Sebep CSS'in az bilinen bir kuralı: bir ata elemanda `transform`│
 * │ ya da `filter` varsa, o eleman `position: fixed` için YENİ BİR   │
 * │ REFERANS ÇERÇEVESİ oluşturur. Kartlar `Motion` bileşeninin       │
 * │ içinde ve o bileşen animasyon için transform uyguluyor — yani    │
 * │ "ekran" artık ekran değil, o kutu.                               │
 * │                                                                  │
 * │ `createPortal` ile doğrudan <body>'ye basılınca arada transform  │
 * │ uygulayan hiçbir ata kalmıyor ve gerçekten ekranı kaplıyor.      │
 * └──────────────────────────────────────────────────────────────────┘
 */
function Onizleme({ item, onClose }: { item: Trademark; onClose: () => void }) {
  const [monte, setMonte] = React.useState(false);

  React.useEffect(() => {
    setMonte(true);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);

    /* Arkadaki sayfa kaydırılmasın. `paddingRight` ile kaydırma çubuğu
       genişliği telafi ediliyor; yoksa çubuk kaybolduğu an sayfa
       sağa doğru zıplıyor. */
    const cubuk = window.innerWidth - document.documentElement.clientWidth;
    const eskiOverflow = document.body.style.overflow;
    const eskiPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (cubuk > 0) document.body.style.paddingRight = `${cubuk}px`;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = eskiOverflow;
      document.body.style.paddingRight = eskiPadding;
    };
  }, [onClose]);

  if (!monte || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex h-[100dvh] w-screen flex-col bg-black/95"
      role="dialog" aria-modal="true" aria-label={`${item.office} tescil belgesi`}>

      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-white">{item.office}</span>
          <span className="truncate text-[12px] text-white/60">
            {item.country}{item.no ? ` · Marka No: ${item.no}` : ""}
          </span>
        </span>

        <button type="button" onClick={onClose} aria-label="Kapat"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20">
          <Icon icon={IconClose} size={18} />
        </button>
      </div>

      {/* Arka plana dokunmak da kapatır; görselin kendisi olayı yutar */}
      <div
        onClick={onClose}
        className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center p-2 sm:p-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={`${item.office} tescil belgesi`}
          onClick={(e) => e.stopPropagation()}
          /* `min-h-0` üstteki kapsayıcıda: esnek kutuda bu olmadan
             görsel taşıp altı kesiliyor. `max-h-full` ile de kalan
             yüksekliğin tamamını kullanıyor. */
          className="max-h-full w-auto max-w-full cursor-default rounded-[8px] bg-white object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  );
}
