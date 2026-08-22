import "server-only";
import type { PaymentProvider } from "./provider";
import { stripeProvider } from "./stripe-provider";

/**
 * AKTİF ÖDEME SAĞLAYICISI
 * ═══════════════════════
 *
 * Sağlayıcı değiştirmek için TEK YAPILACAK ŞEY:
 *
 *   1. Yeni uygulamayı yazın:   src/lib/payment/iyzico-provider.ts
 *   2. Aşağıya import edin ve listeye ekleyin
 *   3. Ortam değişkenini ayarlayın:  PAYMENT_PROVIDER=iyzico
 *
 * Başka hiçbir dosya değişmez.
 *
 * Örnek (iyzico hazır olduğunda):
 *
 *   import { iyzicoProvider } from "./iyzico-provider";
 *
 *   const PROVIDERS: Record<string, PaymentProvider> = {
 *     stripe: stripeProvider,
 *     iyzico: iyzicoProvider,
 *   };
 */

const PROVIDERS: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
  // iyzico: iyzicoProvider,   ← geçişte bu satır açılır
  // paytr:  paytrProvider,
};

const SELECTED = (process.env.PAYMENT_PROVIDER ?? "stripe").toLowerCase();

/**
 * Aktif sağlayıcı.
 *
 * Tanımsız bir ad verilirse Stripe'a düşer ve uyarı yazılır — ödeme
 * sessizce kapanmaz.
 */
export const paymentProvider: PaymentProvider = (() => {
  const found = PROVIDERS[SELECTED];

  if (!found) {
    console.warn(
      `[payment] Bilinmeyen sağlayıcı "${SELECTED}". Stripe kullanılıyor. `
      + `Seçenekler: ${Object.keys(PROVIDERS).join(", ")}`,
    );
    return stripeProvider;
  }

  return found;
})();

export type {
  PaymentProvider, CreatePaymentInput, CreatePaymentResult,
  PaymentStatusResult, RefundInput, RefundResult,
} from "./provider";
