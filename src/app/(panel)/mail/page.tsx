import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailBox } from "@/components/admin/mail-box";
import { listMail, getMailStats, getMailSettings, getImapState } from "@/lib/mail/data";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Mail" };
export const dynamic = "force-dynamic";

/**
 * MAİL KUTUSU
 *
 * Sunucu ilk listeyi hazırlar; oradan sonrasını `MailBox` istemci
 * tarafında canlı tutar (5 saniyede bir, sayfa yenilenmeden).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kutu?: string; ara?: string }>;
}) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor", "support")) redirect("/");

  const sp = await searchParams;
  const box = sp.kutu === "outbox" ? "outbox" : sp.kutu === "starred" ? "starred" : "inbox";
  const search = sp.ara?.trim() || null;

  const [list, stats, settings, imap] = await Promise.all([
    listMail({ box, search, limit: 60 }),
    getMailStats(),
    getMailSettings(),
    getImapState(),
  ]);

  return (
    <MailBox
      box={box}
      initialRows={list.rows}
      initialTotal={list.total}
      initialSignature={list.signature}
      initialStats={stats}
      search={search}
      fromEmail={settings.from_email}
      mailActive={settings.is_active}
      imapEnabled={imap.enabled}
      imapError={imap.last_error}
    />
  );
}
