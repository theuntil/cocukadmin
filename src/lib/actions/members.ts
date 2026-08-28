"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

const uuid = z.string().uuid();

/** Üye profilini düzenle */
export async function updateMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    userId: uuid,
    firstName: z.string().trim().max(80).optional().or(z.literal("")),
    lastName: z.string().trim().max(80).optional().or(z.literal("")),
    username: z.string().trim().max(30)
      .regex(/^[a-z0-9._]*$/i, "Yalnızca harf, rakam, nokta ve alt çizgi")
      .optional().or(z.literal("")),
    cityId: z.coerce.number().int().positive().optional(),
    teamId: uuid.optional().or(z.literal("")),
    status: z.enum(["active", "suspended", "pending"]).optional(),
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
  }).safeParse({
    userId: formData.get("userId"),
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    username: formData.get("username") ?? "",
    cityId: formData.get("cityId") || undefined,
    teamId: formData.get("teamId") ?? "",
    status: formData.get("status") || undefined,
    emailVerified: formData.get("emailVerified") === "on",
    phoneVerified: formData.get("phoneVerified") === "on",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", {
    p_user_id: d.userId,
    p_first_name: d.firstName || null,
    p_last_name: d.lastName || null,
    p_city_id: d.cityId ?? null,
    p_team_id: d.teamId || null,
    p_username: d.username ?? null,
    p_status: d.status ?? null,
    p_email_verified: d.emailVerified,
    p_phone_verified: d.phoneVerified,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/uyeler/${d.userId}`);
  revalidatePath("/uyeler");
  return { ok: true, message: "Profil güncellendi." };
}

/* ═══════════════ ÇOCUK ═══════════════ */

export async function updateChildRecord(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  /* photoOnly: yalnızca fotoğraf güncellenir, diğer alanlara dokunulmaz.
     Avatar bileşeni formun tamamını göndermediği için gerekli. */
  const photoOnly = formData.get("photoOnly") === "1";

  const parsed = z.object({
    childId: uuid,
    firstName: z.string().trim().max(80).optional().or(z.literal("")),
    lastName: z.string().trim().max(80).optional().or(z.literal("")),
    birthDate: z.string().optional().or(z.literal("")),
    gender: z.enum(["female", "male", "unspecified"]).optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    photoPath: z.string().max(300).optional().or(z.literal("")),
    cityId: z.coerce.number().int().positive().optional(),
    teamId: uuid.optional().or(z.literal("")),
  }).safeParse({
    childId: formData.get("childId"),
    firstName: photoOnly ? "" : (formData.get("firstName") ?? ""),
    lastName: photoOnly ? "" : (formData.get("lastName") ?? ""),
    birthDate: photoOnly ? "" : (formData.get("birthDate") ?? ""),
    gender: photoOnly ? undefined : (formData.get("gender") || undefined),
    notes: photoOnly ? undefined : (formData.get("notes") ?? ""),
    photoPath: formData.get("photoPath") ?? undefined,
    cityId: photoOnly ? undefined : (formData.get("cityId") || undefined),
    teamId: photoOnly ? undefined : (formData.get("teamId") ?? ""),
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_child", {
    p_child_id: d.childId,
    p_first_name: d.firstName || null,
    p_last_name: d.lastName || null,
    p_birth_date: d.birthDate || null,
    p_gender: d.gender ?? null,
    p_notes: d.notes ?? null,
    // Boş string fotoğrafı KALDIRIR; undefined dokunmaz
    p_photo_path: d.photoPath !== undefined ? d.photoPath : null,
    p_city_id: d.cityId ?? null,
    p_team_id: d.teamId || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/cocuklar/${d.childId}`);
  return { ok: true, message: "Çocuk bilgileri güncellendi." };
}

export async function deleteChildRecord(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    childId: uuid,
    reason: z.string().trim().min(3, "Gerekçe girin").max(500),
    parentId: uuid.optional().or(z.literal("")),
  }).safeParse({
    childId: formData.get("childId"),
    reason: formData.get("reason"),
    parentId: formData.get("parentId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: { reason: "Gerekçe girin" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_child", {
    p_child_id: parsed.data.childId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { deleted: boolean; message: string };

  // Kayıt silindiyse detay sayfası artık yok; üyeye dön
  if (result.deleted && parsed.data.parentId) {
    revalidatePath(`/uyeler/${parsed.data.parentId}`);
    redirect(`/uyeler/${parsed.data.parentId}`);
  }

  revalidatePath(`/cocuklar/${parsed.data.childId}`);
  return { ok: true, message: result.message };
}
