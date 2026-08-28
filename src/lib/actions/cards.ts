"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

const uuid = z.string().uuid();

/** Kart durumu değiştir */
export async function setCardStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    cardId: uuid,
    status: z.enum(["pending", "processing", "active", "suspended", "expired", "cancelled"]),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }).safeParse({
    cardId: formData.get("cardId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_card_status", {
    p_card_id: parsed.data.cardId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/kartlar/${parsed.data.cardId}`);
  revalidatePath("/kartlar");
  return { ok: true, message: "Kart durumu güncellendi." };
}

/** QR anahtarını yenile — eski QR anında geçersizleşir */
export async function regenerateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = uuid.safeParse(formData.get("cardId"));
  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_regenerate_qr", { p_card_id: parsed.data });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/kartlar/${parsed.data}`);
  return { ok: true, message: "QR yenilendi. Eski QR artık geçersiz." };
}

/** Üyeliği uzat (ödeme almadan) */
export async function extendCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    cardId: uuid,
    days: z.coerce.number().int().min(1, "En az 1 gün").max(1095, "En fazla 1095 gün"),
    reason: z.string().trim().min(3, "Gerekçe girin").max(500),
  }).safeParse({
    cardId: formData.get("cardId"),
    days: formData.get("days"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_extend_card", {
    p_card_id: parsed.data.cardId,
    p_days: parsed.data.days,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/kartlar/${parsed.data.cardId}`);
  return { ok: true, message: `Üyelik ${parsed.data.days} gün uzatıldı.` };
}

/** Profil fotoğrafı ekle / kaldır */
export async function setUserAvatar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    userId: uuid,
    path: z.string().trim().max(400).optional().or(z.literal("")),
  }).safeParse({
    userId: formData.get("userId"),
    path: formData.get("path") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_avatar", {
    p_user_id: parsed.data.userId,
    p_path: parsed.data.path || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/uyeler/${parsed.data.userId}`);
  revalidatePath("/uyeler");
  return {
    ok: true,
    message: parsed.data.path ? "Profil fotoğrafı güncellendi." : "Profil fotoğrafı kaldırıldı.",
  };
}

/**
 * Kombine kart kaydını TAMAMEN siler.
 *
 * İptal etmekten farkı: kayıt listede kalmaz. Test kartları ve yanlış
 * girişler için.
 *
 * ★ Sipariş SİLİNMEZ, karttan koparılır — ticari kayıt yerinde kalır.
 * ★ Geçerli kart `force` olmadan silinmez: hâlâ kullanımdaki bir kartı
 *   silmek, çocuğun stadyuma girememesi demek.
 */
export async function deleteCard(id: string, force = false): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_card", {
    p_card_id: parsed.data,
    p_force: force,
  });

  /* Fonksiyonun kendi Türkçe uyarısı birebir geçsin: "kart hâlâ
     geçerli" mesajı kullanıcıya ulaşmalı. */
  if (error) return { ok: false, message: error.message };

  const d = data as { checkins?: number } | null;

  revalidatePath("/kartlar");
  return {
    ok: true,
    message: (d?.checkins ?? 0) > 0
      ? `Kart silindi. ${d?.checkins} okutma kaydı geçmişte kaldı.`
      : "Kart silindi.",
  };
}
