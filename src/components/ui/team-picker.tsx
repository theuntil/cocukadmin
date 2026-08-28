"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { IconClose, IconSearch, IconFootball, IconCheck } from "@/components/ui/icons";
import { publicStorageUrl } from "@/lib/utils";

export interface PickerTeam {
  id: string;
  name: string;
  short_name?: string | null;
  logo_path?: string | null;
  city_name?: string | null;
  /** Lig kimliği — gruplama için */
  league_id?: string | null;
  league_name?: string | null;
  league_order?: number | null;
}

/**
 * Takımları lige göre gruplar ve lig sırasına dizer.
 *
 * ┌─ NEDEN BURADA GRUPLANIYOR ────────────────────────────────────┐
 * │ Sıralamayı her ekran kendi yapsaydı biri Süper Lig'i başa,    │
 * │ diğeri alfabetik koyardı. Tek yerde toplamak, seçicinin        │
 * │ kullanıldığı her sayfada aynı düzeni garanti ediyor.           │
 * │                                                                 │
 * │ Ligi olmayan takım "Diğer" başlığında en sonda — listeden      │
 * │ düşmüyor.                                                       │
 * └─────────────────────────────────────────────────────────────────┘
 */
function ligeGoreGrupla(teams: PickerTeam[]) {
  const gruplar = new Map<string, { ad: string; sira: number; takimlar: PickerTeam[] }>();

  for (const t of teams) {
    const id = t.league_id ?? "diger";
    if (!gruplar.has(id)) {
      gruplar.set(id, {
        ad: t.league_name ?? "Diğer",
        sira: t.league_order ?? 999,
        takimlar: [],
      });
    }
    gruplar.get(id)!.takimlar.push(t);
  }

  return [...gruplar.values()]
    .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, "tr"))
    .map((g) => ({
      ...g,
      takimlar: g.takimlar.sort((a, b) => a.name.localeCompare(b.name, "tr")),
    }));
}

/**
 * Takım seçici.
 *
 * Açılır liste yerine alttan yükselen bir sayfa açar: takımlar logolarıyla
 * kare kartlar hâlinde görünür, aranabilir. Mobil uygulamalardaki seçim
 * ekranı davranışı — seçim yapılınca panel kapanır.
 *
 * Seçilen değer gizli bir input'a yazılır; form gönderimi normal şekilde çalışır.
 */
export function TeamPicker({
  teams, name = "teamId", defaultValue, required, label = "Takım",
  placeholder = "Takım seçin", error, onChange,
}: {
  teams: PickerTeam[];
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
  label?: string;
  placeholder?: string;
  error?: string;
  /** Seçim değişince haber verir — kart önizlemesi gibi dış durumları güncellemek için */
  onChange?: (teamId: string) => void;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => { setValue(defaultValue ?? ""); }, [defaultValue]);

  const selected = teams.find((t) => t.id === value) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink2">
        {label}{required ? "" : <span className="font-normal text-muted"> · isteğe bağlı</span>}
      </span>

      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[52px] w-full items-center gap-3 rounded-[14px] border border-line bg-field px-4 text-left transition-colors hover:border-accent-line"
      >
        {selected ? (
          <>
            <TeamLogo team={selected} size={30} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-chip">
              <Icon icon={IconFootball} size={15} className="text-muted2" />
            </span>
            <span className="flex-1 text-[15px] text-muted">{placeholder}</span>
          </>
        )}
        <span className="shrink-0 text-[13px] font-semibold text-muted">Seç</span>
      </button>

      {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}

      <TeamSheet
        open={open}
        onClose={() => setOpen(false)}
        teams={teams}
        selectedId={value}
        onSelect={(id) => { setValue(id); onChange?.(id); setOpen(false); }}
      />
    </div>
  );
}

/* ── Alttan yükselen seçim ekranı ── */
function TeamSheet({
  open, onClose, teams, selectedId, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  teams: PickerTeam[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");

  /* Panel kapanırken de animasyon oynasın diye DOM'da bir süre daha tutulur.
     Doğrudan kaldırılsaydı aniden kaybolurdu. */
  const [visible, setVisible] = React.useState(open);
  const [closing, setClosing] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) { setVisible(true); setClosing(false); return; }
    if (!visible) return;

    setClosing(true);
    const t = setTimeout(() => { setVisible(false); setClosing(false); }, 260);
    return () => clearTimeout(t);
  }, [open, visible]);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Panel her açıldığında arama sıfırlanır
  React.useEffect(() => { if (open) setQuery(""); }, [open]);

  if (!mounted || !visible) return null;

  const q = query.trim().toLocaleLowerCase("tr-TR");
  const list = q
    ? teams.filter((t) =>
        t.name.toLocaleLowerCase("tr-TR").includes(q)
        || (t.short_name ?? "").toLocaleLowerCase("tr-TR").includes(q)
        || (t.city_name ?? "").toLocaleLowerCase("tr-TR").includes(q))
    : teams;

  /* Aramada gruplama yok: kullanıcı belirli bir takım arıyor, lig
     başlıkları sonucu bölüp okumayı zorlaştırıyor. */
  const gruplar = q ? null : ligeGoreGrupla(list);

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center"
      role="dialog" aria-modal="true" aria-label="Takım seçin">

      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-[260ms]"
        style={{ opacity: closing ? 0 : 1 }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative flex w-full max-w-[720px] flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface shadow-[0_-20px_60px_-20px_rgba(15,31,26,.45)]"
        style={{
          // Ekranın yaklaşık %60'ı; içerik azsa gereksiz boşluk kalmasın
          height: "min(60dvh, 620px)",
          animation: closing
            ? "ct-sheet-out .26s cubic-bezier(.4,0,1,1) both"
            : "ct-sheet-in .3s cubic-bezier(.22,1,.36,1) both",
        }}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden />

        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-4">
          <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
            Takım seçin
          </span>
          <button type="button" onClick={onClose} aria-label="Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink">
            <Icon icon={IconClose} size={18} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Icon icon={IconSearch} size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Takım ara"
              autoFocus
              className="h-11 w-full rounded-[12px] border border-line bg-field pl-10 pr-4 text-[14.5px] outline-none transition-colors focus:border-accent-line"
            />
          </div>
        </div>

        <div className="ct-noscrollbar flex-1 overflow-y-auto px-5 pb-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Icon icon={IconFootball} size={26} className="text-muted2" />
              <span className="text-[14px] text-muted">Takım bulunamadı</span>
            </div>
          ) : (
            gruplar ? (
              /* Lige göre gruplu görünüm */
              <div className="flex flex-col gap-6">
                {gruplar.map((g) => (
                  <div key={g.ad} className="flex flex-col gap-3">
                    {/* Başlık yapışkan: uzun listede kaydırırken hangi
                        ligde olduğunuz görünür kalıyor. */}
                    <span className="sticky top-0 z-10 bg-page/95 py-1 text-[12px] font-bold tracking-[.12em] text-muted2 backdrop-blur-sm">
                      {g.ad.toLocaleUpperCase("tr-TR")}
                      <span className="ml-2 font-normal text-muted2/70">{g.takimlar.length}</span>
                    </span>
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
                      {g.takimlar.map((t) => (
                        <TakimDugmesi key={t.id} team={t}
                          active={t.id === selectedId} onSelect={onSelect} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Arama sonucu: gruplama yok, düz ızgara */
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
                {list.map((t) => (
                  <TakimDugmesi key={t.id} team={t}
                    active={t.id === selectedId} onSelect={onSelect} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TeamLogo({
  team, size, className = "",
}: { team: PickerTeam; size: number; className?: string }) {
  const logo = publicStorageUrl("team-logos", team.logo_path ?? null);

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="" loading="lazy"
        className={`shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }} />
    );
  }

  return (
    <span className={`flex shrink-0 items-center justify-center rounded-[10px] bg-chip font-display font-bold text-muted ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {(team.short_name ?? team.name).slice(0, 3).toLocaleUpperCase("tr-TR")}
    </span>
  );
}

/** Izgaradaki tek takım kutusu — gruplu ve düz görünüm aynı bileşeni kullanır */
function TakimDugmesi({
  team, active, onSelect,
}: {
  team: PickerTeam;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(team.id)}
      aria-pressed={active}
      className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-[16px] border p-2.5 transition-all sm:gap-2.5 sm:p-3 ${
        active
          ? "border-ink bg-chip shadow-[0_2px_10px_-4px_rgba(0,0,0,.25)]"
          : "border-line bg-surface hover:border-line2 hover:bg-chip/60"
      }`}
    >
      {active && (
        <span className="ct-selected absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full">
          <Icon icon={IconCheck} size={11} />
        </span>
      )}

      <TeamLogo team={team} size={40} className="sm:h-12 sm:w-12" />

      <span className="line-clamp-2 text-center text-[11px] font-semibold leading-[1.2] sm:text-[12.5px]">
        {team.name}
      </span>
    </button>
  );
}
