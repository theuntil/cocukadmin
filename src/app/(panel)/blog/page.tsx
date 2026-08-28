import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconEdit, IconPlus } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

const STATUS_TR: Record<string, string> = {
  draft: "Taslak", published: "Yayında", archived: "Arşiv",
};

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false }).limit(200);

  const rows = (data ?? []) as unknown as {
    id: string; title: string; slug: string; status: string; category: string | null;
    cover_path: string | null; published_at: string | null; created_at: string; view_count: number | null;
  }[];

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <Alert tone="danger" title="Liste alınamadı">{error.message}</Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Blog</h1>
          <span className="text-[14px] text-muted">{rows.length} yazı</span>
        </div>
        <ButtonLink href="/blog/yeni" size="lg">
          <Icon icon={IconPlus} size={17} /> Yeni yazı
        </ButtonLink>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Icon icon={IconEdit} size={26} />} title="Henüz yazı yok"
          description="İlk blog yazınızı ekleyin."
          action={<ButtonLink href="/blog/yeni">Yeni yazı</ButtonLink>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((n) => {
            const cover = publicStorageUrl("news-covers", n.cover_path);
            return (
              <Link key={n.id} href={`/blog/${n.id}`}>
                <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-ink/25">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-chip">
                      <Icon icon={IconEdit} size={22} className="text-muted2" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <div className="flex items-center gap-2">
                      <Badge tone={n.status === "published" ? "green" : n.status === "draft" ? "muted" : "orange"}>
                        {STATUS_TR[n.status] ?? n.status}
                      </Badge>
                      {n.category && <span className="text-[12px] text-muted">{n.category}</span>}
                    </div>
                    <span className="line-clamp-2 text-[15px] font-semibold leading-[1.35]">{n.title}</span>
                    <span className="mt-auto text-[12.5px] text-muted">
                      {n.published_at ? formatDate(n.published_at) : formatDate(n.created_at)}
                      {typeof n.view_count === "number" ? ` · ${n.view_count} görüntülenme` : ""}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
