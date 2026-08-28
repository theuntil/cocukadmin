import "server-only";
import { storageDownload } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/server";
import { sendMail, buildRaw, type SmtpConfig } from "@/lib/mail/provider";
import {
  appendToSent, deleteFromServer, deleteManyFromServer, fetchNewMails,
  markSeen, type ImapConfig,
} from "@/lib/mail/imap";
import { buildMailHtml, htmlToText, type MailBrand } from "@/lib/mail/template";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  MAİL İSTEMCİSİ
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Normal bir mail programı gibi çalışır:
 *
 *    yaz  → SMTP ile ANINDA gider, "Gönderilmiş" klasörüne kopyalanır
 *    al   → IMAP'ten yeni iletiler çekilir
 *    oku  → sunucuda da okundu işaretlenir
 *    sil  → sunucuda çöp kutusuna taşınır
 *
 *  Kuyruk, parti işçisi, toplu gönderim kitlesi YOK. Bir mail bir
 *  iletidir; birden fazla alıcı varsa hepsi aynı iletinin "Kime"
 *  satırındadır — tıpkı Outlook'ta olduğu gibi.
 *
 *  ★ Parolalara yalnızca burası erişir (service_role). Panel tarafı
 *    parolayı hiç görmez.
 */

interface InternalSettings {
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  is_active: boolean | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  imap_host: string | null;
  imap_port: number | null;
  imap_secure: boolean | null;
  imap_user: string | null;
  imap_pass: string | null;
  imap_folder: string | null;
  imap_sent_folder: string | null;
  imap_trash_folder: string | null;
  imap_enabled: boolean | null;
  imap_save_sent: boolean | null;
  imap_last_uid: number | null;
  brand_name: string | null;
  logo_url: string | null;
  banner_url: string | null;
  banner_overlay: number;
  banner_height: number;
  site_url: string | null;
  footer_note: string | null;
  signature_html: string | null;
}

/** Ayar satırından şablon markasını çıkarır — tek dönüşüm noktası */
export function toBrand(s: Partial<InternalSettings> | null | undefined): MailBrand {
  return {
    brandName: s?.brand_name?.trim() || "Çocuk Tribünü",
    logoUrl: s?.logo_url ?? "",
    bannerUrl: s?.banner_url ?? "",
    bannerOverlay: Number(s?.banner_overlay ?? 45),
    bannerHeight: Number(s?.banner_height ?? 190),
    siteUrl: s?.site_url ?? "https://cocuktribunu.org",
    footerNote: s?.footer_note ?? "",
    signatureHtml: s?.signature_html ?? "",
  };
}

function toSmtp(s: InternalSettings): SmtpConfig | null {
  if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) return null;
  return {
    host: s.smtp_host,
    port: Number(s.smtp_port ?? 465),
    secure: s.smtp_secure ?? true,
    user: s.smtp_user,
    pass: s.smtp_pass,
  };
}

function toImap(s: InternalSettings, folder?: string): ImapConfig | null {
  if (!s.imap_host || !s.imap_user || !s.imap_pass) return null;
  return {
    host: s.imap_host,
    port: Number(s.imap_port ?? 993),
    secure: s.imap_secure ?? true,
    user: s.imap_user,
    pass: s.imap_pass,
    folder: folder || s.imap_folder || "INBOX",
  };
}

/** Ayarları parolalarıyla okur — yalnızca sunucu tarafı */
async function loadSettings(): Promise<
  { ok: true; s: InternalSettings; db: ReturnType<typeof createServiceClient> }
  | { ok: false; error: string }
> {
  let db;
  try {
    db = createServiceClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil." };
  }

  const { data, error } = await db.rpc("mail_settings_internal");
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Mail ayarları okunamadı." };
  }
  return { ok: true, s: data as unknown as InternalSettings, db };
}

/* ═══════════════════ GÖNDER ═══════════════════ */

export interface SendMessageInput {
  id: string;               // admin_mail_begin_send'den dönen kayıt
  to: string[];
  subject: string;
  bodyHtml: string;
  heading?: string | null;
  partnerLogoUrl?: string | null;
  inReplyTo?: string | null;
  /** Depolamadaki ek dosyalarının yolları (`mail-attachments` kovası) */
  attachmentPaths?: string[] | null;

  /**
   * Doğrudan bellekten eklenecek dosyalar.
   *
   * Depolamaya yazılmadan gönderilen ekler için — sertifika PDF'i
   * gibi. Dosya zaten elimizde; önce kovaya yazıp sonra indirmek
   * gereksiz iki adım olurdu.
   */
  files?: { filename: string; content: Buffer; contentType?: string }[] | null;
}

export interface SendMessageResult {
  ok: boolean;
  error?: string;
  providerId?: string;
  html?: string;
  text?: string;
  sentUid?: number;
}

/**
 * Maili gönderir. ANINDA — bekleyen kuyruk yok.
 *
 * Birden fazla alıcı tek iletide gider (normal "Kime" satırı).
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const loaded = await loadSettings();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const { s } = loaded;
  const smtp = toSmtp(s);

  if (!smtp) {
    return { ok: false, error: "SMTP bilgileri eksik. Mail → Ayarlar bölümünden tamamlayın." };
  }
  if (!s.from_email) {
    return { ok: false, error: "Gönderen adresi tanımlı değil." };
  }

  const html = buildMailHtml(toBrand(s), {
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    heading: input.heading,
    partnerLogoUrl: input.partnerLogoUrl,
  });
  const text = htmlToText(html);

  /* ┌─ EKLER GÖNDERİM ANINDA İNDİRİLİYOR ⚠️ ────────────────────┐
     │ Dosyalar depolamada duruyor ve yalnızca yolları taşınıyor.   │
     │ Ama SMTP sunucusu o yolu okuyamaz — ek, iletinin İÇİNE       │
     │ gömülmek zorunda. Bu yüzden burada indirilip byte olarak     │
     │ veriliyor.                                                    │
     │                                                                │
     │ Tek bir ek inemezse GÖNDERİM DURUR. Yarım ekli mail          │
     │ göndermek, hiç göndermemekten kötü: kullanıcı ektin gittiğini│
     │ sanır.                                                        │
     └────────────────────────────────────────────────────────────────┘ */
  const ekler: { filename: string; content: Buffer; contentType?: string }[] = [];

  for (const yol of input.attachmentPaths ?? []) {
    const indir = await downloadAttachment(yol);
    if (!indir.ok) {
      return { ok: false, error: `Ek eklenemedi (${yol.split("/").pop()}): ${indir.error}` };
    }
    ekler.push(indir.file);
  }

  for (const f of input.files ?? []) {
    ekler.push({ filename: f.filename, content: f.content, contentType: f.contentType });
  }

  const payload = {
    /* Alıcılar virgülle birleştirilir: nodemailer bunu tek iletide
       birden fazla alıcı olarak gönderir. */
    to: input.to.join(", "),
    subject: input.subject,
    html, text,
    fromEmail: s.from_email,
    fromName: s.from_name,
    replyTo: s.reply_to,
    smtp,
    attachments: ekler,
  };

  const res = await sendMail(payload);
  if (!res.ok) return { ok: false, error: res.error };

  /* GÖNDERİLMİŞ KLASÖRÜNE KOPYALA
     SMTP ile giden mail sunucudaki "Gönderilmiş" kutusuna kendiliğinden
     DÜŞMEZ. Bu adım olmadan telefondan bakınca gönderdiklerin görünmez.
     Başarısızlığı ölümcül değil — mail zaten gitti. */
  let sentUid: number | undefined;
  const imap = toImap(s);
  if (imap && s.imap_save_sent !== false) {
    try {
      const raw = await buildRaw(payload);
      if (raw) {
        const ap = await appendToSent(imap, s.imap_sent_folder || "Sent", raw);
        if (ap.ok) sentUid = ap.uid;
      }
    } catch { /* arşivleme sessizce geçilir */ }
  }

  return { ok: true, providerId: res.providerId, html, text, sentUid };
}

/* ═══════════════════ AL ═══════════════════ */

export interface SyncResult {
  ok: boolean;
  fetched: number;
  added: number;
  /** Kilit başkasındaydı; bu turda sunucuya bağlanılmadı */
  skipped?: boolean;
  error?: string;
}

/**
 * Gelen postaları IMAP'ten çeker.
 *
 * Son okunan UID veritabanında; aynı ileti iki kez alınmaz. Hata olsa
 * bile o ana kadar çekilenler kaydedilir.
 */
export async function syncInbox(limit = 40, opts?: { throttleSeconds?: number }): Promise<SyncResult> {
  const loaded = await loadSettings();
  if (!loaded.ok) return { ok: false, fetched: 0, added: 0, error: loaded.error };

  const { s, db } = loaded;

  if (!s.imap_enabled) {
    return { ok: false, fetched: 0, added: 0, error: "Gelen posta alımı kapalı. Mail → Ayarlar'dan açın." };
  }

  const imap = toImap(s);
  if (!imap) {
    return { ok: false, fetched: 0, added: 0, error: "IMAP bilgileri eksik. Sunucu, kullanıcı ve parola gerekli." };
  }

  /* EŞİTLEME KİLİDİ
     Panel 5 saniyede bir tazeleniyor ve birden çok sekme açık olabilir.
     Her tazelemede IMAP'e bağlanmak hesabı kilitletir. Kilidi yalnızca
     bir çağıran alır; diğerleri veritabanındaki hazır listeyi okur.
     `throttleSeconds: 0` → kilit atlanır (elle "yenile" için). */
  const throttle = opts?.throttleSeconds ?? 0;
  if (throttle > 0) {
    const { data: claimed } = await db.rpc("mail_try_claim_sync", { p_seconds: throttle });
    if (claimed !== true) {
      return { ok: true, fetched: 0, added: 0, skipped: true };
    }
  }

  /* KUTU BOŞALANA KADAR TUR AT
     Tek turda `limit` kadar ileti alınıyor. Biriken kutuda tek tıklama
     ile hepsi gelsin diye, sırada bekleyen kaldıkça tur tekrarlanır.
     Üst sınır var: bir istek sonsuza kadar sürmesin. */
  const MAX_ROUNDS = 6;

  let uid = Number(s.imap_last_uid ?? 0);
  let fetched = 0;
  let added = 0;
  let lastError: string | undefined;
  let ok = true;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetchNewMails(imap, uid, limit);

    const { data: ing, error } = await db.rpc("mail_imap_ingest", {
      p_mails: res.mails,
      p_last_uid: res.lastUid,
      p_error: res.ok ? null : (res.error ?? null),
    });

    if (error) {
      return { ok: false, fetched: fetched + res.mails.length, added, error: error.message };
    }

    fetched += res.mails.length;
    added += Number((ing as { new?: number })?.new ?? 0);
    uid = res.lastUid;

    if (!res.ok) { ok = false; lastError = res.error; break; }

    // Sırada bekleyen kalmadıysa bitti
    if (res.remaining <= 0 || res.mails.length === 0) break;
  }

  if (throttle > 0) {
    await db.rpc("mail_release_sync_lock", { p_ok: ok });
  }

  return { ok, fetched, added, error: lastError };
}

/* ═══════════════════ TOPLU SİL ═══════════════════ */

export interface DeleteManyResult {
  ok: boolean;
  /** Sunucudan gerçekten kaldırılan kayıtlar — yalnızca bunlar silinir */
  deletedIds: string[];
  error?: string;
}

/**
 * Birden çok postayı sunucudan siler — TEK bağlantıda.
 *
 * Sunucudan kaldırılamayan kayıt geri dönmez, dolayısıyla panelden de
 * silinmez. "Sildim sandım" durumu oluşmaz.
 */
export async function deleteManyOnServer(ids: string[]): Promise<DeleteManyResult> {
  if (ids.length === 0) return { ok: true, deletedIds: [] };

  const loaded = await loadSettings();
  if (!loaded.ok) return { ok: false, deletedIds: [], error: loaded.error };

  const { s, db } = loaded;

  const { data, error } = await db.rpc("mail_locate_many", { p_ids: ids });
  if (error) return { ok: false, deletedIds: [], error: error.message };

  const items = ((data ?? []) as { id: string; uid: number | null; folder: string | null }[])
    .map((i) => ({ id: i.id, uid: Number(i.uid ?? 0), folder: i.folder ?? "INBOX" }));

  if (items.length === 0) return { ok: true, deletedIds: [] };

  const needsServer = items.some((i) => i.uid > 0);
  if (!needsServer) return { ok: true, deletedIds: items.map((i) => i.id) };

  const imap = toImap(s);
  if (!imap) {
    return { ok: false, deletedIds: [], error: "IMAP bilgileri eksik; sunucudan silinemedi." };
  }

  const res = await deleteManyFromServer(imap, items, s.imap_trash_folder || "Trash");
  return { ok: res.ok, deletedIds: res.deletedIds, error: res.error };
}

/* ═══════════════════ OKUNDU İŞARETLE ═══════════════════ */

/**
 * Panelde okunan iletiyi sunucuda da okundu yapar.
 * Sessiz çalışır; başarısızlığı kullanıcıya gösterilmez.
 */
export async function markReadOnServer(uid: number, folder: string | null): Promise<void> {
  const loaded = await loadSettings();
  if (!loaded.ok) return;

  const imap = toImap(loaded.s, folder ?? undefined);
  if (!imap) return;

  await markSeen(imap, uid).catch(() => null);
}

/* ═══════════════════ SİL ═══════════════════ */

export interface DeleteResult {
  ok: boolean;
  /** Sunucudan da silindi mi */
  server: boolean;
  moved?: boolean;
  error?: string;
}

/**
 * İletiyi sunucudan siler (çöp kutusuna taşır).
 *
 * ★ Sunucuda kaydı olmayan ileti (hiç gönderilememiş taslak gibi)
 *   doğrudan "sunucu tarafı tamam" sayılır — silinecek bir şey yok.
 *
 * ★ Sunucudan silinemezse `ok:false` döner ve veritabanı kaydı
 *   SİLİNMEZ. "Panelde sildim ama telefonda hâlâ duruyor" durumu
 *   olmasın.
 */
export async function deleteMessageOnServer(id: string): Promise<DeleteResult> {
  const loaded = await loadSettings();
  if (!loaded.ok) return { ok: false, server: false, error: loaded.error };

  const { s, db } = loaded;

  const { data, error } = await db.rpc("mail_locate", { p_id: id });
  if (error) return { ok: false, server: false, error: error.message };

  const loc = data as { found?: boolean; uid?: number | null; folder?: string | null };
  if (!loc?.found) return { ok: true, server: false };

  // Sunucuda karşılığı yoksa silinecek bir şey de yok
  if (!loc.uid) return { ok: true, server: false };

  const imap = toImap(s, loc.folder ?? undefined);
  if (!imap) {
    return { ok: false, server: false, error: "IMAP bilgileri eksik; sunucudan silinemedi." };
  }

  const res = await deleteFromServer(imap, Number(loc.uid), s.imap_trash_folder || "Trash");
  if (!res.ok) return { ok: false, server: false, error: res.error };

  return { ok: true, server: true, moved: res.moved };
}

/**
 * Depolamadaki ek dosyasını indirir.
 *
 * ★ Servis anahtarı kullanılıyor: `mail-attachments` kovası KAPALI.
 *   Açık kova, mail eklerinin bağlantısını bilen herkese açık olması
 *   demekti — ekler kişisel veri içerebilir.
 */
async function downloadAttachment(path: string): Promise<
  | { ok: true; file: { filename: string; content: Buffer; contentType?: string } }
  | { ok: false; error: string }
> {
  try {
    const inen = await storageDownload("mail-attachments", path);
    if (!inen.ok) return { ok: false, error: inen.error };

    const buf = Buffer.from(inen.body);

    /* Yol `{zaman}-{rastgele}-{ad}` biçiminde; kullanıcıya görünen
       kısım son parça. Yolun tamamını dosya adı yapmak alıcıya
       anlamsız bir isim gönderirdi. */
    const ad = path.split("/").pop() ?? "ek";
    const temiz = ad.replace(/^\d+-[a-z0-9]+-/i, "") || ad;

    return {
      ok: true,
      file: { filename: temiz, content: buf, contentType: inen.contentType || undefined },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
