"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button, Alert } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconImage, IconTrash } from "@/components/ui/icons";

const MAX_INPUT = 12 * 1024 * 1024; // 12 MB ham dosya
const OUTPUT_SIZE = 512;            // kırpma sonrası kare kenar
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type Point = { x: number; y: number };

/**
 * Kare fotoğraf kırpma penceresi.
 * Dokunmatik ve fareyle sürükleme, iki parmakla ve kaydırıcıyla yakınlaştırma destekler.
 * Kırpma tamamen tarayıcıda yapılır; sunucuya yalnızca 512×512 JPEG gider.
 */
export function ImageCropper({
  open, file, onCancel, onDone, title = "Fotoğrafı kırpın",
}: {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
  title?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const boxRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ active: boolean; start: Point; origin: Point }>({
    active: false, start: { x: 0, y: 0 }, origin: { x: 0, y: 0 },
  });
  const pinch = React.useRef<{ dist: number; zoom: number } | null>(null);

  // Dosyayı yükle
  React.useEffect(() => {
    if (!file) { setSrc(null); setImg(null); return; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);

    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError("Görsel okunamadı. Farklı bir dosya deneyin.");
    image.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Görselin kutuya sığdırılmış temel ölçeği (cover)
  const baseScale = React.useMemo(() => {
    if (!img || !boxRef.current) return 1;
    const box = boxRef.current.clientWidth;
    return Math.max(box / img.naturalWidth, box / img.naturalHeight);
  }, [img]);

  const clampOffset = React.useCallback((next: Point, z: number) => {
    if (!img || !boxRef.current) return next;
    const box = boxRef.current.clientWidth;
    const w = img.naturalWidth * baseScale * z;
    const h = img.naturalHeight * baseScale * z;
    const maxX = Math.max(0, (w - box) / 2);
    const maxY = Math.max(0, (h - box) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, [img, baseScale]);

  React.useEffect(() => {
    setOffset((o) => clampOffset(o, zoom));
  }, [zoom, clampOffset]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { active: true, start: { x: e.clientX, y: e.clientY }, origin: offset };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const next = {
      x: drag.current.origin.x + (e.clientX - drag.current.start.x),
      y: drag.current.origin.y + (e.clientY - drag.current.start.y),
    };
    setOffset(clampOffset(next, zoom));
  };

  const onPointerUp = () => { drag.current.active = false; };

  // İki parmakla yakınlaştırma
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!pinch.current) { pinch.current = { dist, zoom }; return; }
    const ratio = dist / pinch.current.dist;
    setZoom(Math.min(3, Math.max(1, pinch.current.zoom * ratio)));
  };

  const onTouchEnd = () => { pinch.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(3, Math.max(1, z - e.deltaY * 0.0015)));
  };

  const crop = async () => {
    if (!img || !boxRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const box = boxRef.current.clientWidth;
      const scale = baseScale * zoom;

      // Kutunun sol-üst köşesinin görsel üzerindeki karşılığı
      const sx = (img.naturalWidth * scale - box) / 2 - offset.x;
      const sy = (img.naturalHeight * scale - box) / 2 - offset.y;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Kırpma desteklenmiyor");

      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(
        img,
        sx / scale, sy / scale, box / scale, box / scale,
        0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.88),
      );
      if (!blob) throw new Error("Görsel oluşturulamadı");
      onDone(blob);
    } catch (err) {
      setError((err as Error).message ?? "Kırpma başarısız oldu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description="Sürükleyerek konumlandırın, kaydırıcıyla yakınlaştırın."
      size="md"
      closeOnBackdrop={false}
    >
      <div className="flex flex-col gap-5">
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Kırpma alanı */}
        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
          className="relative mx-auto aspect-square w-full max-w-[340px] cursor-grab touch-none overflow-hidden rounded-[20px] bg-chip active:cursor-grabbing"
        >
          {src && img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: img.naturalWidth * baseScale * zoom,
                height: img.naturalHeight * baseScale * zoom,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}

          {/* Daire maskesi — profil fotoğrafının nasıl görüneceğini gösterir */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 rounded-[20px] shadow-[0_0_0_9999px_rgba(15,31,26,.45)_inset]"
              style={{ clipPath: "circle(48% at 50% 50%)", boxShadow: "none" }} />
            <div className="absolute inset-[2%] rounded-full border-2 border-white/70" />
          </div>
        </div>

        {/* Yakınlaştırma */}
        <div className="flex items-center gap-3">
          <Icon icon={IconImage} size={15} className="shrink-0 text-muted" />
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Yakınlaştırma"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-chip accent-[var(--solid)]"
          />
          <Icon icon={IconImage} size={21} className="shrink-0 text-muted" />
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <Button variant="solid" size="lg" onClick={crop} loading={busy} className="flex-1">
            Tamam, kaydet
          </Button>
          <Button variant="outline" size="lg" onClick={onCancel} className="flex-1">Vazgeç</Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Fotoğraf seçme + kırpma + yükleme akışını tek bileşende toplar.
 * onUpload, kırpılmış blob'u alır ve depolama yolunu döndürür.
 */
export function PhotoPicker({
  currentUrl, fallback, onUpload, onRemove, label = "Fotoğraf", disabled,
}: {
  currentUrl: string | null;
  fallback: string;
  onUpload: (blob: Blob) => Promise<void>;
  onRemove?: () => Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [cropping, setCropping] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setError(null);
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { setError("Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz."); return; }
    if (f.size > MAX_INPUT) { setError("Dosya en fazla 12 MB olabilir."); return; }
    setFile(f);
    setCropping(true);
  };

  const handleDone = async (blob: Blob) => {
    setCropping(false);
    setBusy(true);
    setError(null);
    try {
      await onUpload(blob);
    } catch (err) {
      setError((err as Error).message ?? "Yükleme başarısız oldu.");
    } finally {
      setBusy(false);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setBusy(true);
    try { await onRemove(); }
    catch (err) { setError((err as Error).message ?? "Silinemedi."); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-[22px] font-bold text-muted">{fallback}</span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-[rgba(15,31,26,.5)]">
              <span className="ct-spin inline-block h-6 w-6 rounded-full border-2 border-white border-t-transparent" />
            </span>
          )}
        </span>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink2">{label}</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button" variant="outline" size="sm" disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              <Icon icon={IconUpload} size={14} />
              {currentUrl ? "Değiştir" : "Fotoğraf ekle"}
            </Button>
            {currentUrl && onRemove && (
              <Button
                type="button" variant="ghost" size="sm" disabled={disabled || busy}
                onClick={handleRemove} className="!text-danger hover:!bg-danger-soft"
              >
                <Icon icon={IconTrash} size={14} /> Kaldır
              </Button>
            )}
          </div>
          <span className="text-[12px] text-muted">JPG, PNG veya WEBP · en fazla 12 MB</span>
        </div>
      </div>

      <input
        ref={inputRef} type="file" accept={ALLOWED.join(",")} className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <ImageCropper
        open={cropping}
        file={file}
        onCancel={() => { setCropping(false); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
        onDone={handleDone}
      />
    </div>
  );
}
