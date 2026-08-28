"use client";

import * as React from "react";
import { Alert, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconTrash, IconImage, IconTicket } from "@/components/ui/icons";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/utils";

interface MediaItem {
  id: string; media_type: string; bucket_id: string; path: string;
  caption: string | null; sort_order: number;
}

/* İçerik başına toplam medya sınırı — veritabanında da uygulanır.
   Fotoğraf/video ayrımı yok: istediğiniz dağılımda ekleyebilirsiniz. */
const MAX_TOTAL = 100;

/**
 * İçerik galerisi yöneticisi.
 *
 * Sınırlar veritabanında da uygulanır (1 video + 15 görsel); buradaki kontrol
 * yalnızca kullanıcıya erken geri bildirim vermek içindir.
 */
export function ContentMediaManager({
  entityType, entityId,
}: { entityType: "activity" | "event" | "press" | "supporter"; entityId: string }) {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const images = items.filter((m) => m.media_type === "image");
  const videos = items.filter((m) => m.media_type === "video");

  const load = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: qErr } = await supabase
        .from("content_media").select("*")
        .eq("entity_type", entityType).eq("entity_id", entityId)
        .order("sort_order");
      if (qErr) throw new Error(qErr.message);
      setItems((data ?? []) as MediaItem[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  React.useEffect(() => { void load(); }, [load]);

  const upload = async (files: FileList) => {
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) { setError("Yalnızca görsel veya video yükleyin."); continue; }

      if (items.length >= MAX_TOTAL) {
        setError(`Bir içerikte en fazla ${MAX_TOTAL} medya olabilir.`); break;
      }

      const limit = isVideo ? 100 : 10;
      if (file.size > limit * 1024 * 1024) {
        setError(`${isVideo ? "Video" : "Görsel"} en fazla ${limit} MB olabilir.`); continue;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
        const path = `${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const _yuk = await uploadToStorage({
        bucket: "galeri",
        path: path,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
        if (upErr) throw new Error(upErr.message);

        const { error: insErr } = await supabase.from("content_media").insert({
          entity_type: entityType,
          entity_id: entityId,
          media_type: isVideo ? "video" : "image",
          bucket_id: "galeri",
          path,
          sort_order: items.length + 1,
        });
        if (insErr) throw new Error(insErr.message);

        await load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploading(false);
      }
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── Sıralama ──
     Sürükle-bırakla yeni sıra belirlenir. Ekran hemen güncellenir,
     veritabanı arkadan yazılır; hata olursa liste sunucudan tazelenir. */
  const [dragId, setDragId] = React.useState<string | null>(null);

  const reorder = async (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const from = items.findIndex((m) => m.id === fromId);
    const to = items.findIndex((m) => m.id === toId);
    if (from < 0 || to < 0) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);

    setItems(next);

    try {
      const supabase = createClient();
      await Promise.all(
        next.map((m, i) =>
          supabase.from("content_media").update({ sort_order: i + 1 }).eq("id", m.id)),
      );
    } catch (err) {
      setError((err as Error).message);
      void load();
    }
  };

  const remove = async (item: MediaItem) => {
    try {
      const supabase = createClient();
      await removeFromStorage(item.bucket_id, [item.path]);
      await supabase.from("content_media").delete().eq("id", item.id);
      setItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink2">Galeri</span>
        <div className="flex gap-2">
          <Badge tone="muted">{images.length} görsel</Badge>
          <Badge tone="muted">{videos.length} video</Badge>
          {items.length >= MAX_TOTAL && <Badge tone="orange">Sınır doldu</Badge>}
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="aspect-square animate-pulse rounded-[12px] bg-field" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((m) => {
            const url = publicStorageUrl(m.bucket_id, m.path);
            return (
              <div
                key={m.id}
                draggable
                onDragStart={() => setDragId(m.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) void reorder(dragId, m.id);
                  setDragId(null);
                }}
                className={`group relative aspect-square cursor-grab overflow-hidden rounded-[12px] bg-chip transition-opacity active:cursor-grabbing ${
                  dragId === m.id ? "opacity-40" : ""}`}
              >
                {/* Sıra numarası — hangi medyanın kaçıncı olduğu görünsün */}
                <span className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-[11px] font-bold text-white">
                  {items.indexOf(m) + 1}
                </span>
                {m.media_type === "video" ? (
                  <>
                    <video src={url ?? ""} className="h-full w-full object-cover"
                      preload="metadata" muted />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                      VİDEO
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url ?? ""} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}

                <button type="button" onClick={() => void remove(m)}
                  aria-label="Kaldır"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon icon={IconTrash} size={13} />
                </button>
              </div>
            );
          })}

          {items.length < MAX_TOTAL && (
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-line text-muted transition-colors hover:border-ink/25 hover:text-ink disabled:opacity-50">
              <Icon icon={uploading ? IconTicket : IconUpload} size={18} />
              <span className="text-[11.5px] font-semibold">
                {uploading ? "Yükleniyor" : "Ekle"}
              </span>
            </button>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" multiple
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        className="sr-only"
        onChange={(e) => { const f = e.target.files; if (f?.length) void upload(f); }} />

      <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
        <Icon icon={IconImage} size={15} className="mt-[2px] shrink-0 text-muted" />
        <span className="text-[12.5px] leading-[1.55] text-muted">
          İstediğiniz kadar fotoğraf ve video ekleyebilirsiniz (içerik başına en fazla
          {" "}{MAX_TOTAL} medya). Görsel 10 MB, video 100 MB sınırındadır.
          Sıralamak için sürükleyin.
        </span>
      </div>
    </div>
  );
}
