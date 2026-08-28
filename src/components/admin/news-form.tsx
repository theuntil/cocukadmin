"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Field, H3, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconTrash, IconSearch } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveNews, deleteNews } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { slugify } from "@/lib/utils";

interface NewsRow {
  id: string; title: string; slug: string; excerpt: string | null; body: string;
  cover_path: string | null; category: string | null; status: string; published_at: string | null;
}

export function NewsForm({ news }: { news: NewsRow | null }) {
  const [state, action, pending] = useActionState(saveNews, IDLE);
  const [title, setTitle] = React.useState(news?.title ?? "");
  const [slug, setSlug] = React.useState(news?.slug ?? "");
  const [cover, setCover] = React.useState(news?.cover_path ?? "");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const deleteRef = React.useRef<HTMLFormElement>(null);

  // Slug elle değiştirilmediyse başlıktan türetilir
  const slugTouched = React.useRef(Boolean(news));
  React.useEffect(() => {
    if (!slugTouched.current) setSlug(slugify(title));
  }, [title]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/blog"
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Blog
        </Link>

        {news && (
          <div className="flex items-center gap-2">
            {news.status === "published" && (
              <a href={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/blog/${news.slug}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
                <Icon icon={IconSearch} size={15} /> Sitede gör
              </a>
            )}
            <Button type="button" variant="ghost" size="sm"
              onClick={() => setConfirmDelete(true)}
              className="!text-danger hover:!bg-danger-soft">
              <Icon icon={IconTrash} size={15} /> Sil
            </Button>
          </div>
        )}
      </div>

      <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">
        {news ? "Yazıyı düzenle" : "Yeni yazı"}
      </h1>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <form action={action} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {news && <input type="hidden" name="id" value={news.id} />}
        <input type="hidden" name="coverPath" value={cover} />

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <Field label="Başlık" htmlFor="title" error={state.fieldErrors?.title}>
              <Input id="title" name="title" required maxLength={200}
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <Field label="Kısa yol (slug)" htmlFor="slug" hint="boş bırakılırsa başlıktan üretilir">
              <Input id="slug" name="slug" maxLength={200} value={slug}
                onChange={(e) => { slugTouched.current = true; setSlug(e.target.value); }} />
            </Field>

            <Field label="Özet" htmlFor="excerpt" hint="liste sayfalarında görünür">
              <Textarea id="excerpt" name="excerpt" maxLength={500} rows={3}
                defaultValue={news?.excerpt ?? ""} />
            </Field>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">İçerik</H3>
            <Field label="Gövde" htmlFor="body" hint="HTML kullanabilirsiniz"
              error={state.fieldErrors?.body}>
              <Textarea id="body" name="body" required minLength={10} rows={18}
                defaultValue={news?.body ?? ""} className="font-mono text-[13.5px]" />
            </Field>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">Yayın</H3>

            {/* Yeni yazı doğrudan yayına girer; durum seçimi yalnızca
                düzenlerken anlamlıdır (yayından kaldırma, arşivleme). */}
            {news ? (
              <Field label="Durum" htmlFor="status">
                <Select id="status" name="status" defaultValue={news.status}>
                  <option value="draft">Taslak</option>
                  <option value="published">Yayında</option>
                  <option value="archived">Arşiv</option>
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="status" value="published" />
            )}

            <Field label="Kategori" htmlFor="category" hint="isteğe bağlı">
              <Input id="category" name="category" maxLength={60} defaultValue={news?.category ?? ""} />
            </Field>

            <Field label="Yayın tarihi" htmlFor="publishedAt" hint="boşsa şimdi">
              <Input id="publishedAt" name="publishedAt" type="datetime-local"
                defaultValue={news?.published_at ? news.published_at.slice(0, 16) : ""} />
            </Field>

            <Button type="submit" size="lg" loading={pending}>
              {news ? "Değişiklikleri kaydet" : "Yazıyı oluştur"}
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">Kapak görseli</H3>
            <MediaPicker value={cover} onChange={setCover} bucket="news-media" />
          </Card>
        </div>
      </form>

      {news && (
        <>
          <form ref={deleteRef} action={deleteNews} className="hidden">
            <input type="hidden" name="id" value={news.id} />
          </form>
          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title="Yazı silinsin mi?"
            description={`"${news.title}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
            confirmLabel="Evet, sil"
            onConfirm={() => { setConfirmDelete(false); deleteRef.current?.requestSubmit(); }}
          />
        </>
      )}
    </div>
  );
}
