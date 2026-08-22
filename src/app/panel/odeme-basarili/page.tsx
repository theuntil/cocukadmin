import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Container } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconCard, IconClock, IconAlert } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { verifyAndFinalizePayment } from "@/lib/actions/payment";
import { PaymentWatcher } from "@/components/panel/payment-watcher";

export const metadata: Metadata = { title: "Ödeme tamamlandı", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Ödeme dönüş sayfası — panelin içinde.
 *
 * Ödeme onayı normalde webhook ile gelir. Ancak webhook gecikirse kullanıcı
 * ödemesini yapmış olmasına rağmen kartını göremez. Bu yüzden sayfa açılırken
 * ödeme durumu Stripe'a doğrudan sorulur ve gerekirse kart burada oluşturulur.
 * Webhook sonradan gelse bile ikinci kez işlenmez.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ siparis?: string; redirect_status?: string }>;
}) {
  const { siparis, redirect_status } = await searchParams;

  const supabase = await createClient();

  // Sipariş numarasından kimliği bul
  const { data: orderRow } = siparis
    ? await supabase.from("orders")
        .select("id, order_number, is_renewal, status, child_id, team_id")
        .eq("order_number", siparis).maybeSingle()
    : { data: null };

  const order = orderRow as {
    id: string; order_number: string; is_renewal: boolean;
    status: string; child_id: string | null; team_id: string | null;
  } | null;

  // Ödemeyi doğrula ve gerekirse tamamla
  let finalize: { ok: boolean; status: string; paid: boolean } | null = null;
  if (order && redirect_status !== "failed") {
    finalize = await verifyAndFinalizePayment(order.id);
  }

  const { data } = order
    ? await supabase.from("v_my_cards_and_orders").select("*")
        .eq("order_number", order.order_number).maybeSingle()
    : { data: null };

  let row = data as {
    order_number: string; order_status: string;
    card_id: string | null; card_number: string | null;
    child_name: string | null; child_id?: string | null;
    valid_until?: string | null;
  } | null;

  /*
   * Yenilemede kart yeniden basılmaz; eski kart uzatılır. Kart kaydı bu
   * siparişe bağlanmamışsa (eski veriler) çocuğun aktif kartı aranır.
   * Aksi hâlde kart hazır olduğu hâlde "hazırlanıyor" denirdi.
   */
  if (order?.child_id && (!row || !row.card_id)) {
    const { data: fallbackCard } = await supabase
      .from("cards")
      .select("id, card_number, valid_until, status")
      .eq("child_id", order.child_id)
      .neq("status", "cancelled")
      .order("valid_until", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fc = fallbackCard as {
      id: string; card_number: string; valid_until: string; status: string;
    } | null;

    if (fc && fc.status === "active") {
      row = {
        order_number: order.order_number,
        order_status: order.status,
        card_id: fc.id,
        card_number: fc.card_number,
        child_name: row?.child_name ?? null,
        child_id: order.child_id,
        valid_until: fc.valid_until,
      };
    }
  }

  const cardReady = Boolean(row?.card_id);

  /* Hata ekranı YALNIZCA ödeme gerçekten alınmadıysa gösterilir.
     Para alındıysa ama kart henüz oluşmadıysa "hazırlanıyor" denir —
     "ödeme tamamlanamadı" demek yanlış ve endişe verici olurdu. */
  const paid = cardReady
    || row?.order_status === "completed"
    || finalize?.paid === true;

  const failed = !paid && (
    redirect_status === "failed"
    || (finalize !== null && !finalize.ok && finalize.status !== "processing")
  );

  if (failed && !cardReady) {
    return (
      <Container className="!max-w-[560px] px-0 py-6">
        <Card className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Icon icon={IconAlert} size={28} />
          </span>
          <h1 className="font-display text-[24px] font-semibold tracking-[-.03em]">
            Ödeme tamamlanamadı
          </h1>
          <p className="text-[14.5px] leading-[1.65] text-ink2">
            İşlem onaylanmadı. Kartınızdan para çekilmediyse tekrar
            deneyebilirsiniz; çekildiyse birkaç dakika içinde iade edilir.
          </p>
          {siparis && (
            <ButtonLink href={`/panel/siparislerim/${siparis}`} size="lg">
              Siparişe dön
            </ButtonLink>
          )}
        </Card>
      </Container>
    );
  }

  return (
    <Container className="!max-w-[560px] px-0 py-6">
      <Card className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-soft text-green">
          <Icon icon={IconCheck} size={30} />
        </span>

        <h1 className="font-display text-[24px] font-semibold tracking-[-.03em]">
          {cardReady
            ? (order?.is_renewal ? "Kartınız yenilendi" : "Kartınız hazır")
            : "Ödemeniz alındı"}
        </h1>

        {cardReady ? (
          <>
            <p className="text-[14.5px] leading-[1.65] text-ink2">
              {order?.is_renewal ? (
                <>
                  Üyeliğiniz bir yıl uzatıldı. Kart numaranız ve QR kodunuz
                  aynı kaldı; etkinliklere katılım kaldığı yerden devam eder.
                </>
              ) : (
                <>
                  {row?.child_name ? `${row.child_name} için ` : ""}kombine
                  kart oluşturuldu ve kullanıma hazır.
                </>
              )}
            </p>

            {row?.valid_until && (
              <div className="flex w-full items-center justify-between gap-3 rounded-[14px] bg-green-soft px-5 py-3.5">
                <span className="text-[13px] text-ink2">Geçerlilik</span>
                <span className="text-[14px] font-semibold">
                  {new Date(row.valid_until).toLocaleDateString("tr-TR")}
                  {" tarihine kadar"}
                </span>
              </div>
            )}

            <div className="flex w-full flex-col gap-1.5 rounded-[14px] bg-field px-5 py-4">
              <span className="text-[12.5px] text-muted">Kart numarası</span>
              <span className="font-mono text-[16px] font-semibold">
                {row?.card_number}
              </span>
            </div>

            <ButtonLink href={`/panel/kombine-kart/${row?.card_id}`} size="lg">
              <Icon icon={IconCard} size={17} /> Kartı görüntüle
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="text-[14.5px] leading-[1.65] text-ink2">
              Kartınız birkaç saniye içinde hazır olacak.
            </p>

            {/* Kart hazır olana kadar arka planda kontrol eder ve
                sayfayı kendiliğinden tazeler */}
            {order && <PaymentWatcher orderId={order.id} />}

            <ButtonLink href="/panel/kombine-kart" size="lg">
              Kombine kartlarım
            </ButtonLink>
          </>
        )}

        {siparis && (
          <Link href={`/panel/siparislerim/${siparis}`}
            className="text-[13.5px] font-semibold text-muted hover:text-ink">
            Sipariş detayı ({siparis})
          </Link>
        )}
      </Card>
    </Container>
  );
}
