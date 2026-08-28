"use client";

import * as React from "react";
import { Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconChart, IconUsers, IconFile, IconShare } from "@/components/ui/icons";
import { DateFilter, type DateRange, quickRanges } from "@/components/admin/date-filter";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  period: string; from: string; to: string;
  range_views: number; range_unique: number;
  today: number; yesterday: number; this_week: number; this_month: number; total: number;
  series: { bucket: string; label: string; count: number; unique: number }[];
  top_paths: { path: string; count: number }[];
  devices: { device: string; count: number }[];
  referrers: { host: string; count: number }[];
}

/**
 * Görüntülenme istatistikleri.
 *
 * Varsayılan BUGÜN. Süzgeç penceresinden hazır aralık, ay veya serbest
 * tarih aralığı seçilebilir. Sayfa yatay kaymaz: her bölüm kendi
 * genişliğine sığar.
 */
export function ViewStats() {
  const quick = React.useMemo(() => quickRanges(), []);

  // Varsayılan: Bugün
  const [range, setRange] = React.useState<DateRange>(quick[0]!);
  const [data, setData] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);

    void (async () => {
      try {
        const supabase = createClient();
        const { data: res } = await supabase.rpc("admin_view_stats", {
          p_from: range.from,
          p_to: range.to,
          p_period: "day",
        });
        if (alive) setData((res ?? null) as Stats | null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [range]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[24px] font-semibold tracking-[-.03em] sm:text-[28px]">
            Görüntülenmeler
          </h1>
          <span className="text-[13.5px] text-muted sm:text-[14px]">
            {range.label} · sayfa görüntülenmeleri
          </span>
        </div>

        <DateFilter value={range} onChange={setRange} quick={quick} />
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="h-[86px] animate-pulse p-5"><span /></Card>
          ))}
        </div>
      ) : !data ? (
        <EmptyState icon={<Icon icon={IconChart} size={24} />} title="Veri yok" />
      ) : (
        <>
          {/* Sayaçlar */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat icon={IconChart} label={`${range.label} · görüntülenme`}
              value={data.range_views} tone="accent" />
            <Stat icon={IconUsers} label="Tekil ziyaretçi" value={data.range_unique} />
            <Stat icon={IconChart} label="Bugün" value={data.today} />
            <Stat icon={IconChart} label="Bu ay" value={data.this_month} />
          </div>

          {/* Zaman serisi */}
          <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
            <span className="font-display text-[16px] font-semibold tracking-[-.02em] sm:text-[17px]">
              Günlük dağılım
            </span>
            {data.series.length === 0 ? (
              <span className="py-6 text-center text-[13.5px] text-muted">
                Bu aralıkta görüntülenme yok.
              </span>
            ) : (
              <Chart data={data.series} />
            )}
          </Card>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
            {/* En çok görüntülenen sayfalar */}
            <Card className="flex min-w-0 flex-col gap-3.5 p-5 sm:p-6">
              <span className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-[-.02em] sm:text-[17px]">
                <Icon icon={IconFile} size={16} className="text-muted" /> En çok görüntülenen
              </span>
              <List items={data.top_paths.map((p) => ({
                label: p.path === "/" ? "Ana sayfa" : p.path, value: p.count,
              }))} />
            </Card>

            {/* Cihaz */}
            <Card className="flex min-w-0 flex-col gap-3.5 p-5 sm:p-6">
              <span className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-[-.02em] sm:text-[17px]">
                <Icon icon={IconUsers} size={16} className="text-muted" /> Cihaz
              </span>
              <List items={data.devices.map((d) => ({
                label: d.device, value: d.count,
              }))} />
            </Card>

            {/* Kaynak */}
            <Card className="flex min-w-0 flex-col gap-3.5 p-5 sm:p-6 lg:col-span-2">
              <span className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-[-.02em] sm:text-[17px]">
                <Icon icon={IconShare} size={16} className="text-muted" /> Nereden geldiler
              </span>
              <List items={data.referrers.map((r) => ({
                label: r.host, value: r.count,
              }))} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon, label, value, tone,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  label: string; value: number; tone?: "accent";
}) {
  return (
    <Card className={`flex items-center gap-3 p-4 sm:gap-4 sm:p-5 ${
      tone === "accent" ? "border-ink/25 bg-chip" : ""}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-surface sm:h-11 sm:w-11 sm:rounded-[13px]">
        <Icon icon={icon} size={16} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-[19px] font-semibold leading-none tracking-[-.02em] sm:text-[24px]">
          {value.toLocaleString("tr-TR")}
        </span>
        <span className="truncate text-[11.5px] text-muted sm:text-[12.5px]">{label}</span>
      </div>
    </Card>
  );
}

/** Sütun grafiği — kaydırma yok, mevcut genişliğe sığar */
function Chart({
  data,
}: { data: { bucket: string; label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  // Çok fazla gün varsa etiketler seyrekleştirilir
  const step = data.length > 20 ? Math.ceil(data.length / 12) : 1;

  return (
    <div className="flex h-[160px] w-full min-w-0 items-end gap-[2px] sm:gap-1">
      {data.map((d, i) => (
        <div key={d.bucket} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[9px] font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100 sm:text-[10.5px]">
            {d.count}
          </span>
          <span className="w-full rounded-t-[3px] bg-solid transition-all hover:opacity-80"
            title={`${d.label}: ${d.count}`}
            style={{ height: `${Math.max((d.count / max) * 100, 2)}px` }} />
          <span className="w-full truncate text-center text-[8.5px] text-muted2 sm:text-[10px]">
            {i % step === 0 ? d.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function List({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) {
    return <span className="py-3 text-[13.5px] text-muted">Veri yok.</span>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[13px] text-ink2">{it.label}</span>
            <span className="shrink-0 text-[13px] font-semibold">
              {it.value.toLocaleString("tr-TR")}
            </span>
          </div>
          <span className="h-1.5 overflow-hidden rounded-full bg-chip">
            <span className="block h-full rounded-full bg-solid"
              style={{ width: `${(it.value / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
