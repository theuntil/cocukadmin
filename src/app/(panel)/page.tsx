import type { Metadata } from "next";
import Link from "next/link";
import { Card, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconOrder, IconCard, IconUsers, IconMoney, IconAlert,
  IconSignature, IconCalendar, IconMail, IconArrowRight, IconChart,
} from "@/components/ui/icons";
import { getDashboard, getRecentActivity, getAnalyticsSummary } from "@/lib/data";
import { formatMoney, formatNumber, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Gösterge Paneli" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const [stats, activity, analytics] = await Promise.all([
    getDashboard(), getRecentActivity(15), getAnalyticsSummary(30),
  ]);

  const todo = [
    { label: "Bekleyen ödeme", value: stats.pending_payments, href: "/siparisler?durum=bekleyen" },
    { label: "Süresi yaklaşan kart", value: stats.expiring_cards, href: "/kartlar?durum=expiring" },
    { label: "Süresi dolmuş kart", value: stats.expired_cards, href: "/kartlar?durum=expired" },
    { label: "Faturasız sipariş", value: stats.orders_no_invoice, href: "/siparisler?fatura=yok" },
  ].filter((t) => t.value > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Gösterge paneli</h1>
        <span className="text-[14px] text-muted">Sistemin genel durumu</span>
      </div>

      {/* Bekleyen işler */}
      {todo.length > 0 && (
        <Card className="flex flex-col gap-4 border-orange-line bg-orange-bg p-6">
          <span className="flex items-center gap-2.5 text-[14.5px] font-semibold text-orange-ink">
            <Icon icon={IconAlert} size={18} /> Bekleyen işler
          </span>
          <div className="flex flex-wrap gap-2.5">
            {todo.map((t) => (
              <Link key={t.label} href={t.href}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90">
                {t.label}
                <span className="rounded-full bg-white/25 px-2 text-[12px]">{t.value}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Ana metrikler */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={IconMoney} label="30 günlük ciro" value={formatMoney(stats.revenue_30d)} tone="accent" />
        <Stat icon={IconCard} label="Aktif kart" value={formatNumber(stats.active_cards)} />
        <Stat icon={IconUsers} label="Toplam üye" value={formatNumber(stats.total_users)}
          note={stats.new_users_7d > 0 ? `+${stats.new_users_7d} son 7 gün` : undefined} />
        <Stat icon={IconCard} label="Süresi yaklaşan kart" value={formatNumber(stats.expiring_cards)}
          note={stats.expired_cards > 0 ? `${stats.expired_cards} süresi dolmuş` : undefined} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={IconOrder} label="Açık sipariş" value={formatNumber(stats.open_orders)} small />
        <Stat icon={IconSignature} label="Doğrulanmış imza" value={formatNumber(stats.signatures)} small />
        <Stat icon={IconCalendar} label="Yaklaşan etkinlik" value={formatNumber(stats.upcoming_events)} small />
        <Stat icon={IconMail} label="Bülten abonesi" value={formatNumber(stats.newsletter_subs)} small />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        {/* Son hareketler */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <H3 className="text-[18px]">Son hareketler</H3>
          </div>
          <div className="divide-y divide-line2">
            {activity.length === 0 ? (
              <p className="px-6 py-10 text-center text-[14px] text-muted">Henüz hareket yok.</p>
            ) : (
              activity.map((a, i) => (
                <div key={`${a.kind}-${a.ref}-${i}`} className="flex items-center gap-3.5 px-6 py-3.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${KIND_STYLE[a.kind] ?? "bg-chip text-muted"}`}>
                    <Icon icon={KIND_ICON[a.kind] ?? IconOrder} size={16} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold">{a.title}</span>
                    <span className="truncate text-[12.5px] text-muted">{a.subtitle}</span>
                  </div>
                  <span className="shrink-0 text-[12px] text-muted2">{relativeTime(a.at)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Görüntülenme özeti */}
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <H3 className="text-[18px]">Görüntülenmeler</H3>
            <Link href="/goruntulenmeler"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
              Detay <Icon icon={IconArrowRight} size={14} />
            </Link>
          </div>

          <div className="flex flex-col gap-3.5">
            <Row label="Bugün" value={formatNumber(analytics.today_views)} />
            <Row label="Son 30 gün" value={formatNumber(analytics.total_views)} />
            <Row label="Tekil ziyaretçi" value={formatNumber(analytics.unique_views)} />
            <Row label="Mobil oranı" value={`%${analytics.mobile_share}`} />
            <Row label="İzlenen sayfa" value={formatNumber(analytics.pages_tracked)} />
          </div>

          <div className="mt-auto flex items-center gap-2.5 rounded-[12px] bg-chip px-4 py-3">
            <Icon icon={IconChart} size={15} className="shrink-0 text-muted" />
            <span className="text-[12.5px] leading-[1.5] text-muted">
              Bot trafiği ayrılır, IP saklanmaz.
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

const KIND_ICON: Record<string, Parameters<typeof Icon>[0]["icon"]> = {
  order: IconOrder, signature: IconSignature, user: IconUsers,
};

const KIND_STYLE: Record<string, string> = {
  order: "bg-chip text-ink",
  signature: "bg-chip text-ink2",
  user: "bg-green-soft text-green",
};

function Stat({
  icon, label, value, note, tone, small,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  label: string; value: string; note?: string; tone?: "accent"; small?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${
        tone === "accent" ? "bg-solid text-on-solid" : "bg-chip text-ink2"}`}>
        <Icon icon={icon} size={18} />
      </span>
      <span className={`font-display font-semibold tracking-[-.02em] ${small ? "text-[22px]" : "text-[26px]"}`}>
        {value}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] text-muted">{label}</span>
        {note && <span className="text-[12px] font-semibold text-green">{note}</span>}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line2 pb-3 last:border-0">
      <span className="text-[13.5px] text-muted">{label}</span>
      <span className="text-[15px] font-bold">{value}</span>
    </div>
  );
}
