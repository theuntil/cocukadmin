"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

/**
 * Kart yenileme.
 *
 * Kalan süre kaybolmaz: yeni dönem mevcut bitiş tarihinin üzerine eklenir.
 * Kart dijital olduğu için yeni kart basılmaz; numara ve QR aynı kalır.
 */
export async function startRenewal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    cardId: z.string().uuid(),
    paymentMethod: z.enum(["credit_card", "bank_transfer"]).optional(),
  }).safeParse({
    cardId: formData.get("cardId"),
    paymentMethod: formData.get("paymentMethod") || undefined,
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_renewal_order", {
    p_card_id: parsed.data.cardId,
    p_payment_method: parsed.data.paymentMethod ?? null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { order_id: string };
  revalidatePath("/panel/kombine-kart");
  redirect(`/panel/kombine-kart/${result.order_id}`);
}
