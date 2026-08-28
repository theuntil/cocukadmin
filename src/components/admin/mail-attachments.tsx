"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconFile, IconClose, IconUpload, IconAlert } from "@/components/ui/icons";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface MailEk {
  path: string;
  name: string;
  size: number;
  type: string;
}

/* Çoğu mail sunucusu 25 MB üstünü reddediyor; 24'te durduruyoruz.
   Kodlama sırasında ek yaklaşık %33 büyüdüğü için pay bırakılıyor. */
const TOPLAM_SINIR = 24 * 1024 * 1024;
const TEK_SINIR = 20 * 1024 * 1024;

function boyut(b: number) {
  return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

/**
 * MAİL EKİ YÜKLEME
 *
 * ┌─ DOSYA ÖNCE DEPOLAMAYA GİDİYOR ⚠️ ────────────────────────────┐
 * │ Ek doğrudan forma konup sunucuya gönderilebilirdi. Ama sunucu  │
 * │ eylemlerinin gövde sınırı var (varsayılan 1 MB) ve 10 MB'lık   │
 * │ bir ek sessizce reddedilirdi.                                    │
 * │                                                                  │
 * │ Bu yüzden dosya tarayıcıdan doğrudan depolamaya yükleniyor,     │
 * │ forma yalnızca YOLU gidiyor. Gönderim anında sunucu dosyayı     │
 * │ indirip iletiye gömüyor.                                         │
 * │                                                                  │
 * │ Yan faydası: yükleme sırasında ilerleme görünüyor ve kullanıcı  │
 * │ mail yazmaya devam edebiliyor.                                   │
 * └──────────────────────────────────────────────────────────────────┘
 */
export function MailAttachments({
  value, onChange, disabled,
}: {
  value: MailEk[];
  onChange: (ekler: MailEk[]) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [yukleniyor, setYukleniyor] = React.useState<string[]>([]);
  const [suruklu, setSuruklu] = React.useState(false);

  const toplam = value.reduce((a, e) => a + e.size, 0);

  const yukle = async (files: FileList | File[]) => {
    const liste = Array.from(files);
    if (liste.length === 0) return;

    const supabase = createClient();

    for (const file of liste) {
      if (file.size > TEK_SINIR) {
        toast.error("Dosya çok büyük", `${file.name} ${boyut(file.size)} — tek dosya sınırı 20 MB.`);
        continue;
      }

      /* Sınır kontrolü her dosyada yeniden: döngü içinde eklendikçe
         toplam değişiyor. */
      const suanki = value.reduce((a, e) => a + e.size, 0);
      if (suanki + file.size > TOPLAM_SINIR) {
        toast.error("Toplam sınır aşıldı", "Ekler toplamı 24 MB'ı geçemez.");
        break;
      }

      setYukleniyor((p) => [...p, file.name]);

      try {
        /* Dosya adı temizleniyor: Türkçe karakter ve boşluk depolama
           yollarında soruna yol açıyor. Zaman damgası çakışmayı
           önlüyor; özgün ad gönderim anında geri çıkarılıyor. */
        const guvenli = file.name
          .normalize("NFKD")
          .replace(/[^\w.\-]+/g, "-")
          .replace(/-+/g, "-")
          .slice(-80);

        const yol = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${guvenli}`;

        const _yuk = await uploadToStorage({
        bucket: "mail-attachments",
        path: yol,
        file: file,
      });
      const error = _yuk.ok ? null : new Error(_yuk.error);

        if (error) throw new Error(error.message);

        onChange([
          ...value,
          { path: yol, name: file.name, size: file.size, type: file.type || "application/octet-stream" },
        ]);
      } catch (err) {
        toast.error("Yüklenemedi", `${file.name}: ${(err as Error).message}`);
      } finally {
        setYukleniyor((p) => p.filter((n) => n !== file.name));
      }
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const kaldir = async (ek: MailEk) => {
    /* Listeden hemen çıkarılıyor; depolamadaki silme arkada yapılıyor.
       Silme başarısız olsa bile mail o eki içermeyecek — kullanıcıyı
       bekletmenin anlamı yok. */
    onChange(value.filter((e) => e.path !== ek.path));

    try {
      await removeFromStorage("mail-attachments", [ek.path]);
    } catch {
      /* Sessiz: dosya kovada kalırsa yalnızca yer kaplar, işlevi
         etkilemez. */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink2">
          Ekler
          {value.length > 0 && (
            <span className="ml-2 font-normal text-muted">
              {value.length} dosya · {boyut(toplam)}
            </span>
          )}
        </span>

        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/30 disabled:opacity-50">
          <Icon icon={IconUpload} size={13} /> Dosya ekle
        </button>
      </div>

      {/* Sürükle-bırak alanı: dosya seçiciyi açmadan da eklenebilsin */}
      <div
        onDragOver={(e) => { e.preventDefault(); setSuruklu(true); }}
        onDragLeave={() => setSuruklu(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSuruklu(false);
          if (!disabled && e.dataTransfer.files.length) void yukle(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[14px] border border-dashed px-4 py-3 text-center text-[12.5px] transition-colors",
          suruklu ? "border-solid bg-chip text-ink" : "border-line text-muted",
        )}
      >
        Dosyaları buraya sürükleyin ya da “Dosya ekle” ile seçin
        <span className="mt-0.5 block text-[11.5px] text-muted2">
          Tek dosya en fazla 20 MB · toplam 24 MB
        </span>
      </div>

      {(value.length > 0 || yukleniyor.length > 0) && (
        <ul className="flex flex-col gap-2">
          {value.map((e) => (
            <li key={e.path}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-field px-3.5 py-2.5">
              <Icon icon={IconFile} size={15} className="shrink-0 text-muted" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium">{e.name}</span>
                <span className="text-[11.5px] text-muted">{boyut(e.size)}</span>
              </span>
              <button type="button" onClick={() => void kaldir(e)} title="Kaldır"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger">
                <Icon icon={IconClose} size={13} />
              </button>
            </li>
          ))}

          {yukleniyor.map((n) => (
            <li key={n}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-field px-3.5 py-2.5 opacity-70">
              <span className="h-[15px] w-[15px] shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{n}</span>
              <span className="text-[11.5px] text-muted">yükleniyor…</span>
            </li>
          ))}
        </ul>
      )}

      {toplam > TOPLAM_SINIR * 0.8 && (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-orange-ink">
          <Icon icon={IconAlert} size={13} />
          Sınıra yaklaşıyorsunuz — çoğu mail sunucusu 25 MB üstünü reddeder.
        </span>
      )}

      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={(e) => { if (e.target.files) void yukle(e.target.files); }} />
    </div>
  );
}
