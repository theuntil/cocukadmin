import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailComposer } from "@/components/admin/mail-composer";
import { getMailSettings } from "@/lib/mail/data";
import { getReplyContext } from "@/lib/actions/mail";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Yeni mail" };
export const dynamic = "force-dynamic";

/**
 * Yeni mail · yanıtla · ilet.
 *
 * ★ Yanıt ve iletmede adres satırında YALNIZCA iletinin kimliği taşınır
 *   (`?yanit=<id>` / `?ilet=<id>`). Özgün gövde burada, sunucuda
 *   hazırlanır. Eskiden gövde adres satırında taşınıyordu; uzun mailde
 *   adres binlerce karaktere çıkıp kesiliyor, alıntı yarım kalıyordu.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ yanit?: string; ilet?: string; kime?: string }>;
}) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor", "support")) redirect("/");

  const sp = await searchParams;
  const settings = await getMailSettings();

  const mode = sp.yanit ? "reply" : sp.ilet ? "forward" : "new";
  const kaynakId = sp.yanit ?? sp.ilet ?? null;

  const ctx = kaynakId
    ? await getReplyContext(kaynakId, mode === "forward" ? "forward" : "reply")
    : null;

  /* Gönderime hazır mı? Kullanıcı maili yazıp en sonda hata almasın;
     eksik neyse baştan ve TEK TEK söylenir. */
  const ready =
    settings.is_active &&
    Boolean(settings.from_email) &&
    Boolean(settings.smtp_host) &&
    Boolean(settings.smtp_user) &&
    settings.has_smtp_pass;

  const readyReason = !settings.is_active
    ? "Mail gönderimi kapalı."
    : !settings.from_email
      ? "Gönderen e-posta adresi tanımlı değil."
      : !settings.smtp_host
        ? "SMTP sunucu adresi tanımlı değil."
        : !settings.smtp_user
          ? "SMTP kullanıcı adı tanımlı değil."
          : !settings.has_smtp_pass
            ? "SMTP parolası girilmemiş."
            : undefined;

  const baslik = mode === "reply" ? "Yanıtla" : mode === "forward" ? "İlet" : "Yeni mail";

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-1">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
          {baslik}
        </h1>
        <span className="text-[13.5px] text-muted">
          {settings.from_email
            ? `${settings.from_email} adresinden gönderilecek`
            : "Gönderen adresi tanımlı değil"}
        </span>
      </div>

      <MailComposer
        ready={ready}
        readyReason={readyReason}
        mode={mode}
        initialTo={ctx?.to ?? sp.kime ?? ""}
        initialSubject={ctx?.subject ?? ""}
        initialBody={ctx?.body ?? ""}
        inReplyTo={ctx?.inReplyTo ?? ""}
      />
    </div>
  );
}
