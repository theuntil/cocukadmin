import "server-only";
import { stripe, stripeConfigured, stripeTestMode, toMinorUnit } from "@/lib/stripe";
import type {
  PaymentProvider, CreatePaymentInput, CreatePaymentResult,
  PaymentStatusResult, RefundInput, RefundResult,
} from "./provider";

/**
 * Stripe uygulaması.
 *
 * Başka sağlayıcıya geçildiğinde bu dosyaya dokunulmaz; yalnızca
 * index.ts içindeki seçim değişir. Dosya yerinde kalır, geri dönmek
 * gerekirse tek satırla eski hâline dönülür.
 */
export const stripeProvider: PaymentProvider = {
  name: "stripe",
  configured: stripeConfigured,
  testMode: stripeTestMode,

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!stripe) return { ok: false, message: "Stripe yapılandırılmamış." };

    try {
      const intent = await stripe.paymentIntents.create({
        // Stripe kuruş bekler. iyzico'da bu dönüşüm YAPILMAZ.
        amount: toMinorUnit(input.amount),
        currency: (input.currency || "TRY").toLowerCase(),
        description: input.description,
        statement_descriptor_suffix: "KOMBINE",
        metadata: {
          order_id: input.orderId,
          order_number: input.orderNumber,
        },
        payment_method_types: ["card"],
      });

      return {
        ok: true,
        reference: intent.id,
        clientSecret: intent.client_secret ?? undefined,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },

  async getStatus(reference: string): Promise<PaymentStatusResult> {
    if (!stripe) return { status: "not_configured", succeeded: false, amount: null };

    const intent = await stripe.paymentIntents.retrieve(reference);

    return {
      status: intent.status,
      succeeded: intent.status === "succeeded",
      amount: intent.amount_received !== null ? intent.amount_received / 100 : null,
      orderRef: intent.metadata?.order_id ?? null,
    };
  },

  async verifyCallback({ rawBody, headers }) {
    if (!stripe) return { ok: false, message: "Stripe yapılandırılmamış." };

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = headers["stripe-signature"];

    if (!secret || !signature) {
      return { ok: false, message: "İmza veya anahtar eksik." };
    }

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

      const obj = event.data.object as {
        id: string;
        amount_received?: number | null;
        metadata?: Record<string, string>;
      };

      return {
        ok: true,
        eventId: event.id,
        eventType: event.type,
        reference: obj.id,
        orderRef: obj.metadata?.order_id ?? null,
        succeeded: event.type === "payment_intent.succeeded",
        amount: obj.amount_received != null ? obj.amount_received / 100 : null,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!stripe) return { ok: false, message: "Stripe yapılandırılmamış." };

    try {
      const refund = await stripe.refunds.create({
        payment_intent: input.reference,
        amount: toMinorUnit(input.amount),
        reason: "requested_by_customer",
      });

      return { ok: true, refundId: refund.id };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },
};
