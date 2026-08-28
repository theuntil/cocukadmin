import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft } from "@/components/ui/icons";
import { MailSettingsForm } from "@/components/admin/mail-settings-form";
import { getMailSettings } from "@/lib/mail/data";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Mail ayarları" };
export const dynamic = "force-dynamic";

export default async function Page() {
  /* Ayarlar YALNIZCA yöneticiye açık: gönderen adresi ve API anahtarı
     kurumsal kimlik demek. */
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) redirect("/mail");

  const settings = await getMailSettings();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/mail"
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Mail
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
          Mail ayarları
        </h1>
        <span className="text-[13.5px] text-muted">
          Hesap, giden (SMTP), gelen (IMAP) ve şablon görünümü
        </span>
      </div>

      <MailSettingsForm settings={settings} />
    </div>
  );
}
