"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconEdit, IconTrash, IconNews, IconShare } from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { ContentMediaManager } from "@/components/admin/content-media";
import { savePress, deletePress } from "@/lib/actions/content-extra";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { formatDate, publicStorageUrl } from "@/lib/utils";

interface Press {
  id: string; title: string; slug: string | null;
  source_name: string; source_url: string | null; article_url: string | null;
  excerpt: string | null; body: string | null;
  source_logo_path: string | null; cover_path: string | null;
  published_at: string; is_featured: boolean;
}

export function PressManager({ items }: { items: Press[] }) {
  const [editing, setEditing] = React.useState<Press | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [removing, setRemoving] = React.useState<Press | null>(null);
  const delRef = React.useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Basında biz</h1>
          <span className="text-[14px] text-muted">{items.length} haber</span>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Icon icon={IconPlus} size={17} /> Yeni haber
        </Button>
      </div>

      <Card className="flex items-start gap-3 border-ink/25 bg-chip p-4">
        <Icon icon={IconNews} size={17} className="mt-[2px] shrink-0 text-ink2" />
        <span className="text-[13px] leading-[1.55] text-ink2">
          Habere tıklayan kullanıcı önce <strong>bizim detay sayfamızı</strong> görür.
          Dış kaynağa yalnızca &quot;Kaynağa git&quot; düğmesiyle çıkar.
        </span>
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={<Icon icon={IconNews} size={26} />} title="Henüz haber yok"
          action={<Button onClick={() => setCreating(true)}>Yeni haber</Button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p) => {
            /* Logo press-logos kovasına yükleniyor; galeri denenince
               görsel bulunamıyor ve kırık ikon çıkıyordu. */
            const logo = publicStorageUrl("press-logos", p.source_logo_path);
            return (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-chip">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="h-full w-full object-contain p-1.5"
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <Icon icon={IconNews} size={16} className="text-muted2" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-semibold">{p.title}</span>
                      {p.is_featured && <Badge tone="lime">Öne çıkan</Badge>}
                    </div>
                    <span className="text-[12.5px] text-muted">
                      {p.source_name} · {formatDate(p.published_at)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Icon icon={IconEdit} size={14} /> Düzenle
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(p)}
                    className="!text-danger hover:!bg-danger-soft">
                    <Icon icon={IconTrash} size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PressForm key={`new-${creating}`} open={creating}
        onClose={() => setCreating(false)} item={null} />
      <PressForm key={editing?.id ?? "edit-closed"} open={Boolean(editing)}
        onClose={() => setEditing(null)} item={editing} />

      <form ref={delRef} action={deletePress} className="hidden">
        <input type="hidden" name="id" value={removing?.id ?? ""} />
      </form>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`"${removing?.title ?? ""}" silinsin mi?`}
        confirmLabel="Evet, sil"
        onConfirm={() => { delRef.current?.requestSubmit(); setRemoving(null); }}
      />
    </div>
  );
}

function PressForm({
  open, onClose, item,
}: { open: boolean; onClose: () => void; item: Press | null }) {
  const [state, action, pending] = useActionState(savePress, IDLE);
  const [logo, setLogo] = React.useState(item?.source_logo_path ?? "");
  const [cover, setCover] = React.useState(item?.cover_path ?? "");

  React.useEffect(() => {
    setLogo(item?.source_logo_path ?? "");
    setCover(item?.cover_path ?? "");
  }, [item]);
  useActionEffect(state, onClose);

  return (
    <Modal open={open} onClose={onClose} title={item ? "Haberi düzenle" : "Yeni haber"} size="lg">
      <form action={action} className="flex flex-col gap-4">
        {item && <input type="hidden" name="id" value={item.id} />}
        <input type="hidden" name="logoPath" value={logo} />
        <input type="hidden" name="coverPath" value={cover} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Field label="Haber başlığı" htmlFor="pTitle" error={state.fieldErrors?.title}>
          <Input id="pTitle" name="title" required maxLength={250} defaultValue={item?.title ?? ""} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kaynak adı" htmlFor="pSource" hint="örn. Hürriyet"
            error={state.fieldErrors?.sourceName}>
            <Input id="pSource" name="sourceName" required maxLength={120}
              defaultValue={item?.source_name ?? ""} />
          </Field>
          <Field label="Kaynak adresi" htmlFor="pUrl" hint="Kaynağa git düğmesi buraya gider"
            error={state.fieldErrors?.sourceUrl}>
            <Input id="pUrl" name="sourceUrl" type="url" required
              placeholder="https://kaynak.com/haber"
              defaultValue={item?.source_url ?? item?.article_url ?? ""} />
          </Field>
        </div>

        <Field label="Özet" htmlFor="pExcerpt" hint="liste sayfasında görünür">
          <Textarea id="pExcerpt" name="excerpt" rows={2} maxLength={1000}
            defaultValue={item?.excerpt ?? ""} />
        </Field>

        <Field label="Haber metni" htmlFor="pBody" hint="bizim detay sayfamızda gösterilir">
          <Textarea id="pBody" name="body" rows={8} maxLength={20000}
            defaultValue={item?.body ?? ""} className="font-mono text-[13.5px]" />
        </Field>

        <Field label="Yayın tarihi" htmlFor="pDate">
          <Input id="pDate" name="publishedAt" type="date"
            defaultValue={item?.published_at ? item.published_at.slice(0, 10) : ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink2">Kaynak logosu</span>
            {/* Site logoyu press-logos kovasından okur; farklı kovaya
                yüklenirse görsel bulunamıyordu. */}
            <MediaPicker value={logo} onChange={setLogo} bucket="press-logos" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink2">Kapak görseli</span>
            <MediaPicker value={cover} onChange={setCover} bucket="galeri" />
          </div>
        </div>

        <Checkbox id="pFeatured" name="isFeatured" label="Öne çıkan haber"
          defaultChecked={item?.is_featured ?? false} />

        <Button type="submit" size="lg" loading={pending}>
          {item ? "Değişiklikleri kaydet" : "Haberi ekle"}
        </Button>
      </form>

      {item && (
        <div className="mt-5 border-t border-line2 pt-5">
          <ContentMediaManager entityType="press" entityId={item.id} />
        </div>
      )}
    </Modal>
  );
}
