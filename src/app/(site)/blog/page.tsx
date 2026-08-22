import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, EmptyState, Eyebrow, H3, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Icon } from "@/components/ui/icon";
import { IconNews } from "@/components/ui/icons";
import { getNews, getNewsCategories } from "@/lib/data";
import { formatDate, publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description: "Çocuk Tribünü'nden haberler, sahadan notlar ve kampanya güncellemeleri.",
};

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;
const PER_PAGE = 12;

export default async function BlogPage({
  searchParams,
}: { searchParams: Promise<{ kategori?: string; sayfa?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.sayfa ?? 1));
  const [{ rows, count }, categories] = await Promise.all([
    getNews(PER_PAGE, (page - 1) * PER_PAGE, sp.kategori),
    getNewsCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));

  return (
    <>
      <PageHeader eyebrow="BLOG" title="Sahadan notlar." description="Kampanya güncellemeleri, etkinlik izlenimleri ve çocuk-futbol ilişkisi üzerine yazılar." />

      <Section className="!pt-8">
        <Container>
          <div className="ct-fade mb-8 flex flex-wrap gap-2">
            <Chip href="/blog" active={!sp.kategori}>Tümü</Chip>
            {categories.map((c) => (
              <Chip key={c.id} href={`/blog?kategori=${c.slug}`} active={sp.kategori === c.slug}>{c.name}</Chip>
            ))}
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={<Icon icon={IconNews} size={26} />} title="Henüz yazı yok"
              description="Yakında burada kampanya notları ve etkinlik izlenimleri olacak." />
          ) : (
            <>
              <div className="ct-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {rows.map((n) => {
                  const img = publicStorageUrl(n.image_bucket ?? "news-media", n.image_path);
                  return (
                    <Link key={n.id} href={`/blog/${n.slug}`} className="block h-full">
                      <Card className="flex h-full flex-col overflow-hidden !rounded-[22px] !p-0 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                        <div className="aspect-[16/9] w-full bg-chip">
                          {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={n.title} loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-6">
                          {n.category_name && <Eyebrow className="text-accent-ink">{n.category_name}</Eyebrow>}
                          <H3 className="text-[18px] leading-[1.3]">{n.title}</H3>
                          <p className="line-clamp-3 text-[14px] leading-[1.6] text-ink2">{n.excerpt}</p>
                          <span className="mt-auto pt-2 text-[13px] text-muted">{formatDate(n.published_at)}</span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Sayfalama">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link key={p}
                      href={`/blog?${new URLSearchParams({ ...(sp.kategori ? { kategori: sp.kategori } : {}), sayfa: String(p) })}`}
                      className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[14px] font-semibold transition-colors ${
                        p === page ? "border-transparent bg-solid text-on-solid" : "border-line bg-surface text-ink2 hover:border-ink/25"
                      }`}>
                      {p}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          )}
        </Container>
      </Section>
    </>
  );
}

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href}
      className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
        active ? "border-transparent bg-solid text-on-solid" : "border-line bg-surface text-ink2 hover:border-ink/25 hover:text-accent-ink"
      }`}>{children}</Link>
  );
}
