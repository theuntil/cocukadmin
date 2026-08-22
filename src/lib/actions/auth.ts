"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { sendWelcomeEmail } from "@/lib/actions/verify";

const emailSchema = z.string().trim().toLowerCase().email("Geçerli bir e-posta girin");
const passwordSchema = z.string().min(8, "Şifre en az 8 karakter olmalı");

async function siteUrl() {
  const h = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost:3000"}`
  );
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Şifre gerekli") })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: friendlyError(error) };

  const next = String(formData.get("next") ?? "/panel");
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/panel");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      firstName: z.string().trim().min(2, "Adınızı girin").max(80),
      lastName: z.string().trim().min(2, "Soyadınızı girin").max(80),
      email: emailSchema,
      password: passwordSchema,
      terms: z.literal("on", { message: "Koşulları kabul etmelisiniz" }),
      kvkk: z.literal("on", { message: "KVKK metnini onaylamalısınız" }),
    })
    .safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
      terms: formData.get("terms"),
      kvkk: formData.get("kvkk"),
    });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();

  // Supabase'in kendi doğrulama e-postası KULLANILMIYOR.
  // Doğrulama kendi servisimizden (ct-notify) kod ile yapılır.
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { first_name: parsed.data.firstName, last_name: parsed.data.lastName },
    },
  });

  if (error) return { ok: false, message: friendlyError(error) };

  /*
   * KAYIT SONRASI OTOMATİK GİRİŞ.
   *
   * Supabase e-posta onayı açıkken signUp oturum döndürmez; kullanıcı
   * ayrıca giriş yapmak zorunda kalıyordu. Oturum yoksa hemen giriş
   * denenir. Başarısız olursa kayıt yine geçerlidir, kullanıcı giriş
   * ekranına yönlendirilir.
   */
  if (!signUpData.session) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInErr) {
      console.error("[signup] otomatik giriş yapılamadı:", signInErr.message);
    }
  }

  // Hoş geldiniz e-postası kendi servisimizden gider; başarısız olursa kayıt yine geçerli
  try {
    await sendWelcomeEmail(parsed.data.email, parsed.data.firstName);
  } catch (err) {
    console.error("[signup] hoş geldiniz e-postası gönderilemedi:", (err as Error).message);
  }

  return {
    ok: true,
    message: "Hesabınız hazır. Hoş geldiniz!",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * NOT: Şifre sıfırlama artık kendi servisimizden yürüyor.
 * Bkz. lib/actions/verify.ts → startPasswordReset / completePasswordReset
 * Supabase'in resetPasswordForEmail çağrısı bilinçli olarak kaldırıldı.
 */

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "Şifreler eşleşmiyor", path: ["confirm"] })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: friendlyError(error) };

  return { ok: true, message: "Şifreniz güncellendi." };
}

/**
 * NOT: E-posta doğrulaması kendi servisimizden kod ile yapılır.
 * Bkz. lib/actions/verify.ts → startEmailVerification / confirmEmailVerification
 */

/*
 * `signInWithOAuth` KALDIRILDI.
 *
 * Kurulum zorunlu ve tek ekranda olduğu için sosyal giriş anlamsız
 * kalıyordu: kişi tek tıkla hesap açıyor ama veli adı, çocuk bilgisi
 * ve takım yine sorulmak zorundaydı. Tek yol e-posta ve şifre.
 */
