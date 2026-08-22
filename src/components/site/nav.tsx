"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { IconMenu, IconClose, IconUser } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/site/theme";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Anasayfa" },
  { href: "/kombine-kart", label: "Kombine Kart" },
  { href: "/etkinlikler", label: "Etkinlikler" },
  { href: "/yaptiklarimiz", label: "Bizden Haberler" },
  { href: "/blog", label: "Blog" },
  { href: "/tescil-belgelerimiz", label: "Tescil Belgelerimiz" },
];

/**
 * Menü çubuğunun sabit yüksekliği.
 * Ana sayfadaki hero bölümü bu kadar yukarı çekilir (negatif üst boşluk),
 * böylece video ekranın en tepesinden başlar. Değer değişirse
 * (site)/page.tsx içindeki `-mt-[72px] sm:-mt-[84px]` de güncellenmelidir.
 */
const NAV_H_DESKTOP = 84;

/**
 * Logo — kaynak yönetim panelindeki ayardan gelir (props ile aktarılır).
 * Koyu temada dark varyantı CSS ile devreye girer; JS beklemez.
 */
export function Logo({
  size = 56, forceDark = false, light, dark, contain,
}: {
  size?: number;
  forceDark?: boolean;
  light?: string;
  dark?: string;
  /**
   * Kapsayıcının yüksekliğini büyütmeden logoyu ölçekler.
   * Header'da kullanılır: logo büyüse de menü çubuğu aynı yükseklikte kalır.
   */
  contain?: boolean;
}) {
  /*
   * Yedek zinciri: koyu tema logosu yoksa açık tema logosuna düşülür,
   * ikisi de yoksa görsel yerine yazı gösterilir. Böylece hiçbir durumda
   * kırık görsel çıkmaz.
   */
  const lightSrc = light || dark || "";
  const darkSrc = dark || light || "";

  /*
   * Yükseklik responsive: ayardaki değer MASAÜSTÜ ölçüsüdür, dar ekranda
   * clamp ile küçülür. Genişlik serbesttir (yatay logolar sıkışmasın).
   */
  const h = contain
    ? `clamp(${Math.round(size * 0.62)}px, ${Math.round(size * 0.09)}vw + ${
        Math.round(size * 0.45)}px, ${size}px)`
    : `clamp(${Math.round(size * 0.7)}px, ${Math.round(size * 0.08)}vw + ${
        Math.round(size * 0.5)}px, ${size}px)`;

  if (!lightSrc && !darkSrc) {
    return (
      <span
        className={`flex shrink-0 items-center whitespace-nowrap font-display font-semibold tracking-[-.02em] ${
          forceDark ? "text-white" : "text-ink"}`}
        style={{ fontSize: Math.max(15, size * 0.32) }}
      >
        Çocuk Tribünü
      </span>
    );
  }

  if (forceDark) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={darkSrc} alt="Çocuk Tribünü"
        className="w-auto max-w-full shrink-0 object-contain"
        style={{ height: h }} />
    );
  }

  /*
   * İki varyant normal akışta durur; gizlenen `display:none` olduğu için
   * yer kaplamaz.
   */
  return (
    <span className="flex shrink-0 items-center" style={{ height: h }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lightSrc} alt="Çocuk Tribünü"
        className="ct-logo-light h-full w-auto max-w-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={darkSrc} alt="" aria-hidden
        className="ct-logo-dark h-full w-auto max-w-full object-contain" />
    </span>
  );
}

export function SiteNav({
  isLoggedIn = false, branding,
}: {
  isLoggedIn?: boolean;
  branding?: { logoLight: string; logoDark: string; sizeHeader?: number };
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  /*
   * HERO ÜSTÜNDE ŞEFFAFLIK
   *
   * Kural basit: SAYFA EN ÜSTTEYKEN saydam, aşağı kaydırılınca opak,
   * tekrar en üste çıkılınca yine saydam.
   *
   * ┌─ ÖNCEKİ YAKLAŞIM NEDEN YANLIŞTI ⚠️ ────────────────────────────┐
   * │ Hero bölümü IntersectionObserver ile izleniyordu: başlık, hero  │
   * │ bölümünün TAMAMI geçilene kadar saydam kalıyordu. Hero tam      │
   * │ ekran yüksekliğinde olduğu için kullanıcı yarım ekran           │
   * │ kaydırdığında hâlâ saydamdı ve videonun aydınlık kareleri       │
   * │ üstünde yazılar okunmuyordu.                                    │
   * │                                                                 │
   * │ Artık ölçüt tek: kaydırma konumu. "En üstte miyim?" sorusunun   │
   * │ cevabı her durumda kesin ve tersine çevrilebilir.               │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * İlk boyamada doğru görünsün diye başlangıç değeri yol adresinden
   * çıkarılır — sunucuda da aynı sonucu verir, yanıp sönme olmaz.
   */
  const heroPage = pathname === "/";
  const [atTop, setAtTop] = React.useState(true);

  React.useEffect(() => {
    /* Kaydırma her karede tetiklenebiliyor; okuma requestAnimationFrame
       ile bir kareye indiriliyor. Böylece hızlı kaydırmada bile tek
       okuma yapılır, düzen hesabı zorlanmaz. */
    let raf = 0;

    const oku = () => {
      raf = 0;
      /* 8px tolerans: bazı tarayıcılar üstte 0 yerine 1-2px bırakıyor
         (lastik bant etkisi, adres çubuğu gizlenmesi). Tam sıfır
         aranırsa başlık en üstteyken bile opak kalabiliyor. */
      setAtTop(window.scrollY <= 8);
    };

    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(oku); };

    oku();   // ilk durum: sayfa yenilenince tarayıcı konumu geri yükleyebilir
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);


  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /* Saydamlık YALNIZCA ana sayfanın en üstünde. Mobil menü açıkken
     kapanır: menü içeriği videonun üstünde okunmaz hâle gelmesin. */
  const onVideo = heroPage && atTop && !open;
  const scrolled = !atTop;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300 ease-out",
        onVideo
          ? "border-transparent bg-transparent"
          : scrolled
            ? "border-line2 bg-page/80 shadow-[0_1px_20px_-12px_rgba(15,31,26,.35)] backdrop-blur-xl"
            : "border-transparent bg-page",
      )}
    >
      {/* Videonun üstünde okunabilirlik perdesi: parlak kareler geldiğinde
          logo ve bağlantılar kaybolmasın diye üstten hafif karartma. */}
      {onVideo && (
        <span aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[160%] bg-gradient-to-b from-black/55 via-black/25 to-transparent" />
      )}

      {/* Menü çubuğu SABİT yükseklikte. Logo boyutu ayardan büyütülse bile
          çubuk uzamaz; logo kendi kutusunda ölçeklenir. */}
      <nav className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-between gap-4 px-5 sm:h-[84px] sm:px-8 lg:px-12">
        <Link href="/" aria-label="Çocuk Tribünü ana sayfa">
          <Logo contain size={branding?.sizeHeader ?? 64}
            forceDark={onVideo}
            light={branding?.logoLight} dark={branding?.logoDark} />
        </Link>

        <div className={cn(
          "hidden items-center gap-7 text-[14.5px] font-medium transition-colors duration-300 lg:flex",
          onVideo ? "text-white/75" : "text-ink2",
        )}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative pb-[3px] transition-colors duration-150",
                onVideo ? "hover:text-white" : "hover:text-ink",
                isActive(l.href) && (onVideo ? "font-semibold text-white" : "font-semibold text-ink"),
              )}
            >
              {l.label}
              <span
                className={cn(
                  "absolute inset-x-0 -bottom-[1px] h-[2px] origin-left rounded-full bg-lime transition-transform duration-200",
                  isActive(l.href) ? "scale-x-100" : "scale-x-0",
                )}
              />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle onDark={onVideo} className="hidden sm:inline-flex" />
          {isLoggedIn ? (
            <Link href="/panel" className={buttonClass("solid", "md", "hidden sm:inline-flex")}>
              <Icon icon={IconUser} size={16} />
              Hesabım
            </Link>
          ) : (
            <>
              <Link href="/giris" className={cn(
                "hidden text-[14.5px] font-semibold transition-colors sm:inline",
                onVideo ? "text-white/85 hover:text-white" : "text-ink hover:text-ink2",
              )}>
                Giriş Yap
              </Link>
              {/* Başlıktaki asıl eylem. "Dijital Kombine" ürünü
                  anlatıyordu, ne yapılacağını değil — "Üye Ol" daha net. */}
              <Link href="/panel/kombine-kart/basvuru" className={buttonClass("lime", "md", "hidden sm:inline-flex")}>
                Üye Ol
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden",
              onVideo ? "border-white/30 text-white" : "border-line text-ink",
            )}
          >
            <Icon icon={open ? IconClose : IconMenu} size={19} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="ct-slide-down border-t border-line2 bg-page lg:hidden">
          <div className="ct-stagger flex flex-col gap-1 px-5 py-4 sm:px-8">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-[12px] px-4 py-3 text-[15px] font-medium transition-colors",
                  isActive(l.href) ? "bg-chip font-semibold text-ink" : "text-ink2 hover:bg-chip",
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-line2 pt-4">
              {isLoggedIn ? (
                <Link href="/panel" className={buttonClass("solid", "md", "flex-1")}>Hesabım</Link>
              ) : (
                <>
                  <Link href="/giris" className={buttonClass("outline", "md", "flex-1")}>Giriş Yap</Link>
                  <Link href="/panel/kombine-kart/basvuru" className={buttonClass("lime", "md", "flex-1")}>
                    Üye Ol
                  </Link>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
