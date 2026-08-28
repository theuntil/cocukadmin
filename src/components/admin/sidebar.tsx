"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { IconAward,
  IconHome, IconOrder, IconCard, IconEdit, IconCalendar, IconFootball,
  IconNews, IconStar, IconHeart, IconShield,
  IconUsers, IconImage, IconChart, IconSettings, IconLogout, IconMenu, IconClose,
  IconMail, IconSignature, IconQr,
} from "@/components/ui/icons";
import { ThemeToggle } from "@/components/admin/theme";
import { ConfirmDialog } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@/lib/data";

interface NavItem {
  href: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  exact?: boolean;
  badge?: number;
  roles?: StaffRole[];
}

export function AdminSidebar({
  logoLight = "",
  logoDark = "",
  logoSize = 56,
  roles, counts, userName,
}: {
  logoLight?: string;
  logoDark?: string;
  logoSize?: number;
  roles: StaffRole[];
  counts: { orders: number; invoices: number; mailUnread: number };
  userName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [confirmOut, setConfirmOut] = React.useState(false);
  const logoutRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => { setOpen(false); }, [pathname]);

  const isSuper = roles.includes("super_admin");
  const can = (allowed?: StaffRole[]) =>
    !allowed || isSuper || allowed.some((r) => roles.includes(r));

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "GENEL",
      items: [
        { href: "/", label: "Gösterge paneli", icon: IconHome, exact: true },
        { href: "/goruntulenmeler", label: "Görüntülenmeler", icon: IconChart },
        /* İmza raporları: sayılar, takım/şehir dağılımı ve imza atanlar.
           Destek ekibi de görebilir — kampanya sorularını yanıtlıyorlar. */
        { href: "/imzalar", label: "İmzalar", icon: IconSignature,
          roles: ["admin", "editor", "support"] },
      ],
    },
    {
      title: "SATIŞ",
      items: [
        { href: "/siparisler", label: "Siparişler", icon: IconOrder, badge: counts.orders,
          roles: ["admin", "finance", "support"] },
        { href: "/kartlar", label: "Kombine kartlar", icon: IconCard,
          roles: ["admin", "support"] },
      ],
    },
    {
      title: "İÇERİK",
      items: [
        { href: "/hero", label: "Ana sayfa", icon: IconHome, roles: ["admin"] },
        { href: "/blog", label: "Blog", icon: IconEdit, roles: ["admin", "editor"] },
        { href: "/basin", label: "Basında biz", icon: IconNews, roles: ["admin", "editor"] },
        { href: "/yaptiklarimiz", label: "Bizden Haberler", icon: IconStar, roles: ["admin", "editor"] },
        { href: "/destekciler", label: "Destekçiler", icon: IconHeart, roles: ["admin", "editor"] },
        { href: "/etkinlikler", label: "Etkinlikler", icon: IconCalendar, roles: ["admin", "editor"] },
        { href: "/medya", label: "Medya", icon: IconImage, roles: ["admin", "editor"] },
      ],
    },
    {
      title: "İLETİŞİM",
      items: [
        /* Mail modülü: yönetici, editör ve destek ekibi kullanabilir.
           Ayarlar sayfası ayrıca yalnızca yöneticiye açıktır. */
        { href: "/mail", label: "Mail", icon: IconMail, badge: counts.mailUnread,
          roles: ["admin", "editor", "support"] },
        { href: "/qr", label: "QR kodları", icon: IconQr,
          roles: ["admin", "editor"] },
      ],
    },
    {
      title: "SİSTEM",
      items: [
        { href: "/takimlar", label: "Takımlar", icon: IconFootball, roles: ["admin"] },
        { href: "/sertifikalar", label: "Sertifikalar", icon: IconAward },
        { href: "/uyeler", label: "Üyeler", icon: IconUsers, roles: ["admin", "support"] },
        { href: "/politikalar", label: "Politikalar", icon: IconShield, roles: ["admin"] },
        { href: "/ayarlar", label: "Ayarlar", icon: IconSettings, roles: ["admin"] },
      ],
    },
  ];

  const body = (
    <>
      <div className="flex items-center justify-between px-5 pb-6 pt-5">
        <Link href="/" aria-label="Gösterge paneli" className="flex items-center gap-2.5">
          {/* Logo, Ayarlar > Marka bölümünden gelir. Sabit dosya kullanılmaz;
              logo bir yerden değiştirilince site, panel ve e-postalarda
              birlikte değişir.

              Açık ve koyu tema için ayrı varyantlar CSS ile seçilir; JS
              beklenmediği için ilk boyamada doğru logo görünür. */}
          <span className="relative block shrink-0"
            style={{ height: logoSize, maxHeight: "100%", width: "auto", maxWidth: logoSize * 1.6 }}>
            {/* Panel çubuğu her iki temada da KOYU zeminli olduğu için
                koyu tema logosu kullanılır. Ayarlarda tanımlı değilse
                /cocuktribunud.png yedeğe düşer. */}
            {/* Koyu tema logosu yoksa açık tema logosuna düşülür; ikisi de
                yoksa görsel yerine yazı gösterilir (kırık görsel çıkmasın). */}
            {(logoDark || logoLight) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoDark || logoLight} alt="Çocuk Tribünü"
                className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-full items-center whitespace-nowrap font-display font-semibold text-white"
                style={{ fontSize: Math.max(14, logoSize * 0.3) }}>
                Çocuk Tribünü
              </span>
            )}
          </span>
          <span className="font-display text-[13px] font-semibold tracking-[.1em] text-deep-muted">
            YÖNETİM
          </span>
        </Link>
        <button type="button" onClick={() => setOpen(false)} aria-label="Menüyü kapat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-deep-muted lg:hidden">
          <Icon icon={IconClose} size={18} />
        </button>
      </div>

      <nav className="ct-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const items = group.items.filter((i) => can(i.roles));
          if (items.length === 0) return null;

          return (
            <div key={group.title} className="mb-5">
              <span className="mb-1.5 block px-3.5 text-[10.5px] font-bold tracking-[.14em] text-deep-muted/70">
                {group.title}
              </span>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <li key={item.href}>
                      <Link href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-[11px] px-3.5 py-[10px] text-[14px] transition-colors",
                          active
                            ? "bg-solid text-on-solid font-semibold"
                            : "text-on-dark hover:bg-white/5",
                        )}>
                        <Icon icon={item.icon} size={17} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className={cn(
                            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                            active ? "bg-on-solid/20 text-on-solid" : "bg-orange text-white",
                          )}>
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3.5">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold text-on-dark">{userName}</span>
          <span className="truncate text-[11.5px] text-deep-muted">{roles.join(", ")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <button type="button" onClick={() => setConfirmOut(true)} aria-label="Çıkış yap"
            className="flex h-9 w-9 items-center justify-center rounded-full text-deep-muted transition-colors hover:bg-white/5 hover:text-orange">
            <Icon icon={IconLogout} size={17} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobil üst çubuk */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Menüyü aç"
          className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-line">
          <Icon icon={IconMenu} size={18} />
        </button>
        <span className="font-display text-[15px] font-semibold">Yönetim</span>
        <ThemeToggle />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="ct-fade absolute inset-0 bg-[rgba(15,31,26,.6)]" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[270px] flex-col bg-deep"
            style={{ animation: "ct-slide-in .25s cubic-bezier(.22,1,.36,1) both" }}>
            {body}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col bg-deep lg:flex">
        {body}
      </aside>

      <ConfirmDialog
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        loading={leaving}
        title="Çıkış yapmak istiyor musunuz?"
        description="Yönetim paneli oturumunuz kapatılacak."
        confirmLabel="Çıkış yap"
        onConfirm={() => { setLeaving(true); logoutRef.current?.requestSubmit(); }}
      />
      <form ref={logoutRef} action="/api/auth/cikis" method="post" className="hidden" />
    </>
  );
}
