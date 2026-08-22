import Link from "next/link";
import { SiteNav } from "@/components/site/nav";
import { Analytics } from "@/components/site/analytics";
import { SiteFooter } from "@/components/site/footer";
import { getCurrentUser, getMyRoles, getSiteSettings, settingBool, settingText } from "@/lib/data";
import { getBranding, getTrademarks } from "@/lib/branding";
import { getLegalDocuments } from "@/lib/data";
import { Container } from "@/components/ui";

// Bakım modu ve duyuru şeridi her istekte taze okunmalı
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, branding, legalDocs, trademarks] = await Promise.all([
    getCurrentUser(), getSiteSettings(), getBranding(), getLegalDocuments(),
      getTrademarks(),
  ]);

  const maintenance = settingBool(settings, "site.maintenance_mode", false);
  const banner = settingText(settings, "site.announcement_bar");

  // Bakım modunda yöneticiler siteyi normal görmeye devam eder
  let isStaff = false;
  if (maintenance && user) {
    const roles = await getMyRoles();
    isStaff = roles.some((r) => ["admin", "super_admin", "editor", "support", "moderator", "finance"].includes(r));
  }

  if (maintenance && !isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branding.logoLight} alt="Çocuk Tribünü" width={72} height={72}
          className="h-18 w-18 object-contain" style={{ width: 72, height: 72 }} />
        <div className="flex max-w-[460px] flex-col gap-3">
          <h1 className="font-display text-[30px] font-semibold tracking-[-.03em]">Kısa bir ara</h1>
          <p className="text-[15.5px] leading-[1.7] text-ink2">
            {settingText(settings, "site.maintenance_message",
              "Sitemizde kısa süreli bir bakım çalışması yapıyoruz. Kısa süre içinde geri döneceğiz.")}
          </p>
        </div>
        <Link href="/giris" className="text-[13.5px] font-semibold text-muted hover:text-ink">
          Yönetici girişi
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      {maintenance && isStaff && (
        <div className="bg-danger px-5 py-2 text-center text-[13px] font-semibold text-white">
          Bakım modu açık — siteyi yalnızca yöneticiler görüyor
        </div>
      )}

      {banner && (
        <div className="bg-accent px-5 py-2.5 text-center text-[13.5px] font-semibold text-accent-ink">
          <Container>{banner}</Container>
        </div>
      )}

      <Analytics />
      <SiteNav isLoggedIn={Boolean(user)} branding={branding} />
      <main id="icerik" className="flex-1">{children}</main>
      <SiteFooter
        branding={branding}
        legalDocs={legalDocs}
        /* Yalnızca YÜKLENMİŞ belgeler footer'a gider; boş olanlar
           listeye girmez ki şerit yarım görünmesin. */
        trademarks={trademarks.filter((t) => t.image).map((t) => ({
          code: t.code, image: t.image, office: t.office,
        }))}
      />
    </div>
  );
}
