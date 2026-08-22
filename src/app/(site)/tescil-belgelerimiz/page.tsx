import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconShield } from "@/components/ui/icons";
import { Motion } from "@/components/ui/motion";
import { TrademarkCards } from "@/components/site/trademark-cards";
import { getTrademarks } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Tescil Belgelerimiz",
  description:
    "Çocuk Tribünü markası Türkiye, Avrupa Birliği ve Amerika Birleşik Devletleri nezdinde tescillidir.",
  alternates: { canonical: "/tescil-belgelerimiz" },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await getTrademarks();

  return (
    <Section className="!py-16 sm:!py-24">
      <Container className="flex flex-col gap-10 sm:gap-14">
        <Motion variant="up" className="flex max-w-[760px] flex-col gap-4">
          <h1 className="font-display text-[clamp(30px,5vw,54px)] font-semibold leading-[1.06] tracking-[-.035em]">
            Tescil belgelerimiz.
          </h1>
          <p className="text-[16px] leading-[1.7] text-ink2 sm:text-[17px]">
            Çocuk Tribünü markası Türkiye, Avrupa Birliği ve Amerika Birleşik
            Devletleri nezdinde koruma altındadır. Belgelerin üzerine tıklayarak
            tam boyutta inceleyebilirsiniz.
          </p>
        </Motion>

        <Motion variant="blur" delay={80}>
          <TrademarkCards items={items} />
        </Motion>

        <Motion variant="up" delay={140}>
          <div className="flex items-start gap-3 rounded-[18px] border border-line2 bg-surface px-5 py-4">
            <Icon icon={IconShield} size={18} className="mt-0.5 shrink-0 text-muted" />
            <p className="text-[13.5px] leading-[1.65] text-muted">
              Çocuk Tribünü adı, logosu ve görsel kimliği tescilli markadır.
              İzinsiz kullanımı, benzerinin kullanılması veya karışıklığa yol
              açacak biçimde çağrıştırılması hukuki sorumluluk doğurur.
            </p>
          </div>
        </Motion>
      </Container>
    </Section>
  );
}
