"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconFilter, IconClose, IconCalendar } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

export interface DateRange {
  from: string | null;
  to: string | null;
  /** Kullanıcıya gösterilecek ad — "Tümü", "Bugün", "Ocak 2026"… */
  label: string;
}

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Hazır aralıklar */
export function quickRanges(): DateRange[] {
  const now = new Date();
  const today = iso(now);

  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return iso(d);
  };

  return [
    { from: today, to: today, label: "Bugün" },
    { from: daysAgo(6), to: today, label: "Son 7 gün" },
    { from: daysAgo(29), to: today, label: "Son 30 gün" },
    { from: daysAgo(89), to: today, label: "Son 90 gün" },
    { from: daysAgo(364), to: today, label: "Son 1 yıl" },
    { from: null, to: null, label: "Tümü" },
  ];
}

/** Son 12 ayın ay listesi */
function lastMonths(count = 12): DateRange[] {
  const out: DateRange[] = [];
  const now = new Date();

  for (let i = 0; i < count; i += 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    out.push({
      from: iso(start),
      to: iso(end),
      label: `${AYLAR[start.getMonth()]} ${start.getFullYear()}`,
    });
  }

  return out;
}

/**
 * Tarih süzgeci.
 *
 * Ekranda tek bir düğme durur; tıklanınca pencere açılır. Hazır aralıklar,
 * son 12 ay ve serbest tarih aralığı aynı yerdedir — sayfada yatay
 * kaydırmaya yol açan uzun çip şeritleri yoktur.
 */
export function DateFilter({
  value, onChange, quick,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  /** Düğmenin yanında gösterilecek hızlı seçenekler (masaüstü) */
  quick?: DateRange[];
}) {
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState(value.from ?? "");
  const [to, setTo] = React.useState(value.to ?? "");

  React.useEffect(() => {
    if (!open) return;
    setFrom(value.from ?? "");
    setTo(value.to ?? "");
  }, [open, value]);

  const apply = (r: DateRange) => {
    onChange(r);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!from && !to) { apply({ from: null, to: null, label: "Tümü" }); return; }

    const f = from || to;
    const t = to || from;

    apply({
      from: f,
      to: t,
      label: f === t
        ? new Date(f).toLocaleDateString("tr-TR")
        : `${new Date(f).toLocaleDateString("tr-TR")} – ${new Date(t).toLocaleDateString("tr-TR")}`,
    });
  };

  const quickList = quick ?? quickRanges();
  const isActive = (r: DateRange) => r.from === value.from && r.to === value.to;

  return (
    <>
      {/* Masaüstünde birkaç hazır seçenek + süzgeç düğmesi.
          Mobilde yalnızca süzgeç düğmesi görünür: şerit taşmaz. */}
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 lg:flex">
          {quickList.slice(0, 4).map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => onChange(r)}
              aria-pressed={isActive(r)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                isActive(r) ? "border-ink bg-ink text-page"
                            : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Icon icon={IconFilter} size={14} />
          <span className="max-w-[140px] truncate">{value.label}</span>
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tarih aralığı" size="md">
        <div className="flex flex-col gap-6">
          {/* Hazır aralıklar */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-ink2">Hazır aralıklar</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {quickList.map((r) => (
                <Chip key={r.label} active={isActive(r)} onClick={() => apply(r)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Aylar */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-ink2">Aya göre</span>
            <div className="grid max-h-[180px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {lastMonths().map((r) => (
                <Chip key={r.label} active={isActive(r)} onClick={() => apply(r)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Serbest aralık */}
          <div className="flex flex-col gap-3 border-t border-line2 pt-5">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink2">
              <Icon icon={IconCalendar} size={15} /> Tarih aralığı seç
            </span>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-muted">Başlangıç</span>
                <input type="date" value={from} max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-11 rounded-[12px] border border-line bg-field px-3.5 text-[14px] outline-none focus:border-solid" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-muted">Bitiş</span>
                <input type="date" value={to} min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-11 rounded-[12px] border border-line bg-field px-3.5 text-[14px] outline-none focus:border-solid" />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="md" onClick={applyCustom}>Uygula</Button>
              <Button size="md" variant="ghost"
                onClick={() => { setFrom(""); setTo(""); }}>
                <Icon icon={IconClose} size={14} /> Temizle
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`truncate rounded-[12px] border px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
        active ? "border-solid bg-chip text-ink"
               : "border-line bg-surface text-ink2 hover:border-ink/25"
      }`}
    >
      {children}
    </button>
  );
}
