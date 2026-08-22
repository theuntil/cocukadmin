"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendOtp, verifyOtp, sendTemplateEmail } from "@/lib/notify";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { normalizePhone } from "@/lib/utils";

/** Servis hata kodlarını kullanıcıya gösterilecek metne çevirir */
function notifyError(code?: string, fallback?: string): string {
  switch (code) {
    case "cooldown": return "Çok sık kod istediniz. Lütfen biraz bekleyip tekrar deneyin.";
    case "rate_limited": return "Çok fazla doğrulama isteği gönderildi. Bir süre sonra tekrar deneyin.";
    case "blocked": return "Bu adres geçici olarak engellendi. Bizimle iletişime geçin.";
    case "invalid_target": return "Girdiğiniz bilgi geçerli değil.";
    case "provider_error": return "Kod gönderilemedi. Lütfen tekrar deneyin.";
    case "wrong_code": return "Kod hatalı.";
    case "expired": return "Kodun süresi doldu. Yeni kod isteyin.";
    case "too_many_attempts": return "Çok fazla yanlış deneme yaptınız. Yeni kod isteyin.";
    case "already_used": return "Bu kod zaten kullanıldı.";
    case "not_configured": return "Doğrulama servisi şu anda kullanılamıyor.";
    default: return fallback ?? "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
  }
}

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

const passwordSchema = z.string()
  .min(8, "Şifre en az 8 karakter olmalı")
  .max(72, "Şifre en fazla 72 karakter olabilir")
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Şifre harf ve rakam içermeli");

/* ═════════════════ TELEFON DOĞRULAMA ═════════════════ */

export async function startPhoneVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ phone: z.string().trim().min(10, "Telefon numaranızı girin") })
    .safeParse({ phone: formData.get("phone") });
  if (!parsed.success) return { ok: false, fieldErrors: { phone: "Telefon numaranızı girin" } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Oturum bulunamadı." };

  const phone = normalizePhone(parsed.data.phone);
  if (!/^\+90\d{10}$/.test(phone)) {
    return { ok: false, fieldErrors: { phone: "Telefon numarası geçersiz" } };
  }

  // Numara müsait mi? SMS GÖNDERMEDEN ÖNCE kontrol ediyoruz.
  // Aksi hâlde kullanıcı kodu alıp giriyor, ancak o aşamada
  // "bu numara başka hesapta kayıtlı" hatasını görüyordu.
  const { data: availability } = await supabase.rpc("phone_available", { p_phone: phone });
  const check = availability as { available?: boolean; message?: string } | null;

  if (check && check.available === false) {
    return { ok: false, fieldErrors: { phone: check.message ?? "Bu numara kullanılamıyor." } };
  }

  const res = await sendOtp({
    channel: "sms", purpose: "phone_verify", target: phone,
    meta: { user_id: auth.user.id },
  });

  if (!res.ok) {
    return { ok: false, message: notifyError(res.code, res.error) };
  }

  return {
    ok: true,
    message: `Doğrulama kodu ${res.maskedTarget} numarasına gönderildi.`,
    data: { requestId: res.requestId, maskedTarget: res.maskedTarget, phone, resendAfterSec: res.resendAfterSec },
  };
}

export async function confirmPhoneVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    requestId: z.string().uuid(),
    code: z.string().trim().regex(/^\d{4,8}$/),
    phone: z.string().min(10),
  }).safeParse({
    requestId: formData.get("requestId"),
    code: formData.get("code"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: { code: "Kodu eksiksiz girin" } };

  const res = await verifyOtp({
    requestId: parsed.data.requestId, code: parsed.data.code, target: parsed.data.phone,
  });

  if (!res.ok || !res.verified) {
    return { ok: false, message: notifyError(res.code, res.error), data: { attemptsLeft: res.attemptsLeft } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_phone_verified", { p_phone: parsed.data.phone });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel", "layout");
  return { ok: true, message: "Telefon numaranız doğrulandı." };
}

/* ═════════════════ E-POSTA DOĞRULAMA ═════════════════ */

export async function startEmailVerification(): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { ok: false, message: "Oturum bulunamadı." };

  const res = await sendOtp({
    channel: "email", purpose: "email_verify", target: auth.user.email,
    meta: { user_id: auth.user.id },
  });

  if (!res.ok) return { ok: false, message: notifyError(res.code, res.error) };

  return {
    ok: true,
    message: `Doğrulama kodu ${res.maskedTarget} adresine gönderildi.`,
    data: { requestId: res.requestId, maskedTarget: res.maskedTarget, email: auth.user.email },
  };
}

export async function confirmEmailVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    requestId: z.string().uuid(),
    code: z.string().trim().regex(/^\d{4,8}$/),
  }).safeParse({
    requestId: formData.get("requestId"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: { code: "Kodu eksiksiz girin" } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { ok: false, message: "Oturum bulunamadı." };

  const res = await verifyOtp({
    requestId: parsed.data.requestId, code: parsed.data.code, target: auth.user.email,
  });

  if (!res.ok || !res.verified) {
    return { ok: false, message: notifyError(res.code, res.error), data: { attemptsLeft: res.attemptsLeft } };
  }

  const { error } = await supabase.rpc("mark_email_verified", { p_email: auth.user.email });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel", "layout");
  return { ok: true, message: "E-posta adresiniz doğrulandı." };
}

/* ═════════════════ ŞİFRE SIFIRLAMA ═════════════════
 *
 * Supabase'in kendi sıfırlama e-postası KULLANILMAZ.
 * Akış: e-posta → kendi kodumuz → kod + yeni şifre tek adımda doğrulanır
 * → şifre Supabase Admin API ile sunucu tarafında değiştirilir.
 *
 * Kod ile yeni şifreyi tek istekte alıyoruz; böylece "kod doğrulandı"
 * bilgisi istemciye hiç gitmiyor ve taklit edilemiyor.
 */

export async function startPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, fieldErrors: { email: "Geçerli bir e-posta girin" } };

  const email = parsed.data;
  const ip = await clientIp();
  const admin = createServiceClient();

  // 1) Hesaba özel hız sınırı: dakikada 1, günde 10
  const { data: limit } = await admin.rpc("can_request_password_reset", { p_email: email });
  const allowed = (limit as { allowed?: boolean } | null)?.allowed ?? true;
  const reason = (limit as { reason?: string } | null)?.reason;

  if (!allowed) {
    const retry = Number((limit as { retry_after_sec?: number } | null)?.retry_after_sec ?? 60);
    return {
      ok: false,
      message: reason === "daily_limit"
        ? "Bugün için şifre sıfırlama sınırına ulaştınız. Yarın tekrar deneyin."
        : `Çok sık istek gönderdiniz. ${retry} saniye sonra tekrar deneyin.`,
    };
  }

  // 2) Kayıtlı mı? Değilse kod ÜRETİLİR ama GÖNDERİLMEZ.
  //    Yanıt aynı kaldığı için saldırgan hangi adresin kayıtlı olduğunu anlayamaz.
  const { data: registered } = await admin.rpc("email_is_registered", { p_email: email });
  const isRegistered = registered === true;

  const res = await sendOtp({
    channel: "email",
    purpose: "password_reset",
    target: email,
    silent: !isRegistered,
  });

  // 3) Denemeyi kaydet — gönderilmese bile sayaç işlesin ki tarama yapılamasın
  await admin.rpc("log_password_reset", { p_email: email, p_ip: ip, p_ok: false });

  if (!res.ok && (res.code === "rate_limited" || res.code === "cooldown")) {
    return { ok: false, message: notifyError(res.code) };
  }

  return {
    ok: true,
    message: "Bu e-posta kayıtlıysa doğrulama kodu gönderildi.",
    data: { requestId: res.requestId ?? "", email, maskedTarget: res.maskedTarget },
  };
}

export async function completePasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    requestId: z.string().uuid(),
    code: z.string().trim().regex(/^\d{4,8}$/, "Kod 6 haneli olmalı"),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    confirm: z.string(),
  }).refine((d) => d.password === d.confirm, { message: "Şifreler eşleşmiyor", path: ["confirm"] })
    .safeParse({
      requestId: formData.get("requestId"),
      code: formData.get("code"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors };
  }

  const { requestId, code, email, password } = parsed.data;
  const ip = await clientIp();

  // 1) Kodu doğrula
  const res = await verifyOtp({ requestId, code, target: email });
  if (!res.ok || !res.verified) {
    return { ok: false, message: notifyError(res.code, res.error), data: { attemptsLeft: res.attemptsLeft } };
  }

  // 2) Şifreyi sunucu tarafında değiştir
  try {
    const admin = createServiceClient();

    const { data: userId, error: lookupError } = await admin.rpc("user_id_by_email", { p_email: email });
    if (lookupError || !userId) {
      // Kod doğruydu ama hesap yok — yine de varlığını sızdırmıyoruz
      await admin.rpc("log_password_reset", { p_email: email, p_ip: ip, p_ok: false });
      return { ok: true, message: "Şifreniz güncellendi. Şimdi giriş yapabilirsiniz." };
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(String(userId), {
      password,
      email_confirm: true,
    });

    if (updateError) {
      await admin.rpc("log_password_reset", { p_email: email, p_ip: ip, p_ok: false });
      return { ok: false, message: "Şifre güncellenemedi. Lütfen tekrar deneyin." };
    }

    await admin.rpc("log_password_reset", { p_email: email, p_ip: ip, p_ok: true });
  } catch (err) {
    console.error("[password-reset]", (err as Error).message);
    return { ok: false, message: "Şifre güncellenemedi. Lütfen tekrar deneyin." };
  }

  return { ok: true, message: "Şifreniz güncellendi. Şimdi giriş yapabilirsiniz." };
}

/* ═════════════════ OTURUM İÇİ ŞİFRE DEĞİŞTİRME ═════════════════ */

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    current: z.string().min(1, "Mevcut şifrenizi girin"),
    password: passwordSchema,
    confirm: z.string(),
  }).refine((d) => d.password === d.confirm, { message: "Şifreler eşleşmiyor", path: ["confirm"] })
    .safeParse({
      current: formData.get("current"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { ok: false, message: "Oturum bulunamadı." };

  // Mevcut şifreyi doğrula — oturumu ele geçiren biri şifreyi değiştiremesin
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: parsed.data.current,
  });
  if (signInError) return { ok: false, fieldErrors: { current: "Mevcut şifreniz hatalı" } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: friendlyError(error) };

  return { ok: true, message: "Şifreniz güncellendi." };
}

/* ═════════════════ KAYIT SONRASI HOŞ GELDİNİZ ═════════════════ */

export async function sendWelcomeEmail(email: string, firstName?: string) {
  await sendTemplateEmail({ to: email, template: "welcome", params: { firstName } });
}
