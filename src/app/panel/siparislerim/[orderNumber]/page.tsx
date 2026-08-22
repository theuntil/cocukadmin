import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, Divider } from "@/components/ui";
import { PanelBody, PanelHeader } from "@/components/panel/shell";
import { PaymentSection } from "@/components/panel/payment-section";
import { MyInvoice } from "@/components/panel/my-invoice";
import { Icon } from "@/components/ui/icon";
import { IconCard, IconArrowRight } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate, ORDER_STATUS_TR, PAYMENT_STATUS_TR, statusTone } from "@/lib/utils";
import { getBankInfo, getPaymentOptions } from "@/lib/data";

export const metadata: Metadata = { title: "Ödeme", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, teams(name), children(first_name,last_name)")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order) notFound();

  const orderId = (order as { id: string }).id;

  /* Kart ayrı sorgulanır: gömülü seçimde (cards(...)) ilişki bire-çok
     olduğu için Supabase DİZİ döndürüyor ve `.id` okuması undefined
     veriyordu — "Kartı görüntüle" bağlantısı bozuluyordu. */
  const [{ data: payment }, { data: invoice }, { data: cardRow }, bank, payOpts] = await Promise.all([
    supabase.from("payments").select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("order_invoices").select("id,invoice_number,issued_at")
      .eq("order_id", orderId).maybeSingle(),
    supabase.from("cards").select("id,card_number,status,valid_until")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getBankInfo(),
    getPaymentOptions(),
  ]);

  const card = cardRow as {
    id: string; card_number: string; status: string; valid_until: string | null;
  } | null;

  const o = order as unknown as {
    id: string; order_number: string; amount: number; currency: string; status: string;
    created_at: string; is_renewal: boolean;
    shipping_address_snapshot: Record<string, unknown> | null;
    teams: { name: string } | null;
    children: { first_name: string; last_name: string } | null;
  };
  const inv = invoice as {
    id: string; invoice_number: string | null; issued_at: string | null;
  } | null;
  const p = payment as unknown as {
    id: string; status: string; payment_method: string; rejection_reason: string | null;
  } | null;

  const isPaid = p?.status === "paid";
  const isReviewing = p?.status === "awaiting_review";

  return (
    <PanelBody>
      <PanelHeader
        title={isPaid ? "Ödemeniz onaylandı" : "Ödeme"}
        subtitle={isPaid ? "Kartınız hazırlanmaya başlandı." : `Sipariş ${o.order_number}`}
      />

      <Card className="flex flex-col gap-4 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[17px] font-bold">{o.order_number}</span>
          <div className="flex gap-2">
            {o.is_renewal && <Badge tone="lime">Yenileme</Badge>}
            <Badge tone={statusTone(o.status)}>{ORDER_STATUS_TR[o.status] ?? o.status}</Badge>
          </div>
        </div>
        <Divider />
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Çocuk" value={o.children ? `${o.children.first_name} ${o.children.last_name}` : "—"} />
          <Row label="Takım" value={o.teams?.name ?? "—"} />
          <Row label="Sipariş tarihi" value={formatDate(o.created_at)} />
          <Row label="Ödeme durumu" value={p ? (PAYMENT_STATUS_TR[p.status] ?? p.status) : "—"} />
          <Row label="Teslimat"
            value={(o.shipping_address_snapshot as { digital?: boolean } | null)?.digital
              ? "Dijital · kargo yok" : "—"} />
        </div>
        <Divider />
        <div className="flex items-center justify-between">
          <span className="text-[14.5px] text-ink2">Tutar</span>
          <span className="font-display text-[28px] font-semibold tracking-[-.02em]">
            {formatMoney(o.amount, o.currency)}
          </span>
        </div>
      </Card>

      {isPaid ? (
        <Alert tone="green" title="Ödeme onaylandı">
          Kartınız dijital olarak hazırlanıyor; kargo beklemenize gerek yok.
          Hazır olduğunda{" "}
          <Link href="/panel/kombine-kart" className="font-semibold underline">Kartlarım</Link>{" "}
          sayfasından QR kodunuzla kullanabilirsiniz.
        </Alert>
      ) : (
        <>
          {p?.rejection_reason && (
            <Alert tone="danger" title="Dekontunuz reddedildi">
              {p.rejection_reason} — Lütfen doğru dekontu tekrar yükleyin.
            </Alert>
          )}
          {isReviewing && (
            <Alert tone="orange" title="Dekontunuz inceleniyor">
              Ekibimiz genellikle 1 iş günü içinde onaylıyor.
            </Alert>
          )}
          {/* Ödeme yöntemi kullanıcının seçimine göre; ikisi de açık kalır
              ki fikrini değiştirirse baştan başvurmasın. */}
          <PaymentSection
            orderId={o.id}
            orderNumber={o.order_number}
            amount={formatMoney(o.amount, o.currency)}
            paymentId={p?.id ?? null}
            preferred={p?.payment_method === "bank_transfer" ? "bank" : "card"}
            reviewing={isReviewing}
            bank={bank}
            cardEnabled={payOpts.card_enabled}
          />
        </>
      )}

      {/* Kartın kendisi */}
      {card && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-chip">
              <Icon icon={IconCard} size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[14.5px] font-semibold">{card.card_number}</span>
              <span className="text-[12.5px] text-muted">
                {card.valid_until
                  ? `${formatDate(card.valid_until)} tarihine kadar geçerli` : ""}
              </span>
            </div>
          </div>
          <ButtonLink href={`/panel/kombine-kart/${card.id}`} size="md" variant="outline">
            Kartı görüntüle
          </ButtonLink>
        </Card>
      )}

      {/* Fatura — yüklendiyse önizlenir */}
      {inv && (
        <MyInvoice
          invoiceId={inv.id}
          invoiceNumber={inv.invoice_number}
          issuedAt={inv.issued_at}
        />
      )}
    </PanelBody>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11.5px] font-bold tracking-[.1em] text-muted2">{label.toUpperCase()}</span>
      <span className="text-[14.5px] font-semibold">{value}</span>
    </div>
  );
}
