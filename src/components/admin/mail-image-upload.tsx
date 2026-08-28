"use client";

import * as React from "react";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { publicStorageUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconTrash, IconImage } from "@/components/ui/icons";
import { Spinner } from "@/components/ui";

/**
 * Mail görseli yükleyici.
 *
 * ★ Adres DOĞRUDAN mail HTML'ine giriyor. Mail istemcileri imzalı
 *   bağlantı çözemediği için görsel HERKESE AÇIK kovada durmak zorunda:
 *   `mail-media`. Bu yüzden buraya yalnızca kurumsal görseller yüklenir.
 *
 * ★ Yüklenen dosyanın adresi gizli alana yazılır; form gönderilirken
 *   sunucuya yol değil TAM ADRES gider. Mail istemcisinde göreli yol
 *   çözülmez.
 *
 * Kullanım: bizim logomuz ve üst görsel (ayarlar), karşı logo (gönderim).
 */
export function MailImageUpload({
  name,
  label,
  hint,
  value,
  onChange,
  /** Önizleme kutusunun oranı — banner geniş, logo kare */
  aspect = "logo",
  onDark = false,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "logo" | "banner";
  onDark?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Yalnızca görsel yükleyebilirsiniz.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya 5 MB'tan büyük olamaz.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Oturum bulunamadı.");

      /* Dosya adı temizlenir: Türkçe karakter ve boşluk içeren adlar
         bazı depolama yollarında bozuluyor. */
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${name}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const _yuk = await uploadToStorage({
        bucket: "mail-media",
        path: path,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
      if (upErr) throw new Error(upErr.message);

      /* `getPublicUrl` Supabase'e özgü. `publicStorageUrl` sağlayıcıdan
         bağımsız ve R2 ile Supabase arasında tek yerden geçiş yapıyor. */
      const adres = publicStorageUrl("mail-media", path);
      if (!adres) throw new Error("Görsel adresi alınamadı.");

      onChange(adres ?? "");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const labelCls = onDark ? "text-white/80" : "text-ink2";
  const hintCls = onDark ? "text-white/50" : "text-muted2";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[13px] font-semibold ${labelCls}`}>{label}</span>
        {hint && <span className={`text-[12px] ${hintCls}`}>{hint}</span>}
      </div>

      {/* Adres gizli alanda taşınır — form gönderiminde sunucuya bu gider */}
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-line bg-field ${
            aspect === "banner" ? "h-[74px] w-[132px]" : "h-[74px] w-[74px]"
          }`}
        >
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <Icon icon={IconImage} size={20} className="text-muted2" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-ink/25 disabled:opacity-50"
            >
              {busy ? <Spinner /> : <Icon icon={IconUpload} size={15} />}
              {value ? "Değiştir" : "Görsel yükle"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setError(null); }}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-danger transition-colors hover:border-danger disabled:opacity-50"
              >
                <Icon icon={IconTrash} size={15} /> Kaldır
              </button>
            )}
          </div>

          {value && (
            <span className="truncate text-[11.5px] text-muted2" title={value}>{value}</span>
          )}
          {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
      />
    </div>
  );
}
