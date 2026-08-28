"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconTrash, IconTicket } from "@/components/ui/icons";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/utils";

/**
 * Video yükleyici.
 *
 * Videolar site-video kovasına gider: görsel kovası video türlerini
 * reddediyor ve 10 MB sınırı taşıyordu.
 *
 * Yükleme sırasında ilerleme yüzdesi gösterilir; büyük dosyalarda
 * kullanıcı ekranın donduğunu sanmasın.
 */
export function VideoUpload({
  value, onChange,
}: { value: string; onChange: (path: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const url = value.startsWith("http")
    ? value : publicStorageUrl("site-video", value || null);

  const upload = async (file: File) => {
    setError(null);

    if (!file.type.startsWith("video/")) {
      setError("Video dosyası seçin (MP4 veya WebM)."); return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError("En fazla 200 MB."); return;
    }

    setBusy(true);
    setProgress(0);

    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
      const path = `hero/${Date.now()}.${ext}`;

      /* supabase-js kullanılır: doğrudan XHR ile atılan istek Storage'ın
         beklediği başlıkları tam karşılamıyor ve 400 dönüyordu.
         İlerleme yüzdesi yerine belirsiz bir gösterge kullanılır. */
      setProgress(10);

      const _yuk = await uploadToStorage({
        bucket: "site-video",
        path: path,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);

      if (upErr) {
        // Gerçek sebebi göster: "Bucket not found", "mime type" vb.
        throw new Error(upErr.message);
      }

      setProgress(100);
      onChange(path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {value ? (
        <div className="flex flex-col gap-2.5">
          <video src={url ?? undefined} controls playsInline
            className="w-full rounded-[14px] border border-line bg-black"
            style={{ maxHeight: 200 }} />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold transition-colors hover:border-ink/25 disabled:opacity-60">
              <Icon icon={busy ? IconTicket : IconUpload} size={14} /> Değiştir
            </button>

            <button type="button" onClick={() => onChange("")} disabled={busy}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-danger px-4 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-60">
              <Icon icon={IconTrash} size={14} /> Kaldır
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line bg-field px-4 py-6 transition-colors hover:border-ink/25 disabled:opacity-60">
          <Icon icon={busy ? IconTicket : IconUpload} size={22} className="text-muted" />
          <span className="text-[13.5px] font-semibold">
            {busy ? "Yükleniyor…" : "Video yükle"}
          </span>
          <span className="text-[12px] text-muted">MP4 veya WebM · en fazla 200 MB</span>
        </button>
      )}

      {busy && (
        <span className="h-1.5 overflow-hidden rounded-full bg-chip">
          <span className="ct-indeterminate block h-full w-1/3 rounded-full bg-solid" />
        </span>
      )}

      {error && (
        <span className="text-[12.5px] font-medium text-danger">{error}</span>
      )}

      <input ref={inputRef} type="file" accept="video/mp4,video/webm"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
    </div>
  );
}
