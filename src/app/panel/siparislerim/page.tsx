import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, Divider, EmptyState } from "@/components/ui";
import { PanelBody, PanelHeader } from "@/components/panel/shell";
import { Icon } from "@/components/ui/icon";
import { IconOrder, IconArrowRight, IconCard, IconBank } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate, formatMoney, ORDER_STATUS_TR, PAYMENT_STATUS_TR, statusTone,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Siparişlerim", robots: { index: false } };
export const dynamic = "force-dynamic";


/**
 * Siparişler ve ödemeler tek sayfada.
 * Ayrı tutmanın anlamı yoktu: her siparişin tek bir ödemesi var.
 */
export default async function Page() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("*, teams(name), children(first_name,last_name), payments(id,status,payment_method,rejection_reason,paid_at)")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as {
    id: string; order_number: string; status: string; amount: number; currency: string;
    created_at: string; is_renewal: boolean;
    shipping_address_snapshot: Record<string, string | null> | null;
    teams: { name: string } | null;
    children: { first_name: string; last_name: string } | null;
    payments: {
      id: string; status: string; payment_method: string;
      rejection_reason: string | null; paid_at: string | null;
    }[] | null;
  }[];

  const paidTotal = orders
    .flatMap((o) => o.payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, _p, i, arr) => sum + Number(orders[i]?.amount ?? 0) / arr.length, 0);

  return (
    <PanelBody>
      <PanelHeader
        title="Siparişlerim"
        subtitle={orders.length > 0
          ? `${orders.length} sipariş${paidTotal > 0 ? ` · ${formatMoney(paidTotal)} ödendi` : ""}`
          : "Sipariş ve ödeme geçmişiniz"}
        action={{ href: "/panel/kombine-kart", label: "Yeni başvuru" }}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<Icon icon={IconOrder} size={26} />}
          title="Henüz siparişiniz yok"
          description="Kombine kart başvurusu yaptığınızda siparişleriniz burada listelenir."
          action={<ButtonLink href="/panel/kombine-kart">Başvuru yap</ButtonLink>}
        />
      ) : (
        <div className="ct-stagger flex flex-col gap-5">
          {orders.map((o) => {
            const payment = o.payments?.[0] ?? null;
            const cancelled = ["cancelled", "refunded"].includes(o.status);
            const addr = o.shipping_address_snapshot;
            const isCard = payment?.payment_method === "credit_card";

            return (
              <Card key={o.id} className="flex flex-col gap-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[16px] font-bold">{o.order_number}</span>
                      {o.is_renewal && <Badge tone="lime">Yenileme</Badge>}
                      {/* Sipariş durumu listede gösterilmez: kart sanal
                          olduğu için ara aşama yok. Ödeme bekleyen siparişte
                          zaten aşağıda "Ödemeyi tamamla" bağlantısı çıkıyor. */}
                      {o.status === "cancelled" && <Badge tone="danger">İptal edildi</Badge>}
                      {o.status === "refunded" && <Badge tone="muted">İade edildi</Badge>}
                    </div>
                    <span className="text-[13.5px] text-muted">{formatDate(o.created_at, true)}</span>
                  </div>
                  <span className="font-display text-[22px] font-semibold tracking-[-.02em]">
                    {formatMoney(o.amount, o.currency)}
                  </span>
                </div>

                <div className="grid gap-3 text-[13.5px] sm:grid-cols-3">
                  <Meta label="ÇOCUK" value={o.children ? `${o.children.first_name} ${o.children.last_name}` : "—"} />
                  <Meta label="TAKIM" value={o.teams?.name ?? "—"} />
                  <Meta label="TESLİMAT" value={addr ? `${addr.city ?? ""}${addr.district ? " / " + addr.district : ""}` : "—"} />
                </div>

                {/* Ödeme bilgisi — ayrı sayfa yerine burada */}
                {payment && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Icon icon={isCard ? IconCard : IconBank} size={18} className="shrink-0 text-ink2" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold">
                          {isCard ? "Kredi / banka kartı" : "Havale / EFT"}
                        </span>
                        <span className="text-[12.5px] text-muted">
                          {payment.paid_at ? formatDate(payment.paid_at, true) : "Ödeme bekleniyor"}
                        </span>
                      </div>
                    </div>
                    <Badge tone={statusTone(payment.status)}>
                      {PAYMENT_STATUS_TR[payment.status] ?? payment.status}
                    </Badge>
                  </div>
                )}

                {payment?.rejection_reason && (
                  <Alert tone="danger" title="Dekontunuz reddedildi">{payment.rejection_reason}</Alert>
                )}

                {/* Aşama çubuğu kaldırıldı: kart sanal olduğu için ara adım yok.
                    Sipariş ya ödeme bekliyor ya da tamamlanmıştır. */}

                <div className="flex flex-wrap items-center gap-4 border-t border-line2 pt-4">
                  {o.status === "payment_pending" && (
                    <Link href={`/panel/siparislerim/${o.order_number}`}
                      className="inline-flex items-center gap-2 text-[14px] font-semibold text-orange">
                      Ödemeyi tamamla <Icon icon={IconArrowRight} size={15} />
                    </Link>
                  )}
                  {/* Kart sanaldır: kargo takibi yoktur. */}
                  <Link href={`/panel/siparislerim/${o.order_number}`}
                    className="inline-flex items-center gap-2 text-[14px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
                    Detayı görüntüle <Icon icon={IconArrowRight} size={15} />
                  </Link>
                  <Link href="/iptal-iade" className="text-[13.5px] text-muted hover:text-ink">
                    İptal ve iade koşulları
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PanelBody>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-bold tracking-[.08em] text-muted2">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
