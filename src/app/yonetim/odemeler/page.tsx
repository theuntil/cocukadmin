import type { Metadata } from "next";
import { Badge, Card, EmptyState } from "@/components/ui";
import { PaymentReviewRow } from "@/components/panel/admin-rows";
import { Icon } from "@/components/ui/icon";
import { IconCheck } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, PAYMENT_STATUS_TR, statusTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Ödeme Onayları", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, orders(order_number, amount, children(first_name,last_name), teams(name))")
    .in("status", ["pending", "awaiting_review"])
    .order("created_at");

  const rows = (data ?? []) as unknown as {
    id: string; amount: number; currency: string; status: string; created_at: string;
    orders: { order_number: string; children: { first_name: string; last_name: string } | null; teams: { name: string } | null } | null;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Ödeme onayları</h1>
        <span className="text-[14px] text-muted">{rows.length} bekleyen ödeme</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Icon icon={IconCheck} size={26} />} title="Bekleyen ödeme yok"
          description="Tüm ödemeler işlenmiş durumda." />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[15px] font-bold">{p.orders?.order_number ?? "—"}</span>
                    <Badge tone={statusTone(p.status)}>{PAYMENT_STATUS_TR[p.status] ?? p.status}</Badge>
                  </div>
                  <span className="text-[13px] text-muted">
                    {p.orders?.children ? `${p.orders.children.first_name} ${p.orders.children.last_name}` : "—"}
                    {p.orders?.teams ? ` · ${p.orders.teams.name}` : ""} · {formatDate(p.created_at, true)}
                  </span>
                </div>
                <span className="text-[19px] font-bold">{formatMoney(p.amount, p.currency)}</span>
              </div>
              <PaymentReviewRow paymentId={p.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
