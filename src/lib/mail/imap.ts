import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  IMAP — GELEN POSTALARI ÇEKME
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Kurum maili klasik bir mail sunucusunda duruyor (turkticaret.net).
 *  Orada webhook yok; gelen kutusuna BİZ bağlanıp bakıyoruz.
 *
 *  ┌─ KALICI DİNLEME (IDLE) DEĞİL ─────────────────────────────────┐
 *  │ Bağlan → yeni iletileri al → bağlantıyı kapat.                 │
 *  │                                                                │
 *  │ IMAP IDLE ile sürekli açık bağlantı tutmak kâğıt üstünde daha  │
 *  │ hızlı ama Next.js sunucusu yeniden başladığında bağlantı       │
 *  │ öksüz kalıyor ve sunucu "çok fazla bağlantı" diyip hesabı      │
 *  │ geçici kilitliyor. Kısa bağlantı sağlam olan.                  │
 *  └────────────────────────────────────────────────────────────────┘
 *
 *  Son okunan UID veritabanında tutulur; aynı ileti iki kez çekilmez.
 */

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  folder: string;
}

export interface FetchedMail {
  uid: number;
  message_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string | null;
  folder: string;
  attachments: { filename: string | null; size: number; contentType: string }[];
}

/** Bağlantı zaman aşımları — takılı kalan bağlantı isteği kilitlemesin */
const TIMEOUTS = {
  greetingTimeout: 15_000,
  socketTimeout: 60_000,
  connectionTimeout: 20_000,
} as const;

function client(cfg: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
    /* 587/STARTTLS kullanılıyorsa secure=false gelir; imapflow yükseltmeyi
       kendisi yapar. TLS sürümü en az 1.2 — eski sürümler reddedilir. */
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    ...TIMEOUTS,
  });
}

/** Kullanıcıya gösterilebilir hata metni */
function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Bilinmeyen hata");

  if (/AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed/i.test(raw)) {
    return "Kullanıcı adı veya parola hatalı.";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) {
    return "Sunucu adresi bulunamadı. Adresi kontrol edin.";
  }
  if (/ECONNREFUSED/i.test(raw)) {
    return "Bağlantı reddedildi. Bağlantı noktası (port) yanlış olabilir.";
  }
  if (/ETIMEDOUT|Timeout/i.test(raw)) {
    return "Sunucu yanıt vermedi. Adres, port veya güvenlik duvarını kontrol edin.";
  }
  if (/certificate|self.signed|SSL|TLS/i.test(raw)) {
    return "Güvenli bağlantı kurulamadı. SSL ayarını ve portu kontrol edin (993 → SSL açık).";
  }
  if (/NONEXISTENT|Mailbox doesn't exist|no such mailbox/i.test(raw)) {
    return "Klasör bulunamadı. Klasör adını kontrol edin (genellikle INBOX).";
  }
  return raw.slice(0, 240);
}

/* ═══════════════ BAĞLANTI SINAMASI ═══════════════ */

export async function testImap(
  cfg: ImapConfig,
): Promise<{ ok: boolean; error?: string; total?: number; folders?: string[] }> {
  const c = client(cfg);
  try {
    await c.connect();

    /* Klasör listesi de döndürülür: kullanıcı "Sent" mi "Gönderilmiş
       Öğeler" mi olduğunu tahmin etmek zorunda kalmasın. */
    const folders: string[] = [];
    for (const box of await c.list()) folders.push(box.path);

    const lock = await c.getMailboxLock(cfg.folder || "INBOX");
    try {
      const total = typeof c.mailbox === "object" ? c.mailbox.exists : 0;
      return { ok: true, total, folders };
    } finally {
      lock.release();
    }
  } catch (err) {
    return { ok: false, error: friendly(err) };
  } finally {
    await c.logout().catch(() => null);
  }
}

/* ═══════════════ YENİ İLETİLERİ ÇEK ═══════════════ */

export interface FetchResult {
  ok: boolean;
  error?: string;
  mails: FetchedMail[];
  lastUid: number;
  /** Bu turda alınamayan, sırada bekleyen ileti sayısı */
  remaining: number;
}

/**
 * `sinceUid`'den sonraki iletileri getirir.
 *
 * ┌─ POSTA ATLAMA HATASI VE ÇÖZÜMÜ ⚠️ ─────────────────────────────┐
 * │ Önceki sürüm bulunanları EN YENİDEN başlayarak kesiyordu:       │
 * │                                                                 │
 * │   bulunan = [1..100], limit = 40  →  işlenen = [61..100]        │
 * │   son UID = 100                                                 │
 * │                                                                 │
 * │ Bir sonraki eşitleme 101'den başlıyor ve 1–60 arası iletiler    │
 * │ SONSUZA DEK atlanıyordu. Kullanıcı "mailler eksik geliyor"      │
 * │ diyordu; sebep buydu.                                           │
 * │                                                                 │
 * │ Artık ESKİDEN YENİYE işleniyor: son UID kesintisiz ilerliyor,   │
 * │ hiçbir ileti aradan düşmüyor. Kalanlar bir sonraki turda gelir  │
 * │ ve `syncInbox` kutu boşalana kadar tur atıyor.                  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * İLK eşitleme ayrı ele alınır: yıllardır kullanılan bir hesapta
 * binlerce ileti olabilir, hepsini indirmenin anlamı yok. İlk kez
 * bağlanılıyorsa yalnızca EN YENİ `limit` kadar ileti alınır ve
 * "bugünden itibaren" başlanır.
 *
 * @returns `remaining` — bu turda alınamayan, sırada bekleyen ileti sayısı
 */
export async function fetchNewMails(
  cfg: ImapConfig,
  sinceUid: number,
  limit = 40,
): Promise<FetchResult> {
  const c = client(cfg);
  const mails: FetchedMail[] = [];
  let lastUid = sinceUid;
  let remaining = 0;

  try {
    await c.connect();
    const lock = await c.getMailboxLock(cfg.folder || "INBOX");

    try {
      /* UID aralığı: ilk eşitlemede "1:*", sonrasında "sonUID+1:*".
         Sunucu bu aralıkta olmayan iletiyi göndermez. */
      const range = sinceUid > 0 ? `${sinceUid + 1}:*` : "1:*";

      const found: number[] = [];
      for await (const msg of c.fetch(range, { uid: true }, { uid: true })) {
        if (msg.uid > sinceUid) found.push(msg.uid);
      }

      found.sort((a, b) => a - b);   // eskiden yeniye

      /* İLK eşitleme: en yeni `limit` kadarını al, oradan itibaren takip et.
         SONRAKİ eşitlemeler: EN ESKİDEN başla ki son UID kesintisiz
         ilerlesin ve hiçbir ileti aradan düşmesin. */
      const chosen = sinceUid === 0
        ? found.slice(-limit)
        : found.slice(0, limit);

      remaining = found.length - chosen.length;

      for (const uid of chosen) {
        try {
          const msg = await c.fetchOne(String(uid), { source: true }, { uid: true });
          if (!msg || typeof msg === "boolean" || !msg.source) {
            lastUid = Math.max(lastUid, uid);
            continue;
          }

          const p = await simpleParser(msg.source);
          const from = p.from?.value?.[0];

          const toValue = Array.isArray(p.to) ? p.to[0] : p.to;

          mails.push({
            uid,
            message_id: p.messageId ?? null,
            from_email: (from?.address ?? "bilinmiyor@yok").toLowerCase(),
            from_name: from?.name || null,
            to_email: toValue?.value?.[0]?.address?.toLowerCase() ?? null,
            subject: p.subject ?? null,
            body_text: p.text ?? null,
            body_html: typeof p.html === "string" ? p.html : null,
            received_at: (p.date ?? new Date()).toISOString(),
            folder: cfg.folder || "INBOX",
            attachments: (p.attachments ?? []).map((a) => ({
              filename: a.filename ?? null,
              size: a.size ?? 0,
              contentType: a.contentType ?? "application/octet-stream",
            })),
          });
        } catch {
          /* Tek bir bozuk ileti tüm eşitlemeyi durdurmamalı: atlanır ve
             UID ilerletilir, yoksa her eşitlemede aynı iletide takılırdı. */
        }
        lastUid = Math.max(lastUid, uid);
      }
    } finally {
      lock.release();
    }

    return { ok: true, mails, lastUid, remaining };
  } catch (err) {
    return { ok: false, error: friendly(err), mails, lastUid, remaining };
  } finally {
    await c.logout().catch(() => null);
  }
}

/* ═══════════════ SUNUCUDA İŞARETLE / SİL ═══════════════ */

/**
 * İletiyi sunucuda okundu (\Seen) işaretler.
 *
 * Panelde açtığın mail telefonunda da okunmuş görünsün diye. Normal bir
 * mail istemcisi böyle davranır.
 *
 * Başarısızlığı önemsiz: okundu bilgisi zaten panelde tutuluyor.
 */
export async function markSeen(
  cfg: ImapConfig,
  uid: number,
): Promise<{ ok: boolean; error?: string }> {
  const c = client(cfg);
  try {
    await c.connect();
    const lock = await c.getMailboxLock(cfg.folder || "INBOX");
    try {
      await c.messageFlagsAdd({ uid: String(uid) }, ["\\Seen"], { uid: true });
      return { ok: true };
    } finally {
      lock.release();
    }
  } catch (err) {
    return { ok: false, error: friendly(err) };
  } finally {
    await c.logout().catch(() => null);
  }
}

/**
 * İletiyi SUNUCUDAN siler.
 *
 * ┌─ NEDEN ÇÖP KUTUSUNA TAŞIMA ────────────────────────────────────┐
 * │ Doğrudan silmek (\Deleted + expunge) geri dönüşü olmayan bir   │
 * │ işlem. Mail istemcilerinin tamamı önce Çöp/Trash klasörüne      │
 * │ taşır; kullanıcı yanlışlıkla sildiyse oradan geri alabilir.     │
 * │                                                                 │
 * │ Çöp klasörü yoksa (bazı sunucularda yok) SON ÇARE olarak        │
 * │ \Deleted işaretlenip expunge edilir.                           │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Klasör adı sunucudan sunucuya değişiyor; bilinen adaylar denenir.
 */
export async function deleteFromServer(
  cfg: ImapConfig,
  uid: number,
  trashFolder: string,
): Promise<{ ok: boolean; moved?: boolean; error?: string }> {
  const c = client(cfg);
  try {
    await c.connect();

    const existing = new Set((await c.list()).map((b) => b.path));
    const candidates = [trashFolder, "Trash", "INBOX.Trash", "Deleted Items", "Junk", "Çöp Kutusu"]
      .filter((v, i, a) => v && a.indexOf(v) === i);
    const target = candidates.find((f) => existing.has(f));

    const lock = await c.getMailboxLock(cfg.folder || "INBOX");
    try {
      if (target && target !== cfg.folder) {
        await c.messageMove({ uid: String(uid) }, target, { uid: true });
        return { ok: true, moved: true };
      }

      /* Çöp klasörü yok: kalıcı silme. */
      await c.messageDelete({ uid: String(uid) }, { uid: true });
      return { ok: true, moved: false };
    } finally {
      lock.release();
    }
  } catch (err) {
    return { ok: false, error: friendly(err) };
  } finally {
    await c.logout().catch(() => null);
  }
}

/**
 * BİRDEN ÇOK İLETİYİ TEK BAĞLANTIDA SİLER.
 *
 * ★ Tek tek silinseydi 20 posta için 20 ayrı IMAP bağlantısı açılırdı;
 *   mail sunucusu bunu kötüye kullanım sayıp hesabı kilitler. Burada
 *   bağlantı BİR KEZ açılır, klasör klasör gezilir, hepsi taşınır.
 *
 * ★ Bir klasör başarısız olsa diğerleri devam eder. Hangi iletilerin
 *   gerçekten silindiği geri döner; yalnızca onların panel kaydı silinir.
 */
export async function deleteManyFromServer(
  cfg: ImapConfig,
  items: { id: string; uid: number; folder: string }[],
  trashFolder: string,
): Promise<{ ok: boolean; deletedIds: string[]; error?: string }> {
  const deletedIds: string[] = [];

  /* Sunucuda karşılığı olmayanlar (hiç gönderilememiş taslak gibi)
     doğrudan silinebilir sayılır — kaldırılacak bir şey yok. */
  const onServer = items.filter((i) => Number.isFinite(i.uid) && i.uid > 0);
  for (const i of items) if (!onServer.includes(i)) deletedIds.push(i.id);

  if (onServer.length === 0) return { ok: true, deletedIds };

  const c = client(cfg);
  try {
    await c.connect();

    const existing = new Set((await c.list()).map((b) => b.path));
    const candidates = [trashFolder, "Trash", "INBOX.Trash", "Deleted Items", "Junk", "Çöp Kutusu"]
      .filter((v, i, a) => v && a.indexOf(v) === i);
    const trash = candidates.find((f) => existing.has(f));

    // Klasöre göre gruplanır: her klasör bir kez kilitlenir
    const byFolder = new Map<string, { id: string; uid: number }[]>();
    for (const i of onServer) {
      const f = i.folder || "INBOX";
      if (!byFolder.has(f)) byFolder.set(f, []);
      byFolder.get(f)!.push({ id: i.id, uid: i.uid });
    }

    for (const [folder, group] of byFolder) {
      if (!existing.has(folder)) continue;   // klasör yoksa atla

      try {
        const lock = await c.getMailboxLock(folder);
        try {
          const uids = group.map((g) => g.uid).join(",");
          if (trash && trash !== folder) {
            await c.messageMove({ uid: uids }, trash, { uid: true });
          } else {
            await c.messageDelete({ uid: uids }, { uid: true });
          }
          for (const g of group) deletedIds.push(g.id);
        } finally {
          lock.release();
        }
      } catch {
        /* Bu klasör başarısız: diğerlerini denemeye devam et. */
      }
    }

    return { ok: deletedIds.length > 0, deletedIds };
  } catch (err) {
    return { ok: false, deletedIds, error: friendly(err) };
  } finally {
    await c.logout().catch(() => null);
  }
}

/* ═══════════════ GÖNDERİLENLERİ KLASÖRE YAZ ═══════════════ */

/**
 * Gönderilen iletiyi IMAP "Sent" klasörüne kopyalar.
 *
 * ★ NEDEN: SMTP ile gönderilen mail sunucudaki Gönderilmiş kutusuna
 *   KENDİLİĞİNDEN düşmez. Bu adım olmadan telefondan veya webmail'den
 *   bakıldığında gönderdiğiniz mailler görünmez.
 *
 * ★ Başarısızlığı ölümcül DEĞİL: mail zaten gitti. Arşivleme yapılamazsa
 *   sessizce geçilir, gönderim "başarısız" sayılmaz.
 */
export async function appendToSent(
  cfg: ImapConfig,
  sentFolder: string,
  raw: string | Buffer,
): Promise<{ ok: boolean; uid?: number; error?: string }> {
  const c = client({ ...cfg, folder: sentFolder });
  try {
    await c.connect();

    /* Klasör adı sunucudan sunucuya değişiyor (Sent / Sent Items /
       INBOX.Sent). Verilen ad yoksa bilinen adaylar denenir. */
    const candidates = [sentFolder, "Sent", "INBOX.Sent", "Sent Items", "Gönderilmiş Öğeler"]
      .filter((v, i, a) => v && a.indexOf(v) === i);

    const existing = new Set((await c.list()).map((b) => b.path));
    const target = candidates.find((f) => existing.has(f));

    if (!target) return { ok: false, error: "Gönderilenler klasörü bulunamadı." };

    const res = await c.append(target, raw, ["\\Seen"]);
    return { ok: true, uid: typeof res === "object" && res ? res.uid : undefined };
  } catch (err) {
    return { ok: false, error: friendly(err) };
  } finally {
    await c.logout().catch(() => null);
  }
}

/**
 * Bir iletinin EKİNİ sunucudan indirir.
 *
 * ┌─ EK İÇERİĞİ NEDEN VERİTABANINDA TUTULMUYOR ⚠️ ────────────────┐
 * │ Eşitleme sırasında yalnızca ÜSTVERİ saklanıyor: dosya adı,     │
 * │ boyut, tür. İçeriğin kendisi saklansaydı veritabanı hızla       │
 * │ şişerdi — tek bir 10 MB'lık ek, binlerce satırlık metinden      │
 * │ büyük.                                                           │
 * │                                                                  │
 * │ Bunun bedeli: indirme anında sunucuya bağlanmak gerekiyor.      │
 * │ Karşılığında veritabanı hafif kalıyor ve ekler sunucudaki       │
 * │ gerçek hâliyle iniyor.                                           │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * @param index Ekin ileti içindeki sırası (0'dan başlar)
 */
export async function fetchAttachment(
  cfg: ImapConfig,
  uid: number,
  index: number,
): Promise<
  | { ok: true; filename: string; contentType: string; content: Buffer }
  | { ok: false; error: string }
> {
  const c = client(cfg);
  try {
    await c.connect();
    const lock = await c.getMailboxLock(cfg.folder || "INBOX");
    try {
      const msg = await c.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) return { ok: false, error: "İleti bulunamadı." };

      const p = await simpleParser(msg.source);
      const ek = (p.attachments ?? [])[index];

      if (!ek) return { ok: false, error: "Ek bulunamadı." };

      return {
        ok: true,
        /* Dosya adı yoksa uydurulur: tarayıcı adsız indirmeyi
           "download" diye kaydediyor, uzantısız dosya açılmıyor. */
        filename: ek.filename || `ek-${index + 1}`,
        contentType: ek.contentType || "application/octet-stream",
        content: ek.content as Buffer,
      };
    } finally {
      lock.release();
    }
  } catch (err) {
    return { ok: false, error: friendly(err) };
  } finally {
    await c.logout().catch(() => null);
  }
}
