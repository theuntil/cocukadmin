import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Stripe webhook.
 *
 * Güvenlik: her istek Stripe imzasıyla doğrulanır. İmzasız veya bozuk imzalı
 * istek reddedilir — aksi hâlde herkes "ödeme yapıldı" diyebilirdi.
 *
 * Tekrar koruması: Stripe aynı olayı birden çok kez gönderebilir (ağ hatası,
 * yeniden deneme). Olay kimliği veritabanına yazılır; ikinci gelişte işlem
 * atlanır ama yine 200 döneriz, yoksa Stripe denemeye devam eder.
 */

// Ham gövde gerekir: Next'in JSON ayrıştırması imzayı bozar
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe || !WEBHOOK_SECRET) {
    console.error("[stripe-webhook] yapılandırma eksik");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, WEBHOOK_SECRET);
  } catch (err) {
    // İmza doğrulanamadı: istek Stripe'tan gelmiyor olabilir
    console.error("[stripe-webhook] imza doğrulanamadı:", (err as Error).message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Daha önce işlendi mi?
  const { data: isNew, error: recErr } = await supabase.rpc("record_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: event.data.object as unknown as Record<string, unknown>,
  });

  if (recErr) {
    console.error("[stripe-webhook] olay kaydedilemedi:", recErr.message);
    // 500 dönersek Stripe tekrar dener; geçici hata olabilir
    return NextResponse.json({ error: "record_failed" }, { status: 500 });
  }

  if (isNew === false) {
    // Zaten işlenmiş: sessizce onayla
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string;
          payment_intent: string | null;
          amount_total: number | null;
          currency: string | null;
          payment_status: string;
        };

        // Ödeme gerçekten alındı mı? (bazı akışlarda oturum tamamlanır ama
        // ödeme beklemededir)
        if (session.payment_status !== "paid") {
          await supabase.rpc("mark_webhook_processed", {
            p_event_id: event.id,
            p_error: `payment_status=${session.payment_status}`,
          });
          return NextResponse.json({ received: true, skipped: "unpaid" });
        }

        const { error } = await supabase.rpc("complete_payment_session", {
          p_session_id: session.id,
          p_payment_intent: session.payment_intent,
          // Tutar kuruş cinsinden gelir; veritabanı lira bekliyor
          p_amount: session.amount_total !== null ? session.amount_total / 100 : null,
        });

        if (error) throw new Error(error.message);
        break;
      }

      case "payment_intent.succeeded": {
        // Site içi ödeme akışı: kart alanları kendi sayfamızda gösterilir,
        // onay bu olayla gelir.
        const intent = event.data.object as {
          id: string; amount_received: number | null; currency: string;
          metadata?: Record<string, string>;
        };

        const amount = intent.amount_received !== null
          ? intent.amount_received / 100 : null;

        /* Sipariş kimliği metadata'da taşınır; ara kayıt bulunamasa bile
           sipariş doğrudan tamamlanabilir. */
        const orderRef = (intent as { metadata?: Record<string, string> })
          .metadata?.order_id;

        const { error } = orderRef
          ? await supabase.rpc("settle_order", {
              p_order_ref: orderRef,
              p_payment_intent: intent.id,
              p_amount: amount,
            })
          : await supabase.rpc("complete_payment_intent", {
              p_intent_id: intent.id,
              p_amount: amount,
            });

        if (error) throw new Error(error.message);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as { id: string };
        await supabase.rpc("fail_payment_session", {
          p_session_id: intent.id,
          p_status: "failed",
        });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as { id: string };
        await supabase.rpc("fail_payment_session", {
          p_session_id: session.id,
          p_status: "expired",
        });
        break;
      }

      case "charge.refunded": {
        // İade Stripe panelinden yapıldıysa bilgi amaçlı kaydedilir;
        // bizim panelden yapılan iadeler kendi akışında sonuçlanır.
        break;
      }

      default:
        // İlgilenmediğimiz olaylar sessizce geçilir
        break;
    }

    await supabase.rpc("mark_webhook_processed", {
      p_event_id: event.id,
      p_error: null,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = (err as Error).message;
    console.error("[stripe-webhook]", event.type, message);

    await supabase.rpc("mark_webhook_processed", {
      p_event_id: event.id,
      p_error: message,
    });

    // 500 dönerse Stripe tekrar dener; geçici bir sorunsa kendiliğinden düzelir
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
