import type { Metadata } from "next";
import { ButtonLink, Card, Container, Eyebrow, H2, H3, Lead, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconUsers, IconCalendar, IconMegaphone, IconIdea, IconCheck, IconMail } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Gönüllü Ol",
  description: "Çocuk Tribünü'nde gönüllü olarak yer alın: etkinlik, iletişim, saha ve içerik ekipleri.",
};

const ROLES = [
  { icon: IconCalendar, t: "Etkinlik gönüllüsü", d: "Şehrinizdeki buluşma ve şenliklerde kurulum, karşılama ve çocuk grubu eşliği." },
  { icon: IconMegaphone, t: "İletişim gönüllüsü", d: "Sosyal medya içerikleri, duyuru metinleri ve basın ilişkileri." },
  { icon: IconIdea, t: "İçerik gönüllüsü", d: "Blog yazıları, saha izlenimleri, fotoğraf ve video." },
  { icon: IconUsers, t: "Şehir temsilcisi", d: "Kendi şehrinizde ekip kurmak, kulüplerle ve okullarla iletişim." },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="GÖNÜLLÜLÜK" title={<>Bu işi<br />gönüllüler yapıyor.</>}
        description="Çocuk Tribünü'nün sahadaki her işi gönüllülerle yürüyor. Haftada birkaç saatiniz varsa, yeriniz hazır." />

      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {ROLES.map((r, i) => (
              <Reveal key={r.t} delay={i * 60}>
                <Card className="flex h-full flex-col gap-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
                    <Icon icon={r.icon} size={20} />
                  </span>
                  <H3 className="text-[18px]">{r.t}</H3>
                  <p className="text-[14px] leading-[1.6] text-ink2">{r.d}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line2 bg-surface/40">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <Reveal className="flex flex-col gap-5">
              <Eyebrow className="text-accent-ink">SÜREÇ</Eyebrow>
              <H2>Nasıl katılırım?</H2>
              <ol className="flex flex-col gap-4">
                {[
                  "Aşağıdaki adrese kısa bir e-posta gönderin: adınız, şehriniz ve ilgilendiğiniz alan.",
                  "Şehir temsilcimiz sizinle 1 hafta içinde tanışma görüşmesi yapar.",
                  "Çocuklarla doğrudan temas içeren rollerde kısa bir güvenlik ve etik brifingi veririz.",
                  "İlk etkinliğinizde bir deneyimli gönüllü size eşlik eder.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-on-green">{i + 1}</span>
                    <span className="text-[15px] leading-[1.6] text-ink2">{t}</span>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={80}>
              <Card className="flex flex-col gap-4 p-7">
                <H3>Beklentimiz</H3>
                <ul className="flex flex-col gap-3">
                  {[
                    "18 yaşını doldurmuş olmak",
                    "Çocuk güvenliği ilkelerimize uymayı taahhüt etmek",
                    "Ayda en az bir etkinliğe katılabilmek",
                    "Takım ayrımı yapmadan çalışabilmek",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[14.5px] leading-[1.6] text-ink2">
                      <Icon icon={IconCheck} size={17} className="mt-[3px] shrink-0 text-accent-ink" />{t}
                    </li>
                  ))}
                </ul>
                <Lead className="border-t border-line2 pt-4 !text-[14px]">
                  Çocuklarla doğrudan temas eden gönüllülerden adli sicil kaydı talep edilir.
                </Lead>
                <ButtonLink href="mailto:gonullu@cocuktribunu.org" variant="solid" size="lg">
                  <Icon icon={IconMail} size={17} />
                  gonullu@cocuktribunu.org
                </ButtonLink>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
