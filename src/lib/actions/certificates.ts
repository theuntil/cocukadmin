"use server";
import { storageRemove } from "@/lib/storage";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { issueCertificate, resendCertificateEmail } from "@/lib/certificate/issue";
import type { ActionState } from "@/lib/actions/types";

/** Eksik ya da iptal edilmiş sertifikayı yeniden üretir */
export async function reissueCertificate(childId: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(childId);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const res = await issueCertificate({ childId: parsed.data });

  revalidatePath("/sertifikalar");

  if (!res.ok) return { ok: false, message: res.error ?? "Üretilemedi." };
  if (res.existing) {
    return { ok: false, message: "Bu çocuğun geçerli bir sertifikası zaten var." };
  }

  return {
    ok: true,
    message: res.emailed
      ? `Sertifika üretildi (${res.number}) ve e-posta gönderildi.`
      : `Sertifika üretildi (${res.number}).`,
  };
}

/**
 * Sertifikayı siler.
 *
 * ┌─ HEM KAYIT HEM DOSYA ⚠️ ──────────────────────────────────────┐
 * │ Yalnızca kaydı silmek dosyayı kovada bırakırdı: kimsenin       │
 * │ göremediği ama yer kaplayan ve kişisel veri içeren bir dosya.  │
 * │                                                                  │
 * │ Önce dosya, sonra kayıt. Dosya silinemezse kayıt da duruyor —  │
 * │ böylece yeniden denenebiliyor; tersi olsaydı dosya yetim       │
 * │ kalırdı.                                                         │
 * └──────────────────────────────────────────────────────────────────┘
 */
export async function deleteCertificate(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();

  const { data: cert, error } = await supabase
    .from("certificates").select("id, storage_path, number").eq("id", parsed.data).maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!cert) return { ok: false, message: "Sertifika bulunamadı." };

  const c = cert as { id: string; storage_path: string; number: string };

  try {
    const svc = createServiceClient();
    const _sl = await storageRemove("certificates", [c.storage_path]);
    const sErr = _sl.ok ? null : new Error(_sl.error);
    if (sErr) return { ok: false, message: `Dosya silinemedi: ${sErr.message}` };
  } catch (err) {
    return { ok: false, message: `Dosya silinemedi: ${(err as Error).message}` };
  }

  const { error: dErr } = await supabase.from("certificates").delete().eq("id", c.id);
  if (dErr) return { ok: false, message: dErr.message };

  revalidatePath("/sertifikalar");
  return { ok: true, message: `${c.number} silindi.` };
}

/** Sertifika e-postasını yeniden gönderir */
export async function resendCertificate(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, number, child_name, user_id")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!cert) return { ok: false, message: "Sertifika bulunamadı." };

  const c = cert as { id: string; number: string; child_name: string; user_id: string };

  try {
    const svc = createServiceClient();
    const { data: auth } = await svc.auth.admin.getUserById(c.user_id);
    const eposta = auth?.user?.email;
    if (!eposta) return { ok: false, message: "Kullanıcının e-posta adresi bulunamadı." };

    const { data: veli } = await supabase
      .from("profiles").select("first_name").eq("id", c.user_id).maybeSingle();

    /* Üretimle AYNI yoldan gönderiliyor: iki farklı gönderim yolu
       tutmak, birinin bozulduğunu fark etmemeye yol açıyordu.
       `issueCertificate` mevcut sertifikayı bulup e-postayı
       tekrarlıyor. */
    const yeniden = await resendCertificateEmail(c.id);

    if (!yeniden.ok) {
      return { ok: false, message: yeniden.error ?? "Gönderilemedi." };
    }

    await supabase.rpc("admin_certificate_emailed", { p_id: c.id });
    revalidatePath("/sertifikalar");
    return { ok: true, message: `${eposta} adresine gönderildi.` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
