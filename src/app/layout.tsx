import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getBrandingSettings } from "@/lib/data";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeScript } from "@/components/admin/theme";

/**
 * Favicon ve başlık marka ayarından.
 *
 * Sabit `/favicon.ico` yazılıydı; panelde yüklenen favicon hiç
 * kullanılmıyordu. Ayar boşsa yerel dosyaya düşülür.
 */
export async function generateMetadata(): Promise<Metadata> {
  const marka = await getBrandingSettings();

  return {
  title: { default: "Yönetim · Çocuk Tribünü", template: "%s · Yönetim" },
  description: "Çocuk Tribünü yönetim paneli",
  robots: { index: false, follow: false, nocache: true },
  icons: {
      icon: marka.favicon ? [{ url: marka.favicon }] : [{ url: "/favicon.ico" }],
      apple: marka.favicon || "/favicon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeae1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1410" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
