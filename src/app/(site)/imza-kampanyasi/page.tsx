import type { Metadata } from "next";
import Script from "next/script";
import { Card, Container, Eyebrow, H2, H3, Lead, ProgressBar, Section, StatBlock } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { SignatureForm } from "@/components/site/signature-form";
import { ShareButtons } from "@/components/site/share-buttons";
import { Reveal, CountUp } from "@/components/ui/motion";
import { Accordion } from "@/components/site/faq";
import { Icon } from "@/components/ui/icon";
import { IconShield, IconUsers, IconTarget } from "@/components/ui/icons";
import { getMainCampaign, getCampaignLeaderboard, getTeams, getCities, getSiteSettings, settingBool } from "@/lib/data";
import { formatDate, formatNumber, publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "İmza Kampanyası",
  description: "Çocukların stadyumda güvenle maç izleyebilmesi için imza kampanyamıza katılın. Üyelik gerekmez.",
};

export const revalidate = 60;

const FAQ = [
  { q: "İmza vermek için üye olmam gerekiyor mu?", a: "Hayır. İmza vermek tamamen üyeliksizdir; ad, soyad ve telefon numaranızla 30 saniyede tamamlanır." },
  { q: "Telefon numaram saklanıyor mu?", a: "Hayır. Numaranız açık şekilde veritabanına yazılmaz. Yalnızca aynı kişinin iki kez imza vermesini engellemek için geri döndürülemez bir özeti (hash) tutulur." },
  { q: "Aynı kişi birden fazla imza verebilir mi?", a: "Veremez. Mükerrer imza veritabanı düzeyinde engellenir; numaranızı farklı biçimde yazsanız bile sistem aynı kişi olduğunuzu anlar ve ikinci imzayı reddeder." },
  { q: "İmzam kimlerle paylaşılıyor?", a: "İmza kayıtları kamuya açık değildir. Yalnızca toplam sayılar ve takım bazlı istatistikler herkese gösterilir. Ad ve soyadınız listelenmez." },
  { q: "İmzamı geri çekebilir miyim?", a: "Evet. İletişim sayfasından bize yazmanız yeterli; kaydınızı iptal ederiz." },
];

export default async function SignaturePage() {
  const [campaign, teams, cities, settings] = await Promise.all([
    getMainCampaign(), getTeams(), getCities(), getSiteSettings(),
  ]);
  const signaturesOpen = settingBool(settings, "signatures.enabled", true);
  const leaderboard = campaign ? await getCampaignLeaderboard(campaign.campaign_id) : [];
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const count = campaign?.signature_count ?? 0;
  const target = campaign?.target_signature_count ?? 100000;
  const progress = campaign?.progress_percent ?? 0;

  return (
    <>
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}

      {/* Kampanya başlığı + ilerleme + imza formu tek ekranda.
          Klasik form sayfası yerine gerçek bir kampanya platformu düzeni. */}
      <Section className="!pb-8 !pt-10 sm:!pt-14">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
            <div className="flex flex-col gap-5">
              <Eyebrow className="text-accent-ink">İMZA KAMPANYASI</Eyebrow>
              <h1 className="font-display text-[34px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[46px]">
                {campaign?.title ?? "Çocuklar Tribünde Olsun"}
              </h1>
              <p className="max-w-[560px] text-[16px] leading-[1.7] text-ink2">
                Her çocuğun stadyumda güvenle maç izleyebilmesi için kulüpleri ve
                federasyonu göreve çağırıyoruz. İmzalamak ücretsizdir ve üyelik gerektirmez.
              </p>

              {/* İlerleme — hedefe ne kadar kaldığı hemen görünsün */}
              <Card className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="font-display text-[38px] font-semibold leading-none tracking-[-.03em] text-green">
                      <CountUp to={count} />
                    </span>
                    <span className="mt-1 text-[13px] text-muted">imza toplandı</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-[20px] font-semibold text-ink2">
                      {formatNumber(target)}
                    </span>
                    <div className="text-[13px] text-muted">hedef</div>
                  </div>
                </div>

                <ProgressBar value={progress} />

                <div className="flex flex-wrap justify-between gap-2 text-[13px] text-muted">
                  <span className="font-semibold text-ink2">
                    %{(progress ?? 0).toFixed(1)} tamamlandı
                  </span>
                  <span>
                    {target - count > 0
                      ? `${formatNumber(target - count)} imza kaldı`
                      : "Hedefe ulaşıldı"}
                  </span>
                </div>
              </Card>
            </div>

            {/* İmza formu — sayfanın en üstünde, görünür konumda */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {!signaturesOpen ? (
                <Card className="flex flex-col gap-3 p-7">
                  <span className="font-display text-[20px] font-semibold tracking-[-.02em]">
                    Kampanya geçici olarak kapalı
                  </span>
                  <p className="text-[14px] leading-[1.6] text-ink2">
                    İmza toplama ara verildi. Kısa süre içinde tekrar açacağız.
                  </p>
                </Card>
              ) : (
                <SignatureForm
                  campaignSlug={campaign?.slug ?? "cocuklar-tribunde-olsun"}
                  teams={teams}
                  cities={cities}
                  requiresTeam
                />
              )}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="!pt-4">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col gap-10">

              <Reveal delay={80} className="flex flex-col gap-4">
                <Eyebrow className="text-accent-ink">NE İSTİYORUZ</Eyebrow>
                <H2>Üç somut talep.</H2>
                <div className="flex flex-col gap-4">
                  {[
                    { icon: IconShield, t: "Çocuk dostu tribün bölümü", d: "Her stadyumda, aile ve çocuklar için ayrılmış, güvenlik ve hijyen standartları belirlenmiş bir bölüm oluşturulmasını istiyoruz." },
                    { icon: IconUsers, t: "Erişilebilir çocuk bileti", d: "12 yaş altı çocuklar için sembolik bedelli, tüm kulüplerde geçerli standart bir bilet politikası talep ediyoruz." },
                    { icon: IconTarget, t: "Tribün dili için farkındalık", d: "Kulüplerin ve taraftar gruplarının, çocukların bulunduğu bölümlerde dil ve davranış konusunda ortak bir taahhüt vermesini istiyoruz." },
                  ].map((item) => (
                    <div key={item.t} className="flex gap-4 rounded-[18px] border border-line bg-surface p-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
                        <Icon icon={item.icon} size={20} />
                      </span>
                      <div className="flex flex-col gap-1.5">
                        <H3 className="text-[17px]">{item.t}</H3>
                        <p className="text-[14px] leading-[1.6] text-ink2">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

            </div>

            <div className="flex flex-col gap-10">
              {leaderboard.length > 0 && (
                <Reveal delay={100} className="flex flex-col gap-4">
                  <Eyebrow className="text-accent-ink">TAKIM SIRALAMASI</Eyebrow>
                  <H2>Hangi tribün önde?</H2>
                  <Card className="divide-y divide-line2">
                    {leaderboard.slice(0, 12).map((t) => {
                      const logo = publicStorageUrl("team-logos", t.logo_path);
                      const max = leaderboard[0]?.signature_count || 1;
                      return (
                        <div key={t.team_id} className="flex items-center gap-4 px-5 py-3.5">
                          <span className="w-6 shrink-0 font-display text-[15px] font-semibold text-muted2">{t.rank}</span>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-chip">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logo} alt="" className="h-full w-full object-contain" loading="lazy" />
                            ) : (
                              <span className="text-[11px] font-bold text-muted">{t.team_name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <span className="truncate text-[14.5px] font-semibold">{t.team_name}</span>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-chip">
                              <div className="h-full rounded-full bg-accent transition-[width] duration-700"
                                style={{ width: `${(t.signature_count / max) * 100}%` }} />
                            </div>
                          </div>
                          <span className="shrink-0 text-[14px] font-bold text-accent-ink">{formatNumber(t.signature_count)}</span>
                        </div>
                      );
                    })}
                  </Card>
                </Reveal>
              )}

              {/* Paylaşım — kampanyanın yayılması için */}
              <Reveal delay={140}>
                <Card className="flex flex-col gap-4 p-6">
                  <div className="flex flex-col gap-1.5">
                    <Eyebrow className="text-accent-ink">YAYALIM</Eyebrow>
                    <H3 className="text-[19px]">Bir imza da arkadaşınızdan</H3>
                    <p className="text-[14px] leading-[1.6] text-ink2">
                      Kampanyayı paylaşmak, imzalamak kadar değerli.
                    </p>
                  </div>
                  <ShareButtons
                    title="Çocuklar Tribünde Olsun"
                    text="Her çocuğun stadyumda güvenle maç izleyebilmesi için imza kampanyasına katıl."
                  />
                </Card>
              </Reveal>
            </div>

          </div>
        </Container>
      </Section>

      <Section id="nasil" className="border-t border-line2 bg-surface/40">
        <Container className="max-w-[820px]">
          <Reveal className="mb-8 flex flex-col gap-3">
            <Eyebrow className="text-accent-ink">SIKÇA SORULANLAR</Eyebrow>
            <H2>Nasıl çalışıyor?</H2>
            <Lead>İmza sisteminin gizlilik ve güvenlik tarafını merak edenler için.</Lead>
          </Reveal>
          <Accordion items={FAQ} />
        </Container>
      </Section>
    </>
  );
}
