import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  MailSettings, MailRow, MailDetail, MailStats, ImapState,
} from "@/lib/mail/types";

/**
 * Mail modülünün okuma katmanı.
 *
 * Her okuma RPC üzerinden yapılır: tablolar personel dışına kapalı
 * (RLS açık, politika yok). Yetki kontrolü veritabanında.
 */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error("[mail-data]", (err as Error).message);
    return fallback;
  }
}

export const EMPTY_SETTINGS: MailSettings = {
  from_email: null, from_name: "Çocuk Tribünü", reply_to: null,
  is_active: false,

  smtp_host: null, smtp_port: 465, smtp_secure: true,
  smtp_user: null, has_smtp_pass: false,

  imap_host: null, imap_port: 993, imap_secure: true,
  imap_user: null, has_imap_pass: false,
  imap_folder: "INBOX", imap_sent_folder: "Sent", imap_trash_folder: "Trash",
  imap_enabled: false, imap_save_sent: true,
  imap_last_uid: 0, imap_last_sync: null, imap_last_error: null,

  brand_name: "Çocuk Tribünü",
  logo_url: null, banner_url: null, banner_overlay: 45, banner_height: 190,
  site_url: "https://cocuktribunu.org",
  footer_note: null, signature_html: null,
  updated_at: null,
};

export async function getMailSettings(): Promise<MailSettings> {
  noStore();
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_mail_settings");
    if (error) throw new Error(error.message);
    return { ...EMPTY_SETTINGS, ...(data as unknown as MailSettings) };
  }, EMPTY_SETTINGS);
}

const EMPTY_STATS: MailStats = {
  inbox_total: 0, inbox_unread: 0, sent_total: 0, starred: 0, failed: 0,
};

export async function getMailStats(): Promise<MailStats> {
  noStore();
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_mail_stats");
    if (error) throw new Error(error.message);
    return { ...EMPTY_STATS, ...(data as unknown as MailStats) };
  }, EMPTY_STATS);
}

export type MailBox = "inbox" | "outbox" | "starred";

export async function listMail(opts: {
  box?: MailBox;
  status?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: MailRow[]; total: number; signature: string }> {
  noStore();
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_mail", {
      p_box: opts.box ?? "inbox",
      p_status: opts.status || null,
      p_search: opts.search || null,
      p_limit: opts.limit ?? 40,
      p_offset: opts.offset ?? 0,
    });
    if (error) throw new Error(error.message);
    const d = data as unknown as { rows: MailRow[]; total: number; signature?: string };
    return {
      rows: d.rows ?? [],
      total: Number(d.total ?? 0),
      signature: d.signature ?? "",
    };
  }, { rows: [], total: 0, signature: "" });
}

export async function getMailDetail(id: string): Promise<MailDetail | null> {
  noStore();
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_mail_detail", { p_id: id });
    if (error) throw new Error(error.message);
    return (data as unknown as MailDetail) ?? null;
  }, null);
}


const EMPTY_IMAP: ImapState = {
  enabled: false, configured: false,
  last_sync: null, last_uid: 0, last_error: null, folder: "INBOX",
};

/** Gelen kutusu eşitleme durumu — "en son ne zaman bakıldı" */
export async function getImapState(): Promise<ImapState> {
  noStore();
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_mail_imap_state");
    if (error) throw new Error(error.message);
    return { ...EMPTY_IMAP, ...(data as unknown as ImapState) };
  }, EMPTY_IMAP);
}
