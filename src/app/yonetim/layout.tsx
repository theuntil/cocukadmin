import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getMyRoles } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { IconMoney, IconHeart, IconPackage, IconQr, IconHome, IconSettings } from "@/components/ui/icons";
import { Logo } from "@/components/site/nav";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/yonetim", label: "Genel bakış", icon: IconHome },
  { href: "/yonetim/odemeler", label: "Ödeme onayları", icon: IconMoney },
  { href: "/yonetim/siparisler", label: "Kart üretimi", icon: IconPackage },
  { href: "/yonetim/check-in", label: "Etkinlik girişi", icon: IconQr },
  { href: "/yonetim/ayarlar", label: "Site ayarları", icon: IconSettings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();

  const user = await getCurrentUser();
  if (!user) redirect("/giris?devam=/yonetim");

  const roles = await getMyRoles();
  const allowed = roles.some((r) => ["admin", "super_admin", "finance", "support", "moderator", "editor"].includes(r));
  if (!allowed) redirect("/panel");

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-line2 bg-sidebar">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
          <Link href="/yonetim" className="flex items-center gap-2.5 text-deep-ink">
            <Logo contain forceDark size={36} dark={branding.logoDark} light={branding.logoLight} />
            <span className="font-display text-[14px] font-semibold text-deep-muted">Yönetim</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-[13.5px]">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-on-dark transition-colors hover:bg-white/8 hover:text-lime">
                <Icon icon={n.icon} size={15} />{n.label}
              </Link>
            ))}
          </nav>
          <Link href="/panel" className="ml-auto text-[13px] text-deep-muted hover:text-lime">← Panelim</Link>
        </div>
      </header>
      <main id="icerik" className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
