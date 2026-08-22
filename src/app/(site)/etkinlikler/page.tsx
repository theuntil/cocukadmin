import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Container, EmptyState, H3, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconCalendar, IconLocation, IconTicket, IconUsers } from "@/components/ui/icons";
import { getEvents } from "@/lib/data";
import { formatDate, EVENT_TYPE_TR, publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Etkinlikler",
  description: "Çocuk Tribünü'nün şehirlerde düzenlediği buluşmalar, atölyeler ve maç günü etkinlikleri.",
};

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ sehir?: string; tur?: string; kart?: string }>;
}) {
  const sp = await searchParams;
  const [events, pastEvents] = await Promise.all([
    getEvents({ citySlug: sp.sehir, type: sp.tur, onlyCard: sp.kart === "1", limit: 60 }),
    // Geçmiş etkinlikler ayrı bölümde: tarihi geçti diye sayfa boş görünmesin
    getEvents({ citySlug: sp.sehir, type: sp.tur, onlyCard: sp.kart === "1",
                limit: 12, past: true }),
  ]);


  return (
    <>
      <PageHeader
        eyebrow="ETKİNLİKLER"
        title="Şehirlerde buluşuyoruz."
        description="Maç günü buluşmaları, atölyeler ve çocuk şenlikleri. Bazı etkinlikler yalnızca kombine kart sahibi çocuklara açıktır."
      />

      <Section className="!pt-8">
        <Container>
          {events.length === 0 && pastEvents.length === 0 ? (
            <EmptyState
              icon={<Icon icon={IconCalendar} size={26} />}
              title="Şu an planlanmış etkinlik yok"
              description="Yeni etkinlikler eklendiğinde burada göreceksiniz. Duyurulardan haberdar olmak için üye olabilirsiniz."
            />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-surface px-6 py-10 text-center">
              <Icon icon={IconCalendar} size={24} className="text-muted2" />
              <span className="text-[15px] font-semibold">Yaklaşan etkinlik yok</span>
              <span className="max-w-[420px] text-[13.5px] leading-[1.6] text-muted">
                Yeni etkinlikler eklendiğinde burada göreceksiniz. Geçmiş
                etkinliklerimizi aşağıda inceleyebilirsiniz.
              </span>
            </div>
          ) : (
            <div className="ct-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {events.map((e) => (
                <Link key={e.id} href={`/etkinlikler/${e.slug}`} className="block h-full">
                  <Card className="flex h-full flex-col overflow-hidden !rounded-[22px] !p-0 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                    {/* Kapak görseli — yönetim panelinden yüklenir */}
                    {publicStorageUrl("event-media", e.cover_path) && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={publicStorageUrl("event-media", e.cover_path)!} alt=""
                        loading="lazy" className="aspect-[16/9] w-full object-cover" />
                    )}

                    <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.is_live && (
                        <Badge tone="green">Şu anda sürüyor</Badge>
                      )}
                      <Badge tone="muted">{EVENT_TYPE_TR[e.event_type] ?? "Etkinlik"}</Badge>
                      {e.requires_card && (
                        <Badge tone="orange"><Icon icon={IconTicket} size={13} />Kart sahiplerine özel</Badge>
                      )}
                      {e.capacity !== null && e.seats_left === 0 && (
                        <Badge tone="danger">Kontenjan doldu</Badge>
                      )}
                    </div>

                    <H3 className="text-[19px] leading-[1.25]">{e.title}</H3>
                    {e.short_description && (
                      <p className="line-clamp-2 text-[14px] leading-[1.6] text-ink2">{e.short_description}</p>
                    )}

                    <div className="mt-auto flex flex-col gap-2 border-t border-line2 pt-4 text-[13.5px] text-muted">
                      <span className="flex items-center gap-2">
                        <Icon icon={IconCalendar} size={15} />{formatDate(e.starts_at, true)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Icon icon={IconLocation} size={15} />
                        {[e.city_name, e.venue_name].filter(Boolean).join(" · ") || "Konum açıklanacak"}
                      </span>
                      {e.capacity && (
                        <span className="flex items-center gap-2">
                          <Icon icon={IconUsers} size={15} />
                          {e.registered_count}/{e.capacity} kayıt
                        </span>
                      )}
                    </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Geçmiş etkinlikler — tarihi geçenler kaybolmasın */}
          {pastEvents.length > 0 && (
            <div className="mt-14 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <H3 className="text-[19px]">Geçmiş etkinlikler</H3>
                <span className="h-px flex-1 bg-line2" />
                <span className="text-[13px] text-muted">{pastEvents.length}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map((e) => (
                  <Link key={e.id} href={`/etkinlikler/${e.slug}`} className="block h-full">
                    <Card className="flex h-full flex-col gap-2.5 p-5 opacity-75 transition-opacity hover:opacity-100">
                      <span className="text-[12px] text-muted">
                        {formatDate(e.starts_at, true)}
                      </span>
                      <span className="line-clamp-2 text-[15px] font-semibold leading-[1.35]">
                        {e.title}
                      </span>
                      {(e.venue_name || e.city_name) && (
                        <span className="mt-auto text-[12.5px] text-muted">
                          {[e.venue_name, e.city_name].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}

