import type { Team } from "@/lib/types";

/** Kart önizlemesinde gösterilecek takım verisi (sunucudan client'a aktarılır) */
export interface PreviewTeam {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  logo_path: string | null;
  color_primary: string | null;
}

/** Önizleme döngüsünde önce gösterilecek takımlar */
const PRIORITY = ["galatasaray", "fenerbahce", "besiktas", "trabzonspor"];

/**
 * Tüm aktif takımları döndürür; ilk dördü PRIORITY sırasına göre sabitlenir,
 * kalanlar mevcut sıralamasını korur.
 */
export function toPreviewTeams(teams: Team[]): PreviewTeam[] {
  const map = (t: Team): PreviewTeam => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    slug: t.slug,
    logo_path: t.logo_path,
    color_primary: t.color_primary,
  });

  const head = PRIORITY
    .map((slug) => teams.find((t) => t.slug === slug))
    .filter((t): t is Team => Boolean(t))
    .map(map);

  const headIds = new Set(head.map((t) => t.id));
  const tail = teams.filter((t) => !headIds.has(t.id)).map(map);

  return [...head, ...tail];
}
