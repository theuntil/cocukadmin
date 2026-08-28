import "server-only";
import { createHash } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  GİDEN MAİL — SMTP
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Kurum maili kendi sunucumuzda (smtp.turkticaret.net). Gönderim
 *  DOĞRUDAN oraya yapılır: araya servis, API ya da üçüncü taraf
 *  girmez. En kısa yol, en az kırılma noktası.
 *
 *  ┌─ PORT VE GÜVENLİK ────────────────────────────────────────────┐
 *  │  465 → secure = true   (baştan SSL/TLS)                        │
 *  │  587 → secure = false  (düz başlar, STARTTLS ile yükselir)     │
 *  │                                                                │
 *  │ Bu ikisi karıştırılırsa bağlantı ya hiç kurulmaz ya da el      │
 *  │ sıkışmada takılır. Ayar ekranı port değişince `secure`'u       │
 *  │ kendisi düzeltiyor.                                            │
 *  └────────────────────────────────────────────────────────────────┘
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Giden mail eki.
 *
 * ┌─ NEDEN YOL DEĞİL, İÇERİK ⚠️ ──────────────────────────────────┐
 * │ Dosya depolamada duruyor ve yalnızca yolunu göndermek daha     │
 * │ hafif görünüyor. Ama SMTP sunucusu o yolu okuyamaz: eki        │
 * │ iletinin İÇİNE gömmek zorundayız.                               │
 * │                                                                  │
 * │ Bu yüzden gönderim anında dosya depolamadan indirilip           │
 * │ nodemailer'a veriliyor.                                          │
 * └──────────────────────────────────────────────────────────────────┘
 */
export interface SendAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendInput {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
  smtp?: SmtpConfig | null;
  attachments?: SendAttachment[] | null;
}

export type SendResult =
  | { ok: true; providerId?: string; raw?: string }
  | { ok: false; error: string };

const TIMEOUT_MS = 25_000;

/* ═══════════════ SMTP ═══════════════ */

/*
 * Bağlantı havuzu önbelleğe alınır: her mail için yeni TLS el sıkışması
 * yapmak toplu gönderimde ciddi yavaşlık demek.
 *
 * ★ PAROLA DA ANAHTARA DAHİL — özetlenmiş hâliyle.
 *   Testte yakalandı: anahtar yalnızca sunucu+kullanıcıdan üretilince,
 *   panelden parola değiştirildikten sonra havuz ESKİ parolayı kullanmaya
 *   devam ediyordu. Yanlış parola bile "bağlantı kuruldu" diyordu; sunucu
 *   yeniden başlayana kadar da gerçek parola devreye girmiyordu.
 *
 *   Parola ham hâliyle anahtara konmaz; özeti yeterli ve karşılaştırma
 *   için aynı işi görür.
 */
let cached: { key: string; transport: Transporter } | null = null;

function transportKey(s: SmtpConfig): string {
  const secret = createHash("sha256").update(s.pass).digest("hex").slice(0, 16);
  return `${s.host}:${s.port}:${s.secure}:${s.user}:${secret}`;
}

function getTransport(s: SmtpConfig): Transporter {
  const key = transportKey(s);
  if (cached && cached.key === key) return cached.transport;

  if (cached) cached.transport.close();

  const transport = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,          // 465 → true, 587 → false (STARTTLS)
    auth: { user: s.user, pass: s.pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: 15_000,
    socketTimeout: 40_000,
    tls: { minVersion: "TLSv1.2" },
  });

  cached = { key, transport };
  return transport;
}

/** Kullanıcıya gösterilebilir hata metni */
function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Bilinmeyen hata");

  if (/EAUTH|Invalid login|authentication failed|535/i.test(raw)) {
    return "Kullanıcı adı veya parola hatalı (SMTP kimlik doğrulaması reddedildi).";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) {
    return "SMTP sunucu adresi bulunamadı. Adresi kontrol edin.";
  }
  if (/ECONNREFUSED/i.test(raw)) {
    return "Bağlantı reddedildi. Bağlantı noktasını kontrol edin (465 SSL, 587 STARTTLS).";
  }
  if (/ETIMEDOUT|Greeting never received|timeout/i.test(raw)) {
    return "Sunucu yanıt vermedi. Port ve SSL ayarını kontrol edin — 465 kullanıyorsanız SSL açık olmalı.";
  }
  if (/wrong version number|SSL routines|certificate/i.test(raw)) {
    return "Güvenli bağlantı uyuşmazlığı. 465 → SSL açık, 587 → SSL kapalı olmalı.";
  }
  if (/550|551|553|Relay|not permitted/i.test(raw)) {
    return "Sunucu gönderimi reddetti. Gönderen adresi, hesabın kendi adresiyle aynı olmalı.";
  }
  if (/quota|too many|rate/i.test(raw)) {
    return "Sunucu gönderim sınırına ulaşıldı. Bir süre bekleyip tekrar deneyin.";
  }
  return raw.slice(0, 240);
}

async function sendSmtp(m: SendInput): Promise<SendResult> {
  if (!m.smtp?.host || !m.smtp.user || !m.smtp.pass) {
    return { ok: false, error: "SMTP bilgileri eksik. Mail → Ayarlar bölümünden tamamlayın." };
  }

  try {
    const info = await getTransport(m.smtp).sendMail({
      from: m.fromName ? `"${m.fromName}" <${m.fromEmail}>` : m.fromEmail,
      to: m.toName ? `"${m.toName}" <${m.to}>` : m.to,
      replyTo: m.replyTo || undefined,
      subject: m.subject,
      html: m.html,
      text: m.text || undefined,
      attachments: (m.attachments ?? []).map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || undefined,
      })),
    });

    /* Ham ileti IMAP "Gönderilmiş" klasörüne yazmak için döndürülür.
       nodemailer `buffer:true` verilmediğinde `message` gelmez; bu yüzden
       ham hâli ayrıca üretiyoruz (bkz. buildRaw). */
    return { ok: true, providerId: info.messageId };
  } catch (err) {
    return { ok: false, error: friendly(err) };
  }
}

/**
 * IMAP arşivi için ham RFC822 iletisi üretir.
 *
 * Gönderimden AYRI üretilir: gönderimi bekletmemek için. Arşivleme
 * başarısız olsa bile mail çoktan gitmiş olur.
 */
export async function buildRaw(m: SendInput): Promise<string | null> {
  try {
    const composer = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix",
    });
    const info = await composer.sendMail({
      from: m.fromName ? `"${m.fromName}" <${m.fromEmail}>` : m.fromEmail,
      to: m.toName ? `"${m.toName}" <${m.to}>` : m.to,
      replyTo: m.replyTo || undefined,
      subject: m.subject,
      html: m.html,
      text: m.text || undefined,
      /* Ekler burada da olmalı: "Gönderilmiş" klasöründeki kopya
         eksiz kalırsa kullanıcı ne gönderdiğini göremez. */
      attachments: (m.attachments ?? []).map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || undefined,
      })),
      date: new Date(),
    });
    const buf = info.message as unknown as Buffer;
    return Buffer.isBuffer(buf) ? buf.toString("utf8") : null;
  } catch (err) {
    /* Ham ileti YALNIZCA IMAP arşivi için. Üretilemezse mail yine
       gönderilir, sadece "Gönderilmiş" klasörüne kopyalanmaz. Sessiz
       geçmek doğru ama iz bırakmadan geçmek değil. */
    console.warn("[mail] ham ileti üretilemedi, arşiv atlanacak:", (err as Error).message);
    return null;
  }
}

/** Bağlantıyı mail göndermeden doğrular */
export async function verifySmtp(
  s: SmtpConfig,
): Promise<{ ok: boolean; error?: string }> {
  if (!s.host || !s.user || !s.pass) {
    return { ok: false, error: "SMTP bilgileri eksik." };
  }
  try {
    await getTransport(s).verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendly(err) };
  }
}

/* ═══════════════ ORTAK GİRİŞ ═══════════════ */

/**
 * Maili gönderir.
 *
 * Tek yol var: kendi mail sunucumuz. Sağlayıcı seçimi kaldırıldı —
 * seçilecek bir şey yoksa yanlış seçilemez de.
 */
export async function sendMail(m: SendInput): Promise<SendResult> {
  if (!m.to?.trim()) return { ok: false, error: "Alıcı adresi boş." };
  if (!m.fromEmail?.trim()) return { ok: false, error: "Gönderen adresi tanımlı değil." };
  return sendSmtp(m);
}
