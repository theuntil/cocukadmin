"use client";

import Link from "next/link";
import { publicStorageUrl } from "@/lib/utils";

export interface MarqueeSupporter {
  id: string; name: string; slug: string; logo_path: string | null;
}

/**
 * Ana sayfadaki destekçi logosu şeridi.
 *
 * Liste iki kez basılır ve CSS ile kaydırılır — böylece döngü kesintisiz görünür.
 * Hareketi azaltma tercihi olan kullanıcılarda animasyon durur (globals.css).
 */
export function SupporterMarquee({ supporters }: { supporters: MarqueeSupporter[] }) {
  if (supporters.length === 0) return null;

  const items = [...supporters, ...supporters];

  return (
    <section aria-label="Destekçilerimiz" className="overflow-hidden border-y border-line2 bg-page py-4">
      <div className="mb-4 text-center">
        <span className="text-[11.5px] font-bold tracking-[.16em] text-muted2">
          DESTEKÇİLERİMİZ
        </span>
      </div>

      <div className="ct-marquee-mask relative">
        <div className="ct-marquee flex w-max items-center gap-6 sm:gap-8">
          {items.map((s, i) => {
            const logo = publicStorageUrl("galeri", s.logo_path);
            return (
              <Link key={`${s.id}-${i}`} href={`/destekcilerimiz/${s.slug}`}
                aria-hidden={i >= supporters.length}
                tabIndex={i >= supporters.length ? -1 : 0}
                className="flex h-14 w-[104px] shrink-0 items-center justify-center transition-transform hover:scale-105 sm:h-16 sm:w-[124px]">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={s.name} loading="lazy"
                    className="max-h-12 max-w-full object-contain sm:max-h-14" />
                ) : (
                  <span className="text-center text-[11px] font-semibold leading-tight text-muted">{s.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
