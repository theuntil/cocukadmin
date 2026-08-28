/** Mail modülünün paylaşılan tipleri */


/**
 * Hazır sunucu ayarı.
 *
 * Kurum maili turkticaret.net'te. Adres ve port elle yazılırsa bir
 * rakam hatası saatler kaybettiriyor; tek düğmeyle doldurulur.
 */
export const MAIL_PRESET = {
  label: "TurkTicaret (cocuktribunu.org)",
  smtp_host: "smtp.turkticaret.net",
  smtp_port_ssl: 465,
  smtp_port_tls: 587,
  imap_host: "imap.turkticaret.net",
  imap_port: 993,
  account: "iletisim@cocuktribunu.org",
} as const;

export const MAIL_STATUS_TR: Record<string, string> = {
  received: "Gelen",
  sending: "Gönderiliyor",
  sent: "Gönderildi",
  failed: "Gönderilemedi",
};

export interface MailSettings {
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  is_active: boolean;

  /* ── Giden: SMTP ── */
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string | null;
  has_smtp_pass: boolean;

  /* ── Gelen: IMAP ── */
  imap_host: string | null;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string | null;
  has_imap_pass: boolean;
  imap_folder: string;
  imap_sent_folder: string;
  imap_trash_folder: string;
  imap_enabled: boolean;
  imap_save_sent: boolean;
  imap_last_uid: number;
  imap_last_sync: string | null;
  imap_last_error: string | null;
  brand_name: string | null;
  logo_url: string | null;
  banner_url: string | null;
  banner_overlay: number;
  banner_height: number;
  site_url: string | null;
  footer_note: string | null;
  signature_html: string | null;
  updated_at: string | null;
}

export interface ImapState {
  enabled: boolean;
  configured: boolean;
  last_sync: string | null;
  last_uid: number;
  last_error: string | null;
  folder: string;
}

export interface MailRow {
  id: string;
  box: "outbox" | "inbox";
  status: string;
  subject: string | null;
  to_email: string | null;
  /** Tek iletide birden fazla alıcı — normal "Kime" satırı */
  to_list: string[] | null;
  to_name: string | null;
  from_email: string | null;
  from_name: string | null;
  is_read: boolean;
  is_starred: boolean;
  error: string | null;
  has_attachments: boolean;
  /** Listede gösterilen kısa metin */
  preview: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
}

export interface MailDetail extends MailRow {
  body_html: string | null;
  body_text: string | null;
  /** Editörden gelen ham gövde — gönderilmeden önce burada durur */
  body_source: string | null;
  heading: string | null;
  partner_logo_url: string | null;
  provider_id: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  imap_uid: number | null;
  folder: string | null;
  is_archived: boolean;
  attachments: { filename: string | null; size: number; contentType: string }[] | null;
  created_by_name: string | null;
  /** Bu açılışta okundu işaretlendi mi — sunucuda da işaretlemek için */
  newly_read: boolean;
}

export interface MailStats {
  inbox_total: number;
  inbox_unread: number;
  sent_total: number;
  starred: number;
  failed: number;
}

