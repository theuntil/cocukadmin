import Link from "next/link";
import { Logo } from "@/components/site/nav";
import { Icon } from "@/components/ui/icon";
import { IconArrowRight } from "@/components/ui/icons";

const COLUMNS = [
  {
    title: "KEŞFET",
    links: [
      { href: "/kombine-kart", label: "Kombine Kart" },
      { href: "/etkinlikler", label: "Etkinlikler" },
      { href: "/takimlar", label: "Takımlar" },
      { href: "/blog", label: "Blog" },
      { href: "/duyurular", label: "Duyurular" },
    ],
  },
  {
    title: "KURUMSAL",
    links: [
      { href: "/hakkimizda", label: "Hakkımızda" },
      { href: "/gonullu-ol", label: "Gönüllü Ol" },
      { href: "/basin", label: "Basında Biz" },
      { href: "/destekcilerimiz", label: "Destekçilerimiz" },
      { href: "/sss", label: "Sıkça Sorulanlar" },
      { href: "/iletisim", label: "İletişim" },
    ],
  },
  {
    title: "YASAL",
    links: [
      { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
      { href: "/cocuk-verileri-politikasi", label: "Çocuk Verileri Politikası" },
      { href: "/uyelik-kosullari", label: "Üyelik Koşulları" },
      { href: "/gizlilik", label: "Gizlilik Politikası" },
      { href: "/cerez-politikasi", label: "Çerez Politikası" },
      { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
      { href: "/iptal-iade", label: "İptal ve İade Koşulları" },
    ],
  },
];

export function SiteFooter({
  branding, legalDocs, trademarks,
}: {
  branding?: { logoDark: string; paymentLogos?: string | null; sizeFooter?: number };
  legalDocs?: { slug: string; title: string }[];
  /** Yüklenmiş tescil belgeleri — footer rozeti için */
  trademarks?: { code: string; image: string; office: string }[];
}) {
  return (
    <footer className="bg-sidebar text-on-dark">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-12 lg:py-14">
        <div className="flex flex-col gap-4">
          <Logo forceDark size={branding?.sizeFooter ?? 80} dark={branding?.logoDark} />
          <p className="max-w-[300px] text-[13.5px] leading-[1.6]">
            Çocukların tribünde güvende olduğu bir futbol kültürü için çalışan bağımsız taraftar inisiyatifi.
          </p>
        </div>

        {COLUMNS.map((col) => {
          // Yasal sütunu yönetim panelindeki politikalardan gelir;
          // henüz eklenmemişse sabit liste yedek olarak kullanılır.
          const links = col.title === "YASAL" && legalDocs && legalDocs.length > 0
            ? legalDocs.map((d) => ({ href: `/${d.slug}`, label: d.title }))
            : col.links;

          return (
            <nav key={col.title} className="flex flex-col gap-2.5 text-[13.5px]" aria-label={col.title}>
              <span className="text-[11.5px] font-bold tracking-[.14em] text-deep-muted">{col.title}</span>
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="text-on-dark transition-colors duration-150 hover:text-lime">
                  {l.label}
                </Link>
              ))}
            </nav>
          );
        })}
      </div>

      {/* ── Tescil belgeleri şeridi ──
          YALNIZCA yüklenmiş belge varsa çıkar. Belge yoksa boş bir
          şerit bırakmak yerine bölüm hiç basılmaz. */}
      {trademarks && trademarks.length > 0 && (
        <div className="border-t border-white/8">
          <div className="mx-auto w-full max-w-[1240px] px-5 py-5 sm:px-8 lg:px-12">
            <Link href="/tescil-belgelerimiz"
              className="group inline-flex flex-wrap items-center gap-3.5 rounded-[14px] px-1 py-1 transition-opacity hover:opacity-90">
              {/* Belge küçük resimleri — ikondan büyük, ayırt edilebilir */}
              <span className="flex items-center -space-x-2">
                {trademarks.slice(0, 3).map((t) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={t.code} src={t.image} alt={t.office} loading="lazy"
                    className="h-11 w-9 rounded-[5px] border border-white/25 bg-white object-cover object-top shadow-[0_2px_8px_rgba(0,0,0,.3)]" />
                ))}
              </span>

              <span className="flex flex-col">
                <span className="text-[14px] font-semibold text-on-dark">
                  Tescil belgelerimiz
                </span>
                <span className="text-[12px] text-deep-muted">
                  Çocuk Tribünü tescilli markadır · belgeleri görüntüle
                </span>
              </span>

              <Icon icon={IconArrowRight} size={15}
                className="text-deep-muted transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-white/8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-5 py-6 text-[12.5px] text-deep-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex flex-col gap-1.5">
            <span>© {new Date().getFullYear()} Çocuk Tribünü. Tüm hakları saklıdır.</span>
            <span>Bu site çocuk verilerini KVKK kapsamında asgari düzeyde işler.</span>
          </div>

          {/* Ödeme logoları — yönetim panelinden yüklenir */}
          {branding?.paymentLogos && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={branding.paymentLogos} alt="Kabul edilen ödeme yöntemleri"
              className="h-7 max-w-[280px] self-start object-contain opacity-80 sm:self-auto"
              loading="lazy" />
          )}
        </div>
      </div>
    </footer>
  );
}
