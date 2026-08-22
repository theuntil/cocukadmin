import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, EmptyState, Eyebrow, H2 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconStar, IconArrowRight } from "@/components/ui/icons";
import { getActivities, type Activity } from "@/lib/data";
import { formatDate, publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bizden Haberler",
  description: "Çocuk Tribünü olarak hayata geçirdiğimiz çalışmalar.",
};

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export default async function Page() {
  const items = await getActivities(60);

  return (
    <Container className="px-5 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <Eyebrow className="text-accent-ink">ÇALIŞMALARIMIZ</Eyebrow>
        <H2>Bizden Haberler</H2>
        <p className="max-w-[620px] text-[15.5px] leading-[1.7] text-ink2">
          Sahada ve tribünde hayata geçirdiğimiz çalışmalar.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Icon icon={IconStar} size={26} />} title="Henüz içerik yok" />
      ) : (
        <Timeline items={items} />
      )}
    </Container>
  );
}


/**
 * Zaman çizelgesi.
 *
 * İçerikler yıla göre gruplanır ve dikey bir çizgi boyunca sıralanır.
 * Masaüstünde tarih solda ayrı sütunda durur; mobilde kartın üstüne geçer,
 * böylece dar ekranda çizgi içeriği sıkıştırmaz.
 */
function Timeline({ items }: { items: Activity[] }) {
  const groups = new Map<string, Activity[]>();

  for (const a of items) {
    const year = a.published_at
      ? new Date(a.published_at).getFullYear().toString()
      : "Tarihsiz";
    const list = groups.get(year) ?? [];
    list.push(a);
    groups.set(year, list);
  }

  return (
    <div className="mt-12 flex flex-col gap-14">
      {[...groups.entries()].map(([year, list]) => (
        <section key={year} className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="font-display text-[30px] font-semibold tracking-[-.03em] text-accent-ink sm:text-[36px]">
              {year}
            </span>
            <span className="h-px flex-1 bg-line2" />
            <span className="text-[13px] text-muted">{list.length} çalışma</span>
          </div>

          <div className="relative flex flex-col gap-8">
            {/* Dikey çizgi — yalnızca masaüstünde */}
            <span aria-hidden
              className="absolute left-[104px] top-2 hidden h-[calc(100%-16px)] w-px bg-line2 lg:block" />

            {list.map((a, i) => {
              const cover = publicStorageUrl("galeri", a.cover_path);
              return (
                <Link key={a.id} href={`/yaptiklarimiz/${a.slug}`}
                  className="ct-rise group flex flex-col gap-4 lg:flex-row lg:gap-8"
                  style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>

                  {/* Tarih sütunu */}
                  <div className="flex shrink-0 items-center gap-3 lg:w-[104px] lg:flex-col lg:items-end lg:gap-1 lg:pt-1">
                    <span className="font-display text-[15px] font-semibold tracking-[-.01em] lg:text-[17px]">
                      {a.published_at
                        ? new Date(a.published_at).toLocaleDateString("tr-TR", {
                            day: "numeric", month: "long" })
                        : "—"}
                    </span>
                  </div>

                  {/* Nokta */}
                  <span aria-hidden
                    className="relative hidden shrink-0 lg:block lg:pt-2.5">
                    <span className="block h-3 w-3 rounded-full border-2 border-page bg-line2 transition-colors group-hover:bg-accent" />
                  </span>

                  {/* İçerik */}
                  <Card className="flex flex-1 flex-col overflow-hidden transition-colors group-hover:border-accent-line sm:flex-row">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" loading="lazy"
                        className="h-[180px] w-full shrink-0 object-cover sm:h-auto sm:w-[240px]" />
                    ) : (
                      <div className="flex h-[120px] w-full shrink-0 items-center justify-center bg-chip sm:h-auto sm:w-[180px]">
                        <Icon icon={IconStar} size={24} className="text-muted2" />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
                      <span className="font-display text-[18px] font-semibold leading-[1.3] tracking-[-.02em] sm:text-[20px]">
                        {a.title}
                      </span>
                      {a.summary && (
                        <p className="line-clamp-3 text-[14px] leading-[1.6] text-ink2">
                          {a.summary}
                        </p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13.5px] font-semibold">
                        Devamını oku <Icon icon={IconArrowRight} size={14} />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
