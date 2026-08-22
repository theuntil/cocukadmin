import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink, Card, Container, Divider } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconShare, IconNews } from "@/components/ui/icons";
import { MediaGallery } from "@/components/site/media-gallery";
import { getPressItem, getPressSlugs, getContentMedia } from "@/lib/data";
import { formatDate, publicStorageUrl } from "@/lib/utils";

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export async function generateStaticParams() {
  const slugs = await getPressSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPressItem(slug);
  if (!p) return { title: "Haber bulunamadı" };
  return { title: p.title, description: p.excerpt?.slice(0, 160) };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPressItem(slug);
  if (!p) notFound();

  const media = await getContentMedia("press", p.id);
  const logo = publicStorageUrl("press-logos", p.source_logo_path);
  const cover = publicStorageUrl("galeri", p.cover_path);
  const sourceUrl = p.source_url ?? p.article_url;

  return (
    <Container className="!max-w-[760px] px-5 py-12 sm:py-16">
      <Link href="/basin"
        className="mb-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Basında biz
      </Link>

      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-surface">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={p.source_name} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Icon icon={IconNews} size={16} className="text-muted2" />
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold">{p.source_name}</span>
              <span className="text-[12.5px] text-muted">{formatDate(p.published_at)}</span>
            </div>
          </div>

          <h1 className="font-display text-[30px] font-semibold leading-[1.15] tracking-[-.03em] sm:text-[38px]">
            {p.title}
          </h1>

          {p.excerpt && (
            <p className="text-[16.5px] leading-[1.65] text-ink2">{p.excerpt}</p>
          )}
        </header>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full rounded-[20px] object-cover" />
        )}

        {p.body && (
          <div className="ct-prose text-[16px] leading-[1.75] text-ink2"
            dangerouslySetInnerHTML={{ __html: p.body }} />
        )}

        {media.length > 0 && <MediaGallery items={media} />}

        {sourceUrl && (
          <>
            <Divider className="my-2" />
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold">Haberin tamamı</span>
                <span className="text-[13px] text-muted">{p.source_name} sitesinde</span>
              </div>
              <ButtonLink href={sourceUrl} target="_blank" rel="noopener noreferrer" size="md">
                <Icon icon={IconShare} size={15} /> Kaynağa git
              </ButtonLink>
            </Card>
          </>
        )}
      </article>
    </Container>
  );
}
