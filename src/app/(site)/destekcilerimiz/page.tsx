import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, EmptyState, Eyebrow, H2 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconHeart, IconArrowRight } from "@/components/ui/icons";
import { getSupporters } from "@/lib/data";
import { publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Destekçilerimiz",
  description: "Çocuk Tribünü'nü destekleyen kurum ve kuruluşlar.",
};

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export default async function Page() {
  const supporters = await getSupporters();

  return (
    <Container className="px-5 py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <Eyebrow className="text-accent-ink">YANIMIZDA OLANLAR</Eyebrow>
        <H2>Destekçilerimiz</H2>
        <p className="max-w-[620px] text-[15.5px] leading-[1.7] text-ink2">
          Çocukların tribünde güvende olduğu bir futbol kültürü için bize destek veren kurumlar.
        </p>
      </div>

      {supporters.length === 0 ? (
        <EmptyState icon={<Icon icon={IconHeart} size={26} />} title="Henüz destekçi eklenmedi" />
      ) : (
        <div className="ct-stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {supporters.map((s) => {
            const logo = publicStorageUrl("galeri", s.logo_path);
            return (
              <Link key={s.id} href={`/destekcilerimiz/${s.slug}`}>
                <Card className="flex h-full flex-col gap-4 p-6 transition-colors hover:border-accent-line">
                  <div className="flex h-24 items-center justify-center rounded-[14px] bg-field">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt={s.name} className="max-h-16 max-w-[75%] object-contain" />
                    ) : (
                      <Icon icon={IconHeart} size={24} className="text-muted2" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[16px] font-semibold">{s.name}</span>
                    {s.description && (
                      <p className="line-clamp-3 text-[13.5px] leading-[1.55] text-ink2">
                        {s.description}
                      </p>
                    )}
                  </div>

                  <span className="mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
                    Detay <Icon icon={IconArrowRight} size={14} />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
