import type { Metadata } from "next";
import { Card, Container, Eyebrow, H2, H3, Lead, Section, StatBlock, ButtonLink } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconShield, IconUsers, IconHeart, IconTarget, IconFlag, IconIdea } from "@/components/ui/icons";
import { getTeamMembers } from "@/lib/data";
import { publicStorageUrl, initials } from "@/lib/utils";
import { getActivePlan } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Çocuk Tribünü kimdir, neden kuruldu, nasıl çalışır? Değerlerimiz ve yol haritamız.",
};

const VALUES = [
  { icon: IconShield, title: "Çocuk önce gelir", text: "Her kararımızda ölçüt tektir: çocuk bu ortamda güvende mi, kendini ait hissediyor mu?" },
  { icon: IconUsers, title: "Takım ayrımı yok", text: "Hangi takımı tutarsa tutsun, her çocuk aynı tribünün parçasıdır. Rekabeti sahada bırakırız." },
  { icon: IconHeart, title: "Gönüllülük esası", text: "Sahadaki işi gönüllüler yapar. Bağışlar ve üyelik bedelleri şeffaf şekilde çocuklara döner." },
  { icon: IconTarget, title: "Ölçülebilir etki", text: "Kaç çocuk, kaç şehir, kaç etkinlik — verdiğimiz sözü sayılarla takip edilebilir kılarız." },
  { icon: IconFlag, title: "Bağımsızlık", text: "Hiçbir kulübün, siyasi yapının veya ticari markanın uzantısı değiliz." },
  { icon: IconIdea, title: "Veri minimizasyonu", text: "Çocuklardan yalnızca gerçekten gereken bilgiyi isteriz. Fazlasını istemeyiz, tutmayız." },
];

const TIMELINE = [
  { year: "2024", title: "İlk buluşma", text: "Farklı takımlardan bir grup taraftar, çocukların tribünde yaşadığı sorunları konuşmak için bir araya geldi." },
  { year: "2025", title: "İmza kampanyası", text: "«Çocuklar Tribünde Olsun» kampanyası başladı; kulüplere ve federasyona resmî çağrı yapıldı." },
  { year: "2026", title: "Kombine kart", text: "Çocuk Tribünü Kombine Kartı hayata geçti. Kart çocuğun kendi adına düzenleniyor." },
  { year: "Sırada", title: "81 şehir", text: "Her ilde en az bir gönüllü ekip ve yılda bir çocuk etkinliği hedefliyoruz." },
];

export default async function AboutPage() {
  // Fiyat tek kaynaktan: yönetim panelindeki aktif plan
  const plan = await getActivePlan();
  const price = plan ? formatMoney(plan.price, plan.currency) : "—";

  const members = await getTeamMembers();
  const leader = members.find((m) => m.is_leader) ?? members[0] ?? null;
  const others = members.filter((m) => m.id !== leader?.id);

  return (
    <>
      <PageHeader
        eyebrow="HAKKIMIZDA"
        title={<>Tribünü çocuklara<br />açmak için buradayız.</>}
        description="Çocuk Tribünü, çocukların futbolu güvenli ve ayrımsız deneyimlemesi için çalışan bağımsız bir taraftar inisiyatifidir."
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr]">
            <Reveal className="flex flex-col gap-5">
              <Eyebrow className="text-accent-ink">NEDEN VARIZ</Eyebrow>
              <H2>Bir çocuk için tribün, hayatının ilk topluluğu olabilir.</H2>
              <div className="flex flex-col gap-4 text-[15.5px] leading-[1.75] text-ink2">
                <p>
                  Türkiye&apos;de milyonlarca çocuk futbolu ekran üzerinden tanıyor. Stadyuma gidebilenlerin
                  çoğu için ilk deneyim; bilet fiyatı, ulaşım, güvenlik kaygısı ve tribün dilinin sertliği
                  arasında sıkışıyor.
                </p>
                <p>
                  Biz bunun değişebileceğine inanıyoruz. Çocuk Tribünü; kulüplerle, taraftar gruplarıyla ve
                  ailelerle birlikte çocuğun tribünde <strong className="text-ink">güvende, görünür ve hoş
                  karşılanmış</strong> hissetmesini hedefliyor.
                </p>
                <p>
                  Yaptığımız iş üç ayak üzerine kurulu: erişilebilir bir kombine kart, kamuoyu oluşturan imza
                  kampanyaları ve şehirlerde düzenlediğimiz çocuk etkinlikleri.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <Card className="flex flex-col gap-7 p-8">
                <StatBlock value="81" label="hedeflenen şehir" tone="green" />
                <StatBlock value={price} label="yıllık kombine bedeli" />
                <StatBlock value="%100" label="gönüllü emeği" tone="orange" />
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line2 bg-surface/40">
        <Container>
          <Reveal className="flex flex-col gap-3">
            <Eyebrow className="text-accent-ink">DEĞERLERİMİZ</Eyebrow>
            <H2 className="max-w-[560px]">Altı ilke, tek ölçüt.</H2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 60}>
                <Card className="flex h-full flex-col gap-3.5 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
                    <Icon icon={v.icon} size={20} />
                  </span>
                  <H3 className="text-[18px]">{v.title}</H3>
                  <p className="text-[14px] leading-[1.65] text-ink2">{v.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line2">
        <Container>
          <Reveal className="flex flex-col gap-3">
            <Eyebrow className="text-accent-ink">YOL HARİTASI</Eyebrow>
            <H2>Nereden nereye.</H2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 70}>
                <div className="flex h-full flex-col gap-3 border-t-2 border-accent-line pt-5">
                  <span className="font-display text-[15px] font-semibold tracking-[.1em] text-accent-ink">{t.year}</span>
                  <span className="font-display text-[19px] font-semibold tracking-[-.02em]">{t.title}</span>
                  <p className="text-[14px] leading-[1.65] text-ink2">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {leader && (
        <Section className="border-t border-line2 bg-surface/40">
          <Container>
            <Reveal className="flex flex-col gap-3">
              <Eyebrow className="text-accent-ink">EKİP</Eyebrow>
              <H2>Projeyi kim yürütüyor?</H2>
            </Reveal>

            <Reveal delay={80}>
              <Card className="mt-8 grid gap-8 p-8 sm:p-10 lg:grid-cols-[240px_1fr] lg:items-start">
                <div className="flex flex-col items-center gap-4 lg:items-start">
                  <span className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[28px] bg-chip">
                    {publicStorageUrl("avatars", leader.photo_path) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={publicStorageUrl("avatars", leader.photo_path)!} alt={leader.full_name}
                        className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-[34px] font-bold text-muted">
                        {initials(leader.full_name.split(" ")[0], leader.full_name.split(" ").slice(-1)[0])}
                      </span>
                    )}
                  </span>
                  <div className="flex flex-col gap-1 text-center lg:text-left">
                    <span className="font-display text-[21px] font-semibold tracking-[-.02em]">{leader.full_name}</span>
                    <span className="text-[14px] font-semibold text-accent-ink">{leader.role_title}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {leader.bio && (
                    <p className="text-[15.5px] leading-[1.75] text-ink2">{leader.bio}</p>
                  )}
                  <blockquote className="border-l-[3px] border-accent-line pl-5 text-[16px] leading-[1.65] text-ink">
                    &ldquo;Çocuklarımızı ekran başından alıp sporun disiplinine, takım ruhuna ve sosyal
                    ortamlara yönlendirmeliyiz. Çocuk Tribünü, şiddet sarmalından çıkış için somut ve
                    akademik bir modeldir.&rdquo;
                  </blockquote>
                  <span className="text-[13px] text-muted">
                    Kamuya açık basın açıklamalarından derlenmiştir.
                  </span>
                </div>
              </Card>
            </Reveal>

            {others.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((m, i) => (
                  <Reveal key={m.id} delay={i * 60}>
                    <Card className="flex items-center gap-4 p-5">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-chip">
                        {publicStorageUrl("avatars", m.photo_path) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={publicStorageUrl("avatars", m.photo_path)!} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-[15px] font-bold text-muted">
                            {initials(m.full_name.split(" ")[0], m.full_name.split(" ").slice(-1)[0])}
                          </span>
                        )}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-semibold">{m.full_name}</span>
                        <span className="text-[13px] text-muted">{m.role_title}</span>
                      </div>
                    </Card>
                  </Reveal>
                ))}
              </div>
            )}
          </Container>
        </Section>
      )}

      <Section className="border-t border-line2 bg-surface/40">
        <Container>
          <Reveal>
            <div className="flex flex-col items-center gap-5 rounded-[26px] border border-line bg-deep px-8 py-14 text-center text-deep-ink">
              <H2 className="max-w-[540px] text-deep-ink">Bu işin sahadaki adı gönüllülüktür.</H2>
              <Lead className="max-w-[520px] !text-on-dark">
                Şehrinizde bir çocuk etkinliği düzenlemek, iletişim veya organizasyonda destek olmak isterseniz
                kapımız açık.
              </Lead>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <ButtonLink href="/gonullu-ol" variant="solid" size="lg">Gönüllü ol</ButtonLink>
                <ButtonLink href="/iletisim" variant="outline" size="lg"
                  className="!border-white/20 !bg-transparent !text-deep-ink hover:!border-lime hover:!text-lime">
                  İletişime geç
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
