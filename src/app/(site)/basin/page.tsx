import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Container, EmptyState, Eyebrow, H2, H3, Section, StatBlock } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Prose } from "@/components/site/prose";
import { PressStrip } from "@/components/site/press-strip";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconDownload, IconMail, IconNews } from "@/components/ui/icons";
import { getPressCoverage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Basın",
  description: "Çocuk Tribünü basın kiti, basında çıkan haberler ve şeffaflık raporu.",
};

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

export default async function Page() {
  const press = await getPressCoverage(30);

  return (
    <>
      <PageHeader eyebrow="BASIN" title="Basında biz"
        description="Çocuk Tribünü hakkında yayımlanan haberler, basın kiti ve şeffaflık bilgilerimiz." />

      {/* BASINDA BİZ — veritabanından */}
      <Section className="!pt-10">
        <Container>
          {press.length === 0 ? (
            <EmptyState icon={<Icon icon={IconNews} size={26} />} title="Henüz haber eklenmedi"
              description="Basında çıkan haberler yönetim panelinden eklendiğinde burada listelenecek." />
          ) : (
            <>
              <Reveal className="mb-8 flex flex-col gap-3">
                <Eyebrow className="text-accent-ink">HABERLER</Eyebrow>
                <H2>{press.length} haber</H2>
              </Reveal>
              <PressStrip items={press} />
            </>
          )}
        </Container>
      </Section>

      <Section className="border-t border-line2 bg-surface/40">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            <Reveal><Card className="p-6"><StatBlock value="15 yıl" label="saha deneyimi" /></Card></Reveal>
            <Reveal delay={60}><Card className="p-6"><StatBlock value="%100" label="gönüllü emeği" tone="green" /></Card></Reveal>
            <Reveal delay={120}><Card className="p-6"><StatBlock value="0" label="kurumsal sponsor" tone="orange" /></Card></Reveal>
          </div>

          <Reveal delay={80}>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <Card className="flex flex-col gap-4 p-7">
                <H3>Basın kiti</H3>
                <p className="text-[14.5px] leading-[1.6] text-ink2">
                  Logo dosyaları, marka renkleri, kullanım kuralları ve yüksek çözünürlüklü görseller.
                </p>
                <ButtonLink href="mailto:basin@cocuktribunu.org?subject=Bas%C4%B1n%20kiti%20talebi"
                  variant="outline" size="lg" className="self-start">
                  <Icon icon={IconDownload} size={17} />Basın kiti iste
                </ButtonLink>
              </Card>
              <Card className="flex flex-col gap-4 p-7">
                <H3>Röportaj talepleri</H3>
                <p className="text-[14.5px] leading-[1.6] text-ink2">
                  Proje lideri ve sözcülerimizle görüşme taleplerinizi iletin; genellikle 2 iş günü içinde
                  dönüş yapıyoruz.
                </p>
                <ButtonLink href="mailto:basin@cocuktribunu.org" variant="solid" size="lg" className="self-start">
                  <Icon icon={IconMail} size={17} />basin@cocuktribunu.org
                </ButtonLink>
              </Card>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-t border-line2">
        <Container>
          <Reveal>
            <Eyebrow className="text-accent-ink">ŞEFFAFLIK</Eyebrow>
            <H2 className="mt-2 mb-6 text-[30px]">Parayı nasıl kullanıyoruz?</H2>
            <Prose>
              <p>
                Çocuk Tribünü&apos;nün gelir kalemi kombine kart üyelik bedelleridir.
                Kurumsal sponsorluk kabul etmiyor, reklam geliri elde etmiyoruz.
              </p>
              <table>
                <thead><tr><th>Gider kalemi</th><th>Yaklaşık pay</th></tr></thead>
                <tbody>
                  <tr><td>Kart altyapısı ve dijital sistemler</td><td>%45</td></tr>
                  <tr><td>Etkinlik giderleri (ulaşım, ikram, mekân)</td><td>%35</td></tr>
                  <tr><td>Altyapı (barındırma, alan adı, yazılım)</td><td>%12</td></tr>
                  <tr><td>İmkânı olmayan çocuklara açılan kartlar</td><td>%8</td></tr>
                </tbody>
              </table>
              <p>
                Yıllık gelir-gider özeti her yıl ocak ayında bu sayfada yayımlanır. Ayrıntılı dökümü talep
                eden herkese e-posta ile iletiriz.
              </p>
              <h3>Bağımsızlık beyanı</h3>
              <p>
                Çocuk Tribünü hiçbir kulübün, taraftar grubunun, siyasi yapının veya ticari markanın uzantısı
                değildir. Kulüplerle yürütülen görüşmeler yalnızca çocukların tribün deneyimini iyileştirme
                amacı taşır ve karşılığında maddi kazanç kabul edilmez.
              </p>
            </Prose>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
