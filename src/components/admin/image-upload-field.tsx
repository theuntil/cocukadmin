"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconImage, IconTrash, IconUpload } from "@/components/ui/icons";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl, cn } from "@/lib/utils";

/**
 * GÖRSEL YÜKLEME ALANI
 *
 * Herhangi bir depolama kovasına dosya yükler ve YOL döndürür (tam
 * adres değil): veritabanında yol saklanır, adres gösterim anında
 * üretilir. Kova adı değişirse kayıtlar bozulmaz.
 *
 * ★ Yükleme başarısız olursa mevcut görsel KORUNUR. Hata mesajı
 *   alanın altında görünür; kullanıcı ne olduğunu anlar.
 */
export function ImageUploadField({
  bucket, label, hint, value, onChange, accept = "image/*",
}: {
  bucket: string;
  label: string;
  hint?: string;
  /** Depolama yolu (kova içindeki ad) */
  value: string;
  onChange: (path: string) => void;
  accept?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const url = publicStorageUrl(bucket, value);

  const yukle = async (file: File) => {
    setBusy(true);
    setHata(null);
    try {
      /* Dosya adı temizlenir: Türkçe karakter ve boşluk depolama
         yollarında soruna yol açıyor. Zaman damgası da çakışmayı
         önlüyor. */
      const uzanti = (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
      const ad = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${uzanti}`;

      const supabase = createClient();
      const _yuk = await uploadToStorage({
        bucket: bucket,
        path: ad,
        file: file,
      });
      const error = _yuk.ok ? null : new Error(_yuk.error);

      if (error) throw new Error(error.message);
      onChange(ad);
    } catch (err) {
      setHata((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink2">
        {label}
        {hint && <span className="ml-2 font-normal text-muted2">{hint}</span>}
      </span>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-line bg-field">
          {url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <Icon icon={IconImage} size={20} className="text-muted2" />
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-ink/30",
              busy && "opacity-60",
            )}>
            <Icon icon={IconUpload} size={14} />
            {busy ? "Yükleniyor…" : url ? "Değiştir" : "Görsel yükle"}
          </button>

          {url && !busy && (
            <button type="button" onClick={() => { onChange(""); setHata(null); }}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink2 transition-colors hover:border-danger hover:text-danger">
              <Icon icon={IconTrash} size={14} /> Kaldır
            </button>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void yukle(f); }} />

      {hata && <span className="text-[12.5px] font-medium text-danger">{hata}</span>}
    </div>
  );
}
