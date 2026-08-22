import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Ödeme eşitleme.
 *
 * Beklemede kalmış ödemeleri Stripe'a sorar; para alınmışsa kartı oluşturur.
 * Webhook ulaşmadıysa veya bir adım takıldıysa sistem kendini toparlar.
 *
 * Zamanlanmış görev olarak çağrılabilir, yönetim panelinden elle de
 * tetiklenebilir. İşlenmiş ödemeler ikinci kez işlenmez.
 *
 * Güvenlik: gizli anahtarla korunur. Anahtar tanımlı değilse uç kapalıdır.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.PAYMENT_RECONCILE_SECRET;

export async function POST(req: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  if (req.headers.get("authorization") !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured || !stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const supabase = createServiceClient();

  // Son 7 günün açık oturumları; daha eskisi zaten düşmüştür
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("payment_sessions")
    .select("id, order_id, payment_intent, status, created_at")
    .eq("status", "open")
    .not("payment_intent", "is", null)
    .gte("created_at", since)
    .limit(100);

  if (error) {
    console.error("[reconcile] okuma hatası:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as { payment_intent: string; order_id: string }[];

  let fixed = 0;
  let stillOpen = 0;
  const failures: string[] = [];

  for (const row of rows) {
    try {
      const intent = await stripe.paymentIntents.retrieve(row.payment_intent);

      if (intent.status === "succeeded") {
        const { error: finErr } = await supabase.rpc("settle_order", {
          p_order_ref: row.order_id,
          p_payment_intent: intent.id,
          p_amount: intent.amount_received !== null
            ? intent.amount_received / 100 : null,
        });

        if (finErr) failures.push(`${intent.id}: ${finErr.message}`);
        else fixed += 1;
      } else if (intent.status === "canceled") {
        await supabase.rpc("fail_payment_session", {
          p_session_id: intent.id,
          p_status: "failed",
        });
      } else {
        stillOpen += 1;
      }
    } catch (err) {
      failures.push(`${row.payment_intent}: ${(err as Error).message}`);
    }
  }

  if (failures.length > 0) console.error("[reconcile] hatalar:", failures);

  return NextResponse.json({
    checked: rows.length, fixed, stillOpen, failures: failures.length,
  });
}
