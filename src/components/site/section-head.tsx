import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { IconArrowRight } from "@/components/ui/icons";
import { Motion } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * BÖLÜM BAŞLIĞI
 *
 * Adobe'nin sayfa düzenindeki gibi: solda küçük etiket + büyük başlık,
 * sağda tek bir "tümü" bağlantısı. Mobilde bağlantı alta iner ve tam
 * genişlik olur — küçük ekranda sağ üstteki bağlantıya parmak zor
 * yetişiyor.
 */
export function SectionHead({
  eyebrow, title, description, href, hrefLabel, className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8", className)}>
      <Motion variant="up" className="flex max-w-[640px] flex-col gap-3">
        {eyebrow && (
          <span className="text-[12px] font-bold uppercase tracking-[.14em] text-muted2">
            {eyebrow}
          </span>
        )}
        <h2 className="font-display text-[clamp(26px,4.4vw,44px)] font-semibold leading-[1.08] tracking-[-.035em]">
          {title}
        </h2>
        {description && (
          <p className="text-[15px] leading-[1.65] text-ink2 sm:text-[16px]">{description}</p>
        )}
      </Motion>

      {href && (
        <Link href={href}
          className="group inline-flex shrink-0 items-center gap-2 self-start text-[14.5px] font-semibold text-ink hover:text-ink2">
          {hrefLabel ?? "Tümünü gör"}
          <Icon icon={IconArrowRight} size={16}
            className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

/**
 * YATAY KAYDIRILAN ŞERİT
 *
 * ┌─ MOBİLDE NEDEN IZGARA DEĞİL ──────────────────────────────────┐
 * │ Üç kartı alt alta dizmek sayfayı uzatıyor ve kullanıcı        │
 * │ ikinciyi görmek için kaydırmak zorunda kalıyor — ama aşağı     │
 * │ kaydırma "devamı var" hissi vermiyor.                          │
 * │                                                                │
 * │ Yatay şeritte kartın kenarı ekranın sağında görünüyor;         │
 * │ kullanıcı devamı olduğunu ANLIYOR. Adobe da mobilde bunu       │
 * │ yapıyor. Masaüstünde normal ızgaraya dönüyor.                  │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Kaydırma çubuğu gizli, kartlar hizalanma noktalarına yapışıyor.
 */
export function ScrollRow({
  children, cols = 3, className,
}: {
  children: React.ReactNode;
  /** Masaüstünde kaç sütun */
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const grid = cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <div
      className={cn(
        /* Mobil: kenardan kenara kayan şerit. Negatif margin + padding
           ile kartlar ekranın kenarına değil, içerik hizasına oturur
           ama kaydırma tam genişlikte olur. */
        "ct-scroll-row -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8",
        "md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0",
        grid,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Şerit içindeki tek kart — mobilde sabit genişlik, masaüstünde esnek */
export function ScrollItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-[80vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none", className)}>
      {children}
    </div>
  );
}
