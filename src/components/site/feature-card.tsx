import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { IconArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * ADOBE TARZI GÖRSEL KART
 *
 * Adobe'nin ana sayfasındaki kartların üç değişmezi var:
 *
 *   1. Üstte küçük bir ROZET SATIRI — renkli ikon kutusu + kategori adı
 *   2. Ortada BÜYÜK GÖRSEL, kartın neredeyse tamamını kaplayan
 *   3. Altta kalın başlık, gri açıklama, ok işaretli bağlantı
 *
 * Kart kendisi açık gri bir zemin; görsel onun içinde yuvarlatılmış bir
 * blok olarak duruyor. Kenarlık yok — ayrım ton farkıyla yapılıyor.
 *
 * ★ Görsel yoksa kart yine dengeli durur: yerine ikonlu bir doku
 *   basılır. Kırık görsel ya da boş delik çıkmaz.
 */
export function FeatureCard({
  badge, badgeIcon, badgeTone = "ink",
  image, imageAlt, ratio = "4/5",
  title, description, href, linkLabel,
}: {
  /** Üstteki rozet yazısı */
  badge?: string;
  badgeIcon?: Parameters<typeof Icon>[0]["icon"];
  badgeTone?: "ink" | "green" | "orange" | "accent";
  image?: string | null;
  imageAlt?: string;
  /** Görsel oranı — Adobe dikey (4/5) ve yatay (16/10) karışık kullanır */
  ratio?: "4/5" | "16/10" | "1/1";
  title: string;
  description?: string;
  href: string;
  linkLabel?: string;
}) {
  const rozetRenk = {
    ink: "bg-solid text-on-solid",
    green: "bg-green text-white",
    orange: "bg-orange text-white",
    accent: "bg-accent text-accent-ink",
  }[badgeTone];

  const oran = { "4/5": "aspect-[4/5]", "16/10": "aspect-[16/10]", "1/1": "aspect-square" }[ratio];

  return (
    <Link href={href} className="group flex h-full flex-col">
      <article className="flex h-full flex-col gap-4 rounded-[20px] bg-surface p-3.5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] sm:gap-5 sm:rounded-[24px] sm:p-4">

        {/* 1 — rozet satırı */}
        {badge && (
          <div className="flex items-center gap-2.5 px-1.5 pt-1">
            {badgeIcon && (
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]", rozetRenk)}>
                <Icon icon={badgeIcon} size={15} />
              </span>
            )}
            <span className="truncate text-[13px] font-semibold text-ink">{badge}</span>
          </div>
        )}

        {/* 2 — görsel */}
        <div className={cn("relative w-full overflow-hidden rounded-[16px] bg-chip sm:rounded-[18px]", oran)}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={imageAlt ?? ""} loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]" />
          ) : (
            /* Görselsiz kartta boş gri kutu bırakmak yerine ince bir
               doku: kart yine dolu görünür. */
            <span aria-hidden className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 25%, var(--line) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }} />
          )}
        </div>

        {/* 3 — metin */}
        <div className="flex flex-1 flex-col gap-2 px-1.5 pb-2">
          <h3 className="font-display text-[18px] font-semibold leading-[1.25] tracking-[-.02em] sm:text-[20px]">
            {title}
          </h3>
          {description && (
            <p className="line-clamp-3 text-[14px] leading-[1.6] text-ink2">{description}</p>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13.5px] font-semibold text-ink">
            {linkLabel ?? "Keşfet"}
            <Icon icon={IconArrowRight} size={14}
              className="transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </div>
      </article>
    </Link>
  );
}
