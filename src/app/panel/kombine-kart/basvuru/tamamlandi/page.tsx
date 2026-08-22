import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Badge, ButtonLink, Card, Divider } from "@/components/ui";
import { PanelBody } from "@/components/panel/shell";
import { PaymentSection } from "@/components/panel/payment-section";
import { Icon } from "@/components/ui/icon";
import {
  IconCheck, IconArrowRight, IconTicket, IconQr, IconClock, IconCard,
} from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import { getBankInfo, getPaymentOptions } from "@/lib/data";

export const metadata: Metadata = { title: "Başvurunuz alındı", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * BAŞVURU ONAY SAYFASI.
 *
 * Başvuru tamamlandığında kullanıcı BURAYA gelir. Sayfanın kalıcı bir
 * adresi vardır (`?siparis=CT-...`): yenilense de, geri gelinse de, bağlantı
 * paylaşılsa da aynı başvuruyu açar. Eskiden onay yalnızca formun istemci
 * durumunda tutuluyordu ve sayfa yenilenince kayboluyordu.
 *
 * Üç durumu tek ekranda anlatır:
 *   1. Başvuru alındı, ödeme bekleniyor  → ödeme adımı burada
 *   2. Ödeme alındı, kart hazırlanıyor   → kısa bekleme bilgisi
 *   3. Kart aktif                        → doğrudan karta bağlantı
 *
 * Erişim kontrolü RLS ile: başkasının sipariş numarasını yazan kullanıcı
 * hiçbir satır göremez ve kart listesine geri gönderilir.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ siparis?: string }>;
}) {
  const { siparis } = await searchParams;

  // Sipariş numarası yoksa gösterilecek başvuru da yok
  if (!siparis) redirect("/panel/kombine-kart");

  const supabase = await createClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*, teams(name), children(first_name,last_name)")
    .eq("order_number", siparis)
    .maybeSingle();

  /* Sipariş bulunamadı = ya yanlış numara ya da başkasının siparişi.
     404 yerine kart listesine döndürülür: kullanıcı çıkmazda kalmasın. */
  if (!orderRow) redirect("/panel/kombine-kart");

  const o = orderRow as unknown as {
    id: string; order_number: string; amount: number; currency: string;
    status: string; created_at: string; is_renewal: boolean;
    teams: { name: string } | null;
    children: { first_name: string; last_name: string } | null;
  };

  const [{ data: paymentRow }, { data: cardRow }, bank, payOpts] = await Promise.all([
    supabase.from("payments").select("id,status,payment_method,rejection_reason")
      .eq("order_id", o.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    /* Kart siparişe DEĞİL çocuk+takıma göre aranır: yenilemede yeni kart
       basılmaz, mevcut kartın süresi uzatılır ve order_id eski siparişte
       kalır. Sipariş üzerinden arasaydık kart hazır olduğu hâlde
       "hazırlanıyor" derdik. */
    supabase.from("cards").select("id,card_number,status,valid_until")
      .eq("order_id", o.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getBankInfo(),
    getPaymentOptions(),
  ]);

  const p = paymentRow as {
    id: string; status: string; payment_method: string; rejection_reason: string | null;
  } | null;
  const card = cardRow as {
    id: string; card_number: string; status: string; valid_until: string | null;
  } | null;

  const amount = formatMoney(o.amount, o.currency);
  const childName = o.children ? `${o.children.first_name} ${o.children.last_name}` : "—";

  const isSettled = ["paid", "completed"].includes(o.status);
  const isCancelled = ["cancelled", "refunded"].includes(o.status);
  const isReviewing = p?.status === "awaiting_review";
  const cardReady = Boolean(card && card.status === "active");

  return (
    <PanelBody>
      <div className="flex flex-col gap-6">

        {/* ── Onay başlığı ── */}
        <div className="ct-rise flex flex-col items-center gap-4 rounded-[26px] border border-line bg-surface px-6 py-10 text-center sm:py-14">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full ${
            isCancelled ? "bg-danger-soft text-danger" : "bg-accent text-accent-ink"}`}>
            <Icon icon={isCancelled ? IconClock : IconCheck} size={30} />
          </span>

          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em] sm:text-[34px]">
            {isCancelled
              ? "Bu başvuru iptal edildi"
              : cardReady
                ? "Kartınız hazır"
                : isSettled
                  ? "Ödemeniz alındı"
                  : "Başvurunuz alındı"}
          </h1>

          <p className="max-w-[460px] text-[15px] leading-[1.65] text-ink2">
            {isCancelled
              ? "Dilerseniz yeni bir başvuru oluşturabilirsiniz."
              : cardReady
                ? `${childName} adına düzenlenen kombine kart aktif. QR kodunu panelden görebilirsiniz.`
                : isSettled
                  ? "Kartınız oluşturuluyor. Bu genelde birkaç saniye sürer."
                  : `${childName} için başvurunuz kaydedildi. Son adım: ödeme.`}
          </p>

          <span className="font-mono text-[13.5px] text-muted">
            Başvuru no: <strong className="text-ink">{o.order_number}</strong>
          </span>

          {o.is_renewal && <Badge tone="lime">Yenileme</Badge>}
        </div>

        {/* ── Başvuru özeti ── */}
        <Card className="flex flex-col gap-4 p-6 sm:p-7">
          <span className="flex items-center gap-2.5 font-display text-[18px] font-semibold tracking-[-.02em]">
            <Icon icon={IconTicket} size={19} className="text-accent-ink" />
            Başvuru özeti
          </span>
          <Divider />
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="Çocuk" value={childName} />
            <Row label="Takım" value={o.teams?.name ?? "—"} />
            <Row label="Kart türü" value="Dijital · QR kodlu" />
            <Row label="Üyelik süresi" value="12 ay" />
            <Row label="Başvuru tarihi" value={formatDate(o.created_at)} />
            <Row label="Teslimat" value="Dijital · kargo yok" />
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <span className="text-[14.5px] text-ink2">Toplam</span>
            <span className="font-display text-[26px] font-semibold tracking-[-.02em] text-accent-ink">
              {amount}
            </span>
          </div>
        </Card>

        {/* ── Duruma göre son adım ── */}
        {isCancelled ? (
          <ButtonLink href="/panel/kombine-kart/basvuru" size="lg" className="self-start">
            Yeni başvuru <Icon icon={IconArrowRight} size={16} />
          </ButtonLink>
        ) : cardReady && card ? (
          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-chip">
                <Icon icon={IconQr} size={18} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[14.5px] font-semibold">{card.card_number}</span>
                <span className="text-[12.5px] text-muted">
                  {card.valid_until ? `${formatDate(card.valid_until)} tarihine kadar geçerli` : ""}
                </span>
              </div>
            </div>
            <ButtonLink href={`/panel/kombine-kart/${card.id}`} size="md">
              Kartı görüntüle <Icon icon={IconArrowRight} size={15} />
            </ButtonLink>
          </Card>
        ) : isSettled ? (
          <Alert tone="green" title="Ödeme onaylandı">
            Kartınız dijital olarak oluşturuluyor.{" "}
            <Link href="/panel/kombine-kart" className="font-semibold underline">
              Kombine kart
            </Link>{" "}
            sayfasından birkaç saniye içinde görebilirsiniz.
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

            <div className="flex items-center gap-2.5 rounded-[16px] border border-line2 bg-field px-5 py-4">
              <Icon icon={IconCard} size={17} className="shrink-0 text-muted" />
              <span className="text-[13.5px] leading-[1.55] text-ink2">
                Ödeme tamamlandığı an kartınız aktifleşir. Sayfadan ayrılırsanız
                bu başvuruya <strong>Kombine kart</strong> sayfasından geri
                dönebilirsiniz.
              </span>
            </div>

            <PaymentSection
              orderId={o.id}
              orderNumber={o.order_number}
              amount={amount}
              paymentId={p?.id ?? null}
              preferred={p?.payment_method === "bank_transfer" ? "bank" : "card"}
              reviewing={isReviewing}
              bank={bank}
              cardEnabled={payOpts.card_enabled}
            />
          </>
        )}

        <Link href="/panel/kombine-kart"
          className="self-center text-[13.5px] font-semibold text-muted hover:text-ink">
          Kombine kart sayfasına dön
        </Link>
      </div>
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
