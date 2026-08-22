import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { getBranding } from "@/lib/branding";
import { ThemeScript } from "@/components/site/theme";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

/* Gövde metni Inter: Wise'ın kullandığı font, ekran okunabilirliği
   yüksek. Başlıklar Wise Sans (public/fonts), o yoksa Bricolage. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";

/**
 * Sabit değil ÜRETİLEN metadata.
 *
 * Favicon yönetim panelindeki marka ayarından gelir. Eskiden yalnızca
 * `/favicon.ico` yazıyordu; panelde favicon yüklense bile sitede
 * görünmüyordu — ayar hiç okunmuyordu.
 *
 * Ayar boşsa yerel dosyaya düşülür, yani favicon yüklenmemişse de
 * site simgesiz kalmaz.
 */
export async function generateMetadata(): Promise<Metadata> {
  /* `lib/branding` zaten `site_branding` RPC'sini okuyup depolama
     yolunu tam adrese çeviriyor. Ayrı bir kopya yazmak yerine o
     kullanılıyor — iki yerde iki farklı marka mantığı olması,
     birinin güncellenip diğerinin unutulması demekti. */
  const marka = await getBranding();
  const favicon = marka.favicon && marka.favicon !== "/favicon.ico" ? marka.favicon : null;

  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Çocuk Tribünü — Her çocuğun bir tribünü olsun",
    template: "%s · Çocuk Tribünü",
  },
  description:
    "Çocuk Tribünü; çocukların futbolu güvenli, ayrımsız ve sevgiyle deneyimlemesi için çalışan bir taraftar inisiyatifidir. Kombine kart, imza kampanyaları ve şehir etkinlikleri.",
  keywords: ["çocuk tribünü", "kombine kart", "çocuk futbol", "taraftar", "imza kampanyası"],
  authors: [{ name: "Çocuk Tribünü" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "Çocuk Tribünü",
    title: "Çocuk Tribünü — Her çocuğun bir tribünü olsun",
    description: "Çocukların tribünde güvende olduğu bir futbol kültürü için çalışıyoruz.",
  },
  twitter: { card: "summary_large_image", title: "Çocuk Tribünü" },
  robots: { index: true, follow: true },
  icons: {
    icon: favicon
      ? [{ url: favicon }]
      : [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.png", type: "image/png" }],
    apple: favicon ?? "/favicon.png",
  },
  manifest: "/site.webmanifest",
  alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeae1" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${bricolage.variable} ${inter.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ToastProvider>
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-solid focus:px-5 focus:py-3 focus:text-on-solid"
        >
          İçeriğe geç
        </a>
        {children}</ToastProvider>
      </body>
    </html>
  );
}
