import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink, Card, Container, Eyebrow, H2, H3, Lead, Section, StatBlock } from "@/components/ui";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/icon";
import { IconArrowRight, IconCalendar, IconLocation } from "@/components/ui/icons";
import { getTeam, getTeamSlugs, getCities, getEvents, getMainCampaign, getCampaignLeaderboard } from "@/lib/data";
import { publicStorageUrl, formatDate, formatNumber } from "@/lib/utils";

export const revalidate = 600;

export async function generateStaticParams() {
  const slugs = await getTeamSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTeam(slug);
  if (!t) return { title: "Takım bulunamadı" };
  return {
    title: t.name,
    description: t.description ?? `${t.name} taraftarı çocuklar için Çocuk Tribünü kombine kartı.`,
    alternates: { canonical: `/takimlar/${t.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) notFound();

  const [cities, events, campaign] = await Promise.all([getCities(), getEvents({ limit: 30 }), getMainCampaign()]);
  const leaderboard = campaign ? await getCampaignLeaderboard(campaign.campaign_id) : [];
  const teamStat = leaderboard.find((l) => l.team_id === team.id);
  const teamEvents = events.filter((e) => e.required_team_id === team.id);
  const cityName = team.city_id ? cities.find((c) => c.id === team.city_id)?.name : null;
  const logo = publicStorageUrl("team-logos", team.logo_path);

  return (
    <>
      <div className="border-b border-line2 bg-[radial-gradient(120%_90%_at_8%_0%,var(--surface)_0%,var(--page)_46%,var(--page)_100%)]">
        <Container className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="ct-rise flex flex-col gap-6">
            <Link href="/takimlar" className="text-[13.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">← Tüm takımlar</Link>
            <div className="flex flex-wrap items-center gap-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-line bg-surface">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="font-display text-[20px] font-bold text-muted">{(team.short_name ?? team.name).slice(0, 3).toUpperCase()}</span>
                )}
              </span>
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-[34px] leading-[1.05] font-semibold tracking-[-.035em] sm:text-[44px]">{team.name}</h1>
                {cityName && (
                  <span className="flex items-center gap-2 text-[14.5px] text-muted">
                    <Icon icon={IconLocation} size={16} />{cityName}
                  </span>
                )}
              </div>
            </div>
            {team.description && <Lead className="max-w-[640px]">{team.description}</Lead>}
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            <Reveal><Card className="p-6"><StatBlock value={formatNumber(teamStat?.signature_count ?? 0)} label="bu takımdan imza" tone="green" /></Card></Reveal>
            <Reveal delay={60}><Card className="p-6"><StatBlock value={teamStat?.rank ? `#${teamStat.rank}` : "—"} label="imza sıralaması" tone="orange" /></Card></Reveal>
            <Reveal delay={120}><Card className="p-6"><StatBlock value={formatNumber(teamEvents.length)} label="takıma özel etkinlik" /></Card></Reveal>
          </div>

          <Reveal delay={100}>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-line bg-surface p-7">
              <div className="flex flex-col gap-1.5">
                <H3>{team.name} kombine kartı</H3>
                <p className="text-[14px] text-ink2">Çocuğunuzun adına düzenlenmiş, 12 ay geçerli kart.</p>
              </div>
              <ButtonLink href="/panel/kombine-kart" variant="solid" size="lg">
                Başvur <Icon icon={IconArrowRight} size={16} />
              </ButtonLink>
            </div>
          </Reveal>

          {teamEvents.length > 0 && (
            <Reveal delay={140} className="mt-12 flex flex-col gap-5">
              <Eyebrow className="text-accent-ink">TAKIMA ÖZEL ETKİNLİKLER</Eyebrow>
              <H2 className="text-[28px]">Yaklaşan buluşmalar</H2>
              <div className="grid gap-4 md:grid-cols-2">
                {teamEvents.map((e) => (
                  <Link key={e.id} href={`/etkinlikler/${e.slug}`}>
                    <Card className="flex flex-col gap-3 p-5 transition-colors hover:border-accent-line">
                      <H3 className="text-[17px]">{e.title}</H3>
                      <span className="flex items-center gap-2 text-[13.5px] text-muted">
                        <Icon icon={IconCalendar} size={15} />{formatDate(e.starts_at, true)}
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </Reveal>
          )}
        </Container>
      </Section>
    </>
  );
}
