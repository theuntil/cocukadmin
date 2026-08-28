"use client";

import * as React from "react";
import { useActionState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconTrash, IconTicket } from "@/components/ui/icons";
import { setUserAvatar } from "@/lib/actions/cards";
import { IDLE } from "@/lib/actions/types";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";

/**
 * Profil fotoğrafı — avatarın kendi üzerinden yönetilir.
 *
 * Ayrı bir kart yerine avatarın üstünde beliren düğmeler kullanılır:
 * fotoğraf varsa silme, yoksa yükleme. Her işlem denetim kaydına yazılır.
 */
export function AvatarManager({
  userId, userName, currentPath, size = "lg",
}: {
  userId: string;
  userName: string;
  currentPath: string | null;
  size?: "lg" | "xl";
}) {
  const [state, action, pending] = useActionState(setUserAvatar, IDLE);
  const [path, setPath] = React.useState(currentPath ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => { setPath(currentPath ?? ""); }, [currentPath]);

  const save = (next: string) => {
    setPath(next);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

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
      const newPath = `${userId}/${Date.now()}.${ext}`;
      const _yuk = await uploadToStorage({
        bucket: "avatars",
        path: newPath,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
      if (upErr) throw new Error(upErr.message);
      save(newPath);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const working = busy || pending;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="group relative shrink-0">
        <Avatar name={userName} path={path || null} userId={userId} size={size} />

        {/* İşlem düğmesi avatarın üstünde */}
        <button
          type="button"
          disabled={working}
          onClick={() => (path ? save("") : fileRef.current?.click())}
          aria-label={path ? "Profil fotoğrafını kaldır" : "Profil fotoğrafı yükle"}
          title={path ? "Fotoğrafı kaldır" : "Fotoğraf yükle"}
          className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface shadow-[0_2px_8px_-2px_rgba(15,31,26,.35)] transition-colors disabled:opacity-60 ${
            path ? "bg-danger text-white hover:opacity-90" : "bg-ink text-white hover:opacity-90"
          }`}
        >
          <Icon icon={working ? IconTicket : path ? IconTrash : IconUpload} size={14} />
        </button>
      </div>

      {error && (
        <span className="max-w-[160px] text-[11.5px] font-medium text-danger">{error}</span>
      )}
      {state.message && !state.ok && (
        <span className="max-w-[160px] text-[11.5px] font-medium text-danger">{state.message}</span>
      )}

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="path" value={path} />
      </form>
    </div>
  );
}
