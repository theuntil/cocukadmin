"use client";

import * as React from "react";
import { Badge, Card, EmptyState, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconFootball, IconSearch, IconUsers, IconChild, IconCard,
  IconCalendar, IconCash, IconStar,
} from "@/components/ui/icons";
import { DateFilter, type DateRange } from "@/components/admin/date-filter";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl, formatMoney } from "@/lib/utils";

interface TeamRow {
  id: string; name: string; slug: string; logo_path: string | null;
  city_name: string | null; is_active: boolean;
  supporters: number; children: number; active_cards: number;
}

interface TeamDetail {
  id: string; name: string; short_name: string | null; logo_path: string | null;
  color_primary: string | null; city_name: string | null; is_active: boolean;
  supporters: number; children: number;
  cards_total: number; cards_active: number; cards_expired: number; cards_expiring: number;
  orders_total: number; orders_completed: number; revenue: number;
  events_total: number; event_registrations: number;
  age_groups: { label: string; count: number }[];
  gender: { female: number; male: number; unspecified: number };
  monthly_cards: { month: string; label: string; year: number; count: number }[];
  filtered: boolean;
  from: string | null;
  to: string | null;
}

/**
 * Takım istatistikleri.
 *
 * Solda aranabilir takım listesi, sağda seçilen takımın ayrıntıları.
 * Mobilde liste üstte yatay şerit olur, ayrıntılar altında akar.
 */
export function TeamStats({
  teams, lockedTeamId,
}: {
  teams: TeamRow[];
  /**
   * Tek takıma kilitle.
   *
   * Takım detay sayfasından çağrıldığında sol taraftaki takım listesi
   * gereksiz — hangi takımda olduğunuz zaten belli. Liste gizlenir ve
   * ayrıntılar tüm genişliği kullanır.
   */
  lockedTeamId?: string;
}) {
  const kilitli = Boolean(lockedTeamId);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(
    lockedTeamId ?? teams[0]?.id ?? null,
  );
  const [detail, setDetail] = React.useState<TeamDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  /* Varsayılan TÜMÜ. Süzgeç penceresinden aralık seçilebilir. */
  const [range, setRange] = React.useState<DateRange>({
    from: null, to: null, label: "Tümü",
  });

  React.useEffect(() => {
    if (!selected) return;
    let alive = true;

    setLoading(true);
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc("admin_team_stats", {
          p_team_id: selected,
          p_from: range.from,
          p_to: range.to,
        });
        if (alive) setDetail((data ?? null) as TeamDetail | null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [selected, range]);

  const q = query.trim().toLocaleLowerCase("tr-TR");
  const list = q
    ? teams.filter((t) => t.name.toLocaleLowerCase("tr-TR").includes(q)
        || (t.city_name ?? "").toLocaleLowerCase("tr-TR").includes(q))
    : teams;

  if (teams.length === 0) {
    return <EmptyState icon={<Icon icon={IconFootball} size={26} />} title="Takım yok" />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[24px] font-semibold tracking-[-.03em] sm:text-[28px]">
            İstatistikler
          </h1>
          <span className="text-[13.5px] text-muted sm:text-[14px]">
            Takım seçerek üye, çocuk ve kart dağılımını inceleyin.
          </span>
        </div>

        <DateFilter value={range} onChange={setRange} />
      </div>

      <div className={kilitli
        ? "grid min-w-0 gap-5"
        : "grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6"}>
        {/* Takım listesi — tek takıma kilitliyken gösterilmez */}
        {!kilitli && (
        <Card className="flex min-w-0 flex-col gap-3 p-4 lg:sticky lg:top-6">
          <div className="relative">
            <Icon icon={IconSearch} size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Takım ara" className="!h-10 !pl-9 !text-[13.5px]" />
          </div>

          {/* Mobilde iki sütunlu ızgara (yatay kaydırma yok),
              masaüstünde dikey liste */}
          <div className="grid max-h-[280px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:max-h-[520px] lg:grid-cols-1">
            {list.map((t) => {
              const active = selected === t.id;
              const logo = publicStorageUrl("team-logos", t.logo_path);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  aria-pressed={active}
                  className={`flex min-w-0 items-center gap-2.5 rounded-[12px] border p-2.5 text-left transition-colors ${
                    active ? "border-ink bg-chip" : "border-transparent hover:bg-chip/60"
                  }`}
                >
                  {logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-chip">
                      <Icon icon={IconFootball} size={14} className="text-muted2" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-semibold">{t.name}</span>
                    <span className="truncate text-[11px] text-muted">
                      {t.active_cards} kart · {t.supporters} üye
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
        )}

        {/* Ayrıntılar */}
        <div className="flex min-w-0 flex-col gap-5">
          {loading && !detail ? (
            <Card className="h-[200px] animate-pulse p-6"><span /></Card>
          ) : detail ? (
            <TeamDetailView detail={detail} rangeLabel={range.label} />
          ) : (
            <EmptyState icon={<Icon icon={IconFootball} size={24} />}
              title="Takım seçin" />
          )}
        </div>
      </div>
    </div>
  );
}

function TeamDetailView({
  detail, rangeLabel,
}: { detail: TeamDetail; rangeLabel: string }) {
  const logo = publicStorageUrl("team-logos", detail.logo_path);
  const totalChildren = detail.gender.female + detail.gender.male
    + detail.gender.unspecified;

  return (
    <>
      {/* Başlık */}
      <Card className="flex flex-wrap items-center gap-5 p-6 sm:p-7">
        {logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logo} alt={detail.name}
            className="h-14 w-14 shrink-0 object-contain sm:h-20 sm:w-20" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-chip sm:h-20 sm:w-20">
            <Icon icon={IconFootball} size={26} className="text-muted2" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-[20px] font-semibold tracking-[-.03em] sm:text-[24px]">
              {detail.name}
            </h2>
            {!detail.is_active && <Badge tone="muted">Pasif</Badge>}
            {detail.filtered && <Badge tone="lime">{rangeLabel}</Badge>}
          </div>
          {detail.city_name && (
            <span className="text-[13.5px] text-muted">{detail.city_name}</span>
          )}
        </div>
      </Card>



      {/* Ana sayılar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={IconCard} label="Aktif kombine kart" value={detail.cards_active}
          hint={detail.cards_expiring > 0
            ? `${detail.cards_expiring} kart 30 gün içinde bitiyor` : undefined}
          tone="accent" />
        <Stat icon={IconUsers} label="Bu takımı tutan üye" value={detail.supporters} />
        <Stat icon={IconChild} label="Bu takımı tutan çocuk" value={detail.children} />
        <Stat icon={IconCash} label="Toplam gelir"
          value={formatMoney(detail.revenue, "TRY")} isText />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Kart dağılımı */}
        <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <span className="font-display text-[16px] sm:text-[17px] font-semibold tracking-[-.02em]">
            Kart durumu
          </span>
          <Bar label="Aktif" value={detail.cards_active} total={detail.cards_total} tone="green" />
          <Bar label="Süresi dolmuş" value={detail.cards_expired} total={detail.cards_total} tone="muted" />
          <Bar label="Yakında bitiyor" value={detail.cards_expiring} total={detail.cards_total} tone="orange" />
          <div className="flex items-center justify-between border-t border-line2 pt-3">
            <span className="text-[13px] text-muted">Toplam kart</span>
            <span className="text-[15px] font-semibold">{detail.cards_total}</span>
          </div>
        </Card>

        {/* Yaş dağılımı */}
        <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <span className="font-display text-[16px] sm:text-[17px] font-semibold tracking-[-.02em]">
            Yaş dağılımı
          </span>
          {detail.age_groups.map((g) => (
            <Bar key={g.label} label={g.label} value={g.count}
              total={detail.children || 1} tone="accent" />
          ))}
          {detail.children === 0 && (
            <span className="py-2 text-[13.5px] text-muted">Henüz çocuk kaydı yok.</span>
          )}
        </Card>

        {/* Cinsiyet */}
        <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <span className="font-display text-[16px] sm:text-[17px] font-semibold tracking-[-.02em]">
            Cinsiyet dağılımı
          </span>
          <Bar label="Kız" value={detail.gender.female} total={totalChildren || 1} tone="accent" />
          <Bar label="Erkek" value={detail.gender.male} total={totalChildren || 1} tone="green" />
          {detail.gender.unspecified > 0 && (
            <Bar label="Belirtilmemiş" value={detail.gender.unspecified}
              total={totalChildren || 1} tone="muted" />
          )}
        </Card>

        {/* Son 6 ay */}
        <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <span className="font-display text-[16px] sm:text-[17px] font-semibold tracking-[-.02em]">
            Son 6 ayda çıkarılan kart
          </span>
          <MiniChart data={detail.monthly_cards} />
        </Card>
      </div>

      {/* Etkinlik ve sipariş */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat icon={IconCalendar} label="Takıma özel etkinlik" value={detail.events_total} />
        <Stat icon={IconStar} label="Etkinlik kaydı" value={detail.event_registrations} />
        <Stat icon={IconCard} label="Tamamlanan sipariş" value={detail.orders_completed}
          hint={`${detail.orders_total} toplam`} />
      </div>
    </>
  );
}

/* ── Yardımcı görseller ── */

function Stat({
  icon, label, value, hint, tone, isText,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  label: string; value: number | string; hint?: string;
  tone?: "accent"; isText?: boolean;
}) {
  return (
    <Card className={`flex items-center gap-3 p-4 sm:gap-4 sm:p-5 ${
      tone === "accent" ? "border-ink/25 bg-chip" : ""}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-surface sm:h-11 sm:w-11 sm:rounded-[13px]">
        <Icon icon={icon} size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={`font-display font-semibold leading-none tracking-[-.02em] ${
          isText ? "text-[15px] sm:text-[18px]" : "text-[19px] sm:text-[24px]"}`}>
          {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
        </span>
        <span className="truncate text-[11.5px] text-muted sm:text-[12.5px]">{label}</span>
        {hint && <span className="truncate text-[11.5px] text-muted2">{hint}</span>}
      </div>
    </Card>
  );
}

function Bar({
  label, value, total, tone,
}: {
  label: string; value: number; total: number;
  tone: "accent" | "green" | "orange" | "muted";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = tone === "green" ? "bg-green"
    : tone === "orange" ? "bg-orange-ink"
    : tone === "muted" ? "bg-line2" : "bg-solid";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-ink2">{label}</span>
        <span className="text-[13px] font-semibold">
          {value} <span className="text-muted">· %{pct}</span>
        </span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-chip">
        <span className={`block h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function MiniChart({ data }: { data: { month: string; label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    /* Kaydırma yok: 12 sütun mevcut genişliğe sığdırılır. Etiketler
       dar ekranda dikey yazılır, taşma olmaz. */
    <div className="flex h-[140px] w-full min-w-0 items-end gap-[3px] sm:gap-1.5">
      {data.map((d) => (
        <div key={d.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[9.5px] font-semibold text-muted sm:text-[11px]">
            {d.count}
          </span>
          <span className="w-full rounded-t-[4px] bg-solid transition-all sm:rounded-t-[6px]"
            style={{ height: `${Math.max((d.count / max) * 78, 3)}px` }} />
          <span className="w-full truncate text-center text-[9px] text-muted2 sm:text-[10.5px]">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}



