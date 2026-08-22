"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  IconPlay, IconPause, IconVolume, IconVolumeOff, IconClose, IconExpand,
} from "@/components/ui/icons";

/**
 * Tanıtım videosu oynatıcı.
 *
 * Kontroller tarayıcının varsayılanı değil, kendi tasarımımızdır: oynat,
 * duraklat, sesi kapat, ilerleme çubuğu, tam ekran. Böylece görünüm sitenin
 * geri kalanıyla tutarlı olur ve platformdan platforma değişmez.
 *
 * Kontroller hareketsizlikte gizlenir, fare/dokunuşta geri gelir.
 */
export function VideoPlayer({
  src, poster, title, description, onClose,
}: {
  src: string;
  poster?: string | null;
  title?: string | null;
  description?: string | null;
  onClose: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = React.useState(true);
  const [muted, setMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [showControls, setShowControls] = React.useState(true);
  const [buffering, setBuffering] = React.useState(true);

  // Kontrolleri hareketsizlikte gizle
  const wakeControls = React.useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2800);
  }, []);

  React.useEffect(() => {
    wakeControls();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [wakeControls]);

  // Klavye kısayolları: boşluk oynat/duraklat, M sessiz, Esc kapat
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }

      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "m") setMuted((m) => !m);
      wakeControls();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, wakeControls]);

  // Sayfa kaydırması kilitlensin
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  React.useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  /* Tarayıcılar sesli otomatik oynatmayı engeller. Engellenirse video hiç
     başlamıyordu; bu durumda sessize alıp yeniden denenir, kullanıcı
     isterse sesi kendisi açar. */
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPlaying(false));
    });
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) { void v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);

    v.currentTime = ratio * duration;
    setProgress(ratio * 100);
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;

    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[300] flex flex-col bg-black"
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
    >
      {/* Video */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          autoPlay
          playsInline
          className="h-full w-full object-contain"
          onClick={togglePlay}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setBuffering(false);
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setCurrent(v.currentTime);
            if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onEnded={() => setPlaying(false)}
        />

        {buffering && (
          <span className="pointer-events-none absolute h-12 w-12 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        )}

        {/* Ortadaki büyük oynat düğmesi */}
        {!playing && !buffering && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Oynat"
            className="absolute flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-ink transition-transform hover:scale-105"
          >
            <Icon icon={IconPlay} size={30} className="ml-1" />
          </button>
        )}
      </div>

      {/* Üst şerit: başlık ve kapat */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/75 to-transparent px-5 pb-12 pt-5 transition-opacity duration-300 sm:px-7 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="pointer-events-auto flex min-w-0 flex-col gap-1">
          {title && (
            <h2 className="font-display text-[17px] font-semibold tracking-[-.02em] text-white sm:text-[20px]">
              {title}
            </h2>
          )}
          {description && (
            <p className="max-w-[560px] text-[12.5px] leading-[1.5] text-white/75 sm:text-[13.5px]">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        >
          <Icon icon={IconClose} size={18} />
        </button>
      </div>

      {/* Alt şerit: kontroller */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-2.5 bg-gradient-to-t from-black/85 to-transparent px-5 pb-5 pt-14 transition-opacity duration-300 sm:px-7 sm:pb-6 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* İlerleme çubuğu */}
        <div
          onClick={seek}
          role="slider"
          aria-label="Video ilerlemesi"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          className="group relative h-6 cursor-pointer"
        >
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-all group-hover:h-1.5">
            <span
              className="block h-full rounded-full bg-lime transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </span>

          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-lime opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Duraklat" : "Oynat"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
          >
            <Icon icon={playing ? IconPause : IconPlay} size={19} />
          </button>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Sesi aç" : "Sesi kapat"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
          >
            <Icon icon={muted ? IconVolumeOff : IconVolume} size={19} />
          </button>

          <span className="font-mono text-[12.5px] tabular-nums text-white/85">
            {fmt(current)} <span className="text-white/45">/ {fmt(duration)}</span>
          </span>

          <span className="flex-1" />

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Tam ekran"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
          >
            <Icon icon={IconExpand} size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
