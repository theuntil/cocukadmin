import Link from "next/link";
import { Card, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowUpRight, IconNews } from "@/components/ui/icons";
import { publicStorageUrl, formatDate } from "@/lib/utils";
import type { PressItem } from "@/lib/data";

/**
 * Basında biz — press_coverage tablosundan gelir.
 *
 * Kart tıklanınca DOĞRUDAN dış kaynağa gitmez; önce bizim detay sayfamız açılır.
 * Kullanıcı oradan "Kaynağa git" düğmesiyle asıl habere ulaşır.
 */
export function PressStrip({ items, columns = 3 }: { items: PressItem[]; columns?: 2 | 3 }) {
  if (items.length === 0) return null;

  return (
    <div className={`ct-stagger grid gap-5 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
      {items.map((p) => {
        /* Logo iki biçimde gelebilir: depolamadaki bir dosya yolu veya
           haber sitesinin kendi tam adresi. publicStorageUrl ikisini de
           doğru çözer. */
        const logo = publicStorageUrl("press-logos", p.source_logo_path);
        const detailHref = p.slug ? `/basin/${p.slug}` : null;

        const card = (
            <Card className="flex h-full flex-col gap-4 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-accent-line">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-chip">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                  ) : (
                    <Icon icon={IconNews} size={17} className="text-muted" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-bold">{p.source_name}</span>
                  <span className="text-[12.5px] text-muted">{formatDate(p.published_at)}</span>
                </div>
                {detailHref && (
                  <Icon icon={IconArrowUpRight} size={16} className="shrink-0 text-muted" />
                )}
              </div>

              <H3 className="text-[17px] leading-[1.35]">{p.title}</H3>
              {p.excerpt && (
                <p className="line-clamp-3 text-[13.5px] leading-[1.6] text-ink2">{p.excerpt}</p>
              )}
            </Card>
        );

        return detailHref ? (
          <Link key={p.id} href={detailHref} className="block h-full">{card}</Link>
        ) : (
          <div key={p.id} className="block h-full">{card}</div>
        );
      })}
    </div>
  );
}
