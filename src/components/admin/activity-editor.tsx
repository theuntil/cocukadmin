"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Badge, Button, Card, Field, H3, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconImage, IconUpload, IconTrash, IconTicket } from "@/components/ui/icons";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveActivity } from "@/lib/actions/content-extra";
import { attachActivityMedia } from "@/lib/actions/content-extra";
import { IDLE } from "@/lib/actions/types";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/utils";

interface Activity {
  id: string; title: string; slug: string; summary: string | null; body: string;
  cover_path: string | null; status: string; published_at: string | null;
}

interface PendingMedia {
  key: string;
  path: string;
  bucket: string;
  type: "image" | "video";
  previewUrl: string;
  /** Kayıtlı içerikte veritabanı satırının kimliği */
  rowId?: string;
}

const STATUS_TR: Record<string, string> = {
  draft: "Taslak", published: "Yayında", archived: "Arşiv",
};

/**
 * İçerik düzenleyici — tek ekran.
 *
 * Medya, içerik kaydedilmeden ÖNCE de eklenebilir: dosyalar depolamaya
 * yüklenir ve listede bekletilir, içerik kaydedilince veritabanı kayıtları
 * tek seferde oluşturulur. Böylece "önce kaydet, sonra medya ekle" adımı yok.
 *
 * Kaydettikten sonra sayfa düzenleme adresine geçer ve alanlar dolu kalır.
 */
export function ActivityEditor({ item }: { item: Activity | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveActivity, IDLE);

  const [cover, setCover] = React.useState(item?.cover_path ?? "");
  const [media, setMedia] = React.useState<PendingMedia[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [attaching, setAttaching] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Düzenlemede mevcut galeriyi yükle
  React.useEffect(() => {
    if (!item) return;
    let alive = true;

    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("content_media").select("*")
          .eq("entity_type", "activity").eq("entity_id", item.id).order("sort_order");
        if (!alive || !data) return;

        setMedia((data as { id: string; path: string; bucket_id: string; media_type: string }[])
          .map((m) => ({
            key: m.id,
            rowId: m.id,
            path: m.path,
            bucket: m.bucket_id,
            type: m.media_type === "video" ? "video" : "image",
            previewUrl: publicStorageUrl(m.bucket_id, m.path) ?? "",
          })));
      } catch {
        /* galeri okunamazsa boş kalır; kaydetmeyi engellemez */
      }
    })();

    return () => { alive = false; };
  }, [item]);

  /*
   * Kaydedildi.
   *  · Yeni içerikse: bekleyen medya bağlanır, sonra düzenleme adresine geçilir.
   *    router.replace + refresh sunucu verisini tazeler; alanlar dolu gelir ve
   *    içerik listede anında görünür.
   *  · Düzenlemeyse: listeyi tazelemek yeterli.
   */
  React.useEffect(() => {
    if (!state.ok) return;
    const createdId = (state.data as { id?: string } | undefined)?.id;
    if (!createdId) return;

    void (async () => {
      const unsaved = media.filter((m) => !m.rowId);

      if (unsaved.length > 0) {
        setAttaching(true);
        try {
          const fd = new FormData();
          fd.set("activityId", createdId);
          fd.set("items", JSON.stringify(
            unsaved.map((m, i) => ({
              path: m.path, bucket: m.bucket, type: m.type, order: i + 1,
            })),
          ));
          await attachActivityMedia(IDLE, fd);
        } finally {
          setAttaching(false);
        }
      }

      router.refresh();
      if (!item) router.replace(`/yaptiklarimiz/${createdId}`);
    })();
  }, [state.ok, state.data, item, media, router]);

  const upload = async (files: FileList) => {
    setMediaError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) { setMediaError("Yalnızca görsel veya video yükleyin."); continue; }

      const limit = isVideo ? 100 : 10;
      if (file.size > limit * 1024 * 1024) {
        setMediaError(`${isVideo ? "Video" : "Görsel"} en fazla ${limit} MB olabilir.`); continue;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
        const path = `activity/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const _yuk = await uploadToStorage({
        bucket: "galeri",
        path: path,
        file: file,
      });
      const error = _yuk.ok ? null : new Error(_yuk.error);
        if (error) throw new Error(error.message);

        setMedia((prev) => [...prev, {
          key: path,
          path,
          bucket: "galeri",
          type: isVideo ? "video" : "image",
          previewUrl: publicStorageUrl("galeri", path) ?? "",
        }]);
      } catch (err) {
        setMediaError((err as Error).message);
      } finally {
        setUploading(false);
      }
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (m: PendingMedia) => {
    try {
      const supabase = createClient();
      await removeFromStorage(m.bucket, [m.path]);
      if (m.rowId) await supabase.from("content_media").delete().eq("id", m.rowId);
      setMedia((prev) => prev.filter((x) => x.key !== m.key));
    } catch (err) {
      setMediaError((err as Error).message);
    }
  };

  const busy = pending || attaching;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/yaptiklarimiz"
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Bizden Haberler
        </Link>

        {item && (
          <Badge tone={item.status === "published" ? "green" : "muted"}>
            {STATUS_TR[item.status] ?? item.status}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">
          {item ? "Haberi düzenle" : "Yeni haber"}
        </h1>
        <span className="text-[14px] text-muted">
          Metni yazın, görselleri ekleyin, kaydedin.
        </span>
      </div>

      {state.message && (
        <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>
      )}
      {mediaError && <Alert tone="danger">{mediaError}</Alert>}

      <form action={action} className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        {item && <input type="hidden" name="id" value={item.id} />}
        <input type="hidden" name="coverPath" value={cover} />
        {!item && <input type="hidden" name="status" value="published" />}
        {!item && <input type="hidden" name="publishedAt" value="" />}

        {/* Sol: metin */}
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5 p-6">
            <Field label="Başlık" htmlFor="aTitle" error={state.fieldErrors?.title}>
              <Input id="aTitle" name="title" required maxLength={250}
                defaultValue={item?.title ?? ""}
                placeholder="Örn. Ankara'da 200 çocukla stat turu" />
            </Field>

            <Field label="Özet" htmlFor="aSummary" hint="liste sayfasında görünür">
              <Textarea id="aSummary" name="summary" rows={2} maxLength={500}
                defaultValue={item?.summary ?? ""} />
            </Field>

            <Field label="İçerik" htmlFor="aBody" hint="HTML kullanabilirsiniz"
              error={state.fieldErrors?.body}>
              <Textarea id="aBody" name="body" required minLength={10} rows={16}
                defaultValue={item?.body ?? ""} className="font-mono text-[13.5px]" />
            </Field>
          </Card>

          {item && (
            <Card className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Durum" htmlFor="aStatus">
                <Select id="aStatus" name="status" defaultValue={item.status}>
                  <option value="published">Yayında</option>
                  <option value="draft">Taslak</option>
                  <option value="archived">Arşiv</option>
                </Select>
              </Field>
              <Field label="Yayın tarihi" htmlFor="aPub">
                <Input id="aPub" name="publishedAt" type="datetime-local"
                  defaultValue={item.published_at ? item.published_at.slice(0, 16) : ""} />
              </Field>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" loading={busy}>
              {item ? "Değişiklikleri kaydet" : "Kaydet ve yayınla"}
            </Button>
            <Button type="button" size="lg" variant="outline"
              onClick={() => router.push("/yaptiklarimiz")}>
              Listeye dön
            </Button>
          </div>
        </div>

        {/* Sağ: görseller */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Card className="flex flex-col gap-3 p-6">
            <H3 className="text-[17px]">Kapak görseli</H3>
            <span className="text-[12.5px] leading-[1.5] text-muted">
              Liste sayfasında ve paylaşımlarda kullanılır.
            </span>
            <MediaPicker value={cover} onChange={setCover} bucket="galeri" />
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Icon icon={IconImage} size={17} className="text-muted" />
                <H3 className="text-[17px]">Galeri</H3>
              </div>
              {media.length > 0 && (
                <span className="text-[12.5px] text-muted">{media.length} medya</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {media.map((m) => (
                <div key={m.key}
                  className="group relative aspect-square overflow-hidden rounded-[12px] bg-chip">
                  {m.type === "video" ? (
                    <>
                      <video src={m.previewUrl} className="h-full w-full object-cover"
                        preload="metadata" muted />
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                        VİDEO
                      </span>
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.previewUrl} alt="" className="h-full w-full object-cover" />
                  )}

                  {!m.rowId && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-solid px-2 py-0.5 text-[10px] font-bold text-ink">
                      YENİ
                    </span>
                  )}

                  <button type="button" onClick={() => void remove(m)} aria-label="Kaldır"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon icon={IconTrash} size={13} />
                  </button>
                </div>
              ))}

              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-line text-muted transition-colors hover:border-ink/25 hover:text-ink disabled:opacity-50">
                <Icon icon={uploading ? IconTicket : IconUpload} size={18} />
                <span className="text-[11.5px] font-semibold">
                  {uploading ? "Yükleniyor" : "Ekle"}
                </span>
              </button>
            </div>

            <input ref={fileRef} type="file" multiple
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              className="sr-only"
              onChange={(e) => { const f = e.target.files; if (f?.length) void upload(f); }} />

            <span className="text-[12px] leading-[1.5] text-muted">
              Görsel 10 MB, video 100 MB. Kaydetmeden önce de ekleyebilirsiniz;
              içerik kaydedilince galeriye işlenir.
            </span>
          </Card>
        </div>
      </form>
    </div>
  );
}
