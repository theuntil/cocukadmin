import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card, Divider, EmptyState, H3 } from "@/components/ui";
import { PanelBody } from "@/components/panel/shell";
import { CardMockup } from "@/components/panel/card-mockup";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconArrowRight, IconTicket, IconChild, IconQr } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, publicStorageUrl } from "@/lib/utils";
import { getActivePlan } from "@/lib/data";

export const metadata: Metadata = { title: "Kombine Kart", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Kombine kartlar.
 *
 * Kartı olan kullanıcı önce KARTINI görür — başvuru formu sayfayı işgal etmez.
 * Yeni başvuru sağ üstteki "+" ile ayrı bir sayfada açılır.
 */
export default async function Page() {
  const supabase = await createClient();

  const [rowsRes, childrenRes, plan] = await Promise.all([
    supabase.from("v_my_cards_and_orders").select("*")
      .order("order_created_at", { ascending: false }),
    supabase.from("children").select("id").eq("status", "active"),
    getActivePlan(),
  ]);

  const rows = (rowsRes.data ?? []) as unknown as {
    order_id: string; order_number: string; order_status: string;
    amount: number; currency: string; order_created_at: string; is_renewal: boolean;
    child_id: string | null; child_name: string | null; child_photo_path: string | null;
    team_name: string | null; team_logo_path: string | null;
    card_id: string | null; card_number: string | null; card_status: string | null;
    qr_token: string | null;
    lifecycle: string | null; valid_until: string | null; days_left: number | null;
  }[];

  const hasChildren = (childrenRes.data ?? []).length > 0;
  const price = plan ? formatMoney(plan.price, plan.currency) : "—";

  // Kartı olanlar önce, başvuru aşamasındakiler sonra
  /* Her yenileme bir sipariş satırı üretir; aynı kart birden fazla kez
     görünmemeli. En güncel satır bırakılır. */
  const cards = Array.from(
    rows
      .filter((r) => r.card_id)
      .reduce((map, r) => {
        if (!map.has(r.card_id!)) map.set(r.card_id!, r);
        return map;
      }, new Map<string, (typeof rows)[number]>())
      .values(),
  );

  /*
   * Devam eden başvurular = ÖDEMESİ BEKLENEN siparişler.
   *
   * Eskiden "kartı olmayan sipariş" ölçütü kullanılıyordu; yenilemede kart
   * yalnızca son siparişe bağlandığı için tamamlanmış eski yenilemeler de
   * bu listede birikiyor, kullanıcı yeni kart çıkmış sanıyordu.
   */
  const pending = rows.filter((r) =>
    ["pending", "payment_pending"].includes(r.order_status));

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";
  const qrFor = (token: string | null) => token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${
        encodeURIComponent(`${site}/k/${token}`)}`
    : null;

  return (
    <PanelBody>
      <div className="flex flex-col gap-7">

        {/* Başlık + tek bir "+" düğmesi */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
              Kombine kart
            </h1>
            <span className="text-[13.5px] text-muted">
              {cards.length > 0
                ? `${cards.length} kart${pending.length > 0 ? ` · ${pending.length} başvuru sürüyor` : ""}`
                : `Yıllık üyelik ${price} · dijital kart`}
            </span>
          </div>

          <Link href="/panel/kombine-kart/basvuru"
            aria-label="Yeni kombine kart başvurusu"
            className="ct-selected flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90">
            <Icon icon={IconPlus} size={20} />
          </Link>
        </div>

        {/* Süre uyarıları — yenileme kartın kendi sayfasında yapılır */}
        {cards
          .filter((r) => r.lifecycle === "expiring_soon" || r.lifecycle === "expired")
          .map((r) => (
            <Link key={r.card_id} href={`/panel/kombine-kart/${r.card_id}`}
              className="block">
              <Card className={`flex flex-wrap items-center justify-between gap-3 p-5 transition-colors ${
                r.lifecycle === "expired"
                  ? "border-danger bg-danger-soft" : "border-orange-line bg-orange-bg"}`}>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[14.5px] font-semibold">
                    {r.lifecycle === "expired"
                      ? `${r.child_name ?? "Kartınızın"} süresi doldu`
                      : `${r.days_left} gün sonra bitiyor`}
                  </span>
                  <span className="text-[13px] text-ink2">
                    Yenilemek için karta dokunun.
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
                  Yenile <Icon icon={IconArrowRight} size={15} />
                </span>
              </Card>
            </Link>
          ))}

        {/* Kartlar — büyük mockup */}
        {cards.length > 0 && (
          <section className="flex flex-col gap-6">
            {cards.map((r) => (
              <div key={r.card_id} className="flex flex-col gap-4">
                <Link href={`/panel/kombine-kart/${r.card_id}`}
                  className="block transition-transform hover:-translate-y-1">
                  <div className="mx-auto w-full max-w-[560px]">
                    <CardMockup
                      cardNumber={r.card_number ?? ""}
                      childName={r.child_name ?? "—"}
                      childId={r.child_id}
                      childPhoto={r.child_photo_path}
                      teamName={r.team_name}
                      teamLogo={r.team_logo_path}
                      validUntil={r.valid_until}
                      lifecycle={r.lifecycle}
                      qrUrl={qrFor(r.qr_token)}
                    />
                  </div>
                </Link>

                <div className="mx-auto flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                    <Icon icon={IconQr} size={15} />
                    Girişte bu QR okutulur
                  </span>
                  <ButtonLink href={`/panel/kombine-kart/${r.card_id}`} size="md" variant="outline">
                    Kart detayı <Icon icon={IconArrowRight} size={15} />
                  </ButtonLink>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Süren başvurular */}
        {pending.length > 0 && (
          <section className="flex flex-col gap-4">
            <H3 className="text-[18px]">Devam eden başvurular</H3>
            <div className="grid gap-4 sm:grid-cols-2">
              {pending.map((r) => {
                const logo = publicStorageUrl("team-logos", r.team_logo_path);
                return (
                  <Link key={r.order_id} href={`/panel/siparislerim/${r.order_number}`}>
                    <Card className="flex h-full flex-col gap-4 p-5 transition-colors hover:border-accent-line">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-chip">
                            {logo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
                            ) : (
                              <Icon icon={IconTicket} size={17} className="text-muted" />
                            )}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[15px] font-semibold">
                              {r.child_name ?? "—"}
                            </span>
                            <span className="truncate text-[12.5px] text-muted">
                              {r.team_name ?? "—"}
                            </span>
                          </div>
                        </div>
                        {r.is_renewal && <Badge tone="lime">Yenileme</Badge>}
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line2 pt-3">
                        <span className="font-mono text-[12.5px] text-muted">{r.order_number}</span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                          Ödeme <Icon icon={IconArrowRight} size={14} />
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Hiç kaydı yoksa */}
        {rows.length === 0 && (
          <EmptyState
            icon={<Icon icon={hasChildren ? IconTicket : IconChild} size={26} />}
            title={hasChildren ? "Henüz kombine kartınız yok" : "Önce bir çocuk kaydı ekleyin"}
            description={hasChildren
              ? `Yıllık üyelik ${price}. Kart dijitaldir, kargo beklemezsiniz.`
              : "Kart çocuğun adına düzenlenir."}
            action={hasChildren
              ? <ButtonLink href="/panel/kombine-kart/basvuru" size="lg">
                  Başvuru yap <Icon icon={IconArrowRight} size={16} />
                </ButtonLink>
              : <ButtonLink href="/panel/cocuklarim?donus=/panel/kombine-kart" size="lg">
                  Çocuk ekle <Icon icon={IconArrowRight} size={16} />
                </ButtonLink>}
          />
        )}

        <Card className="flex flex-col gap-3 p-6">
          <span className="text-[13px] font-bold tracking-[.1em] text-muted2">BİLGİ</span>
          <p className="text-[14px] leading-[1.65] text-ink2">
            Kart <strong>dijitaldir</strong>; fiziksel kart gönderilmez. Etkinlik girişlerinde
            kartın ortasındaki QR kodu okutmanız yeterlidir. Üyelik 12 ay geçerlidir ve
            otomatik yenilenmez. Süre bitimine 60 gün kala yenileyebilirsiniz; kalan
            süreniz kaybolmaz.
          </p>
          <Divider />
          <p className="text-[13.5px] text-muted">
            <Link href="/mesafeli-satis"
              className="font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
              Mesafeli satış sözleşmesi
            </Link>{" · "}
            <Link href="/iptal-iade"
              className="font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
              İptal ve iade
            </Link>
          </p>
        </Card>
      </div>
    </PanelBody>
  );
}
