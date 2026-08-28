"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import {
  sendMessage, syncInbox, deleteMessageOnServer, deleteManyOnServer,
  markReadOnServer, toBrand,
} from "@/lib/mail/client";
import { verifySmtp } from "@/lib/mail/provider";
import { testImap } from "@/lib/mail/imap";
import { buildMailHtml, textToHtml, quotableText } from "@/lib/mail/template";
import { getMailSettings, listMail, getMailStats, getMailDetail } from "@/lib/mail/data";
import type { MailRow, MailStats } from "@/lib/mail/types";

/* ═════════════════════ AYARLAR ═════════════════════ */

export async function saveMailSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    from_email: z.string().trim().email("Geçerli bir gönderen adresi girin"),
    from_name: z.string().trim().max(80).optional().default(""),
    reply_to: z.union([z.string().trim().email("Geçerli bir yanıt adresi girin"), z.literal("")]).optional(),
    is_active: z.boolean(),

    smtp_host: z.string().trim().max(200).optional().default(""),
    smtp_port: z.coerce.number().int().min(1).max(65535),
    smtp_secure: z.boolean(),
    smtp_user: z.string().trim().max(200).optional().default(""),
    smtp_pass: z.string().max(200).optional().default(""),

    imap_host: z.string().trim().max(200).optional().default(""),
    imap_port: z.coerce.number().int().min(1).max(65535),
    imap_secure: z.boolean(),
    imap_user: z.string().trim().max(200).optional().default(""),
    imap_pass: z.string().max(200).optional().default(""),
    imap_folder: z.string().trim().max(120).optional().default("INBOX"),
    imap_sent_folder: z.string().trim().max(120).optional().default("Sent"),
    imap_trash_folder: z.string().trim().max(120).optional().default("Trash"),
    imap_enabled: z.boolean(),
    imap_save_sent: z.boolean(),

    brand_name: z.string().trim().max(80).optional().default(""),
    logo_url: z.string().trim().max(600).optional().default(""),
    banner_url: z.string().trim().max(600).optional().default(""),
    banner_overlay: z.coerce.number().int().min(0).max(90),
    banner_height: z.coerce.number().int().min(110).max(340),
    site_url: z.string().trim().max(300).optional().default(""),
    footer_note: z.string().trim().max(400).optional().default(""),
    signature_html: z.string().trim().max(4000).optional().default(""),
  }).safeParse({
    from_email: formData.get("from_email"),
    from_name: formData.get("from_name") ?? "",
    reply_to: formData.get("reply_to") ?? "",
    is_active: formData.get("is_active") === "on",

    smtp_host: formData.get("smtp_host") ?? "",
    smtp_port: formData.get("smtp_port"),
    smtp_secure: formData.get("smtp_secure") === "on",
    smtp_user: formData.get("smtp_user") ?? "",
    smtp_pass: formData.get("smtp_pass") ?? "",

    imap_host: formData.get("imap_host") ?? "",
    imap_port: formData.get("imap_port"),
    imap_secure: formData.get("imap_secure") === "on",
    imap_user: formData.get("imap_user") ?? "",
    imap_pass: formData.get("imap_pass") ?? "",
    imap_folder: formData.get("imap_folder") ?? "INBOX",
    imap_sent_folder: formData.get("imap_sent_folder") ?? "Sent",
    imap_trash_folder: formData.get("imap_trash_folder") ?? "Trash",
    imap_enabled: formData.get("imap_enabled") === "on",
    imap_save_sent: formData.get("imap_save_sent") === "on",

    brand_name: formData.get("brand_name") ?? "",
    logo_url: formData.get("logo_url") ?? "",
    banner_url: formData.get("banner_url") ?? "",
    banner_overlay: formData.get("banner_overlay"),
    banner_height: formData.get("banner_height"),
    site_url: formData.get("site_url") ?? "",
    footer_note: formData.get("footer_note") ?? "",
    signature_html: formData.get("signature_html") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
  }

  const supabase = await createClient();

  /* Parola alanları BOŞ geldiyse mevcut parola korunur — panelde maskeli
     gösterildiği için kullanıcı her kaydedişte boş gönderiyor. */
  const { error } = await supabase.rpc("admin_save_mail_settings", {
    p_patch: {
      ...parsed.data,
      reply_to: parsed.data.reply_to ?? "",
      reset_imap: formData.get("reset_imap") === "on",
    },
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/mail");
  revalidatePath("/mail/ayarlar");
  return { ok: true, message: "Mail ayarları kaydedildi." };
}

/** SMTP bağlantısını sınar — gerçek mail göndermeden */
export async function testSmtpConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("mail_settings_internal");
    if (error || !data) return { ok: false, message: "Ayarlar okunamadı." };

    const i = data as unknown as {
      smtp_host: string | null; smtp_port: number | null; smtp_secure: boolean | null;
      smtp_user: string | null; smtp_pass: string | null;
    };

    if (!i.smtp_host || !i.smtp_user || !i.smtp_pass) {
      return { ok: false, message: "SMTP sunucu, kullanıcı ve parola alanlarını doldurup kaydedin." };
    }

    const res = await verifySmtp({
      host: i.smtp_host,
      port: Number(i.smtp_port ?? 465),
      secure: i.smtp_secure ?? true,
      user: i.smtp_user,
      pass: i.smtp_pass,
    });

    return res.ok
      ? { ok: true, message: `Bağlantı kuruldu: ${i.smtp_host}:${i.smtp_port} — gönderime hazır.` }
      : { ok: false, message: res.error ?? "Bağlantı kurulamadı." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** IMAP bağlantısını sınar ve klasör listesini döndürür */
export async function testImapConnection(): Promise<{
  ok: boolean; message: string; folders?: string[];
}> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("mail_settings_internal");
    if (error || !data) return { ok: false, message: "Ayarlar okunamadı." };

    const i = data as unknown as {
      imap_host: string | null; imap_port: number | null; imap_secure: boolean | null;
      imap_user: string | null; imap_pass: string | null; imap_folder: string | null;
    };

    if (!i.imap_host || !i.imap_user || !i.imap_pass) {
      return { ok: false, message: "IMAP sunucu, kullanıcı ve parola alanlarını doldurup kaydedin." };
    }

    const res = await testImap({
      host: i.imap_host,
      port: Number(i.imap_port ?? 993),
      secure: i.imap_secure ?? true,
      user: i.imap_user,
      pass: i.imap_pass,
      folder: i.imap_folder || "INBOX",
    });

    return res.ok
      ? {
          ok: true,
          message: `Bağlantı kuruldu. ${i.imap_folder || "INBOX"} klasöründe ${res.total ?? 0} ileti var.`,
          folders: res.folders,
        }
      : { ok: false, message: res.error ?? "Bağlantı kurulamadı." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/* ═════════════════════ ÖNİZLEME ═════════════════════ */

/**
 * Gönderilecek HTML'i üretir.
 *
 * ★ Gönderimde kullanılan `buildMailHtml` ile AYNI fonksiyon. Önizleme
 *   ayrı bir kod yoluyla üretilseydi ikisi zamanla ayrışırdı.
 */
export async function previewMail(input: {
  subject: string;
  bodyHtml: string;
  heading?: string | null;
  partnerLogoUrl?: string | null;
}): Promise<{ html: string }> {
  const s = await getMailSettings();
  const html = buildMailHtml(toBrand(s), {
    subject: input.subject || "(konu yok)",
    bodyHtml: input.bodyHtml || "<p>İçerik buraya gelecek.</p>",
    heading: input.heading,
    partnerLogoUrl: input.partnerLogoUrl,
  });
  return { html };
}

/* ═════════════════════ GÖNDER ═════════════════════ */

/**
 * Maili gönderir — ANINDA.
 *
 * Kuyruk yok: kullanıcı düğmeye basar, birkaç saniye bekler, sonucu
 * görür. Bir kurum mail kutusunda günde onlarca mail gider; kuyruk
 * mekanizması sadece karmaşıklık ekliyordu.
 *
 * Birden fazla alıcı TEK iletide gider (normal "Kime" satırı).
 */
export async function sendMailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    to: z.string().trim().min(3, "En az bir alıcı girin").max(4000),
    subject: z.string().trim().min(2, "Konu en az 2 karakter olmalı").max(200),
    heading: z.string().trim().max(160).optional().default(""),
    bodyHtml: z.string().trim().min(2, "İçerik boş olamaz").max(60000),
    format: z.enum(["text", "html"]).default("text"),
    partnerLogoUrl: z.string().trim().max(600).optional().default(""),
    inReplyTo: z.string().trim().max(400).optional().default(""),
    /* Ek yolları JSON dizisi olarak geliyor: form alanı çoklu değer
       taşıyamıyor, tek alanda toplamak daha güvenilir. */
    attachments: z.string().trim().max(8000).optional().default(""),
  }).safeParse({
    to: formData.get("to"),
    subject: formData.get("subject"),
    heading: formData.get("heading") ?? "",
    bodyHtml: formData.get("bodyHtml"),
    format: formData.get("format") ?? "text",
    partnerLogoUrl: formData.get("partnerLogoUrl") ?? "",
    inReplyTo: formData.get("inReplyTo") ?? "",
    attachments: formData.get("attachments") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
  }

  const d = parsed.data;

  /* DÜZ METİN → HTML
     Varsayılan kip düz metin: kimse mail yazarken etiket düşünmesin.
     Alt satıra geçmeler, boş satırlar ve "> " ile başlayan alıntılar
     korunarak HTML'e çevrilir. HTML kipinde metin olduğu gibi geçer. */
  const govde = d.format === "html" ? d.bodyHtml : textToHtml(d.bodyHtml);

  /* Adresler virgül, noktalı virgül, satır sonu veya boşlukla ayrılabilir.
     Kullanıcı hangisini kullanırsa kullansın çalışsın. */
  const recipients = [...new Set(
    d.to.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean),
  )];

  if (recipients.length === 0) {
    return { ok: false, fieldErrors: { to: "En az bir alıcı girin" } };
  }

  const bad = recipients.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (bad) return { ok: false, fieldErrors: { to: `Geçersiz adres: ${bad}` } };

  /* Ek listesi çözülür. Bozuk JSON gelirse gönderim durur: sessizce
     eksiz göndermek, kullanıcının ek gittiğini sanmasına yol açar. */
  let ekler: { path: string; name: string; size: number; type: string }[] = [];

  if (d.attachments) {
    try {
      const ham = JSON.parse(d.attachments) as unknown;
      if (!Array.isArray(ham)) throw new Error("liste değil");

      ekler = ham.map((x) => {
        const o = x as Record<string, unknown>;
        if (typeof o.path !== "string" || !o.path) throw new Error("yol yok");
        return {
          path: o.path,
          name: String(o.name ?? o.path.split("/").pop() ?? "ek"),
          size: Number(o.size ?? 0),
          type: String(o.type ?? "application/octet-stream"),
        };
      });
    } catch {
      return { ok: false, message: "Ek listesi okunamadı. Ekleri kaldırıp tekrar deneyin." };
    }
  }

  /* Toplam boyut sınırı: çoğu mail sunucusu 25 MB üstünü reddediyor.
     Burada durdurmak, SMTP'den dönen anlaşılmaz hatadan iyi. */
  const toplam = ekler.reduce((a, e) => a + e.size, 0);
  if (toplam > 24 * 1024 * 1024) {
    return {
      ok: false,
      message: `Ekler toplam ${(toplam / 1048576).toFixed(1)} MB. Sınır 24 MB — birkaçını çıkarın.`,
    };
  }

  const supabase = await createClient();

  // 1) Kayıt açılır — gönderim yarıda kesilse bile ekranda iz kalsın
  const { data: begun, error: beginErr } = await supabase.rpc("admin_mail_begin_send", {
    p_to: recipients,
    p_subject: d.subject,
    p_body_source: govde,
    p_heading: d.heading || null,
    p_partner_logo_url: d.partnerLogoUrl || null,
    p_in_reply_to: d.inReplyTo || null,
  });

  if (beginErr) return { ok: false, message: friendlyError(beginErr) };

  const id = (begun as { id?: string })?.id;
  if (!id) return { ok: false, message: "Gönderim kaydı oluşturulamadı." };

  // 2) SMTP ile gönder
  const res = await sendMessage({
    id,
    to: recipients,
    subject: d.subject,
    bodyHtml: govde,
    heading: d.heading || null,
    partnerLogoUrl: d.partnerLogoUrl || null,
    inReplyTo: d.inReplyTo || null,
    attachmentPaths: ekler.map((e) => e.path),
  });

  /* Ek üstverisi kayda yazılır: gönderilen mail açıldığında ekler
     gelen maillerdeki gibi listelensin. */
  if (ekler.length > 0) {
    await supabase.rpc("admin_mail_set_attachments", {
      p_id: id,
      p_items: ekler.map((e) => ({
        filename: e.name, size: e.size, contentType: e.type,
      })),
    });
  }

  // 3) Sonucu işle
  await supabase.rpc("admin_mail_finish_send", {
    p_id: id,
    p_ok: res.ok,
    p_error: res.ok ? null : (res.error ?? "Bilinmeyen hata"),
    p_provider_id: res.providerId ?? null,
    p_html: res.html ?? null,
    p_text: res.text ?? null,
    p_imap_uid: res.sentUid ?? null,
  });

  revalidatePath("/mail");

  if (!res.ok) {
    return { ok: false, message: res.error ?? "Mail gönderilemedi." };
  }

  redirect(`/mail?kutu=outbox&gonderildi=${recipients.length}`);
}

/** Kendine test maili gönderir */
export async function sendTestMail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = z.string().trim().email("Geçerli bir adres girin")
    .safeParse(formData.get("testEmail"));
  if (!email.success) {
    return { ok: false, fieldErrors: { testEmail: email.error.issues[0]?.message ?? "Geçersiz adres" } };
  }

  const supabase = await createClient();
  const body =
    "<p>Bu bir <strong>test</strong> e-postasıdır.</p>" +
    "<p>Bu iletiyi okuyabiliyorsanız mail ayarlarınız çalışıyor demektir. " +
    "Üst görsel, logo ve şablon doğru görünüyor mu diye kontrol edin.</p>";

  const { data: begun, error } = await supabase.rpc("admin_mail_begin_send", {
    p_to: [email.data],
    p_subject: "Çocuk Tribünü — test e-postası",
    p_body_source: body,
    p_heading: "Test e-postası",
    p_partner_logo_url: null,
    p_in_reply_to: null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const id = (begun as { id?: string })?.id;
  if (!id) return { ok: false, message: "Gönderim kaydı oluşturulamadı." };

  const res = await sendMessage({
    id, to: [email.data],
    subject: "Çocuk Tribünü — test e-postası",
    bodyHtml: body,
    heading: "Test e-postası",
  });

  await supabase.rpc("admin_mail_finish_send", {
    p_id: id, p_ok: res.ok,
    p_error: res.ok ? null : (res.error ?? "Bilinmeyen hata"),
    p_provider_id: res.providerId ?? null,
    p_html: res.html ?? null, p_text: res.text ?? null,
    p_imap_uid: res.sentUid ?? null,
  });

  revalidatePath("/mail");

  return res.ok
    ? { ok: true, message: `Test e-postası ${email.data} adresine gönderildi.` }
    : { ok: false, message: res.error ?? "Gönderilemedi." };
}

/* ═════════════════════ YANITLA / İLET ═════════════════════ */

export interface ReplyContext {
  to: string;
  subject: string;
  body: string;
  inReplyTo: string;
}

/** "Ad Soyad <adres>" — mail programlarının alışılmış yazımı */
function kisi(ad: string | null | undefined, adres: string | null | undefined): string {
  const a = (ad ?? "").trim();
  const e = (adres ?? "").trim();
  if (a && e) return `${a} <${e}>`;
  return a || e || "gönderen";
}

/**
 * Alıntı satırlarını hazırlar.
 *
 * Boş satır `>` olur (sonunda boşluk bırakılmaz); sondaki boş alıntı
 * satırları kırpılır. Eskiden alıntının altında bir sürü "> " kalıyordu.
 */
function quoteLines(text: string, limit = 6000): string {
  const satirlar = String(text ?? "").slice(0, limit).replace(/\r\n?/g, "\n").split("\n");

  while (satirlar.length && satirlar[satirlar.length - 1].trim() === "") satirlar.pop();
  while (satirlar.length && satirlar[0].trim() === "") satirlar.shift();

  return satirlar.map((l) => (l.trim() === "" ? ">" : `> ${l}`)).join("\n");
}

/**
 * Yanıtla / İlet için hazır içerik üretir.
 *
 * ┌─ NEDEN SUNUCUDAN ─────────────────────────────────────────────┐
 * │ Önce özgün gövde ADRES SATIRINDA taşınıyordu (?govde=...).     │
 * │ Uzun bir mail yanıtlanınca adres binlerce karaktere çıkıyor;   │
 * │ tarayıcılar ve sunucular bunu kesiyordu — alıntı yarım         │
 * │ kalıyor, bazen sayfa hiç açılmıyordu.                          │
 * │                                                                │
 * │ Artık yalnızca iletinin kimliği taşınıyor; içerik burada       │
 * │ hazırlanıyor.                                                  │
 * └────────────────────────────────────────────────────────────────┘
 *
 * ★ Alıntı, mailin TAM HTML'inden değil `quotableText` ile
 *   kullanıcının yazdığı kaynak metinden çıkarılır. Aksi hâlde
 *   iletilen mailin içine ön izleme dolgusu, alt bilgi ve düzinelerce
 *   boş satır giriyordu.
 *
 * ★ Yanıt ve iletme AYNI biçimi kullanır: tek satır künye + alıntı.
 *   "--- İletilen ileti ---" gibi ayraçlar ve çok satırlı künye
 *   blokları kaldırıldı; sade ve okunur.
 */
export async function getReplyContext(
  id: string,
  mode: "reply" | "forward",
): Promise<ReplyContext | null> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return null;

  const m = await getMailDetail(parsed.data);
  if (!m) return null;

  const govde = quotableText({
    body_source: m.body_source,
    body_text: m.body_text,
    body_html: m.body_html,
  });

  const tarih = m.received_at ?? m.sent_at ?? m.created_at;
  const tarihStr = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long", timeStyle: "short",
  }).format(new Date(tarih));

  const konu = (m.subject ?? "").trim();
  const alinti = govde ? `\n${quoteLines(govde)}` : "";

  if (mode === "reply") {
    const kim = kisi(m.from_name, m.from_email);
    return {
      to: m.from_email ?? "",
      subject: /^yan:/i.test(konu) ? konu : `Yan: ${konu}`,
      body: `\n\n${tarihStr} tarihinde ${kim} yazdı:${alinti}`,
      inReplyTo: m.message_id ?? "",
    };
  }

  /* İletmede gönderen BİZ olabiliriz (giden kutusundan iletme);
     o yüzden künye "kimden" değil "kim gönderdi" diye kurulur. */
  const kim = m.box === "inbox"
    ? kisi(m.from_name, m.from_email)
    : kisi(m.from_name, m.from_email);

  return {
    to: "",
    subject: /^ilt:/i.test(konu) ? konu : `İlt: ${konu}`,
    body: `\n\n${tarihStr} tarihinde ${kim} tarafından gönderildi:${alinti}`,
    inReplyTo: "",
  };
}

/* ═════════════════════ CANLI KUTU ═════════════════════ */

export interface MailboxSnapshot {
  rows: MailRow[];
  total: number;
  signature: string;
  stats: MailStats;
  syncError?: string | null;
}

/**
 * Kutunun anlık görüntüsü.
 *
 * Panel bunu 5 saniyede bir çağırıyor. İki iş yapar:
 *   1. Gelen kutusundaysak IMAP'ten yeni posta çekmeyi DENER
 *   2. Güncel listeyi ve sayaçları döndürür
 *
 * ┌─ 5 SANİYEDE BİR IMAP'E BAĞLANMAZ ─────────────────────────────┐
 * │ Bağlanmak için önce veritabanındaki kilidi alması gerekir.     │
 * │ Kilit 25 saniyede bir açılıyor. Yani kaç sekme açık olursa     │
 * │ olsun mail sunucusuna dakikada ~2 bağlantı gider; liste ise    │
 * │ her 5 saniyede tazelenir (ucuz veritabanı okuması).            │
 * └────────────────────────────────────────────────────────────────┘
 *
 * `signature` listenin özeti: değişmediyse panel hiçbir şeyi yeniden
 * çizmez. Ekran titremez, kaydırma yeri kaymaz.
 */
export async function pollMailbox(
  box: "inbox" | "outbox" | "starred",
  search: string | null,
): Promise<MailboxSnapshot> {
  let syncError: string | null = null;

  /* Yalnızca gelen kutusu ve yıldızlılar için sunucuya bakılır;
     giden kutusu zaten yerelde oluşuyor. */
  if (box !== "outbox") {
    try {
      const res = await syncInbox(40, { throttleSeconds: 25 });
      if (!res.ok && !res.skipped) syncError = res.error ?? null;
    } catch (err) {
      syncError = (err as Error).message;
    }
  }

  const [list, stats] = await Promise.all([
    listMail({ box, search, limit: 60 }),
    getMailStats(),
  ]);

  return { ...list, stats, syncError };
}

/** Elle yenileme — kilidi beklemeden hemen bağlanır */
export async function syncInboxAction(): Promise<ActionState> {
  const res = await syncInbox(40);
  revalidatePath("/mail");

  if (!res.ok) return { ok: false, message: res.error ?? "Gelen postalar alınamadı." };

  return {
    ok: true,
    message: res.added > 0 ? `${res.added} yeni posta alındı.` : "Yeni posta yok.",
  };
}

/* ═════════════════════ TOPLU İŞLEM ═════════════════════ */

const idsSchema = z.array(z.string().uuid()).min(1).max(200);

/** Seçili postalara toplu işlem: okundu · okunmadı · yıldız · arşiv */
export async function bulkMailAction(
  ids: string[],
  action: "read" | "unread" | "star" | "unstar" | "archive",
): Promise<ActionState> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: "Geçersiz seçim." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mail_bulk", {
    p_ids: parsed.data, p_action: action,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/mail");
  return { ok: true, message: `${Number(data ?? 0)} posta güncellendi.` };
}

/**
 * Seçili postaları siler — SUNUCUDAN DA.
 *
 * Tek IMAP bağlantısında hepsi çöp kutusuna taşınır. Sunucudan
 * kaldırılamayan kayıt panelden de silinmez.
 */
export async function deleteManyAction(ids: string[]): Promise<ActionState> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: "Geçersiz seçim." };

  const server = await deleteManyOnServer(parsed.data);

  if (server.deletedIds.length === 0) {
    return {
      ok: false,
      message: `Postalar mail sunucusundan silinemedi, bu yüzden panelden de silinmedi: ${
        server.error ?? "bilinmeyen hata"}`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mail_delete_many", {
    p_ids: server.deletedIds,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  const silinen = Number(data ?? 0);
  const kalan = parsed.data.length - silinen;

  revalidatePath("/mail");
  return {
    ok: kalan === 0,
    message: kalan === 0
      ? `${silinen} posta silindi ve sunucuda çöp kutusuna taşındı.`
      : `${silinen} posta silindi. ${kalan} tanesi sunucudan kaldırılamadığı için duruyor.`,
  };
}

/* ═════════════════════ SİL ═════════════════════ */

/**
 * İletiyi siler — SUNUCUDAN DA.
 *
 * Önce mail sunucusunda çöp kutusuna taşınır, sonra panel kaydı silinir.
 * Sunucudan silinemezse panel kaydı da SİLİNMEZ; "sildim sandım" durumu
 * oluşmasın diye.
 */
export async function deleteMailAction(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const server = await deleteMessageOnServer(parsed.data);

  if (!server.ok) {
    return {
      ok: false,
      message: `Mail sunucudan silinemedi, bu yüzden panelden de silinmedi: ${server.error ?? "bilinmeyen hata"}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mail_delete", {
    p_id: parsed.data,
    p_server_deleted: server.server,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/mail");
  return {
    ok: true,
    message: server.server
      ? (server.moved ? "Mail silindi ve sunucuda çöp kutusuna taşındı." : "Mail sunucudan kalıcı olarak silindi.")
      : "Mail silindi.",
  };
}

/** Yıldızlama / arşivleme */
export async function flagMail(
  id: string,
  field: "is_read" | "is_starred" | "is_archived",
  value: boolean,
): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mail_flag", {
    p_id: parsed.data, p_field: field, p_value: value,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/mail");
  revalidatePath(`/mail/${parsed.data}`);
  return { ok: true };
}

/**
 * Panelde açılan iletiyi sunucuda da okundu işaretler.
 * Detay sayfası arka planda çağırır; sonucu kullanıcıya gösterilmez.
 */
export async function markReadOnServerAction(uid: number, folder: string | null): Promise<void> {
  await markReadOnServer(uid, folder);
}
