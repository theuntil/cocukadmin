"use client";

import * as React from "react";
import { Badge, Button, ButtonLink, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconEdit, IconTrash, IconStar } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { deleteActivity } from "@/lib/actions/content-extra";
import { formatDate, publicStorageUrl } from "@/lib/utils";
import Link from "next/link";

interface Activity {
  id: string; title: string; slug: string; summary: string | null; body: string;
  cover_path: string | null; status: string; published_at: string | null; created_at: string;
}

const STATUS_TR: Record<string, string> = {
  draft: "Taslak", published: "Yayında", archived: "Arşiv",
};

export function ActivityManager({ items }: { items: Activity[] }) {
  const [removing, setRemoving] = React.useState<Activity | null>(null);
  const delRef = React.useRef<HTMLFormElement>(null);

  const published = items.filter((a) => a.status === "published").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Bizden Haberler</h1>
          <span className="text-[14px] text-muted">
            {items.length} içerik · {published} yayında
          </span>
        </div>
        <ButtonLink href="/yaptiklarimiz/yeni" size="lg">
          <Icon icon={IconPlus} size={17} /> Yeni içerik
        </ButtonLink>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Icon icon={IconStar} size={26} />} title="Henüz haber yok"
          description="Hayata geçirdiğiniz çalışmaları paylaşın."
          action={<ButtonLink href="/yaptiklarimiz/yeni">Yeni haber</ButtonLink>} />
      ) : (
        /* Dikey liste: kart ızgarası yerine tarayıp bulmayı kolaylaştıran
           tek sütun. Görsel küçük tutulur, başlık öne çıkar. */
        <div className="flex flex-col divide-y divide-line2 overflow-hidden rounded-[18px] border border-line bg-surface">
          {items.map((a) => {
            const cover = publicStorageUrl("galeri", a.cover_path);
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-chip/50">
                <Link href={`/yaptiklarimiz/${a.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-chip">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon icon={IconStar} size={17} className="text-muted2" />
                    )}
                  </span>

                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-[15px] font-semibold">{a.title}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                      {formatDate(a.published_at ?? a.created_at)}
                      {a.status !== "published" && (
                        <Badge tone="muted">{STATUS_TR[a.status] ?? a.status}</Badge>
                      )}
                    </span>
                  </div>
                </Link>

                <div className="flex shrink-0 gap-2">
                  <ButtonLink href={`/yaptiklarimiz/${a.id}`} size="sm" variant="outline">
                    <Icon icon={IconEdit} size={14} /> Düzenle
                  </ButtonLink>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(a)}
                    className="!text-danger hover:!bg-danger-soft">
                    <Icon icon={IconTrash} size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form ref={delRef} action={deleteActivity} className="hidden">
        <input type="hidden" name="id" value={removing?.id ?? ""} />
      </form>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`"${removing?.title ?? ""}" silinsin mi?`}
        description="İçerik ve galerisindeki tüm medya kalıcı olarak silinir."
        confirmLabel="Evet, sil"
        onConfirm={() => { delRef.current?.requestSubmit(); setRemoving(null); }}
      />
    </div>
  );
}
