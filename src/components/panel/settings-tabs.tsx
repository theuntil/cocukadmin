"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Ayarlar bölümleri.
 *
 * Tüm kartları alt alta dizmek yerine bölümlere ayrılır: kullanıcı aradığını
 * kaydırmadan bulur. Seçim adres çubuğuna yazılır (#guvenlik gibi), böylece
 * yenilemede veya paylaşılan bağlantıda aynı bölüm açılır.
 */

export interface SettingsSection {
  id: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  /** Menüde başlığın altında görünen kısa etiket */
  short?: string;
  description: string;
  content: React.ReactNode;
}

export function SettingsTabs({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = React.useState(sections[0]?.id ?? "");

  // Adres çubuğundaki bölüm varsa onunla başla
  React.useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && sections.some((s) => s.id === hash)) setActive(hash);
  }, [sections]);

  const select = (id: string) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[264px_1fr] lg:gap-9">
      {/* Bölüm listesi — mobilde yatay şerit, masaüstünde yapışkan sütun */}
      <nav aria-label="Ayar bölümleri"
        className="ct-noscrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:h-fit lg:flex-col lg:overflow-visible lg:px-0 lg:sticky lg:top-24">
        {sections.map((s) => {
          const isActive = s.id === current?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => select(s.id)}
              aria-current={isActive ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-3.5 rounded-[16px] border px-4 py-3.5 text-left transition-all lg:w-full ${
                isActive
                  ? "ct-selected border-ink shadow-[0_4px_14px_-6px_rgba(15,31,26,.4)]"
                  : "border-line bg-surface text-ink2 hover:border-accent-line hover:bg-accent-soft/40"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] transition-colors ${
                isActive ? "bg-page/15" : "bg-chip group-hover:bg-surface"}`}>
                <Icon icon={s.icon} size={16}
                  className={isActive ? "" : "text-muted"} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="whitespace-nowrap text-[14px] font-semibold">{s.label}</span>
                <span className={`hidden truncate text-[11.5px] lg:block ${
                  isActive ? "ct-selected-muted" : "text-muted2"}`}>
                  {s.short ?? ""}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* İçerik */}
      <div className="flex min-w-0 flex-col gap-6">
        {current && (
          <>
            <div className="flex flex-col gap-2 border-b border-line2 pb-5">
              <h2 className="font-display text-[22px] font-semibold tracking-[-.025em]">
                {current.label}
              </h2>
              <p className="max-w-[560px] text-[14px] leading-[1.65] text-muted">
                {current.description}
              </p>
            </div>
            {current.content}
          </>
        )}
      </div>
    </div>
  );
}
