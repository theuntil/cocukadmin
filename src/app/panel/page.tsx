import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, H3 } from "@/components/ui";
import { PanelBody } from "@/components/panel/shell";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import {
  IconChild, IconCard, IconOrder, IconCalendar, IconArrowRight,
  IconTicket, IconAlert, IconBook, IconStar, IconSignature, IconHeart,
} from "@/components/ui/icons";
import { HScroll } from "@/components/panel/hscroll";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getEvents, getNews, getActivities } from "@/lib/data";
import {
  formatDate, formatMoney, CARD_STATUS_TR, calcAge, publicStorageUrl, EVENT_TYPE_TR,
} from "@/lib/utils";
import { ChildPhoto } from "@/components/panel/child-photo";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

/**
 * Kullanıcı panelinin ana ekranı.
 *
 * İstatistik tablosu değil, keşif ekranı: önce kişinin kendi durumu
 * (kart, yaklaşan etkinlik), sonra katılabileceği etkinlikler ve okuyabileceği
 * içerikler yatay şeritler hâlinde gelir.
 */
export default async function PanelHome() {
  const supabase = await createClient();

  const [profile, children, cards, orders, registrations, events, news, activities] =
    await Promise.all([
      getMyProfile(),
      supabase.from("children").select("*").eq("status", "active").order("birth_date"),
      supabase.from("v_my_cards").select("*").order("valid_until", { ascending: false }).limit(4),
      supabase.from("orders").select("*, teams(name)").order("created_at", { ascending: false }).limit(3),
      supabase.from("v_my_event_registrations").select("*")
        .in("status", ["confirmed", "waitlisted"])
        .gte("starts_at", new Date().toISOString())
        .order("starts_at").limit(4),
      getEvents({ limit: 8 }),
      getNews(6),
      getActivities(6),
    ]);

  const kids = (children.data ?? []) as { id: string; first_name: string; last_name: string;
    birth_date: string; photo_path: string | null }[];
  const myCards = (cards.data ?? []) as { id: string; card_number: string; status: string;
    valid_until: string | null; child_name: string | null; lifecycle: string | null;
    days_left: number | null }[];
  const myOrders = (orders.data ?? []) as { id: string; order_number: string; status: string;
    amount: number; created_at: string }[];
  const myEvents = (registrations.data ?? []) as { id: string; event_id: string; title: string;
    starts_at: string; city_name: string | null; status: string }[];

  // getNews sayfalama için { rows, count } döner
  const newsRows = Array.isArray(news) ? news : news.rows;

  const prof = profile as {
    id?: string; first_name?: string | null; avatar_path?: string | null;
  } | null;
  const firstName = prof?.first_name ?? "";
  const expiring = myCards.find((c) => c.lifecycle === "expiring_soon" || c.lifecycle === "expired");

  const hour = new Date().getHours();
  const greeting = hour < 6 ? "İyi geceler" : hour < 12 ? "Günaydın"
    : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <PanelBody>
      <div className="flex flex-col gap-10">

        {/* ── Karşılama ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={firstName || "Üye"} path={prof?.avatar_path}
              userId={prof?.id} size="lg" />
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-muted">{greeting}</span>
              <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-.03em] sm:text-[30px]">
                {firstName || "Hoş geldiniz"}
              </h1>
            </div>
          </div>

          <ButtonLink href="/panel/cocuklarim" variant="outline" size="md">
            <Icon icon={IconChild} size={16} /> Çocuklarım
          </ButtonLink>
        </div>

        {/* ── Süre uyarısı ── */}
        {expiring && (
          <Card className={`flex flex-wrap items-center justify-between gap-4 p-5 ${
            expiring.lifecycle === "expired"
              ? "border-danger bg-danger-soft" : "border-orange-line bg-orange-bg"}`}>
            <div className="flex items-center gap-3.5">
              <Icon icon={IconAlert} size={20}
                className={expiring.lifecycle === "expired" ? "text-danger" : "text-orange-ink"} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold">
                  {expiring.lifecycle === "expired"
                    ? `${expiring.child_name ?? "Kartınızın"} üyeliği sona erdi`
                    : `${expiring.days_left} gün sonra üyelik bitiyor`}
                </span>
                <span className="text-[13px] text-ink2">
                  Yenilerseniz kalan süreniz kaybolmaz, üzerine eklenir.
                </span>
              </div>
            </div>
            <ButtonLink href={`/panel/kombine-kart/${expiring.id}`} size="md">
              Yenile
            </ButtonLink>
          </Card>
        )}

        {/* ── Kartlarım ── */}
        <Section title="Kombine kartlarım" href="/panel/kombine-kart"
          icon={IconCard} empty={myCards.length === 0}
          emptyNode={
            <EmptyState icon={<Icon icon={IconCard} size={26} />}
              title="Henüz kombine kartınız yok"
              description="Çocuğunuz için dijital kombine kart alın, etkinliklere katılın."
              action={<ButtonLink href="/panel/kombine-kart/basvuru">Kombine kart al</ButtonLink>} />
          }>
          <HScroll>
            {myCards.map((c) => (
              <Link key={c.id} href={`/panel/kombine-kart/${c.id}`}
                className="w-[280px] shrink-0 snap-start">
                <MiniCard card={c} />
              </Link>
            ))}
          </HScroll>
        </Section>

        {/* ── Çocuklarım ── */}
        {kids.length > 0 && (
          <Section title="Çocuklarım" href="/panel/cocuklarim" icon={IconChild}>
            <HScroll>
              {kids.map((k) => (
                <Link key={k.id} href="/panel/cocuklarim"
                  className="w-[170px] shrink-0 snap-start">
                  <Card className="flex flex-col items-center gap-3 p-5 text-center transition-colors hover:border-accent-line">
                    <ChildPhoto childId={k.id} name={`${k.first_name} ${k.last_name}`}
                      hasPhoto={Boolean(k.photo_path)} rounded="lg"
                      className="h-16 w-16 text-[19px]" />
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate text-[14px] font-semibold">{k.first_name}</span>
                      <span className="text-[12.5px] text-muted">{calcAge(k.birth_date)} yaş</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </HScroll>
          </Section>
        )}

        {/* ── Yaklaşan kayıtlarım ── */}
        {myEvents.length > 0 && (
          <Section title="Yaklaşan etkinliklerim" href="/panel/etkinliklerim" icon={IconTicket}>
            <HScroll>
              {myEvents.map((e) => (
                <Link key={e.id} href={`/etkinlikler/${e.event_id}`}
                  className="w-[260px] shrink-0 snap-start">
                  <Card className="flex h-full flex-col gap-2.5 p-5 transition-colors hover:border-accent-line">
                    <Badge tone={e.status === "confirmed" ? "green" : "orange"}>
                      {e.status === "confirmed" ? "Kayıtlı" : "Sırada"}
                    </Badge>
                    <span className="line-clamp-2 text-[15px] font-semibold leading-[1.35]">
                      {e.title}
                    </span>
                    <span className="mt-auto text-[12.5px] text-muted">
                      {formatDate(e.starts_at, true)}
                      {e.city_name ? ` · ${e.city_name}` : ""}
                    </span>
                  </Card>
                </Link>
              ))}
            </HScroll>
          </Section>
        )}

        {/* ── Keşfet: etkinlikler ── */}
        {events.length > 0 && (
          <Section title="Katılabileceğiniz etkinlikler" href="/etkinlikler" icon={IconCalendar}>
            <HScroll>
              {events.map((e) => (
                <Link key={e.id} href={`/etkinlikler/${e.slug}`}
                  className="w-[280px] shrink-0 snap-start">
                  <Card className="flex h-full flex-col gap-2.5 p-5 transition-colors hover:border-accent-line">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-chip">
                      <Icon icon={IconCalendar} size={18} />
                    </span>
                    {e.event_type && (
                      <span className="text-[11px] font-bold tracking-[.1em] text-accent-ink">
                        {(EVENT_TYPE_TR[e.event_type] ?? e.event_type).toLocaleUpperCase("tr-TR")}
                      </span>
                    )}
                    <span className="line-clamp-2 text-[14.5px] font-semibold leading-[1.35]">
                      {e.title}
                    </span>
                    <span className="mt-auto text-[12.5px] text-muted">
                      {formatDate(e.starts_at)}
                      {e.city_name ? ` · ${e.city_name}` : ""}
                    </span>
                  </Card>
                </Link>
              ))}
            </HScroll>
          </Section>
        )}

        {/* ── Keşfet: yaptıklarımız ── */}
        {activities.length > 0 && (
          <Section title="Bizden Haberler" href="/yaptiklarimiz" icon={IconStar}>
            <HScroll>
              {activities.map((a) => {
                const cover = publicStorageUrl("galeri", a.cover_path);
                return (
                  <Link key={a.id} href={`/yaptiklarimiz/${a.slug}`}
                    className="w-[280px] shrink-0 snap-start">
                    <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-accent-line">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" loading="lazy"
                          className="aspect-[16/10] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center bg-chip">
                          <Icon icon={IconStar} size={22} className="text-muted2" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <span className="line-clamp-2 text-[14.5px] font-semibold leading-[1.35]">
                          {a.title}
                        </span>
                        {a.summary && (
                          <p className="line-clamp-2 text-[12.5px] leading-[1.5] text-muted">
                            {a.summary}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </HScroll>
          </Section>
        )}

        {/* ── Keşfet: blog ── */}
        {newsRows.length > 0 && (
          <Section title="Blogdan" href="/blog" icon={IconBook}>
            <HScroll>
              {newsRows.map((n) => {
                const cover = publicStorageUrl(n.image_bucket ?? "news-media", n.image_path ?? null);
                return (
                  <Link key={n.id} href={`/blog/${n.slug}`}
                    className="w-[280px] shrink-0 snap-start">
                    <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-accent-line">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" loading="lazy"
                          className="aspect-[16/10] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center bg-chip">
                          <Icon icon={IconBook} size={22} className="text-muted2" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <span className="line-clamp-2 text-[14.5px] font-semibold leading-[1.35]">
                          {n.title}
                        </span>
                        <span className="mt-auto text-[12.5px] text-muted">
                          {n.published_at ? formatDate(n.published_at) : ""}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </HScroll>
          </Section>
        )}

        {/* ── Son siparişler ── */}
        {myOrders.length > 0 && (
          <Section title="Son siparişlerim" href="/panel/siparislerim" icon={IconOrder}>
            <div className="flex flex-col gap-2.5">
              {/* Rota sipariş NUMARASI bekliyor; kimlik gönderilince 404 oluyordu */}
              {myOrders.map((o) => (
                <Link key={o.id} href={`/panel/siparislerim/${o.order_number}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-accent-line">
                    <span className="font-mono text-[13.5px] font-semibold">{o.order_number}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[12.5px] text-muted">{formatDate(o.created_at)}</span>
                      <span className="text-[14px] font-semibold">{formatMoney(o.amount)}</span>
                      <Icon icon={IconArrowRight} size={15} className="text-muted" />
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ── Kısayollar ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Shortcut href="/imza-kampanyasi" icon={IconSignature}
            title="İmza kampanyası" text="Çocuklar tribünde olsun" />
          <Shortcut href="/destekcilerimiz" icon={IconHeart}
            title="Destekçilerimiz" text="Bize destek veren kurumlar" />
          <Shortcut href="/panel/ayarlar" icon={IconAlert}
            title="Hesap ayarları" text="Bilgilerinizi güncelleyin" />
        </div>
      </div>
    </PanelBody>
  );
}

/* ── Bölüm başlığı ── */
function Section({
  title, href, icon, children, empty, emptyNode,
}: {
  title: string; href: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  children: React.ReactNode; empty?: boolean; emptyNode?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Icon icon={icon} size={18} className="text-muted" />
          <H3 className="text-[18px]">{title}</H3>
        </div>
        <Link href={href}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          Tümü <Icon icon={IconArrowRight} size={14} />
        </Link>
      </div>
      {empty ? emptyNode : children}
    </section>
  );
}

/* ── Kart özeti ── */
function MiniCard({ card }: {
  card: { card_number: string; status: string; valid_until: string | null;
          child_name: string | null; lifecycle: string | null; days_left: number | null };
}) {
  const expired = card.lifecycle === "expired";

  return (
    <div
      className={`flex flex-col justify-between gap-5 rounded-[20px] p-5 text-white transition-transform hover:-translate-y-1 ${
        expired ? "grayscale" : ""}`}
      style={{
        aspectRatio: "1.586 / 1",
        background: "linear-gradient(140deg, #14352A 0%, #1D4936 55%, #245B41 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold tracking-[.18em] text-white/55">
          ÇOCUK TRİBÜNÜ
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
          expired ? "bg-white/20 text-white"
            : card.lifecycle === "expiring_soon" ? "bg-[#E8A33D] text-[#2A1A02]"
            : "bg-[#C6F24E] text-[#16301F]"}`}>
          {expired ? "SÜRESİ DOLDU"
            : card.lifecycle === "expiring_soon" ? `${card.days_left} GÜN`
            : (CARD_STATUS_TR[card.status] ?? card.status).toLocaleUpperCase("tr-TR")}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="truncate font-display text-[17px] font-semibold tracking-[-.02em]">
          {card.child_name ?? "—"}
        </span>
        <span className="font-mono text-[12px] tracking-[.1em] text-white/65">
          {card.card_number}
        </span>
        <span className="text-[11.5px] text-white/55">
          {card.valid_until ? `${formatDate(card.valid_until)} tarihine kadar` : ""}
        </span>
      </div>
    </div>
  );
}

/* ── Kısayol kutusu ── */
function Shortcut({
  href, icon, title, text,
}: {
  href: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  title: string; text: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex h-full items-center gap-3.5 p-5 transition-colors hover:border-accent-line">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-chip">
          <Icon icon={icon} size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold">{title}</span>
          <span className="truncate text-[12.5px] text-muted">{text}</span>
        </div>
      </Card>
    </Link>
  );
}
