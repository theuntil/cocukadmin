"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { SignedAvatar } from "@/components/admin/signed-avatar";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconTrash, IconClose, IconTicket } from "@/components/ui/icons";
import { updateChildRecord } from "@/lib/actions/members";
import { IDLE } from "@/lib/actions/types";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";

/**
 * Çocuk profil fotoğrafı.
 *
 * Avatara tıklayınca fotoğraf tam ekran açılır. Aynı ekrandan değiştirilebilir
 * veya kaldırılabilir — ayrı bir bölüme gitmeye gerek yok.
 */
export function ChildAvatar({
  childId, parentId, name, path, canEdit,
}: {
  childId: string;
  /** Veli kimliği — dosya yolu bu klasörün altında olmak zorunda */
  parentId: string;
  name: string;
  path: string | null;
  canEdit: boolean;
}) {
  const [current, setCurrent] = React.useState(path ?? "");
  const [full, setFull] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(updateChildRecord, IDLE);

  React.useEffect(() => { setCurrent(path ?? ""); }, [path]);

  const save = (next: string) => {
    setCurrent(next);
    setStamp(Date.now());
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  /*
   * Fotoğraf KENDİ SUNUCUMUZ üzerinden gelir; depolamanın imzalı adresi
   * hiç kullanılmaz.
   *
   * İmzalı adres "bağlantıya sahip olan açsın" demektir: kopyalanıp başka
   * cihazda açılabilir. Buradaki uç ise her istekte oturumu doğrular.
   *
   * Zaman damgası, fotoğraf değişince tarayıcının eski görseli
   * göstermemesi için eklenir.
   */
  const [stamp, setStamp] = React.useState(() => Date.now());

  const signedUrl = current ? `/api/child-photo/${childId}?v=${stamp}` : null;

  const upload = async (file: File) => {
    setError(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("PNG, JPG veya WebP yükleyin."); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError("En fazla 5 MB."); return; }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";

      /* Yol biçimi zorunludur: "<veli_id>/children/<dosya>".
         Erişim yetkisi bu klasör adından çözülür. */
      const target = `${parentId}/children/${childId}-${Date.now()}.${ext}`;

      const _yuk = await uploadToStorage({
        bucket: "child-photos",
        path: target,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);

      if (upErr) throw new Error(upErr.message);

      save(target);
      setFull(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const url = signedUrl;
  const working = busy || pending;

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => (current ? setFull(true) : canEdit && fileRef.current?.click())}
          className="block rounded-full transition-transform hover:scale-[1.03]"
          aria-label={current ? "Fotoğrafı büyüt" : "Fotoğraf yükle"}
        >
          <SignedAvatar name={name} url={signedUrl} size="lg" />
        </button>

        {canEdit && (
          <button
            type="button"
            disabled={working}
            onClick={() => (current ? setFull(true) : fileRef.current?.click())}
            aria-label={current ? "Fotoğrafı yönet" : "Fotoğraf yükle"}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-ink text-white shadow-[0_2px_8px_-2px_rgba(15,31,26,.35)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Icon icon={working ? IconTicket : IconUpload} size={14} />
          </button>
        )}
      </div>

      {error && (
        <span className="text-[12px] font-medium text-danger">{error}</span>
      )}
      {state.message && !state.ok && (
        <span className="text-[12px] font-medium text-danger">{state.message}</span>
      )}

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="childId" value={childId} />
        <input type="hidden" name="photoPath" value={current} />
        <input type="hidden" name="photoOnly" value="1" />
      </form>

      {/* Tam ekran */}
      {full && url && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[rgba(15,31,26,.94)]"
          onClick={() => setFull(false)}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[14px] font-semibold text-white">{name}</span>
            <button type="button" onClick={() => setFull(false)} aria-label="Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
              <Icon icon={IconClose} size={17} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 pb-4"
            onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name}
              className="max-h-full w-auto max-w-full rounded-[18px] object-contain" />
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center justify-center gap-3 px-5 pb-6"
              onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" loading={working}
                onClick={() => fileRef.current?.click()}
                className="!border-white/30 !text-white hover:!bg-white/10">
                <Icon icon={IconUpload} size={15} /> Değiştir
              </Button>
              <Button variant="outline" loading={working}
                onClick={() => { save(""); setFull(false); }}
                className="!border-danger !text-danger hover:!bg-danger-soft">
                <Icon icon={IconTrash} size={15} /> Kaldır
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
