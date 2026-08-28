import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCalendar, IconPlus, IconLocation, IconUsers } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, publicStorageUrl, EVENT_STATUS_TR } from "@/lib/utils";

export const metadata: Metadata = { title: "Etkinlikler" };
export const dynamic = "force-dynamic";

const STATUS_TR: Record<string, string> = {
  draft: "Taslak", published: "Yayında", ongoing: "Devam ediyor",
  completed: "Tamamlandı", cancelled: "İptal",
};

const ACCESS_TR: Record<string, string> = {
  public: "Herkese açık", card_holders: "Kart sahipleri",
  team_card_holders: "Takım kart sahipleri", invite_only: "Davetli",
};

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events").select("*, cities(name)").order("starts_at", { ascending: false }).limit(200);

  const rows = (data ?? []) as unknown as {
    id: string; title: string; status: string; starts_at: string; access_type: string;
    venue_name: string | null; capacity: number | null; cities: { name: string } | null;
    cover_path: string | null;
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
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Etkinlikler</h1>
          <span className="text-[14px] text-muted">{rows.length} etkinlik</span>
        </div>
        <ButtonLink href="/etkinlikler/yeni" size="lg">
          <Icon icon={IconPlus} size={17} /> Yeni etkinlik
        </ButtonLink>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Icon icon={IconCalendar} size={26} />} title="Henüz etkinlik yok"
          action={<ButtonLink href="/etkinlikler/yeni">Yeni etkinlik</ButtonLink>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((e) => (
            <Link key={e.id} href={`/etkinlikler/${e.id}`}>
              <Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-ink/25">
                {/* Kapak: etkinliği tanımayı kolaylaştırır */}
                {publicStorageUrl("event-media", e.cover_path) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={publicStorageUrl("event-media", e.cover_path)!} alt=""
                    className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-chip">
                    <Icon icon={IconCalendar} size={24} className="text-muted2" />
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.status === "published" ? "green"
                      : e.status === "cancelled" ? "danger" : "muted"}>
                      {EVENT_STATUS_TR[e.status] ?? e.status}
                    </Badge>
                    {new Date(e.starts_at).getTime() < Date.now() && (
                      <Badge tone="muted">Geçmiş</Badge>
                    )}
                  </div>

                  <span className="line-clamp-2 font-display text-[17px] font-semibold leading-[1.3] tracking-[-.02em]">
                    {e.title}
                  </span>

                  <div className="mt-auto flex flex-col gap-1.5 border-t border-line2 pt-3 text-[12.5px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon={IconCalendar} size={13} />
                      {formatDate(e.starts_at, true)}
                    </span>
                    {(e.venue_name || e.cities?.name) && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon icon={IconLocation} size={13} />
                        {[e.venue_name, e.cities?.name].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
