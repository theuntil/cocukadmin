import "server-only";
import Stripe from "stripe";

/**
 * Stripe istemcisi.
 *
 * Gizli anahtar YALNIZCA sunucuda okunur. Anahtar tanımlı değilse istemci
 * oluşturulmaz ve ödeme akışı kapalı kabul edilir — yanlış yapılandırmayla
 * canlıya çıkıp ödeme alamamak yerine, sistem bunu açıkça bildirir.
 */

const SECRET = process.env.STRIPE_SECRET_KEY;

export const stripeConfigured = Boolean(SECRET);

export const stripe = SECRET
  ? new Stripe(SECRET, {
      // SDK'nın kendi varsayılan sürümü kullanılır: sabit bir sürüm yazmak
      // SDK yükseltmesinde tip hatasına yol açıyor.
      appInfo: { name: "Cocuk Tribunu", url: "https://cocuktribunu.org" },
    })
  : null;

/** Test anahtarıyla mı çalışıyoruz? Panelde uyarı göstermek için. */
export const stripeTestMode = (SECRET ?? "").startsWith("sk_test_");

/**
 * Stripe tutarları en küçük para biriminde ister (kuruş).
 * 190.00 TRY → 19000
 */
export function toMinorUnit(amount: number): number {
  return Math.round(amount * 100);
}

/** Kuruştan liraya */
export function fromMinorUnit(amount: number): number {
  return amount / 100;
}
