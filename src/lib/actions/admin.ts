"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { sendTemplateEmail } from "@/lib/notify";

/** Ödeme onayı — DB tarafında finance rolü ayrıca doğrulanır. */
export async function approvePayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = z.string().uuid().safeParse(formData.get("paymentId"));
  if (!id.success) return { ok: false, message: "Ödeme bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_payment", {
    p_payment_id: id.data,
    p_note: String(formData.get("note") ?? ""),
  });
  if (error) return { ok: false, message: friendlyError(error) };

  // Bilgilendirme e-postası — başarısız olsa da onay geçerli kalır
  try {
    const { data: row } = await supabase
      .from("payments")
      .select("orders(order_number, profiles(id))")
      .eq("id", id.data)
      .maybeSingle();

    const orderNumber = (row as { orders?: { order_number?: string } } | null)?.orders?.order_number;
    const email = String(formData.get("email") ?? "");

    if (email && orderNumber) {
      await sendTemplateEmail({ to: email, template: "payment_approved", params: { orderNumber } });
    }
  } catch (err) {
    console.error("[approvePayment] e-posta gönderilemedi:", (err as Error).message);
  }

  revalidatePath("/yonetim/odemeler");
  return { ok: true, message: "Ödeme onaylandı, kart hazırlığa alındı." };
}

export async function rejectPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ paymentId: z.string().uuid(), reason: z.string().trim().min(3, "Gerekçe yazın") })
    .safeParse({ paymentId: formData.get("paymentId"), reason: formData.get("reason") });
  if (!parsed.success) return { ok: false, fieldErrors: { reason: "Red gerekçesi zorunludur" } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_payment", {
    p_payment_id: parsed.data.paymentId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yonetim/odemeler");
  return { ok: true, message: "Ödeme reddedildi." };
}



export async function updateCardStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      cardId: z.string().uuid(),
      status: z.enum(["processing", "ready", "shipped", "delivered", "active", "cancelled", "lost", "suspended", "expired"]),
      carrier: z.string().optional().nullable(),
      tracking: z.string().optional().nullable(),
    })
    .safeParse({
      cardId: formData.get("cardId"),
      status: formData.get("status"),
      carrier: formData.get("carrier") || null,
      tracking: formData.get("tracking") || null,
    });
  if (!parsed.success) return { ok: false, message: "Geçersiz durum bilgisi." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_card_status", {
    p_card_id: parsed.data.cardId,
    p_status: parsed.data.status,
    p_carrier: parsed.data.carrier,
    p_tracking: parsed.data.tracking,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yonetim/siparisler");
  return { ok: true, message: "Kart durumu güncellendi." };
}

/** Etkinlik girişinde kod okutma */
export async function checkIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = z.string().trim().min(4, "Kod girin").safeParse(formData.get("code"));
  if (!code.success) return { ok: false, fieldErrors: { code: "Giriş kodunu girin" } };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_registration", { p_code: code.data });
  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { ok: boolean; message: string; attendee?: Record<string, unknown>; event_title?: string };
  return { ok: result.ok, message: result.message, data: result as Record<string, unknown> };
}

