import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCalendar, IconUsers } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, EVENT_TYPE_TR } from "@/lib/utils";
import type { EventPublicView } from "@/lib/types";

export const metadata: Metadata = { title: "Etkinlik Yönetimi", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_events_public")
    .select("*")
    .gte("starts_at", new Date(Date.now() - 30 * 864e5).toISOString())
    .order("starts_at");

  const events = (data ?? []) as unknown as EventPublicView[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Etkinlikler</h1>
        <span className="text-[14px] text-muted">{events.length} etkinlik · kayıt ve kontenjan durumu</span>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<Icon icon={IconCalendar} size={26} />} title="Etkinlik yok" />
      ) : (
        <Card className="divide-y divide-line2 overflow-hidden">
          {events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Link href={`/etkinlikler/${e.slug}`} className="truncate text-[15px] font-semibold hover:text-accent-ink">
                  {e.title}
                </Link>
                <span className="text-[13px] text-muted">
                  {formatDate(e.starts_at, true)} · {e.city_name ?? "—"} · {EVENT_TYPE_TR[e.event_type] ?? e.event_type}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {e.requires_card && <Badge tone="orange">Kart şartlı</Badge>}
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                  <Icon icon={IconUsers} size={15} className="text-muted" />
                  {e.registered_count}{e.capacity ? `/${e.capacity}` : ""}
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
