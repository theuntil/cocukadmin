import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, EmptyState, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Icon } from "@/components/ui/icon";
import { IconFootball } from "@/components/ui/icons";
import { getTeams, getCities } from "@/lib/data";
import { publicStorageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Takımlar",
  description: "Çocuk Tribünü kombine kartı düzenlenebilen takımlar.",
};

export const revalidate = 3600;

export default async function TeamsPage() {
  const [teams, cities] = await Promise.all([getTeams(), getCities()]);
  const cityMap = new Map(cities.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader eyebrow="TAKIMLAR" title="Tribünler tek çatı altında."
        description="Aşağıdaki takımlar için Çocuk Tribünü kombine kartı düzenlenebilir. Rekabet sahada kalır; çocuklar aynı tribünün parçasıdır." />

      <Section className="!pt-8">
        <Container>
          {teams.length === 0 ? (
            <EmptyState icon={<Icon icon={IconFootball} size={26} />} title="Takım listesi yükleniyor" />
          ) : (
            <div className="ct-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t) => {
                const logo = publicStorageUrl("team-logos", t.logo_path);
                return (
                  <Link key={t.id} href={`/takimlar/${t.slug}`}>
                    <Card className="flex items-center gap-4 p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-accent-line">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-chip">
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" />
                        ) : (
                          <span className="font-display text-[15px] font-bold text-muted">{(t.short_name ?? t.name).slice(0, 3).toUpperCase()}</span>
                        )}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-display text-[17px] font-semibold tracking-[-.01em]">{t.name}</span>
                        <span className="text-[13px] text-muted">{t.city_id ? cityMap.get(t.city_id) : "—"}</span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
