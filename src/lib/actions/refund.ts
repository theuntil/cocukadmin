"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe, stripeConfigured, toMinorUnit } from "@/lib/stripe";
import { friendlyError, type ActionState } from "@/lib/actions/types";

/**
 * İade.
 *
 * Sıra önemli: önce veritabanında "pending" kayıt açılır, sonra Stripe'a
 * istek atılır, sonuç kayda işlenir. Tersi olsaydı Stripe'ta iade olup
 * bizde kaydı bulunmayan işlemler oluşabilirdi.
 */
export async function refundOrder(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    orderId: z.string().uuid(),
    reason: z.string().trim().min(3, "Gerekçe en az 3 karakter").max(500),
    amount: z.coerce.number().positive().optional(),
    confirm: z.string(),
  }).safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
    amount: formData.get("amount") || undefined,
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  // Yanlışlıkla iadeyi önlemek için ikinci onay
  if (parsed.data.confirm !== "IADE") {
    return { ok: false, fieldErrors: { confirm: "Onaylamak için IADE yazın" } };
  }

  const supabase = await createClient();

  // 1) Kayıt aç
  const { data, error } = await supabase.rpc("request_refund", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason,
    p_amount: parsed.data.amount ?? null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const req = data as {
    refund_id: string; amount: number; currency: string;
    payment_intent: string | null; provider: string;
  };

  // 2) Sağlayıcıya göre işle
  if (req.provider !== "stripe" || !req.payment_intent) {
    // Havale/elden ödeme: para iadesi elle yapılır, kayıt tamamlanır
    const { error: manualErr } = await supabase.rpc("complete_refund", {
      p_refund_id: req.refund_id,
      p_provider_refund_id: null,
      p_error: null,
    });

    if (manualErr) return { ok: false, message: friendlyError(manualErr) };

    revalidatePath(`/siparisler/${parsed.data.orderId}`);
    return {
      ok: true,
      message: "İade kaydedildi. Havale ile alınan ödemeyi elle iade etmeyi unutmayın.",
    };
  }

  if (!stripeConfigured || !stripe) {
    await supabase.rpc("complete_refund", {
      p_refund_id: req.refund_id,
      p_provider_refund_id: null,
      p_error: "Stripe yapılandırılmamış",
    });
    return { ok: false, message: "Stripe yapılandırılmamış; iade yapılamadı." };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: req.payment_intent,
      amount: toMinorUnit(Number(req.amount)),
      reason: "requested_by_customer",
      metadata: { refund_id: req.refund_id },
    });

    const { error: doneErr } = await supabase.rpc("complete_refund", {
      p_refund_id: req.refund_id,
      p_provider_refund_id: refund.id,
      p_error: null,
    });

    if (doneErr) return { ok: false, message: friendlyError(doneErr) };

    revalidatePath(`/siparisler/${parsed.data.orderId}`);
    revalidatePath("/siparisler");

    return {
      ok: true,
      message: `${req.amount} ${req.currency} iade edildi. Kart iptal edildi.`,
    };
  } catch (err) {
    const message = (err as Error).message;

    // Hata kayda işlenir: iade denendi ama başarısız oldu bilgisi kaybolmaz
    await supabase.rpc("complete_refund", {
      p_refund_id: req.refund_id,
      p_provider_refund_id: null,
      p_error: message,
    });

    console.error("[refundOrder]", message);
    return { ok: false, message: `İade başarısız: ${message}` };
  }
}
