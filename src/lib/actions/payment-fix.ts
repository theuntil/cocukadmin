"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { friendlyError, type ActionState } from "@/lib/actions/types";

/**
 * Ödemesi alınmış ama tamamlanmamış siparişi eşitler.
 *
 * Stripe'a sorar; para gerçekten alınmışsa siparişi tamamlar ve kartı üretir.
 * Ödeme bulunamazsa hiçbir şey değiştirmez — yanlışlıkla bedava kart
 * üretilmesi mümkün değildir.
 */
export async function syncOrderPayment(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    orderId: z.string().uuid(),
    orderNumber: z.string().min(3),
  }).safeParse({
    orderId: formData.get("orderId"),
    orderNumber: formData.get("orderNumber"),
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };
  if (!stripeConfigured || !stripe) {
    return { ok: false, message: "Stripe yapılandırılmamış." };
  }

  const supabase = await createClient();

  // Bu siparişin ödeme niyetlerini bul
  const { data: sessions } = await supabase
    .from("payment_sessions")
    .select("payment_intent")
    .eq("order_id", parsed.data.orderId)
    .not("payment_intent", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const intentIds = ((sessions ?? []) as { payment_intent: string }[])
    .map((r) => r.payment_intent);

  // Kayıt yoksa Stripe'ta sipariş numarasıyla ara
  if (intentIds.length === 0) {
    try {
      const search = await stripe.paymentIntents.search({
        query: `metadata['order_number']:'${parsed.data.orderNumber}'`,
        limit: 5,
      });
      for (const pi of search.data) intentIds.push(pi.id);
    } catch (err) {
      console.error("[syncOrderPayment] arama:", (err as Error).message);
    }
  }

  if (intentIds.length === 0) {
    return { ok: false, message: "Bu siparişe ait ödeme kaydı bulunamadı." };
  }

  for (const id of intentIds) {
    try {
      const intent = await stripe.paymentIntents.retrieve(id);
      if (intent.status !== "succeeded") continue;

      const { data, error } = await supabase.rpc("settle_order", {
        p_order_ref: parsed.data.orderId,
        p_payment_intent: intent.id,
        p_amount: intent.amount_received !== null
          ? intent.amount_received / 100 : null,
      });

      if (error) return { ok: false, message: friendlyError(error) };

      const res = data as { already_completed: boolean; card_number: string | null };

      revalidatePath(`/siparisler/${parsed.data.orderId}`);
      revalidatePath("/siparisler");

      return {
        ok: true,
        message: res.already_completed
          ? "Sipariş zaten tamamlanmıştı."
          : `Ödeme eşitlendi. Kart oluşturuldu: ${res.card_number ?? "—"}`,
      };
    } catch (err) {
      console.error("[syncOrderPayment]", (err as Error).message);
    }
  }

  return {
    ok: false,
    message: "Stripe'ta tamamlanmış ödeme bulunamadı. Para çekilmemiş olabilir.",
  };
}
