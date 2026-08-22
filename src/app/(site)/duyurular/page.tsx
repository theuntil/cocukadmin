import type { Metadata } from "next";
import { Badge, Card, Container, EmptyState, H3, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Icon } from "@/components/ui/icon";
import { IconMegaphone } from "@/components/ui/icons";
import { getAnnouncements } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Duyurular", description: "Çocuk Tribünü resmî duyuruları." };
export const revalidate = 120;

const PRIORITY: Record<string, { label: string; tone: "green" | "orange" | "danger" | "muted" }> = {
  critical: { label: "Kritik", tone: "danger" },
  high: { label: "Önemli", tone: "orange" },
  normal: { label: "Duyuru", tone: "muted" },
  low: { label: "Bilgi", tone: "muted" },
};

export default async function Page() {
  const items = await getAnnouncements();

  return (
    <>
      <PageHeader eyebrow="DUYURULAR" title="Resmî duyurular" description="Kampanya, etkinlik ve hizmet değişikliklerine dair güncel bildirimler." />
      <Section className="!pt-8">
        <Container className="max-w-[860px]">
          {items.length === 0 ? (
            <EmptyState icon={<Icon icon={IconMegaphone} size={26} />} title="Şu an aktif duyuru yok" />
          ) : (
            <div className="ct-stagger flex flex-col gap-4">
              {items.map((a) => {
                const p = PRIORITY[a.priority] ?? PRIORITY.normal;
                return (
                  <Card key={a.id} className="flex flex-col gap-3 p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={p.tone}>{p.label}</Badge>
                      <span className="text-[13px] text-muted">{formatDate(a.starts_at)}</span>
                    </div>
                    <H3 className="text-[19px]">{a.title}</H3>
                    {a.summary && <p className="text-[14.5px] leading-[1.65] text-ink2">{a.summary}</p>}
                    <div className="whitespace-pre-line text-[14.5px] leading-[1.7] text-ink2">{a.content}</div>
                  </Card>
                );
              })}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
