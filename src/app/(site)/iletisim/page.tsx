import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, H3, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconInstagram, IconTwitter, IconShield, IconUsers, IconInvoice } from "@/components/ui/icons";

export const metadata: Metadata = { title: "İletişim", description: "Çocuk Tribünü ile iletişime geçin." };

const CHANNELS = [
  { icon: IconMail, title: "Genel iletişim", value: "merhaba@cocuktribunu.org", href: "mailto:merhaba@cocuktribunu.org", desc: "Sorular, öneriler ve iş birlikleri." },
  { icon: IconShield, title: "KVKK ve veri talepleri", value: "kvkk@cocuktribunu.org", href: "mailto:kvkk@cocuktribunu.org", desc: "Verilerinize erişim, düzeltme ve silme talepleri." },
  { icon: IconInvoice, title: "Bağış ve mali işler", value: "bagis@cocuktribunu.org", href: "mailto:bagis@cocuktribunu.org", desc: "Makbuz, dekont ve bağış sorguları." },
  { icon: IconUsers, title: "Basın", value: "basin@cocuktribunu.org", href: "mailto:basin@cocuktribunu.org", desc: "Röportaj talepleri ve basın materyalleri." },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="İLETİŞİM" title="Bize ulaşın." description="Doğru kanaldan yazarsanız çok daha hızlı dönüş yapabiliyoruz. Ortalama yanıt süremiz 2 iş günü." />
      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {CHANNELS.map((c, i) => (
              <Reveal key={c.title} delay={i * 60}>
                <Card className="flex h-full flex-col gap-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
                    <Icon icon={c.icon} size={20} />
                  </span>
                  <H3 className="text-[18px]">{c.title}</H3>
                  <p className="text-[14px] leading-[1.6] text-ink2">{c.desc}</p>
                  <a href={c.href} className="mt-auto pt-2 text-[14.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">{c.value}</a>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <Card className="mt-8 flex flex-col gap-4 p-7">
              <H3>Sosyal medya</H3>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: IconInstagram, label: "Instagram", href: "https://instagram.com" },
                  { icon: IconTwitter, label: "X", href: "https://x.com" },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-semibold transition-colors hover:border-accent-line hover:text-accent-ink">
                    <Icon icon={s.icon} size={17} />{s.label}
                  </a>
                ))}
              </div>
              <p className="border-t border-line2 pt-4 text-[13.5px] leading-[1.6] text-muted">
                Bir çocuğun güvenliğiyle ilgili acil bir durum söz konusuysa lütfen önce yetkili makamlara
                başvurun. Bize de bilgi verirseniz süreci takip ederiz.{" "}
                <Link href="/cocuk-verileri-politikasi" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Çocuk verileri politikamız</Link>
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
