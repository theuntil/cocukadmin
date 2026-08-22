"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";

/**
 * Yatay kaydırılabilir şerit.
 *
 * Dokunmatikte doğal kaydırma, masaüstünde ok düğmeleri. Oklar yalnızca
 * kaydırılacak yer varsa görünür — boşta duran düğme olmaz.
 */
export function HScroll({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;

    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={ref}
        className="ct-noscrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1">
        {children}
      </div>

      {canLeft && (
        <button type="button" onClick={() => scroll(-1)} aria-label="Geri kaydır"
          className="absolute -left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface shadow-[0_4px_14px_-4px_rgba(15,31,26,.25)] transition-colors hover:bg-chip lg:flex">
          <Icon icon={IconArrowLeft} size={16} />
        </button>
      )}

      {canRight && (
        <button type="button" onClick={() => scroll(1)} aria-label="İleri kaydır"
          className="absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface shadow-[0_4px_14px_-4px_rgba(15,31,26,.25)] transition-colors hover:bg-chip lg:flex">
          <Icon icon={IconArrowRight} size={16} />
        </button>
      )}
    </div>
  );
}
