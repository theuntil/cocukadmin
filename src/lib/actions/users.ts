"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

const uuid = z.string().uuid();

/** Kullanıcı engelleme / engel kaldırma */
export async function blockUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    userId: uuid,
    block: z.enum(["true", "false"]),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  }).safeParse({
    userId: formData.get("userId"),
    block: formData.get("block"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const blocking = parsed.data.block === "true";
  if (blocking && !parsed.data.reason) {
    return { ok: false, fieldErrors: { reason: "Engelleme gerekçesi zorunlu" } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_block_user", {
    p_user_id: parsed.data.userId,
    p_reason: parsed.data.reason || null,
    p_block: blocking,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/uyeler");
  revalidatePath(`/uyeler/${parsed.data.userId}`);
  return { ok: true, message: blocking ? "Kullanıcı engellendi." : "Engel kaldırıldı." };
}

/** Kullanıcı silme — yalnızca süper yönetici */
export async function deleteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    userId: uuid,
    reason: z.string().trim().min(5, "Gerekçe en az 5 karakter").max(500),
    confirm: z.string(),
  }).safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  // Yanlışlıkla silmeyi önlemek için ikinci onay
  if (parsed.data.confirm !== "SIL") {
    return { ok: false, fieldErrors: { confirm: "Onaylamak için SIL yazın" } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", {
    p_user_id: parsed.data.userId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/uyeler");
  redirect("/uyeler");
}

/* ═══════════════ IP ENGELLEME ═══════════════ */

export async function blockIp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    ip: z.string().trim().min(7, "IP adresi girin").max(45),
    reason: z.string().trim().min(3, "Gerekçe girin").max(500),
    days: z.coerce.number().int().positive().optional(),
  }).safeParse({
    ip: formData.get("ip"),
    reason: formData.get("reason"),
    days: formData.get("days") || undefined,
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_block_ip", {
    p_ip: parsed.data.ip,
    p_reason: parsed.data.reason,
    p_days: parsed.data.days ?? null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/uyeler");
  return {
    ok: true,
    message: `${(data as { preview: string }).preview} engellendi.`,
  };
}

export async function unblockIp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_unblock_ip", { p_id: parsed.data });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/uyeler");
  return { ok: true, message: "IP engeli kaldırıldı." };
}

/**
 * Yönetici kullanıcının e-posta/telefon bilgisini değiştirir.
 *
 * ★ Yeni değer DOĞRULANMAMIŞ sayılır — kimse o adrese ulaşıp teyit
 *   etmedi. Yönetici gerçekten teyit ettiyse (aradı, kişiyi tanıyor)
 *   "doğrulanmış işaretle" kutusunu açabilir; bu, denetime ayrı bir
 *   işlem olarak yazılır.
 */
export async function setUserContact(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    userId: z.string().uuid(),
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    markVerified: z.boolean(),
  }).safeParse({
    userId: formData.get("userId"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    markVerified: formData.get("markVerified") === "on",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const { userId, email, phone, markVerified } = parsed.data;

  if (!email && !phone) {
    return { ok: false, message: "Değiştirilecek bir bilgi girin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_contact", {
    p_user_id: userId,
    p_email: email || null,
    p_phone: phone || null,
    p_mark_verified: markVerified,
  });

  /* Fonksiyonun Türkçe uyarıları birebir geçsin: "bu e-posta başka
     hesapta kullanılıyor" gibi mesajlar kullanıcıya ulaşmalı. */
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/uyeler/${userId}`);
  return {
    ok: true,
    message: markVerified
      ? "Bilgi güncellendi ve doğrulanmış işaretlendi."
      : "Bilgi güncellendi. Doğrulanmamış olarak işaretlendi.",
  };
}

/** Doğrulama işaretini elle aç/kapa — bilgiyi değiştirmeden */
export async function toggleVerification(
  userId: string,
  field: "email" | "phone",
  value: boolean,
): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_verification", {
    p_user_id: parsed.data, p_field: field, p_value: value,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/uyeler/${parsed.data}`);
  return {
    ok: true,
    message: value ? "Doğrulanmış olarak işaretlendi." : "Doğrulama kaldırıldı.",
  };
}
