import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, ButtonLink, Card, Container, Divider, Eyebrow, H2, Lead, Section } from "@/components/ui";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconCalendar, IconLocation, IconUsers, IconTicket, IconClock, IconMap, IconAlert } from "@/components/ui/icons";
import { EventRegistration } from "@/components/site/event-registration";
import { getEventBySlug, getEventSlugs, getCurrentUser, getProfileCompletion } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateLong, formatDate, EVENT_TYPE_TR, formatMoney, publicStorageUrl,
} from "@/lib/utils";
import type { ChildEligibility } from "@/lib/types";

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export async function generateStaticParams() {
  const slugs = await getEventSlugs(50);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEventBySlug(slug);
  if (!e) return { title: "Etkinlik bulunamadı" };
  return {
    title: e.title,
    description: e.short_description ?? undefined,
    alternates: { canonical: `/etkinlikler/${e.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await getCurrentUser();

  // Kart şartı olan etkinliklerde hangi çocuğun katılabileceğini DB hesaplar
  let eligibility: ChildEligibility[] = [];
  let profileComplete = true;
  if (user) {
    const completion = await getProfileCompletion();
    profileComplete = completion?.complete ?? true;
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("my_children_for_event", { p_event_id: event.id });
      eligibility = (data ?? []) as unknown as ChildEligibility[];
    } catch { /* sessizce geç */ }
  }

  const mapsUrl =
    event.latitude && event.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
      : event.venue_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address)}`
        : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venue_name ?? event.city_name ?? "Belirlenecek",
      address: event.venue_address ?? event.city_name ?? "",
    },
    description: event.short_description ?? "",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="border-b border-line2 bg-[radial-gradient(120%_90%_at_8%_0%,var(--surface)_0%,var(--page)_46%,var(--page)_100%)]">
        <Container className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="ct-rise flex max-w-[780px] flex-col gap-5">
            <Link href="/etkinlikler" className="text-[13.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">← Tüm etkinlikler</Link>
            <div className="flex flex-wrap gap-2">
              <Badge tone="muted">{EVENT_TYPE_TR[event.event_type] ?? "Etkinlik"}</Badge>
              {event.requires_card && (
                <Badge tone="orange"><Icon icon={IconTicket} size={13} />
                  {event.required_team_name ? `${event.required_team_name} kart sahiplerine özel` : "Kart sahiplerine özel"}
                </Badge>
              )}
              {event.is_live && <Badge tone="green">Şu anda sürüyor</Badge>}
            </div>
            <h1 className="font-display text-[34px] leading-[1.05] font-semibold tracking-[-.035em] sm:text-[46px]">
              {event.title}
            </h1>
            {event.short_description && <Lead>{event.short_description}</Lead>}

            {/* Kapak görseli — yönetim panelinden yüklenir */}
            {publicStorageUrl("event-media", event.cover_path) && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={publicStorageUrl("event-media", event.cover_path)!} alt=""
                className="mt-6 w-full rounded-[22px] object-cover"
                style={{ maxHeight: 420 }} />
            )}
          </div>
        </Container>
      </div>

      <Section className="!pt-10">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-14">
            <div className="flex flex-col gap-8">
              <Reveal>
                <Card className="grid gap-5 p-6 sm:grid-cols-2">
                  <Info icon={IconCalendar} label="TARİH" value={formatDateLong(event.starts_at)} />
                  <Info icon={IconClock} label="SAAT"
                    value={`${formatDate(event.starts_at, true).split(" ")[1] ?? ""}${event.ends_at ? ` – ${formatDate(event.ends_at, true).split(" ")[1]}` : ""}`} />
                  <Info icon={IconLocation} label="YER"
                    value={[event.venue_name, event.city_name].filter(Boolean).join(", ") || "Açıklanacak"} />
                  {event.capacity && (
                    <Info icon={IconUsers} label="KONTENJAN"
                      value={`${event.registered_count} / ${event.capacity} · ${event.seats_left} yer kaldı`} />
                  )}
                  {(event.min_age || event.max_age) && (
                    <Info icon={IconUsers} label="YAŞ ARALIĞI"
                      value={`${event.min_age ?? 0} – ${event.max_age ?? 18} yaş`} />
                  )}
                  {event.fee > 0 && <Info icon={IconTicket} label="KATILIM ÜCRETİ" value={formatMoney(event.fee, event.currency)} />}
                </Card>
              </Reveal>

              {event.description && (
                <Reveal delay={70} className="flex flex-col gap-3">
                  <Eyebrow className="text-accent-ink">ETKİNLİK HAKKINDA</Eyebrow>
                  <div className="whitespace-pre-line text-[15.5px] leading-[1.75] text-ink2">{event.description}</div>
                </Reveal>
              )}

              {event.venue_address && (
                <Reveal delay={90}>
                  <Card className="flex flex-col gap-3 p-6">
                    <span className="flex items-center gap-2 text-[13px] font-bold tracking-[.1em] text-muted2">
                      <Icon icon={IconMap} size={16} /> ADRES
                    </span>
                    <p className="text-[15px] leading-[1.6] text-ink2">{event.venue_address}</p>
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="self-start text-[14px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">
                        Haritada aç →
                      </a>
                    )}
                  </Card>
                </Reveal>
              )}

              {event.guardian_required && (
                <Reveal delay={100}>
                  <div className="flex gap-3 rounded-[18px] border border-orange-line bg-orange-bg p-5">
                    <Icon icon={IconAlert} size={19} className="mt-[2px] shrink-0 text-orange" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[14.5px] font-semibold text-orange-ink">Veli refakati zorunludur</span>
                      <p className="text-[13.5px] leading-[1.6] text-orange-ink/85">
                        Çocuğunuz bu etkinliğe bir veli veya vasi eşliğinde katılmalıdır.
                        Kayıt sırasında refakatçi sayısını belirtebilirsiniz.
                      </p>
                    </div>
                  </div>
                </Reveal>
              )}
            </div>

            {/* Katılım kutusu */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Reveal>
                {event.registration_required ? (
                  user ? (
                    <EventRegistration
                      eventId={event.id}
                      eventTitle={event.title}
                      children={eligibility}
                      waitlistEnabled={event.waitlist_enabled}
                      remaining={event.capacity ? event.seats_left : null}
                      profileComplete={profileComplete}
                    />
                  ) : (
                    <Card className="flex flex-col gap-4 p-7">
                      <span className="font-display text-[20px] font-semibold tracking-[-.02em]">Katılmak için giriş yapın</span>
                      <p className="text-[14px] leading-[1.6] text-ink2">
                        Etkinlik kaydı çocuk adına yapılır. Giriş yaptıktan sonra hangi çocuğunuzun
                        katılabileceğini burada göreceksiniz.
                      </p>
                      <Divider />
                      <ButtonLink href={`/giris?devam=/etkinlikler/${event.slug}`} size="lg">Giriş yap</ButtonLink>
                      <ButtonLink href="/kayit" variant="outline" size="lg">Hesap oluştur</ButtonLink>
                      {event.requires_card && (
                        <p className="text-[13px] leading-[1.55] text-muted">
                          Bu etkinlik kombine kart sahiplerine özeldir.{" "}
                          <Link href="/kombine-kart" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Kart nasıl alınır?</Link>
                        </p>
                      )}
                    </Card>
                  )
                ) : (
                  <Card className="flex flex-col gap-3 p-7">
                    <span className="font-display text-[20px] font-semibold tracking-[-.02em]">Kayıt gerekmiyor</span>
                    <p className="text-[14px] leading-[1.6] text-ink2">
                      Bu etkinliğe kayıt olmadan doğrudan katılabilirsiniz. Görüşmek üzere!
                    </p>
                  </Card>
                )}
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Info({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["icon"]; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-chip text-muted">
        <Icon icon={icon} size={17} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11.5px] font-bold tracking-[.1em] text-muted2">{label}</span>
        <span className="text-[14.5px] font-semibold leading-[1.4]">{value}</span>
      </div>
    </div>
  );
}
