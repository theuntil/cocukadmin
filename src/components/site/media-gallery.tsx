"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconClose, IconArrowLeft, IconArrowRight, IconTicket } from "@/components/ui/icons";
import { publicStorageUrl } from "@/lib/utils";

export interface GalleryItem {
  id: string; media_type: string; bucket_id: string; path: string; caption: string | null;
}

/**
 * İçerik galerisi + tam ekran görüntüleyici.
 *
 * Klavye (ok tuşları, Esc) ve mobil kaydırma desteklenir.
 * Görüntüleyici açıkken sayfa kaydırması kilitlenir.
 */
export function MediaGallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = React.useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((m, i) => {
          const url = publicStorageUrl(m.bucket_id, m.path);
          const isVideo = m.media_type === "video";

          return (
            <button key={m.id} type="button" onClick={() => setOpen(i)}
              aria-label={m.caption ?? `Medya ${i + 1}`}
              className="group relative aspect-square overflow-hidden rounded-[14px] bg-chip">
              {isVideo ? (
                <>
                  <video src={url ?? ""} className="h-full w-full object-cover" preload="metadata" muted />
                  <span className="absolute inset-0 flex items-center justify-center bg-[rgba(15,31,26,.35)]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink">
                      <Icon icon={IconTicket} size={17} />
                    </span>
                  </span>
                </>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={url ?? ""} alt={m.caption ?? ""} loading="lazy" decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
            </button>
          );
        })}
      </div>

      {open !== null && (
        <Viewer items={items} index={open} onClose={() => setOpen(null)} onChange={setOpen} />
      )}
    </>
  );
}

function Viewer({
  items, index, onClose, onChange,
}: {
  items: GalleryItem[]; index: number;
  onClose: () => void; onChange: (i: number) => void;
}) {
  const touchX = React.useRef<number | null>(null);
  const current = items[index]!;
  const url = publicStorageUrl(current.bucket_id, current.path);

  const prev = React.useCallback(
    () => onChange((index - 1 + items.length) % items.length), [index, items.length, onChange]);
  const next = React.useCallback(
    () => onChange((index + 1) % items.length), [index, items.length, onChange]);

  /* Bir önceki ve bir sonraki görsel arka planda indirilir; kaydırınca
     boş veya yarım yüklenmiş görüntü görünmez. */
  React.useEffect(() => {
    const neighbours = [
      items[(index + 1) % items.length],
      items[(index - 1 + items.length) % items.length],
    ];

    for (const n of neighbours) {
      if (!n || n.media_type !== "image") continue;
      const src = publicStorageUrl(n.bucket_id, n.path);
      if (!src) continue;
      const img = new window.Image();
      img.src = src;
    }
  }, [index, items]);

  // Klavye desteği + sayfa kaydırma kilidi
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Medya görüntüleyici"
      className="ct-fade fixed inset-0 z-[100] flex flex-col bg-[rgba(8,16,13,.94)]"
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
        if (Math.abs(delta) > 50) { delta > 0 ? prev() : next(); }
        touchX.current = null;
      }}>

      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-[13.5px] font-semibold text-white/70">
          {index + 1} / {items.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Kapat"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <Icon icon={IconClose} size={19} />
        </button>
      </div>

      {/* min-h-0 olmadan flex çocuğu içeriğe göre büyür ve büyük
          görseller ekranı taşırırdı. */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-4">
        {current.media_type === "video" ? (
          <video src={url ?? ""} controls autoPlay playsInline
            className="max-h-full w-auto max-w-full rounded-[14px] object-contain" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={current.id}
            src={url ?? ""}
            alt={current.caption ?? ""}
            decoding="async"
            className="max-h-full w-auto max-w-full rounded-[14px] object-contain"
          />
        )}
      </div>

      {current.caption && (
        <p className="px-6 pb-4 text-center text-[13.5px] leading-[1.55] text-white/75">
          {current.caption}
        </p>
      )}

      {items.length > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Önceki"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <Icon icon={IconArrowLeft} size={18} />
          </button>
          <button type="button" onClick={next} aria-label="Sonraki"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <Icon icon={IconArrowRight} size={18} />
          </button>
        </>
      )}
    </div>
  );
}
