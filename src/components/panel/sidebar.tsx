"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/site/nav";
import { ThemeToggle } from "@/components/site/theme";
import { Icon } from "@/components/ui/icon";
import {
  IconHome, IconChild, IconCard, IconOrder, IconTicket, IconMoney, IconLocation,
  IconCalendar, IconHeart, IconBell, IconSettings, IconLogout, IconMenu, IconClose,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/modal";

const NAV = [
  { href: "/panel", label: "Genel bakış", icon: IconHome, exact: true },
  { href: "/panel/kombine-kart", label: "Kombine kart", icon: IconTicket },
  { href: "/panel/cocuklarim", label: "Çocuklarım", icon: IconChild },
  { href: "/panel/siparislerim", label: "Siparişlerim", icon: IconOrder },
  { href: "/panel/etkinliklerim", label: "Etkinliklerim", icon: IconCalendar },
  { href: "/panel/bildirimler", label: "Bildirimler", icon: IconBell },
  { href: "/panel/ayarlar", label: "Hesabım", icon: IconSettings },
];

export function PanelSidebar({
  unread = 0, logoLight, logoDark, logoSize = 60,
}: {
  unread?: number;
  /** Logo ve boyutu, yönetim panelindeki Marka ayarından gelir. */
  logoLight?: string;
  logoDark?: string;
  logoSize?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav className="flex flex-col gap-1 text-[14px]">
      {NAV.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-[11px] px-3.5 py-[11px] transition-colors duration-150",
              active ? "bg-[rgba(216,240,74,.14)] font-semibold text-lime" : "text-on-dark hover:bg-white/5",
            )}
          >
            <Icon icon={item.icon} size={17} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.href === "/panel/bildirimler" && unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[11px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobil başlık */}
      <div className="flex items-center justify-between border-b border-line2 bg-page px-5 py-4 lg:hidden">
        <Link href="/">
          {/* Mobil başlık AÇIK zeminlidir: burada tema duyarlı logo kullanılır.
              (Masaüstü sidebar koyu zeminli olduğu için orada koyu logo sabit.) */}
          <Logo contain size={Math.min(logoSize, 52)}
            light={logoLight} dark={logoDark} />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink">
            <Icon icon={open ? IconClose : IconMenu} size={19} />
          </button>
        </div>
      </div>

      {open && (
        <div className="ct-slide-down bg-sidebar px-5 py-5 lg:hidden">
          {nav}
          <LogoutButton className="mt-3" />
        </div>
      )}

      {/* Masaüstü kenar çubuğu */}
      <aside className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-line2 bg-sidebar px-5 py-7 lg:flex">
        <Link href="/" aria-label="Çocuk Tribünü ana sayfa" className="block">
          {/* Sabit dosya yerine Ayarlar > Marka'daki logo kullanılır.
              Sidebar koyu zeminli olduğu için koyu tema logosu seçilir. */}
          <Logo contain forceDark size={logoSize} dark={logoDark} light={logoLight} />
        </Link>

        {nav}

        <div className="mt-auto flex flex-col gap-3">
          <LogoutButton />
          <div className="flex items-center justify-between border-t border-white/8 pt-4">
            <Link href="/" className="text-[12.5px] text-deep-muted hover:text-lime">← Siteye dön</Link>
            <ThemeToggle className="!border-white/15 !text-deep-muted hover:!border-lime" />
          </div>
        </div>
      </aside>
    </>
  );
}

function LogoutButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [leaving, setLeaving] = React.useState(false);

  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-[11px] px-3.5 py-[11px] text-[14px] text-on-dark transition-colors hover:bg-white/5 hover:text-orange",
          className,
        )}
      >
        <Icon icon={IconLogout} size={17} />Çıkış yap
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={leaving}
        title="Çıkış yapmak istiyor musunuz?"
        description="Oturumunuz kapatılacak. Kayıtlı bilgileriniz silinmez; istediğiniz zaman tekrar giriş yapabilirsiniz."
        confirmLabel="Çıkış yap"
        cancelLabel="Vazgeç"
        onConfirm={() => { setLeaving(true); formRef.current?.requestSubmit(); }}
      />

      <form ref={formRef} action="/api/auth/cikis" method="post" className="hidden" />
    </>
  );
}
