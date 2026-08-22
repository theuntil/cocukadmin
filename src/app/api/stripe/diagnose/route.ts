import { NextResponse } from "next/server";
import { stripe, stripeConfigured, stripeTestMode } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Ödeme sistemi teşhisi.
 *
 * Zincirin her halkasını tek tek dener ve nerede koptuğunu bildirir:
 * ortam değişkenleri, Stripe bağlantısı, servis anahtarı, veritabanı
 * fonksiyonları ve takılı siparişler.
 *
 * Gizli anahtarla korunur; değerlerin kendisi ASLA döndürülmez, yalnızca
 * "var / yok" ve ilk birkaç karakter gösterilir.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.PAYMENT_RECONCILE_SECRET;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";

  if (!SECRET) {
    return NextResponse.json(
      { error: "PAYMENT_RECONCILE_SECRET tanımlı değil" }, { status: 503 });
  }
  if (key !== SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report: Record<string, unknown> = {};

  /* 1 — Ortam değişkenleri */
  const mask = (v: string | undefined) =>
    v ? `${v.slice(0, 8)}… (${v.length} karakter)` : "TANIMLI DEĞİL";

  report.ortam = {
    STRIPE_SECRET_KEY: mask(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: mask(process.env.STRIPE_WEBHOOK_SECRET),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      mask(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "TANIMLI DEĞİL",
    mod: stripeTestMode ? "TEST" : "CANLI",
  };

  /* 2 — Stripe bağlantısı */
  if (!stripeConfigured || !stripe) {
    report.stripe = "YAPILANDIRILMAMIŞ";
  } else {
    try {
      const list = await stripe.paymentIntents.list({ limit: 3 });
      report.stripe = {
        baglanti: "OK",
        son_odemeler: list.data.map((p) => ({
          id: p.id,
          durum: p.status,
          tutar: p.amount / 100,
          siparis: p.metadata?.order_number ?? null,
        })),
      };
    } catch (err) {
      report.stripe = { baglanti: "HATA", mesaj: (err as Error).message };
    }
  }

  /* 3 — Servis anahtarı ve veritabanı fonksiyonları */
  try {
    const service = createServiceClient();

    // Basit okuma: anahtar geçerli mi
    const { error: readErr } = await service
      .from("orders").select("id").limit(1);

    report.veritabani_okuma = readErr
      ? { durum: "HATA", mesaj: readErr.message }
      : "OK";

    // Kritik fonksiyon API üzerinden bulunabiliyor mu
    const { error: fnErr } = await service.rpc("force_complete_order", {
      p_order_ref: "00000000-0000-0000-0000-000000000000",
      p_payment_intent: null,
      p_amount: null,
    });

    if (!fnErr) {
      report.force_complete_order = "OK (beklenmedik: sipariş bulunmamalıydı)";
    } else if (/Could not find the function|PGRST202|schema cache/i.test(fnErr.message)) {
      report.force_complete_order = {
        durum: "BULUNAMADI",
        mesaj: fnErr.message,
        cozum: "Supabase SQL Editor'de çalıştırın: notify pgrst, 'reload schema';",
      };
    } else if (/Sipariş bulunamadı|no_data_found/i.test(fnErr.message)) {
      report.force_complete_order = "OK (fonksiyon çalışıyor)";
    } else if (/yalnızca sunucu|insufficient_privilege/i.test(fnErr.message)) {
      report.force_complete_order = {
        durum: "YETKİ REDDİ",
        mesaj: fnErr.message,
        cozum: "SUPABASE_SERVICE_ROLE_KEY yanlış veya eski olabilir.",
      };
    } else {
      report.force_complete_order = { durum: "HATA", mesaj: fnErr.message };
    }
  } catch (err) {
    report.veritabani_okuma = { durum: "HATA", mesaj: (err as Error).message };
  }

  /* 4 — Takılı siparişler ve webhook geçmişi */
  try {
    const service = createServiceClient();

    const { data: stuck } = await service
      .from("payment_sessions")
      .select("session_id, payment_intent, status, amount, created_at, order_id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10);

    report.takili_odemeler = stuck ?? [];

    const { data: hooks } = await service
      .from("webhook_events")
      .select("event_type, processed_at, error, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    report.son_webhookler = hooks ?? [];

    if ((hooks ?? []).length === 0) {
      report.webhook_uyarisi =
        "Hiç webhook kaydı yok. Stripe → Developers → Webhooks bölümünde "
        + "https://www.cocuktribunu.org/api/stripe/webhook adresi tanımlı mı ve "
        + "payment_intent.succeeded olayı seçili mi kontrol edin.";
    }
  } catch (err) {
    report.takili_odemeler = { durum: "HATA", mesaj: (err as Error).message };
  }

  return NextResponse.json(report, {
    headers: { "cache-control": "no-store" },
  });
}
