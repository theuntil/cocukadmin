import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Divider } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft } from "@/components/ui/icons";
import { MediaGallery } from "@/components/site/media-gallery";
import { getActivity, getActivitySlugs, getContentMedia } from "@/lib/data";
import { formatDate, publicStorageUrl } from "@/lib/utils";

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export async function generateStaticParams() {
  const slugs = await getActivitySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const a = await getActivity(slug);
  if (!a) return { title: "İçerik bulunamadı" };
  return { title: a.title, description: a.summary?.slice(0, 160) };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActivity(slug);
  if (!a) notFound();

  const media = await getContentMedia("activity", a.id);
  const cover = publicStorageUrl("galeri", a.cover_path);

  return (
    <Container className="!max-w-[980px] px-5 py-12 sm:py-16">
      <Link href="/yaptiklarimiz"
        className="mb-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Bizden Haberler
      </Link>

      <article className="flex flex-col gap-6">
        <header className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
          {a.published_at && (
            <span className="text-[13px] text-muted">{formatDate(a.published_at)}</span>
          )}
          <h1 className="font-display text-[32px] font-semibold leading-[1.12] tracking-[-.03em] sm:text-[40px]">
            {a.title}
          </h1>
          {a.summary && (
            <p className="text-[16.5px] leading-[1.65] text-ink2">{a.summary}</p>
          )}
        </header>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full rounded-[20px] object-cover" />
        )}

        <div className="ct-prose mx-auto w-full max-w-[720px] text-[16.5px] leading-[1.75] text-ink2"
          dangerouslySetInnerHTML={{ __html: a.body }} />

        {media.length > 0 && (
          <>
            <Divider className="my-4" />
            <div className="flex flex-col gap-4">
              <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
                Galeri
              </span>
              <MediaGallery items={media} />
            </div>
          </>
        )}
      </article>
    </Container>
  );
}
