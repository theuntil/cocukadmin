import Link from "next/link";
import { Container } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowRight, IconHeart } from "@/components/ui/icons";
import { publicStorageUrl } from "@/lib/utils";

/**
 * Öne çıkan destekçi.
 *
 * Destekçi şeridinin altında tek satır: solda logo, ortada ad, sağda
 * destek belgesine giden bağlantı. Şeritten görsel olarak ayrılır ki
 * gözden kaçmasın.
 */
export function FeaturedSupporter({
  supporter, docLabel,
}: {
  supporter: {
    id: string; name: string; slug: string;
    logo_path: string | null; short_description?: string | null;
  };
  docLabel: string;
}) {
  const logo = publicStorageUrl("galeri", supporter.logo_path);

  return (
    <section className="border-b border-line2 bg-page">
      <Container>
        <Link
          href={`/destekcilerimiz/${supporter.slug}`}
          className="group flex flex-wrap items-center gap-4 py-5 sm:gap-6 sm:py-6"
        >
          {/* Sol: logo */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-surface sm:h-16 sm:w-16">
            {logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logo} alt={supporter.name}
                className="h-full w-full object-contain p-2" />
            ) : (
              <Icon icon={IconHeart} size={20} className="text-muted2" />
            )}
          </span>

          {/* Orta: ad */}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-display text-[16px] font-semibold tracking-[-.02em] sm:text-[18px]">
              {supporter.name}
            </span>
            {supporter.short_description && (
              <span className="truncate text-[13px] text-muted">
                {supporter.short_description}
              </span>
            )}
          </span>

          {/* Sağ: belge bağlantısı */}
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold transition-colors group-hover:border-accent-line group-hover:bg-accent-soft">
            {docLabel}
            <Icon icon={IconArrowRight} size={15} />
          </span>
        </Link>
      </Container>
    </section>
  );
}
