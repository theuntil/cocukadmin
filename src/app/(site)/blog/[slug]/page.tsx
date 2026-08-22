import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Eyebrow, Section } from "@/components/ui";
import { Prose } from "@/components/site/prose";
import { ViewTracker } from "@/components/site/view-tracker";
import { getNewsBySlug, getNewsSlugs } from "@/lib/data";
import { formatDate, publicStorageUrl } from "@/lib/utils";

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export async function generateStaticParams() {
  const slugs = await getNewsSlugs(30);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const n = await getNewsBySlug(slug);
  if (!n) return { title: "Yazı bulunamadı" };
  return {
    title: n.meta_title ?? n.title,
    description: n.meta_description ?? n.excerpt ?? undefined,
    alternates: { canonical: `/blog/${n.slug}` },
    openGraph: {
      title: n.title,
      description: n.excerpt ?? undefined,
      type: "article",
      publishedTime: n.published_at ?? undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) notFound();

  const category = post.news_categories as { name: string; slug: string } | null;
  const author = post.profiles as { first_name: string | null; last_name: string | null } | null;
  const cover = publicStorageUrl("news-media", (post as { og_image_path?: string | null }).og_image_path ?? null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.published_at,
    dateModified: (post as { updated_at?: string }).updated_at ?? post.published_at,
    description: post.excerpt ?? "",
    author: { "@type": "Organization", name: "Çocuk Tribünü" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewTracker contentType="news" contentId={post.id} />

      <article>
        <div className="border-b border-line2 bg-[radial-gradient(120%_90%_at_8%_0%,var(--surface)_0%,var(--page)_46%,var(--page)_100%)]">
          <Container className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
            <div className="ct-rise flex max-w-[760px] flex-col gap-4">
              <Link href="/blog" className="text-[13.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">← Tüm yazılar</Link>
              {category && <Eyebrow className="text-accent-ink">{category.name}</Eyebrow>}
              <h1 className="font-display text-[32px] leading-[1.08] font-semibold tracking-[-.035em] sm:text-[44px]">
                {post.title}
              </h1>
              {post.excerpt && <p className="text-[17px] leading-[1.65] text-ink2">{post.excerpt}</p>}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[13.5px] text-muted">
                <span>{formatDate(post.published_at)}</span>
                {author?.first_name && <><span aria-hidden>·</span><span>{author.first_name} {author.last_name}</span></>}
              </div>
            </div>
          </Container>
        </div>

        {cover && (
          <Container className="px-5 pt-10 sm:px-8 lg:px-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={post.title} className="ct-fade w-full rounded-[24px] border border-line object-cover" />
          </Container>
        )}

        <Section>
          <Container>
            <Prose>
              <div className="whitespace-pre-line">{post.content}</div>
            </Prose>
          </Container>
        </Section>
      </article>
    </>
  );
}
