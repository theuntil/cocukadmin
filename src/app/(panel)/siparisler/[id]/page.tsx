import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Alert, Badge, Card, Divider, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconInvoice, IconCard, IconBank, IconArrowRight } from "@/components/ui/icons";
import { OrderActions, CancelOrder, DeleteOrder } from "@/components/admin/order-actions";
import { RefundPanel } from "@/components/admin/refund-panel";
import { PaymentSync } from "@/components/admin/payment-sync";
import { ReceiptPreview } from "@/components/admin/receipt-preview";
import { InvoicePreview } from "@/components/admin/invoice-preview";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";
import {
  formatDate, formatMoney, ORDER_STATUS_TR, PAYMENT_STATUS_TR, CARD_STATUS_TR, statusTone,
} from "@/lib/utils";
import type { AdminOrderRow } from "../page";

export const metadata: Metadata = { title: "Sipariş detayı" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data }, { data: refunds }, { data: allReceipts }, user] = await Promise.all([
    supabase.from("v_admin_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("refunds").select("*").eq("order_id", id)
      .order("created_at", { ascending: false }),
    // Dekontlar ödeme kaydına bağlıdır
    supabase.from("payment_receipts")
      .select("id, bucket_id, path, mime_type, uploaded_at, payment_id")
      .order("uploaded_at", { ascending: false }),
    getAdminUser(),
  ]);

  if (!data) notFound();
  const o = data as unknown as AdminOrderRow;

  const addr = o.shipping_address_snapshot;
  const canFinance = hasRole(user, "admin", "finance");
  const canShip = hasRole(user, "admin", "support");
  const canCancel = hasRole(user, "admin");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/siparisler"
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Siparişler
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-[24px] font-bold">{o.order_number}</h1>
            {o.is_renewal && <Badge tone="lime">Yenileme</Badge>}
            <Badge tone={statusTone(o.status)}>{ORDER_STATUS_TR[o.status] ?? o.status}</Badge>
          </div>
          <span className="text-[13.5px] text-muted">{formatDate(o.created_at, true)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display text-[30px] font-semibold tracking-[-.03em]">
            {formatMoney(o.amount, o.currency)}
          </span>

          {/* İptal, en sık aranan yerde: başlığın yanında */}
          {canCancel && !["cancelled", "refunded", "completed"].includes(o.status) && (
            <CancelOrder orderId={o.id} orderNumber={o.order_number} />
          )}

          {/* İptal kaydı korur, silme kaydı kaldırır — ikisi ayrı iş.
              Silme her durumda görünür: iptal edilmiş test kayıtları da
              temizlenebilsin. Yalnızca yönetici. */}
          {canCancel && (
            <DeleteOrder orderId={o.id} orderNumber={o.order_number} />
          )}
        </div>
      </div>

      {o.notes && <Alert tone="orange" title="Not">{o.notes}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Bilgiler */}
        <Card className="flex flex-col gap-4 p-6">
          <H3 className="text-[18px]">Sipariş bilgileri</H3>
          <Divider />
          <Row label="Müşteri" value={[o.customer_first_name, o.customer_last_name].filter(Boolean).join(" ") || "—"} />
          <Row label="Çocuk" value={[o.child_first_name, o.child_last_name].filter(Boolean).join(" ") || "—"} />
          <Row label="Takım" value={o.team_name ?? "—"} />
          <Divider />
          <Row label="Teslimat" value={addr?.recipient_name ?? "—"} />
          <Row label="Şehir" value={[addr?.city, addr?.district].filter(Boolean).join(" / ") || "—"} />
          <span className="text-[13.5px] leading-[1.6] text-ink2">{addr?.full_address ?? "—"}</span>
        </Card>

        {/* Ödeme + kart */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <H3 className="text-[18px]">Ödeme</H3>
              {o.payment_status && (
                <Badge tone={statusTone(o.payment_status)}>
                  {PAYMENT_STATUS_TR[o.payment_status] ?? o.payment_status}
                </Badge>
              )}
            </div>
            <Divider />
            <div className="flex items-center gap-3">
              <Icon icon={o.payment_method === "credit_card" ? IconCard : IconBank} size={18} className="text-ink2" />
              <span className="text-[14px] font-semibold">
                {o.payment_method === "credit_card" ? "Kredi / banka kartı" : "Havale / EFT"}
              </span>
            </div>
            {o.paid_at && <Row label="Ödeme tarihi" value={formatDate(o.paid_at, true)} />}
            {o.rejection_reason && <Alert tone="danger">{o.rejection_reason}</Alert>}
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <H3 className="text-[18px]">Kart</H3>
              {o.card_status && (
                <Badge tone={statusTone(o.card_status)}>
                  {CARD_STATUS_TR[o.card_status] ?? o.card_status}
                </Badge>
              )}
            </div>
            <Divider />
            {o.card_id ? (
              <Link href={`/kartlar/${o.card_id}`}
                className="flex items-center justify-between gap-4 rounded-[10px] px-2 py-1.5 hover:bg-chip">
                <span className="text-[13px] text-muted">Kart no</span>
                <span className="inline-flex items-center gap-2 font-mono text-[14px] font-semibold">
                  {o.card_number ?? "—"}
                  <Icon icon={IconArrowRight} size={14} className="text-muted" />
                </span>
              </Link>
            ) : (
              <Row label="Kart no" value="Henüz kart oluşturulmadı" />
            )}
          </Card>
        </div>
      </div>

      {/* Müşterinin yüklediği dekont */}
      <ReceiptPreview receipts={((allReceipts ?? []) as { payment_id: string }[])
        .filter((r) => r.payment_id === o.payment_id) as never} />

      {/* Ödeme eşitleme: kartla ödenmiş ama tamamlanmamış siparişler için */}
      {o.payment_method === "credit_card" && o.status !== "completed"
        && o.status !== "cancelled" && o.status !== "refunded" && (
        <PaymentSync orderId={o.id} orderNumber={o.order_number} />
      )}

      {/* İade */}
      {canCancel && (
        <RefundPanel
          orderId={o.id}
          amount={o.amount}
          currency={o.currency}
          orderStatus={o.status}
          paymentStatus={o.payment_status}
          refunds={(refunds ?? []) as never}
        />
      )}

      {/* Fatura — yüklendiyse görseli/PDF'i burada önizlenir */}
      {o.invoice_id && (
        <InvoicePreview
          invoiceId={o.invoice_id}
          invoiceNumber={o.invoice_number}
          issuedAt={o.issued_at}
          orderId={o.id}
        />
      )}

      {/* İşlemler */}
      <OrderActions
        order={{
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          amount: Number(o.amount),
          paymentId: o.payment_id,
          paymentStatus: o.payment_status,
          cardId: o.card_id,
          cardStatus: o.card_status,
          hasInvoice: Boolean(o.invoice_id),
        }}
        permissions={{ finance: canFinance, shipping: canShip, cancel: canCancel }}
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`text-right text-[14px] font-semibold ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
