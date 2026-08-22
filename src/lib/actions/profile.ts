"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { sendTemplateEmail, sendOtp, verifyOtp } from "@/lib/notify";

/**
 * E-posta değiştirme talebi.
 *
 * Onay bağlantısı YENİ adrese gider; adres ancak orada doğrulanınca değişir.
 * Böylece yanlış yazılan bir adres hesabı kilitleyemez.
 */
export async function requestEmailChange(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta adresi girin"),
  }).safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { ok: false, fieldErrors: { email: parsed.error.issues[0]!.message } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_email_change", {
    p_new_email: parsed.data.email,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { token: string; new_email: string };
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";

  const mail = await sendTemplateEmail({
    to: result.new_email,
    template: "email_change",
    params: {
      confirmUrl: `${site}/eposta-onayi?anahtar=${result.token}`,
      newEmail: result.new_email,
    },
  });

  if (!mail.ok) {
    return {
      ok: false,
      message: "Onay e-postası gönderilemedi. Lütfen birazdan tekrar deneyin.",
    };
  }

  revalidatePath("/panel/ayarlar");
  return {
    ok: true,
    message: `Onay bağlantısı ${result.new_email} adresine gönderildi. Tıklayana kadar adresiniz değişmez.`,
  };
}

/** Onay bağlantısındaki anahtarı doğrular */
export async function confirmEmailChange(token: string): Promise<
  { ok: true; email: string } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_email_change", { p_token: token });

  if (error) return { ok: false, message: friendlyError(error) };

  return { ok: true, email: (data as { email: string }).email };
}

/* ═══════════════ TELEFON DEĞİŞTİRME ═══════════════ */

/**
 * Yeni numaraya doğrulama kodu gönderir.
 * Numara, kod doğrulanana kadar değişmez.
 */
export async function requestPhoneChange(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    phone: z.string().trim().min(10, "Telefon numarası girin").max(20),
  }).safeParse({ phone: formData.get("phone") });

  if (!parsed.success) {
    return { ok: false, fieldErrors: { phone: parsed.error.issues[0]!.message } };
  }

  const supabase = await createClient();

  // Numaranın uygunluğu önce kontrol edilir: kullanılmış bir numaraya
  // boşuna SMS gönderilmesin
  const { data, error } = await supabase.rpc("request_phone_change", {
    p_new_phone: parsed.data.phone,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const normalized = (data as { phone: string }).phone;

  const sent = await sendOtp({
    channel: "sms",
    purpose: "phone_verify",
    target: normalized,
  });

  if (!sent.ok) {
    return { ok: false, message: "Doğrulama kodu gönderilemedi. Birazdan tekrar deneyin." };
  }

  return {
    ok: true,
    message: `Kod ${normalized} numarasına gönderildi.`,
    data: { phone: normalized, requestId: sent.requestId ?? "" },
  };
}

/** Kodu doğrular ve numarayı kaydeder */
export async function confirmPhoneChange(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    phone: z.string().trim().min(10),
    requestId: z.string().trim().min(1),
    code: z.string().trim().regex(/^\d{4,8}$/, "Kodu eksiksiz girin"),
  }).safeParse({
    phone: formData.get("phone"),
    requestId: formData.get("requestId"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: { code: "Kodu eksiksiz girin" } };
  }

  const checked = await verifyOtp({
    requestId: parsed.data.requestId,
    code: parsed.data.code,
    target: parsed.data.phone,
  });

  if (!checked.ok || !checked.verified) {
    return { ok: false, fieldErrors: { code: "Kod hatalı veya süresi dolmuş" } };
  }

  // Kod doğrulandı; numara ancak şimdi yazılır
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_phone_change", {
    p_new_phone: parsed.data.phone,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/ayarlar");
  return { ok: true, message: "Telefon numaranız güncellendi." };
}
