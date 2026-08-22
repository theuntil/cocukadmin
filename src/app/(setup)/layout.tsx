import Link from "next/link";
import { Logo } from "@/components/site/nav";
import { ThemeToggle } from "@/components/site/theme";

/**
 * Kurulum sihirbazı için sade kabuk.
 *
 * ÖNEMLİ: Bu sayfa panelin DIŞINDA. Panel layout'u eksik kurulumda buraya
 * yönlendirdiği için, sihirbaz panelin içinde olsaydı sonsuz döngü olurdu.
 */
import { getBranding } from "@/lib/branding";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Çocuk Tribünü"><Logo size={branding.sizePanel} light={branding.logoLight} dark={branding.logoDark} /></Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <form action="/api/auth/cikis" method="post">
            <button type="submit" className="text-[13.5px] font-semibold text-muted hover:text-ink">
              Çıkış
            </button>
          </form>
        </div>
      </header>

      <main id="icerik" className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:px-8">
        <div className="w-full max-w-[540px]">{children}</div>
      </main>
    </div>
  );
}
