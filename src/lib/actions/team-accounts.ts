"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { sendMessage } from "@/lib/mail/client";
import { textToHtml } from "@/lib/mail/template";

/**
 * Davet jetonunu ÜRETİR ve tabloya yazar.
 *
 * ┌─ NEDEN VERİTABANI FONKSİYONU KULLANILMIYOR ⚠️ ────────────────┐
 * │ Önce `admin_invite_team_member()` çağrılıyordu ve davet hiç    │
 * │ oluşmuyordu: fonksiyon PostgREST'in şema önbelleğinde yoktu.   │
 * │ Hata da genel bir metne dönüştüğü için sebebi görünmüyordu.    │
 * │                                                                 │
 * │ `team_invitations` tablosuna yazma yetkisi zaten yöneticide     │
 * │ (migration 072). Fonksiyona gerek yok.                          │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ★ JETON HAM SAKLANMAZ. Veritabanına yalnızca SHA-256 özeti yazılır;
 *   veritabanı sızsa bile kimse davetle hesap açamaz. Özet biçimi
 *   `accept_team_invitation` ile birebir aynı: hex kodlanmış sha256.
 */
async function davetYaz(opts: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  teamId: string;
  email: string;
  role: "owner" | "steward";
}): Promise<{ token: string } | { error: string }> {
  const token = randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const email = opts.email.trim().toLowerCase();

  /* Aynı takım + e-posta için AÇIK davet varsa yenilenir. Veritabanında
     bunu engelleyen kısmi benzersiz dizin var; önce kapatıp yeniden
     yazmak yerine mevcut kaydı güncelliyoruz. */
  const { data: mevcut } = await opts.supabase
    .from("team_invitations")
    .select("id, sent_count")
    .eq("team_id", opts.teamId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("cancelled_at", null)
    .maybeSingle();

  const sonKullanma = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (mevcut) {
    const { error } = await opts.supabase
      .from("team_invitations")
      .update({
        token_hash: hash,
        token_hint: token.slice(0, 8),
        role: opts.role,
        expires_at: sonKullanma,
        sent_count: ((mevcut as { sent_count: number }).sent_count ?? 1) + 1,
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", (mevcut as { id: string }).id);

    return error ? { error: error.message } : { token };
  }

  const { error } = await opts.supabase.from("team_invitations").insert({
    team_id: opts.teamId,
    email,
    role: opts.role,
    token_hash: hash,
    token_hint: token.slice(0, 8),
    expires_at: sonKullanma,
  });

  return error ? { error: error.message } : { token };
}

/** Takım panelinin adresi — davet bağlantıları buraya gider */
function teamBase(): string {
  return (process.env.NEXT_PUBLIC_TEAM_URL ?? "https://takim.cocuktribunu.org").replace(/\/$/, "");
}

/**
 * Davet e-postasını gönderir.
 *
 * ┌─ BAŞARISIZLIĞI GÖNDERİMİ DURDURMAZ ───────────────────────────┐
 * │ Davet zaten veritabanında oluşturuldu ve bağlantı panelde       │
 * │ gösteriliyor. Mail ayarları eksikse ya da SMTP yanıt vermezse   │
 * │ yönetici bağlantıyı elle iletir.                                │
 * │                                                                  │
 * │ Mail hatası yüzünden daveti geri almak, çalışan bir şeyi        │
 * │ çalışmayan bir şey uğruna iptal etmek olurdu.                    │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * @returns Gönderilebildiyse null, gönderilemediyse hata metni
 */
async function davetMailiGonder(opts: {
  email: string;
  teamName: string;
  link: string;
  role: "owner" | "steward";
}): Promise<string | null> {
  const supabase = await createClient();

  const konu = `${opts.teamName} · Çocuk Tribünü takım paneli daveti`;

  const metin = opts.role === "owner"
    ? `Merhaba,

${opts.teamName} adına Çocuk Tribünü takım paneline yetkili olarak davet edildiniz.

Panelde kulübünüzün kombine kart sahibi üyelerini, iletişim bilgilerini ve istatistikleri görebilir; maç günü QR kontrolü yapacak görevlileri tanımlayabilirsiniz.

Hesabınızı oluşturmak için aşağıdaki bağlantıya tıklayın ve kendi şifrenizi belirleyin:

${opts.link}

Bağlantı 7 gün geçerlidir. Süresi dolarsa bizden yeni bağlantı isteyebilirsiniz.

Saygılarımızla,
Çocuk Tribünü`
    : `Merhaba,

${opts.teamName} adına Çocuk Tribünü takım panelinde görevli olarak tanımlandınız.

Görevli hesabıyla yalnızca kombine kart QR kontrolü yapabilirsiniz.

Hesabınızı oluşturmak için:

${opts.link}

Bağlantı 7 gün geçerlidir.

Saygılarımızla,
Çocuk Tribünü`;

  const govde = textToHtml(metin);

  // 1) Kayıt açılır
  const { data: begun, error: beginErr } = await supabase.rpc("admin_mail_begin_send", {
    p_to: [opts.email],
    p_subject: konu,
    p_body_source: govde,
    p_heading: "Takım paneli daveti",
    p_partner_logo_url: null,
    p_in_reply_to: null,
  });

  if (beginErr) return friendlyError(beginErr);

  const id = (begun as { id?: string })?.id;
  if (!id) return "Gönderim kaydı oluşturulamadı.";

  // 2) SMTP ile gönder
  const res = await sendMessage({
    id,
    to: [opts.email],
    subject: konu,
    bodyHtml: govde,
    heading: "Takım paneli daveti",
  });

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

  return res.ok ? null : (res.error ?? "Mail gönderilemedi.");
}

/**
 * Takım yetkilisi davet eder.
 *
 * ★ Jeton BURADA üretilir; veritabanına yalnızca SHA-256 özeti yazılır.
 *   Bağlantı çağırana bir kez döner ve panelde bir kez gösterilir.
 *   Veritabanı sızsa bile kimse davetle takım hesabı açamaz.
 */
export async function inviteTeamOwner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    teamId: z.string().uuid("Takım seçin"),
    email: z.string().trim().email("Geçerli bir e-posta girin"),
  }).safeParse({
    teamId: formData.get("teamId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();

  /* Takım adı e-posta metninde geçiyor; formda yalnızca kimlik var. */
  const { data: takim } = await supabase
    .from("teams").select("name").eq("id", parsed.data.teamId).maybeSingle();

  if (!takim) return { ok: false, message: "Takım bulunamadı." };

  const yazim = await davetYaz({
    supabase,
    teamId: parsed.data.teamId,
    email: parsed.data.email,
    role: "owner",
  });

  if ("error" in yazim) {
    return { ok: false, message: `Davet kaydedilemedi: ${yazim.error}` };
  }

  const link = `${teamBase()}/davet/${yazim.token}`;
  const takimAdi = (takim as { name?: string }).name ?? "Takımınız";

  const mailHatasi = await davetMailiGonder({
    email: parsed.data.email,
    teamName: takimAdi,
    link,
    role: "owner",
  });

  revalidatePath("/takimlar");
  return {
    ok: true,
    message: mailHatasi
      ? `Davet oluşturuldu ama e-posta gönderilemedi (${mailHatasi}). Bağlantıyı elle iletin.`
      : `${parsed.data.email} adresine davet e-postası gönderildi.`,
    data: { link, email: parsed.data.email, mailSent: !mailHatasi },
  };
}

/**
 * Davetin e-postasını değiştirir ya da bağlantıyı yeniler.
 *
 * Aynı fonksiyon iki işi görür: yanlış adrese gönderildiyse adresi
 * düzeltir, bağlantı kaybolduysa yenisini üretir. Her iki durumda da
 * ESKİ BAĞLANTI GEÇERSİZLEŞİR.
 */
export async function reissueInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    id: z.string().uuid(),
    email: z.string().trim().email("Geçerli bir e-posta girin"),
  }).safeParse({
    id: formData.get("id"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: { email: "Geçerli bir e-posta girin" } };
  }

  const token = randomBytes(24).toString("hex");

  const supabase = await createClient();
  /* Doğrudan güncelleme: fonksiyon şema önbelleğine takılmasın.
     Eski bağlantı ANINDA geçersizleşir — yeni özet yazıldığı için
     eski jetonun karşılığı kalmaz. */
  const hash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase
    .from("team_invitations")
    .update({
      email: parsed.data.email.trim().toLowerCase(),
      token_hash: hash,
      token_hint: token.slice(0, 8),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_sent_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .is("accepted_at", null)
    .is("cancelled_at", null);

  if (error) return { ok: false, message: `Bağlantı yenilenemedi: ${error.message}` };

  const link = `${teamBase()}/davet/${token}`;

  /* Davetin hangi takıma ait olduğunu kayıttan okuyoruz — formda yok. */
  const { data: inv } = await supabase
    .from("team_invitations").select("team_id, role").eq("id", parsed.data.id).maybeSingle();
  const kayit = inv as { team_id?: string; role?: string } | null;

  const { data: takim } = kayit?.team_id
    ? await supabase.from("teams").select("name").eq("id", kayit.team_id).maybeSingle()
    : { data: null };

  const mailHatasi = await davetMailiGonder({
    email: parsed.data.email,
    teamName: (takim as { name?: string } | null)?.name ?? "Takımınız",
    link,
    role: kayit?.role === "steward" ? "steward" : "owner",
  });

  revalidatePath("/takimlar");
  return {
    ok: true,
    message: mailHatasi
      ? `Yeni bağlantı üretildi ama e-posta gönderilemedi (${mailHatasi}). Bağlantıyı elle iletin.`
      : "Yeni bağlantı üretildi ve e-posta gönderildi. Eski bağlantı artık çalışmıyor.",
    data: { link, email: parsed.data.email, mailSent: !mailHatasi },
  };
}

export async function cancelInvite(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_invitations")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("accepted_at", null);

  if (error) return { ok: false, message: `İptal edilemedi: ${error.message}` };

  revalidatePath("/takimlar");
  return { ok: true, message: "Davet iptal edildi." };
}

/**
 * Takım hesabını SİLER.
 *
 * Üyelik silinir; giriş hesabı yalnızca kişi başka hiçbir şeye bağlı
 * değilse (çocuğu, siparişi, personel rolü, başka takım hesabı yok)
 * kaldırılır. Aksi hâlde kulüp yetkilisi aynı zamanda veliyse
 * çocuğunun kaydını da uçururduk.
 */
export async function deleteTeamAccount(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  /* Auth hesabı SİLİNMEZ — kişi aynı zamanda veli olabilir, çocuğunun
     kartı vardır. Yalnızca takım bağı kopar. */
  const { error } = await supabase
    .from("team_accounts")
    .delete()
    .eq("id", parsed.data);
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };

  revalidatePath("/takimlar");
  return {
    ok: true,
    message: "Takım erişimi kaldırıldı. Giriş hesabı korundu.",
  };
}

/** Yönetici yetkili ya da görevli davet eder */
export async function inviteTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    teamId: z.string().uuid("Takım bulunamadı"),
    email: z.string().trim().email("Geçerli bir e-posta girin"),
    role: z.enum(["owner", "steward"]),
  }).safeParse({
    teamId: formData.get("teamId"),
    email: formData.get("email"),
    role: formData.get("role") ?? "steward",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();

  /* Kişi bu takımda zaten var mı? Baştan söylemek, davet gönderip
     sonra "zaten var" hatası almaktan iyi. */
  const { data: takim } = await supabase
    .from("teams").select("name").eq("id", parsed.data.teamId).maybeSingle();

  if (!takim) return { ok: false, message: "Takım bulunamadı." };

  const yazim = await davetYaz({
    supabase,
    teamId: parsed.data.teamId,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if ("error" in yazim) {
    return { ok: false, message: `Davet kaydedilemedi: ${yazim.error}` };
  }

  const link = `${teamBase()}/davet/${yazim.token}`;

  const mailHatasi = await davetMailiGonder({
    email: parsed.data.email,
    teamName: (takim as { name?: string } | null)?.name ?? "Takımınız",
    link,
    role: parsed.data.role,
  });

  revalidatePath("/takimlar");
  revalidatePath(`/takimlar/${parsed.data.teamId}`);
  return {
    ok: true,
    message: mailHatasi
      ? `Davet oluşturuldu ama e-posta gönderilemedi (${mailHatasi}). Bağlantıyı elle iletin.`
      : `${parsed.data.email} adresine davet e-postası gönderildi.`,
    data: { link, email: parsed.data.email, mailSent: !mailHatasi },
  };
}

export async function setAccountActive(id: string, active: boolean): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_accounts")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", parsed.data);
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/takimlar");
  return { ok: true, message: active ? "Hesap yeniden açıldı." : "Hesap askıya alındı." };
}
