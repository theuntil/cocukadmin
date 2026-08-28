"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconClose, IconImage } from "@/components/ui/icons";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/utils";

const MAX = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Kapak görseli seçici — doğrudan ilgili bucket'a yükler */
export function MediaPicker({
  value, onChange, bucket,
}: { value: string; onChange: (path: string) => void; bucket: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const url = publicStorageUrl(bucket, value);

  const upload = async (file: File) => {
    setError(null);
    if (!TYPES.includes(file.type)) { setError("JPG, PNG, WEBP veya AVIF yükleyin."); return; }
    if (file.size > MAX) { setError("Dosya en fazla 8 MB olabilir."); return; }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const _yuk = await uploadToStorage({
        bucket: bucket,
        path: path,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
      if (upErr) throw new Error(upErr.message);
      onChange(path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        <div className="relative overflow-hidden rounded-[14px] border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="aspect-[16/9] w-full object-cover" />
          <button type="button" aria-label="Görseli kaldır" onClick={() => onChange("")}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(15,31,26,.7)] text-white transition-opacity hover:opacity-80">
            <Icon icon={IconClose} size={15} />
          </button>
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line bg-field">
          <Icon icon={IconImage} size={22} className="text-muted2" />
          <span className="text-[12.5px] text-muted">Görsel seçilmedi</span>
        </div>
      )}

      {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}

      <input ref={inputRef} type="file" accept={TYPES.join(",")} className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

      <Button type="button" variant="outline" size="md" loading={busy}
        onClick={() => inputRef.current?.click()}>
        <Icon icon={IconUpload} size={15} /> {url ? "Değiştir" : "Görsel yükle"}
      </Button>

      <span className="text-[12px] text-muted">JPG, PNG, WEBP veya AVIF · en fazla 8 MB</span>
    </div>
  );
}
