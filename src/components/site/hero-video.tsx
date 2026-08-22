"use client";

import * as React from "react";

/**
 * Hero arka planı.
 *
 * ÖNEMLİ TASARIM KURALI: Bu bölümün arkasında VİDEO vardır, tema rengi
 * değil. Bu yüzden perde de tema rengiyle (`--page`) değil, SİYAHLA
 * kurulur ve üstündeki tüm yazılar beyaz kalır. Eskiden açık temada
 * videonun üstüne beyazımsı perde çekiliyor, koyu yazılar okunmuyordu.
 *
 * Perde tek renk değil, degradedir:
 *   · üstte koyu   → menü çubuğundaki logo ve bağlantılar okunur
 *   · ortada hafif → video görünür kalır
 *   · altta koyu   → başlık ve düğmeler her karede okunur
 *
 * Hareket azaltma tercihi açık kullanıcıda video oynatılmaz; kapak görseli
 * ya da düz degrade gösterilir.
 */
export function HeroBackdrop({
  src, poster, overlayOpacity = 55,
}: {
  /** Boş olabilir: video kapalıysa degrade sahne kullanılır */
  src?: string | null;
  poster?: string | null;
  /** Panelden ayarlanan karartma oranı (0–90) */
  overlayOpacity?: number;
}) {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Panelden gelen oran 0–90 arasına sıkıştırılır, sonra 0–1'e çevrilir
  const dim = Math.min(Math.max(overlayOpacity, 0), 90) / 100;
  const showVideo = Boolean(src) && !reduced;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Taban sahne: video yüklenene kadar VE video hiç yoksa görünür.
          Böylece hero asla boş/beyaz kalmaz. */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #1b4436 0%, #0f2a22 45%, #071310 100%)",
        }}
      />

      {showVideo ? (
        <video
          ref={(el) => {
            if (!el) return;
            /* Bazı tarayıcılar autoplay özniteliğini geç uyguluyor;
               öğe elde edildiği an oynatma denenir. */
            el.play().catch(() => undefined);
          }}
          src={src ?? undefined}
          poster={poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        poster && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      )}

      {/* Okunabilirlik perdesi — SİYAH, tema renginden bağımsız */}
      <span
        className="absolute inset-0"
        style={{
          background:
            `linear-gradient(180deg, rgba(4,10,8,${Math.min(dim + 0.22, 0.9)}) 0%,` +
            ` rgba(4,10,8,${Math.max(dim - 0.12, 0.08)}) 38%,` +
            ` rgba(4,10,8,${Math.min(dim + 0.18, 0.88)}) 100%)`,
        }}
      />
      {/* Sol taraf biraz daha koyu: başlık uzun metinlerde bile okunur */}
      <span
        className="absolute inset-0"
        style={{ background: "linear-gradient(100deg, rgba(4,10,8,.5) 0%, rgba(4,10,8,0) 62%)" }}
      />
      {/* Alt kenarda sayfa rengine yumuşak geçiş: hero bir sonraki bölümle
          kesintisiz birleşsin. */}
    </div>
  );
}
