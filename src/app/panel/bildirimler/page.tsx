import type { Metadata } from "next";
import { Badge, Card, EmptyState } from "@/components/ui";
import { PanelBody, PanelHeader } from "@/components/panel/shell";
import { MarkAllRead } from "@/components/panel/mark-read";
import { Icon } from "@/components/ui/icon";
import { IconBell } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, formatDate } from "@/lib/utils";
import type { Notification } from "@/lib/types";

export const metadata: Metadata = { title: "Bildirimler", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (data ?? []) as unknown as Notification[];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <PanelBody>
      <PanelHeader title="Bildirimler" subtitle={unread > 0 ? `${unread} okunmamış bildirim` : "Tüm bildirimler okundu"} />

      {unread > 0 && (
        <div className="flex justify-end"><MarkAllRead /></div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<Icon icon={IconBell} size={26} />} title="Bildiriminiz yok"
          description="Sipariş, ödeme ve etkinlik güncellemeleri burada görünecek." />
      ) : (
        <Card className="ct-fade divide-y divide-line2 overflow-hidden">
          {items.map((n) => (
            <div key={n.id} className={`flex gap-4 px-5 py-4 sm:px-6 ${!n.read_at ? "bg-accent-soft/40" : ""}`}>
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-line" : "bg-accent"}`} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-semibold">{n.title}</span>
                  {!n.read_at && <Badge tone="green">Yeni</Badge>}
                </div>
                {n.body && <p className="text-[14px] leading-[1.6] text-ink2">{n.body}</p>}
                <span className="text-[12.5px] text-muted2" title={formatDate(n.created_at, true)}>
                  {relativeTime(n.created_at)}
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </PanelBody>
  );
}
