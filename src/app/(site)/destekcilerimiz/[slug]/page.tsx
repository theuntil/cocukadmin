import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink, Card, Container, Divider } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconShare, IconFile } from "@/components/ui/icons";
import { getSupporter, getSupporters } from "@/lib/data";
import { publicStorageUrl } from "@/lib/utils";

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export async function generateStaticParams() {
  const supporters = await getSupporters();
  return supporters.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSupporter(slug);
  if (!s) return { title: "Destekçi bulunamadı" };
  return {
    title: s.name,
    description: s.description?.slice(0, 160) ?? `${s.name} · Çocuk Tribünü destekçisi`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSupporter(slug);
  if (!s) notFound();

  const logo = publicStorageUrl("galeri", s.logo_path);
  const doc = publicStorageUrl("galeri", s.document_path);
  const isPdf = (s.document_type ?? "").includes("pdf");

  return (
    <Container className="!max-w-[840px] px-5 py-12 sm:py-16">
      <Link href="/destekcilerimiz"
        className="mb-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Destekçilerimiz
      </Link>

      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-32 w-full max-w-[280px] items-center justify-center rounded-[20px] border border-line bg-surface">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={s.name} className="max-h-24 max-w-[80%] object-contain" />
          ) : null}
        </div>

        <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-.03em] sm:text-[38px]">
          {s.name}
        </h1>

        {s.description && (
          <p className="max-w-[600px] text-[15.5px] leading-[1.7] text-ink2">{s.description}</p>
        )}

        {s.website_url && (
          <ButtonLink href={s.website_url} size="lg" variant="outline"
            target="_blank" rel="noopener noreferrer">
            <Icon icon={IconShare} size={16} /> Web sitesini ziyaret et
          </ButtonLink>
        )}
      </div>

      {doc && (
        <>
          <Divider className="my-10" />
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Icon icon={IconFile} size={18} className="text-muted" />
              <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
                Destek belgesi
              </span>
            </div>

            <Card className="overflow-hidden p-0">
              {isPdf ? (
                <object data={doc} type="application/pdf"
                  className="h-[600px] w-full" aria-label="Destek belgesi">
                  <div className="flex flex-col items-center gap-3 p-10 text-center">
                    <p className="text-[14px] text-ink2">
                      Belge tarayıcınızda gösterilemiyor.
                    </p>
                    <ButtonLink href={doc} target="_blank" rel="noopener noreferrer">
                      Belgeyi aç
                    </ButtonLink>
                  </div>
                </object>
              ) : (
                <a href={doc} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doc} alt="Destek belgesi" className="w-full object-contain" />
                </a>
              )}
            </Card>

            <a href={doc} target="_blank" rel="noopener noreferrer"
              className="self-start text-[13.5px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
              Tam ekran aç
            </a>
          </div>
        </>
      )}
    </Container>
  );
}
