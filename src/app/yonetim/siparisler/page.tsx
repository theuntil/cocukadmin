import type { Metadata } from "next";
import { Badge, Card, EmptyState } from "@/components/ui";
import { CardStatusForm } from "@/components/panel/card-status-form";
import { Icon } from "@/components/ui/icon";
import { IconPackage } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, CARD_STATUS_TR, statusTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Kart Üretimi", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("*, teams(name), orders(order_number, shipping_address_snapshot)")
    .in("status", ["processing", "ready", "shipped"])
    .order("created_at");

  const cards = (data ?? []) as unknown as {
    id: string; card_number: string; status: string; created_at: string;
    holder_snapshot: { first_name?: string; last_name?: string } | null;
    shipping_carrier: string | null; tracking_number: string | null;
    teams: { name: string } | null;
    orders: { order_number: string; shipping_address_snapshot: Record<string, string | null> | null } | null;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Kart üretimi</h1>
        <span className="text-[14px] text-muted">{cards.length} kart üretim/kargo kuyruğunda</span>
      </div>

      {cards.length === 0 ? (
        <EmptyState icon={<Icon icon={IconPackage} size={26} />} title="Kuyrukta kart yok" />
      ) : (
        <div className="flex flex-col gap-4">
          {cards.map((c) => {
            const addr = c.orders?.shipping_address_snapshot;
            return (
              <Card key={c.id} className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[15px] font-bold">{c.card_number}</span>
                      <Badge tone={statusTone(c.status)}>{CARD_STATUS_TR[c.status] ?? c.status}</Badge>
                    </div>
                    <span className="text-[14px] font-semibold">
                      {c.holder_snapshot?.first_name} {c.holder_snapshot?.last_name}
                    </span>
                    <span className="text-[13px] text-muted">
                      {c.teams?.name ?? "—"} · {c.orders?.order_number ?? "—"} · {formatDate(c.created_at)}
                    </span>
                  </div>
                </div>

                {addr && (
                  <div className="rounded-[12px] bg-field p-4 text-[13.5px] leading-[1.6] text-ink2">
                    <strong className="text-ink">{addr.recipient_name}</strong> · {addr.phone}<br />
                    {addr.full_address}<br />
                    {[addr.neighborhood, addr.district, addr.city].filter(Boolean).join(" / ")}
                  </div>
                )}

                <CardStatusForm cardId={c.id} status={c.status}
                  carrier={c.shipping_carrier} tracking={c.tracking_number} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
