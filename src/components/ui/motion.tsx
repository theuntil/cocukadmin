"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll ile görünüme girdiğinde açılan sarmalayıcı.
 * IntersectionObserver kullanır — JS maliyeti neredeyse sıfır,
 * animasyon tamamen CSS transform/opacity üzerinden (GPU).
 */
export function Reveal({
  children, delay = 0, className, as: As = "div",
}: {
  children: React.ReactNode; delay?: number; className?: string; as?: React.ElementType;
}) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.visible = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.visible = "true";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <As ref={ref} className={cn("ct-reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </As>
  );
}

/* ══════════════════════ MOTION ══════════════════════ */

type MotionVariant = "up" | "blur" | "scale" | "left" | "right";

const VARIANT_CLASS: Record<MotionVariant, string> = {
  up: "ct-in-up",
  blur: "ct-in-blur",
  scale: "ct-in-scale",
  left: "ct-in-left",
  right: "ct-in-right",
};

/**
 * Ana sayfanın kaydırma animasyonu.
 *
 * `Reveal`den farkı: birden çok giriş biçimi (yukarıdan, bulanıklıktan,
 * ölçekten, yandan) sunar. Başlangıç durumu CSS'te tanımlıdır; JS yalnızca
 * `data-visible` bayrağını çevirir.
 *
 * Gözlemci kurulamazsa öğe ANINDA açılır — animasyon süslemedir, içeriğin
 * görünmesi ona bağlı bırakılmaz.
 */
export function Motion({
  children,
  variant = "up",
  delay = 0,
  className,
  as: As = "div",
  amount = 0.12,
  id,
}: {
  children: React.ReactNode;
  variant?: MotionVariant;
  /** ms cinsinden gecikme — sıralı açılma için */
  delay?: number;
  className?: string;
  as?: React.ElementType;
  /** Öğenin ne kadarı göründüğünde tetiklensin (0–1) */
  amount?: number;
  id?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.dataset.visible = "true";
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.visible = "true";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: amount },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [amount]);

  return (
    <As
      ref={ref}
      id={id}
      className={cn("ct-in", VARIANT_CLASS[variant], className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </As>
  );
}

/**
 * Satır satır açılan büyük başlık.
 *
 * Her satır kendi kutusunda aşağıdan yukarı kayar. Satırlar dizi olarak
 * verilir; böylece satır sonları tasarıma göre kesin belirlenir, tarayıcının
 * sarma kararına bırakılmaz.
 */
export function MotionLines({
  lines, className, delay = 0, as: As = "h2",
}: {
  lines: React.ReactNode[];
  className?: string;
  delay?: number;
  as?: React.ElementType;
}) {
  return (
    <Motion variant="up" delay={delay} className={className} amount={0.2} as={As}>
      {lines.map((l, i) => (
        <span key={i} className="ct-line">
          <span>{l}</span>
        </span>
      ))}
    </Motion>
  );
}

/** Sayaçların hedefe doğru sayması — istatistik bölümleri için */
export function CountUp({ to, duration = 1100, className }: { to: number; duration?: number; className?: string }) {
  const [value, setValue] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setValue(to);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // easeOutCubic
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") { run(); return; }

    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref} className={className}>{new Intl.NumberFormat("tr-TR").format(value)}</span>;
}
