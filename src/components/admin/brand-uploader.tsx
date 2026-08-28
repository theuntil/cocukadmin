"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconTrash, IconImage } from "@/components/ui/icons";
import { updateSetting } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/utils";

const TYPES = ["image/png", "image/svg+xml", "image/webp", "image/x-icon", "image/vnd.microsoft.icon", "image/jpeg"];
const MAX = 2 * 1024 * 1024;

/** Logo, favicon ve paylaşım görseli yükleyici */
export function BrandUploader({
  settingKey, label, description, current,
}: { settingKey: string; label: string; description: string | null; current: string }) {
  const [path, setPath] = React.useState(current);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [, startSave] = useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const url = publicStorageUrl("site-media", path);
  const isDark = settingKey.includes("dark");

  const save = (next: string) =>
    new Promise<void>((resolve) => {
      startSave(async () => {
        const fd = new FormData();
        fd.set("key", settingKey);
        fd.set("kind", "text");
        fd.set("value", next);
        const res = await updateSetting(IDLE, fd);
        if (res.ok) setPath(next);
        else setError(res.message ?? "Kaydedilemedi");
        resolve();
      });
    });

  const upload = async (file: File) => {
    setError(null);
    if (!TYPES.includes(file.type)) { setError("PNG, SVG, WEBP veya ICO yükleyin."); return; }
    if (file.size > MAX) { setError("Dosya en fazla 2 MB olabilir."); return; }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const target = `brand/${settingKey.replace(/\./g, "-")}-${Date.now()}.${ext}`;
      const _yuk = await uploadToStorage({
        bucket: "site-media",
        path: target,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
      if (upErr) throw new Error(upErr.message);
      await save(target);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold">{label}</span>
        {description && <span className="text-[12px] leading-[1.5] text-muted">{description}</span>}
      </div>

      <div className={`flex h-28 items-center justify-center rounded-[14px] border border-line ${
        isDark ? "bg-deep" : "bg-field"}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-20 max-w-[70%] object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Icon icon={IconImage} size={20} className={isDark ? "text-deep-muted" : "text-muted2"} />
            <span className={`text-[12px] ${isDark ? "text-deep-muted" : "text-muted"}`}>
              Varsayılan kullanılıyor
            </span>
          </div>
        )}
      </div>

      {error && <span className="text-[12px] font-medium text-danger">{error}</span>}

      <input ref={inputRef} type="file" accept={TYPES.join(",")} className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" loading={busy}
          onClick={() => inputRef.current?.click()} className="flex-1">
          <Icon icon={IconUpload} size={14} /> {url ? "Değiştir" : "Yükle"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => void save("")}
            className="!text-danger hover:!bg-danger-soft">
            <Icon icon={IconTrash} size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
