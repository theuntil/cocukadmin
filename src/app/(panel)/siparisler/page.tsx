import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconOrder, IconInvoice, IconTruck, IconSearch } from "@/components/ui/icons";
import { NewOrderButton } from "@/components/admin/new-order";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate, formatMoney, ORDER_STATUS_TR, PAYMENT_STATUS_TR, statusTone,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Siparişler" };
export const dynamic = "force-dynamic";

export interface AdminOrderRow {
  id: string; order_number: string; status: string; amount: number; currency: string;
  created_at: string; is_renewal: boolean; user_id: string | null; notes: string | null;
  shipping_address_snapshot: Record<string, string | null> | null;
  child_first_name: string | null; child_last_name: string | null;
  team_name: string | null;
  customer_first_name: string | null; customer_last_name: string | null;
  payment_id: string | null; payment_status: string | null; payment_method: string | null;
  rejection_reason: string | null; paid_at: string | null;
  card_id: string | null; card_number: string | null; card_status: string | null;
  shipping_carrier: string | null; tracking_number: string | null;
  invoice_id: string | null; invoice_number: string | null;
  invoice_path: string | null; issued_at: string | null;
}

const FILTERS = [
  { key: "", label: "Tümü" },
  { key: "bekleyen", label: "Ödeme bekleyen" },
  { key: "odendi", label: "Ödendi" },
  { key: "kargoda", label: "Kargoda" },
  { key: "tamamlanan", label: "Tamamlanan" },
  { key: "iptal", label: "İptal" },
];

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ durum?: string; fatura?: string; q?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("v_admin_orders").select("*").order("created_at", { ascending: false }).limit(200);

  if (sp.durum === "bekleyen") query = query.eq("status", "payment_pending");
  else if (sp.durum === "odendi") query = query.eq("status", "paid");
  else if (sp.durum === "kargoda") query = query.in("status", ["shipped", "delivered"]);
  else if (sp.durum === "tamamlanan") query = query.eq("status", "completed");
  else if (sp.durum === "iptal") query = query.in("status", ["cancelled", "refunded"]);

  if (sp.fatura === "yok") query = query.is("invoice_id", null);
  if (sp.q) query = query.ilike("order_number", `%${sp.q}%`);

  const { data, error } = await query;

  /* ┌─ HATA YUTULMUYOR ⚠️ ──────────────────────────────────────┐
     │ `error` hiç okunmuyordu: sorgu patlasa da ekranda "sipariş │
     │ yok" yazıyordu. "Kayıt yok" ile "veriye erişemedim" aynı   │
     │ görünmemeli.                                                │
     └─────────────────────────────────────────────────────────────┘ */
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Siparişler</h1>
        <Alert tone="danger" title="Sipariş listesi alınamadı">{error.message}</Alert>
      </div>
    );
  }

  const orders = (data ?? []) as unknown as AdminOrderRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Siparişler</h1>
          <span className="text-[14px] text-muted">{orders.length} kayıt</span>
        </div>
        <NewOrderButton />
      </div>

      {/* Filtreler */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (sp.durum ?? "") === f.key && !sp.fatura;
            return (
              <Link key={f.key} href={f.key ? `/siparisler?durum=${f.key}` : "/siparisler"}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  active ? "bg-solid text-on-solid" : "border border-line bg-surface text-ink2 hover:border-ink/25"
                }`}>
                {f.label}
              </Link>
            );
          })}
          <Link href="/siparisler?fatura=yok"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              sp.fatura === "yok" ? "bg-orange text-white" : "border border-orange-line bg-orange-bg text-orange-ink"
            }`}>
            <Icon icon={IconInvoice} size={14} /> Faturasız
          </Link>
        </div>

        <form action="/siparisler" className="flex max-w-[360px] gap-2">
          <div className="relative flex-1">
            <Icon icon={IconSearch} size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Sipariş numarası ara"
              className="h-11 w-full rounded-[12px] border border-line bg-field pl-10 pr-3 text-[14px] outline-none focus:border-ink/25" />
          </div>
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<Icon icon={IconOrder} size={26} />} title="Sipariş bulunamadı"
          description="Seçtiğiniz filtreye uyan kayıt yok." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/siparisler/${o.id}`} className="block">
              <Card className="flex flex-col gap-4 p-5 transition-colors hover:border-ink/25">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[15px] font-bold">{o.order_number}</span>
                      {o.is_renewal && <Badge tone="lime">Yenileme</Badge>}
                      <Badge tone={statusTone(o.status)}>{ORDER_STATUS_TR[o.status] ?? o.status}</Badge>
                      {!o.invoice_id && ["paid","processing","shipped","delivered","completed"].includes(o.status) && (
                        <Badge tone="orange">Faturasız</Badge>
                      )}
                    </div>
                    <span className="truncate text-[13px] text-muted">
                      {[o.customer_first_name, o.customer_last_name].filter(Boolean).join(" ") || "—"}
                      {" · "}{formatDate(o.created_at, true)}
                    </span>
                  </div>
                  <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
                    {formatMoney(o.amount, o.currency)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line2 pt-3 text-[13px]">
                  <Field label="Çocuk"
                    value={[o.child_first_name, o.child_last_name].filter(Boolean).join(" ") || "—"} />
                  <Field label="Takım" value={o.team_name ?? "—"} />
                  <Field label="Ödeme"
                    value={o.payment_status ? (PAYMENT_STATUS_TR[o.payment_status] ?? o.payment_status) : "—"} />
                  {o.tracking_number && (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Icon icon={IconTruck} size={14} />
                      <span className="font-mono text-[12.5px]">{o.tracking_number}</span>
                    </span>
                  )}
                  {o.invoice_number && (
                    <span className="inline-flex items-center gap-1.5 text-green">
                      <Icon icon={IconInvoice} size={14} />
                      <span className="text-[12.5px] font-semibold">{o.invoice_number}</span>
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11.5px] font-bold tracking-[.06em] text-muted2">{label.toUpperCase()}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
