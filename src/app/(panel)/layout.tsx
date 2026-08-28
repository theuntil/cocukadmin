import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getAdminUser, getDashboard, getBrandingSettings } from "@/lib/data";
import { getMailStats } from "@/lib/mail/data";

export const dynamic = "force-dynamic";

/**
 * Panel kabuğu.
 *
 * Güvenlik iki katmanlı: middleware oturumu doğrular, burada rol kontrolü yapılır.
 * Üçüncü katman veritabanındadır — her RPC kendi yetki kontrolünü yapar.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/giris");

  /* Mail sayacı personel dışına kapalı bir RPC'den gelir; yetkisi
     olmayan kullanıcıda 0 döner ve rozet hiç çıkmaz. */
  const [stats, branding, mail] = await Promise.all([
    getDashboard(), getBrandingSettings(), getMailStats(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-page lg:flex-row">
      <AdminSidebar
        logoLight={branding.logoLight}
        logoDark={branding.logoDark}
        logoSize={branding.logoSizePanel}
        roles={user.roles}
        userName={[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
        counts={{
          orders: stats.pending_payments,
          invoices: stats.orders_no_invoice,
          mailUnread: mail.inbox_unread,
        }}
      />
      <main id="icerik" className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
