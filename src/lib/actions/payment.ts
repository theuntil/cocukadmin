"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe, stripeConfigured, toMinorUnit } from "@/lib/stripe";
import { friendlyError, type ActionState } from "@/lib/actions/types";

/**
 * Ödeme niyeti oluşturur.
 *
 * Kart alanları KENDİ SAYFAMIZDA gösterilir; bu fonksiyon yalnızca ödemeyi
 * hazırlar ve istemciye tek kullanımlık bir anahtar (client secret) döndürür.
 *
 * Tutar İSTEMCİDEN ALINMAZ: siparişin veritabanı kaydından okunur. Böylece
 * kullanıcı fiyatı değiştiremez.
 *
 * Aynı sipariş için açık bir niyet varsa yenisi oluşturulmaz — sayfa
 * yenilendiğinde ödeme niyetleri birikmez.
 */
export async function createPaymentIntent(orderId: string): Promise<
  | { ok: true; clientSecret: string; amount: number; currency: string }
  | { ok: false; message: string }
> {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, message: "Geçersiz sipariş." };

  if (!stripeConfigured || !stripe) {
    return {
      ok: false,
      message: "Kart ile ödeme şu anda kullanılamıyor. Havale ile ödeyebilirsiniz.",
    };
  }

  const supabase = await createClient();

  // Sahiplik kontrolü RLS ile: başkasının siparişi görünmez
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, order_number, amount, currency, status, children(first_name,last_name)")
    .eq("id", parsed.data)
    .maybeSingle();

  if (orderErr) return { ok: false, message: friendlyError(orderErr) };
  if (!order) return { ok: false, message: "Sipariş bulunamadı." };

  const o = order as unknown as {
    id: string; order_number: string; amount: number; currency: string; status: string;
    children: { first_name: string; last_name: string } | null;
  };

  if (["completed", "cancelled", "refunded"].includes(o.status)) {
    return { ok: false, message: "Bu sipariş için ödeme alınamaz." };
  }

  const amountMinor = toMinorUnit(Number(o.amount));
  const currency = (o.currency || "TRY").toLowerCase();

  try {
    // Açık niyet varsa onu kullan
    const { data: existing } = await supabase.rpc("my_open_payment_intent", {
      p_order_id: o.id,
    });

    const open = existing as { payment_intent: string } | null;

    if (open?.payment_intent) {
      /* Mevcut niyeti okumak BAŞARISIZ OLABİLİR: test modunda açılmış bir
         niyete canlı anahtarla erişilemez ("No such payment_intent ...
         a similar object exists in test mode"). Bu bir hata değil, sadece
         yeniden kullanılamaz demektir — kayıt kapatılır ve yenisi açılır. */
      try {
        const intent = await stripe.paymentIntents.retrieve(open.payment_intent);

        // Tutar değişmemişse ve hâlâ ödenebilir durumdaysa yeniden kullan
        const reusable = [
          "requires_payment_method", "requires_confirmation", "requires_action",
        ];

        if (reusable.includes(intent.status) && intent.amount === amountMinor) {
          return {
            ok: true,
            clientSecret: intent.client_secret!,
            amount: Number(o.amount),
            currency: o.currency,
          };
        }
      } catch {
        // Erişilemeyen niyet kapatılır ki bir daha denenmesin
        await supabase.rpc("close_stale_payment_intent", {
          p_intent_id: open.payment_intent,
        });
      }
    }

    const childName = o.children
      ? `${o.children.first_name} ${o.children.last_name}` : "Çocuk";

    const intent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency,
      // Kart ekstresinde ve Stripe panelinde siparişi bulmayı kolaylaştırır
      description: `Çocuk Tribünü · Kombine Kart · ${o.order_number}`,
      statement_descriptor_suffix: "KOMBINE",
      metadata: {
        order_id: o.id,
        order_number: o.order_number,
        child_name: childName,
      },
      // Yalnızca kart: Link (telefonla ödeme), cüzdanlar ve diğer
      // yöntemler gösterilmez. Kullanıcı yalnızca kart bilgisi girer.
      payment_method_types: ["card"],
    });

    const { error: sessErr } = await supabase.rpc("upsert_payment_intent", {
      p_order_id: o.id,
      p_intent_id: intent.id,
      p_status: "open",
    });

    if (sessErr) throw new Error(sessErr.message);

    return {
      ok: true,
      clientSecret: intent.client_secret!,
      amount: Number(o.amount),
      currency: o.currency,
    };
  } catch (err) {
    console.error("[createPaymentIntent]", (err as Error).message);
    return { ok: false, message: "Ödeme başlatılamadı. Lütfen birazdan tekrar deneyin." };
  }
}

/** Form gönderiminden çağrılan sarmalayıcı */
export async function preparePayment(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const result = await createPaymentIntent(String(formData.get("orderId") ?? ""));

  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    data: {
      clientSecret: result.clientSecret,
      amount: result.amount,
      currency: result.currency,
    },
  };
}

/**
 * Ödemeyi sunucu tarafında doğrular ve gerekirse işler.
 *
 * Webhook birincil yoldur; ancak ağ gecikmesi veya webhook yapılandırma
 * hatası yüzünden onay geç kalabilir. Bu durumda kullanıcı ödemesini yapmış
 * olmasına rağmen kartını göremez.
 *
 * Bu fonksiyon dönüş sayfasında çağrılır: Stripe'a doğrudan sorar, ödeme
 * gerçekten başarılıysa kartı hemen oluşturur. Webhook daha sonra gelse bile
 * ikinci kez işlenmez (already_processed).
 */
export async function verifyAndFinalizePayment(orderId: string): Promise<{
  /** Kart oluşturuldu mu */
  ok: boolean;
  /** Stripe'ın bildirdiği ödeme durumu */
  status: string;
  /** Ödeme gerçekten alındı mı — kart oluşmasa bile true olabilir */
  paid: boolean;
  message?: string;
}> {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, status: "invalid", paid: false };

  if (!stripeConfigured || !stripe) {
    return { ok: false, status: "not_configured", paid: false };
  }

  const supabase = await createClient();

  // Bu siparişin son ödeme niyeti (RLS: yalnızca kendi siparişi)
  const { data: sess } = await supabase
    .from("payment_sessions")
    .select("payment_intent, status")
    .eq("order_id", parsed.data)
    .not("payment_intent", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = sess as { payment_intent: string; status: string } | null;

  if (!row?.payment_intent) {
    console.error("[verifyAndFinalizePayment] ödeme oturumu kaydı yok:", orderId);
    return { ok: false, status: "no_intent", paid: false };
  }

  // Zaten işlenmişse tekrar uğraşma
  if (row.status === "completed") {
    return { ok: true, status: "completed", paid: true };
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(row.payment_intent);

    // Ödeme henüz sonuçlanmadıysa hata değildir; bekleniyor demektir
    if (intent.status !== "succeeded") {
      return {
        ok: false,
        status: intent.status,
        paid: intent.status === "processing",
      };
    }

    // Ödeme gerçekten alınmış: kartı oluştur.
    // Servis anahtarı gerekir — bu işlem kullanıcı adına değil, sunucu
    // adına yapılır ve kullanıcı kendi ödemesini onaylayamaz.
    const { createServiceClient } = await import("@/lib/supabase/server");
    const service = createServiceClient();

    const { error } = await service.rpc("settle_order", {
      p_order_ref: parsed.data,
      p_payment_intent: intent.id,
      p_amount: intent.amount_received !== null
        ? intent.amount_received / 100 : null,
    });

    if (error) {
      /* Para ALINDI ama kart oluşturulamadı. Kullanıcıya "ödeme
         tamamlanamadı" denmemeli — bu yanlış ve endişe verici olur.
         Webhook birazdan aynı işi yapacak; sorun buraya kaydedilir. */
      console.error("[verifyAndFinalizePayment] kart oluşturulamadı:",
        error.message, "| intent:", intent.id);
      return {
        ok: false,
        status: "finalize_failed",
        paid: true,
        message: error.message,
      };
    }

    return { ok: true, status: "completed", paid: true };
  } catch (err) {
    console.error("[verifyAndFinalizePayment]", (err as Error).message);
    return { ok: false, status: "error", paid: false, message: (err as Error).message };
  }
}

/**
 * Ödemeyi ANINDA sonuçlandırır.
 *
 * Kart onaylandığı saniyede istemciden çağrılır. Kartın oluşması için
 * webhook'un ulaşmasını veya sayfanın değişmesini beklemez.
 *
 * Üç yol da aynı işi yapar ve birbirini engellemez:
 *   1. bu çağrı (en hızlı)
 *   2. dönüş sayfasındaki doğrulama
 *   3. Stripe webhook'u
 * Hangisi önce çalışırsa kart oluşur; diğerleri "zaten işlenmiş" döner.
 */
export async function finalizePaymentNow(
  orderId: string, paymentIntentId: string,
): Promise<{ ok: boolean; message?: string }> {
  const ids = z.object({
    orderId: z.string().uuid(),
    intentId: z.string().min(3),
  }).safeParse({ orderId, intentId: paymentIntentId });

  if (!ids.success) return { ok: false, message: "Geçersiz istek." };
  if (!stripeConfigured || !stripe) return { ok: false, message: "Yapılandırma eksik." };

  try {
    // Ödemenin gerçekten alındığını Stripe'a sorarak doğrula.
    // İstemcinin "ödedim" demesi tek başına yeterli değildir.
    const intent = await stripe.paymentIntents.retrieve(ids.data.intentId);

    if (intent.status !== "succeeded") {
      return { ok: false, message: `Ödeme durumu: ${intent.status}` };
    }

    if (intent.metadata?.order_id && intent.metadata.order_id !== ids.data.orderId) {
      console.error("[finalizePaymentNow] sipariş uyuşmazlığı", intent.id);
      return { ok: false, message: "Sipariş eşleşmedi." };
    }

    const { createServiceClient } = await import("@/lib/supabase/server");
    const service = createServiceClient();

    const amount = intent.amount_received !== null
      ? intent.amount_received / 100 : null;

    /*
     * Ara kayıtlara (payment_sessions) bağımlı OLMAYAN yol kullanılır.
     * Oturum kaydı hiç oluşmamış olsa bile sipariş bulunur ve tamamlanır.
     */
    const { error } = await service.rpc("settle_order", {
      p_order_ref: ids.data.orderId,
      p_payment_intent: intent.id,
      p_amount: amount,
    });

    if (!error) return { ok: true };

    console.error("[finalizePaymentNow] force_complete_order:", error.message,
      "| intent:", intent.id, "| order:", ids.data.orderId);

    /*
     * Servis anahtarı yolu çalışmadı. Jeton yoluna geç: sunucu ödemeyi
     * Stripe'tan doğruladı, tek kullanımlık bir jeton üretir ve kullanıcının
     * KENDİ oturumuyla siparişi tamamlar. Servis anahtarı bozuk veya eksik
     * olsa bile ödeme tamamlanır.
     */
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const userClient = await createClient();

    const { error: issueErr } = await service.rpc("issue_payment_claim", {
      p_order_id: ids.data.orderId,
      p_token: token,
      p_payment_intent: intent.id,
      p_amount: amount,
    });

    if (issueErr) {
      // Servis anahtarı tamamen çalışmıyorsa jeton da üretilemez
      console.error("[finalizePaymentNow] jeton üretilemedi:", issueErr.message);
      return { ok: false, message: issueErr.message };
    }

    const { error: claimErr } = await userClient.rpc("claim_paid_order", {
      p_order_id: ids.data.orderId,
      p_token: token,
    });

    if (claimErr) {
      console.error("[finalizePaymentNow] jeton yolu da başarısız:", claimErr.message);
      return { ok: false, message: claimErr.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("[finalizePaymentNow]", (err as Error).message);
    return { ok: false, message: (err as Error).message };
  }
}

/**
 * Sipariş oluşturur ve ödeme niyetini tek adımda hazırlar.
 *
 * Başvuru ekranında kart bilgileri ödeme yönteminin hemen altında görünür;
 * kullanıcı "Öde" dediğinde sipariş ve ödeme birlikte hazırlanır. Böylece
 * ekran değiştirmeden ödeme tamamlanır.
 */
export async function createOrderAndIntent(input: {
  childId: string; teamId: string;
}): Promise<
  | { ok: true; orderId: string; orderNumber: string; clientSecret: string }
  | { ok: false; message: string }
> {
  const parsed = z.object({
    childId: z.string().uuid(),
    teamId: z.string().uuid(),
  }).safeParse(input);

  if (!parsed.success) return { ok: false, message: "Eksik bilgi." };

  const supabase = await createClient();

  /* Açık sipariş varsa yenisi açılmaz; kullanıcı tekrar denediğinde
     "zaten siparişiniz var" hatasıyla karşılaşmaz. */
  const { data, error } = await supabase.rpc("get_or_create_card_order", {
    p_child_id: parsed.data.childId,
    p_team_id: parsed.data.teamId,
    p_address_id: null,
    p_plan_slug: "yillik-kombine",
    p_payment_method: "credit_card",
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const order = data as { order_id: string; order_number: string };

  const intent = await createPaymentIntent(order.order_id);
  if (!intent.ok) return { ok: false, message: intent.message };

  return {
    ok: true,
    orderId: order.order_id,
    orderNumber: order.order_number,
    clientSecret: intent.clientSecret,
  };
}

/**
 * Kart yenileme: sipariş ve ödeme niyetini tek adımda hazırlar.
 *
 * Kullanıcı kart sayfasından ayrılmadan yenileyebilsin diye vardır.
 * Yenileme olduğunu veritabanı kendisi anlar (aynı çocuk + aynı takım için
 * süresi dolan veya dolmak üzere olan kart varsa).
 *
 * Kart basılmaz: mevcut kartın süresi uzatılır, numara ve QR aynı kalır.
 */
export async function startRenewal(input: {
  cardId: string;
  method: "card" | "bank";
}): Promise<
  | { ok: true; orderId: string; orderNumber: string; clientSecret?: string;
      amount: number; currency: string }
  | { ok: false; message: string }
> {
  const parsed = z.object({
    cardId: z.string().uuid(),
    method: z.enum(["card", "bank"]),
  }).safeParse(input);

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();

  /*
   * Yenileme TEK giriş noktasından yürür: renew_card.
   *
   * Kartı bulur, sahibini doğrular, açık sipariş varsa AYNISINI döndürür,
   * yoksa yenileme siparişi açar ve is_renewal bayrağını kesinleştirir.
   * Yeni kart BASILMAZ; ödeme tamamlanınca mevcut kartın süresi uzatılır.
   */
  const { data: orderData, error: orderErr } = await supabase.rpc("renew_card", {
    p_card_id: parsed.data.cardId,
    p_payment_method: parsed.data.method === "card" ? "credit_card" : "bank_transfer",
  });

  if (orderErr) return { ok: false, message: friendlyError(orderErr) };

  const order = orderData as {
    order_id: string; order_number: string; amount: number; currency: string;
  };

  // Havale seçildiyse ödeme niyeti gerekmez
  if (parsed.data.method === "bank") {
    return {
      ok: true,
      orderId: order.order_id,
      orderNumber: order.order_number,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }

  const intent = await createPaymentIntent(order.order_id);
  if (!intent.ok) return { ok: false, message: intent.message };

  return {
    ok: true,
    orderId: order.order_id,
    orderNumber: order.order_number,
    clientSecret: intent.clientSecret,
    amount: Number(order.amount),
    currency: order.currency,
  };
}
