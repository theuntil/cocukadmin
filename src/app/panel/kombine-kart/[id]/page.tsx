import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, ButtonLink, Card, Divider, H3 } from "@/components/ui";
import { PanelBody } from "@/components/panel/shell";
import { Icon } from "@/components/ui/icon";
import {
  IconArrowLeft, IconTicket, IconCalendar, IconLocation,
  IconCheck, IconQr, IconOrder,
} from "@/components/ui/icons";
import { CardMockup } from "@/components/panel/card-mockup";
import { RenewCard } from "@/components/panel/renew-card";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate, formatMoney, ORDER_STATUS_TR, CARD_STATUS_TR, statusTone,
} from "@/lib/utils";
import { getActivePlan, getBankInfo, getPaymentOptions } from "@/lib/data";

export const metadata: Metadata = { title: "Kart detayı", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Başvuru/kart aşamaları */
const STAGES = [
  { key: "received",  label: "Başvuru alındı" },
  { key: "payment",   label: "Ödeme bekleniyor" },
  { key: "paid",      label: "Ödeme tamamlandı" },
  { key: "producing", label: "Kart hazırlanıyor" },
  { key: "active",    label: "Kart aktif" },
];

function stageIndex(orderStatus: string, lifecycle: string | null): number {
  if (["cancelled", "refunded"].includes(orderStatus)) return -1;
  if (["active", "expiring_soon", "expired"].includes(lifecycle ?? "")) return 4;
  if (lifecycle === "preparing") return 3;
  if (["paid", "processing", "completed"].includes(orderStatus)) return 2;
  if (orderStatus === "awaiting_payment") return 1;
  return 0;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Bağlantı hem kart hem sipariş kimliğiyle gelebilir; ikisi de desteklenir
  const [{ data }, plan, bank, payOpts] = await Promise.all([
    /* Kart birden fazla siparişte görünebilir (her yenileme bir sipariş).
       maybeSingle çoklu satırda hata verip 404'e düşürüyordu; en güncel
       satır alınır. */
    supabase.from("v_my_cards_and_orders").select("*")
      .or(`card_id.eq.${id},order_id.eq.${id}`)
      .order("order_created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getActivePlan(),
    getBankInfo(),
    getPaymentOptions(),
  ]);

  /* Görünümde bulunamadıysa (kartın ödenmiş siparişi yok, kart iptal
     edilmiş ya da veri onarımından geçmiş) doğrudan kart tablosuna bakılır.
     Kullanıcı kendi kartına her hâlükârda erişebilmeli; 404 görmemeli. */
  let row0 = data as Record<string, unknown> | null;

  if (!row0) {
    const { data: direct } = await supabase
      .from("v_my_cards_and_orders").select("*")
      .eq("child_id", (
        await supabase.from("cards").select("child_id").eq("id", id).maybeSingle()
      ).data?.child_id ?? "00000000-0000-0000-0000-000000000000")
      .order("order_created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    row0 = direct as Record<string, unknown> | null;
  }

  if (!row0) notFound();

  const price = plan ? formatMoney(plan.price, plan.currency) : "—";

  const r = row0 as unknown as {
    order_id: string; order_number: string; order_status: string;
    amount: number; currency: string; order_created_at: string; is_renewal: boolean;
    child_id: string | null; child_name: string | null; child_photo_path: string | null;
    team_name: string | null; team_logo_path: string | null;
    card_id: string | null; card_number: string | null; card_status: string | null;
    qr_token: string | null;
    lifecycle: string | null; valid_until: string | null; valid_from: string | null;
    days_left: number | null;
  };

  // Kartla katılınan etkinlikler
  const { data: eventsData } = r.card_id
    ? await supabase.rpc("card_events", { p_card_id: r.card_id })
    : { data: null };

  const events = (eventsData ?? []) as {
    registration_id: string; event_id: string; title: string; slug: string;
    starts_at: string; ends_at: string | null; city_name: string | null;
    venue_name: string | null; status: string; attended: boolean;
  }[];

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";
  const qrUrl = r.qr_token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=0&data=${
        encodeURIComponent(`${site}/k/${r.qr_token}`)}`
    : null;

  const current = stageIndex(r.order_status, r.lifecycle);

  /* Yenileme kutusu: süresi dolduysa ya da bitmesine 30 günden az kaldıysa.
     Erken yenilemede kalan süre kaybolmaz, üzerine eklenir. */
  const needsRenewal = ["expired", "expiring_soon"].includes(r.lifecycle ?? "");
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);

  return (
    <PanelBody>
      <div className="flex flex-col gap-7">
        <Link href="/panel/kombine-kart"
          className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Kombine kart
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[26px] font-semibold tracking-[-.03em]">
                {r.child_name ?? "Kart"}
              </h1>
              {r.is_renewal && <Badge tone="lime">Yenileme</Badge>}
              {r.card_status && (
                <Badge tone={r.lifecycle === "expired" ? "danger"
                  : r.lifecycle === "expiring_soon" ? "orange" : "green"}>
                  {CARD_STATUS_TR[r.card_status] ?? r.card_status}
                </Badge>
              )}
            </div>
            <span className="text-[13.5px] text-muted">
              {r.team_name ?? "—"} · {r.order_number}
            </span>
          </div>

          {r.days_left !== null && r.lifecycle !== "expired" && (
            <div className="flex flex-col items-end">
              <span className="font-display text-[26px] font-semibold tracking-[-.02em]">
                {r.days_left}
              </span>
              <span className="text-[12.5px] text-muted">gün kaldı</span>
            </div>
          )}
        </div>

        {/* Kart görseli — QR ortada, çocuğun fotoğrafı sağ altta */}
        {r.card_id && (
          <div className="mx-auto w-full max-w-[600px]">
            <CardMockup
              cardNumber={r.card_number ?? ""}
              childName={r.child_name ?? "—"}
              childId={r.child_id}
              childPhoto={r.child_photo_path}
              teamName={r.team_name}
              teamLogo={r.team_logo_path}
              validUntil={r.valid_until}
              lifecycle={r.lifecycle}
              qrUrl={qrUrl}
            />
          </div>
        )}

        {/* Yenileme — kartın HEMEN ALTINDA.
            Süresi dolduysa ya da 30 günden az kaldıysa görünür; kullanıcı
            başka ekrana gitmeden, sipariş numarası aramadan yeniler. */}
        {r.card_id && needsRenewal && (
          <div className="mx-auto w-full max-w-[600px]">
            <RenewCard
              cardId={r.card_id}
              cardNumber={r.card_number ?? ""}
              childName={r.child_name ?? "Çocuğunuz"}
              price={price}
              expired={r.lifecycle === "expired"}
              bank={bank}
              cardEnabled={payOpts.card_enabled}
              bankEnabled={payOpts.iban_enabled}
            />
          </div>
        )}

        {r.card_id && qrUrl && (
          <div className="mx-auto flex max-w-[600px] items-start gap-3 rounded-[14px] bg-chip px-5 py-4">
            <Icon icon={IconQr} size={17} className="mt-[2px] shrink-0 text-muted" />
            <span className="text-[13px] leading-[1.55] text-ink2">
              Etkinlik girişinde kartın ortasındaki QR kodu okutun. QR&apos;da kart
              numarası taşınmaz; kaybolursa panelinizden yenileyebilirsiniz.
            </span>
          </div>
        )}

        {/* Aşama göstergesi — kart henüz yoksa */}
        {!r.card_id && (
          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">Durum</H3>
            <div className="flex gap-2">
              {STAGES.map((s, i) => (
                <div key={s.key} className="flex flex-1 flex-col gap-2">
                  <span className={`h-1.5 rounded-full transition-colors ${
                    i <= current ? "bg-accent" : "bg-line"}`} />
                  <span className={`text-[11.5px] leading-tight ${
                    i <= current ? "font-semibold text-ink" : "text-muted2"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
            <Divider />
            <ButtonLink href={`/panel/siparislerim/${r.order_number}`} size="md" variant="outline"
              className="self-start">
              <Icon icon={IconOrder} size={15} /> Sipariş detayı
            </ButtonLink>
          </Card>
        )}

        {/* Kart bilgileri */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-3.5 p-6">
            <H3 className="text-[18px]">Kart bilgileri</H3>
            <Divider />
            <Row label="Kart numarası" value={r.card_number ?? "Henüz oluşturulmadı"} mono />
            <Row label="Geçerlilik" value={r.valid_from && r.valid_until
              ? `${formatDate(r.valid_from)} — ${formatDate(r.valid_until)}` : "—"} />
            <Row label="Takım" value={r.team_name ?? "—"} />
          </Card>

          <Card className="flex flex-col gap-3.5 p-6">
            <H3 className="text-[18px]">Sipariş</H3>
            <Divider />
            <Row label="Sipariş no" value={r.order_number} mono />
            <Row label="Tarih" value={formatDate(r.order_created_at)} />
            <Row label="Tutar" value={formatMoney(r.amount, r.currency)} />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-muted">Durum</span>
              <Badge tone={statusTone(r.order_status)}>
                {ORDER_STATUS_TR[r.order_status] ?? r.order_status}
              </Badge>
            </div>
            <ButtonLink href={`/panel/siparislerim/${r.order_number}`} size="sm" variant="outline"
              className="mt-1 self-start">
              Sipariş detayı
            </ButtonLink>
          </Card>
        </div>

        {/* Bu kartla katılınan etkinlikler */}
        {r.card_id && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Icon icon={IconTicket} size={18} className="text-muted" />
              <H3 className="text-[18px]">Bu kartla katıldığınız etkinlikler</H3>
            </div>

            {events.length === 0 ? (
              <Card className="flex flex-col gap-2 p-6">
                <span className="text-[14.5px] font-semibold">Henüz etkinlik yok</span>
                <p className="text-[13.5px] leading-[1.6] text-ink2">
                  Kartınızla katılabileceğiniz etkinlikleri görüntüleyin.
                </p>
                <ButtonLink href="/etkinlikler" size="md" variant="outline" className="mt-2 self-start">
                  Etkinlikler
                </ButtonLink>
              </Card>
            ) : (
              <div className="flex flex-col gap-5">
                {upcoming.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[12px] font-bold tracking-[.1em] text-muted2">
                      YAKLAŞAN
                    </span>
                    {upcoming.map((e) => <EventRow key={e.registration_id} event={e} />)}
                  </div>
                )}

                {past.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[12px] font-bold tracking-[.1em] text-muted2">
                      GEÇMİŞ ({past.length})
                    </span>
                    {past.slice(0, 10).map((e) => <EventRow key={e.registration_id} event={e} past />)}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </PanelBody>
  );
}

function EventRow({
  event, past,
}: {
  event: {
    event_id: string; title: string; slug: string; starts_at: string;
    city_name: string | null; venue_name: string | null;
    status: string; attended: boolean;
  };
  past?: boolean;
}) {
  return (
    <Link href={`/etkinlikler/${event.slug}`}>
      <Card className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-accent-line ${
        past ? "opacity-75" : ""}`}>
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-chip">
            <Icon icon={IconCalendar} size={17} className="text-muted" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14.5px] font-semibold">{event.title}</span>
            <span className="inline-flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
              {formatDate(event.starts_at, true)}
              {(event.city_name || event.venue_name) && (
                <span className="inline-flex items-center gap-1">
                  <Icon icon={IconLocation} size={12} />
                  {[event.venue_name, event.city_name].filter(Boolean).join(", ")}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {event.attended && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-[12px] font-semibold text-green">
              <Icon icon={IconCheck} size={12} /> Katıldı
            </span>
          )}
          <Badge tone={event.status === "confirmed" ? "green"
            : event.status === "waitlisted" ? "orange" : "muted"}>
            {event.status === "confirmed" ? "Kayıtlı"
              : event.status === "waitlisted" ? "Sırada"
              : event.status === "cancelled" ? "İptal" : event.status}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`text-right text-[14px] font-semibold ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
