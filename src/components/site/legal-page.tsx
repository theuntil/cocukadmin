import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Prose } from "@/components/site/prose";
import { getLegalDocument, getLegalDocuments } from "@/lib/data";
import { formatDate } from "@/lib/utils";

/**
 * Yasal metinler veritabanındaki legal_documents tablosundan gelir.
 * Metni değiştirmek için kod dokunmaya gerek yok — Supabase'den düzenleyin.
 */
export async function LegalPage({ slug }: { slug: string }) {
  const [doc, all] = await Promise.all([getLegalDocument(slug), getLegalDocuments()]);
  if (!doc) notFound();

  return (
    <>
      <PageHeader eyebrow="YASAL" title={doc.title} description={doc.summary ?? undefined} />
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_240px] lg:gap-16">
            <Prose>
              <p className="text-[13.5px] text-muted">
                Sürüm {doc.version} · Yürürlük: {formatDate(doc.effective_from)} ·
                Son güncelleme: {formatDate(doc.updated_at)}
              </p>
              <div dangerouslySetInnerHTML={{ __html: doc.body }} />
            </Prose>

            {all.length > 1 && (
              <nav className="flex h-fit flex-col gap-2 lg:sticky lg:top-24" aria-label="Diğer yasal metinler">
                <span className="ct-eyebrow mb-1">DİĞER METİNLER</span>
                {all.map((d) => (
                  <Link key={d.slug} href={`/${d.slug}`}
                    className={`rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
                      d.slug === slug ? "bg-chip font-semibold text-ink" : "text-ink2 hover:bg-chip"
                    }`}>
                    {d.title}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}

export async function legalMetadata(slug: string) {
  const doc = await getLegalDocument(slug);
  return {
    title: doc?.title ?? "Yasal",
    description: doc?.summary ?? undefined,
    alternates: { canonical: `/${slug}` },
  };
}
