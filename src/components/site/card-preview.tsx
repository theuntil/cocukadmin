"use client";

import * as React from "react";
import { publicStorageUrl, cn } from "@/lib/utils";
import type { PreviewTeam } from "@/lib/preview-teams";

const HOLDER_NAME = "Erkam Kutay Coşkun";
const CYCLE_MS = 2600;

/* Tanıtım kartındaki QR deseni. Gerçek bir kod DEĞİLDİR; kullanıcı
   panelindeki kartla aynı görünümü vermek için sabit tutulur. */
const QR_PATTERN: [number, number][] = [
  [9, 1], [11, 1], [13, 1], [16, 1], [18, 1],
  [10, 2], [12, 2], [15, 2], [19, 2],
  [9, 3], [13, 3], [14, 3], [17, 3], [20, 3],
  [11, 4], [12, 4], [16, 4], [18, 4],
  [9, 5], [14, 5], [15, 5], [19, 5], [20, 5],
  [1, 9], [3, 9], [5, 9], [8, 9], [10, 9], [12, 9], [15, 9], [17, 9], [19, 9], [22, 9], [25, 9], [27, 9],
  [2, 10], [4, 10], [9, 10], [11, 10], [14, 10], [16, 10], [20, 10], [23, 10], [26, 10],
  [1, 11], [5, 11], [8, 11], [12, 11], [13, 11], [17, 11], [18, 11], [21, 11], [24, 11], [27, 11],
  [3, 12], [4, 12], [10, 12], [15, 12], [19, 12], [22, 12], [25, 12],
  [2, 13], [6, 13], [9, 13], [11, 13], [14, 13], [16, 13], [20, 13], [23, 13], [26, 13], [28, 13],
  [1, 14], [4, 14], [8, 14], [13, 14], [17, 14], [21, 14], [24, 14], [27, 14],
  [3, 15], [5, 15], [10, 15], [12, 15], [15, 15], [18, 15], [22, 15], [25, 15],
  [2, 16], [6, 16], [9, 16], [14, 16], [16, 16], [20, 16], [23, 16], [26, 16],
  [1, 17], [4, 17], [11, 17], [13, 17], [17, 17], [19, 17], [24, 17], [27, 17],
  [9, 22], [11, 22], [14, 22], [16, 22], [19, 22], [22, 22], [25, 22],
  [10, 23], [13, 23], [17, 23], [20, 23], [23, 23], [26, 23],
  [9, 24], [12, 24], [15, 24], [18, 24], [21, 24], [24, 24], [27, 24],
  [11, 25], [14, 25], [16, 25], [19, 25], [22, 25], [25, 25],
  [10, 26], [13, 26], [17, 26], [20, 26], [23, 26], [26, 26],
];

/**
 * Kombine kart önizlemesi.
 * Takımlar veritabanından gelir ve otomatik döngüyle, yumuşak geçişle değişir.
 * Kullanıcı seçim yapmaz — kart yalnızca tanıtım amaçlıdır.
 */
export function CardPreview({ teams, className }: { teams: PreviewTeam[]; className?: string }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (teams.length < 2 || paused) return;
    if (typeof window !== "undefined"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => setIndex((i) => (i + 1) % teams.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [teams.length, paused]);

  const team = teams[index];
  const logo = publicStorageUrl("team-logos", team?.logo_path);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Kartın altındaki hafif gölge katmanı — derinlik hissi */}
      <div
        aria-hidden
        className="absolute inset-x-6 -bottom-3 h-16 rounded-[22px] bg-ink/10 blur-2xl"
      />

      <div
        className="relative isolate overflow-hidden rounded-[24px] border border-white/10 text-deep-ink"
        style={{
          background: "linear-gradient(155deg, #17362c 0%, var(--deep) 55%, #0b1f19 100%)",
          boxShadow: "var(--shadow)",
          /* Gerçek bir kombine kart yataydır (kredi kartı oranına yakın).
             Sabit `minHeight` kartı karemsi yapıyordu; oran kullanılınca
             her ekran genişliğinde aynı biçimi koruyor. */
          aspectRatio: "1.62 / 1",
        }}
      >
        {/* Kart yüzeyi dokusu */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,.05) 22px 23px)",
          }}
        />
        {/* Işık yansıması */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-1/4 -top-1/2 h-[160%] w-1/2 rotate-12 opacity-[.07]"
          style={{ background: "linear-gradient(90deg, transparent, #fff, transparent)" }}
        />

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
          {/* Üst: marka + takım logosu */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-[.2em] text-deep-muted">
                ÇOCUK TRİBÜNÜ
              </span>
              <span className="font-display text-[17px] font-semibold tracking-[-.02em] sm:text-[19px]">
                Kombine Kart
              </span>
            </div>

            {/* Logo yuvası — takım değişince yumuşak geçiş.
                Arkaplan yok: logolar kartın üstünde serbest durur, böylece
                beyaz kutu içinde küçülmüş görünmezler. */}
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20">
              {teams.map((t, i) => {
                const l = publicStorageUrl("team-logos", t.logo_path);
                const active = i === index;
                return (
                  <span
                    key={t.id}
                    aria-hidden={!active}
                    className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
                    style={{
                      opacity: active ? 1 : 0,
                      transform: active ? "scale(1)" : "scale(.86)",
                    }}
                  >
                    {l ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l} alt={active ? t.name : ""}
                        className="h-full w-full object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,.28)]" />
                    ) : (
                      <span className="font-display text-[22px] font-bold text-ink">
                        {(t.short_name ?? t.name).slice(0, 3).toLocaleUpperCase("tr-TR")}
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
          </div>

          {/* Ortada QR — kullanıcı panelindeki kartla aynı düzen.
              Tanıtım amaçlı olduğu için desen temsilîdir. */}
          <div className="flex flex-1 items-center justify-center py-1">
            <span
              aria-hidden
              className="flex h-[74px] w-[74px] items-center justify-center rounded-[12px] bg-white p-1.5 shadow-[0_4px_18px_-6px_rgba(0,0,0,.45)] sm:h-[86px] sm:w-[86px]"
            >
              <svg viewBox="0 0 29 29" className="h-full w-full" role="presentation">
                <rect width="29" height="29" fill="#fff" />
                <g fill="#0b1f19">
                  {/* Köşe işaretleri */}
                  {[[0, 0], [22, 0], [0, 22]].map(([x, y]) => (
                    <g key={`${x}-${y}`}>
                      <rect x={x} y={y} width="7" height="7" />
                      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
                      <rect x={x + 2} y={y + 2} width="3" height="3" />
                    </g>
                  ))}
                  {/* Veri deseni — sabit, tanıtım amaçlı */}
                  {QR_PATTERN.map(([x, y], i) => (
                    <rect key={i} x={x} y={y} width="1" height="1" />
                  ))}
                </g>
              </svg>
            </span>
          </div>

          {/* Alt: kart sahibi + takım adı */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[9.5px] font-bold tracking-[.2em] text-deep-muted">
                KART SAHİBİ
              </span>
              <span className="truncate font-display text-[17px] font-semibold tracking-[-.01em] sm:text-[19px]">
                {HOLDER_NAME}
              </span>
              <span className="font-mono text-[11.5px] tracking-[.08em] text-deep-muted">
                CT{"XXXXXXXXXXXX".slice(0, 12)}
              </span>
            </div>

            <span
              key={team?.id}
              className="shrink-0 text-right text-[12.5px] font-semibold text-deep-muted"
              style={{ animation: "ct-fade .6s ease both" }}
            >
              {team?.name}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
