import "server-only";

/**
 * ÖDEME SAĞLAYICI ARAYÜZÜ
 * ═══════════════════════
 *
 * Sistem tek bir sağlayıcıya bağlı değildir. Ödeme akışının ihtiyaç duyduğu
 * her şey bu arayüzde tanımlıdır; Stripe, iyzico veya PayTR bunu uygular.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BAŞKA SAĞLAYICIYA GEÇERKEN NE YAPILIR
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  1. Bu klasöre yeni bir dosya eklenir:  src/lib/payment/iyzico.ts
 *     İçinde PaymentProvider arayüzünü uygulayan bir nesne dışa aktarılır.
 *
 *  2. src/lib/payment/index.ts içindeki seçim değiştirilir:
 *        PAYMENT_PROVIDER=iyzico   (ortam değişkeni)
 *
 *  3. Başka HİÇBİR dosyaya dokunulmaz. Arayüzler, sunucu eylemleri,
 *     veritabanı fonksiyonları ve ekranlar aynı kalır.
 *
 *  Veritabanı tarafı zaten sağlayıcıdan bağımsızdır:
 *    · payments.payment_provider   → 'stripe' | 'iyzico' | 'paytr'
 *    · payment_sessions.session_id → sağlayıcının işlem kimliği
 *    · force_complete_order()      → sağlayıcı ne olursa olsun aynı
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  İYZİCO İÇİN NOTLAR (geçiş anında bunlara bakılacak)
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  · iyzico'da "PaymentIntent" karşılığı CheckoutForm veya 3DS başlatmadır.
 *    createPayment() bir token/HTML döndürür; clientSecret alanı bu token'ı
 *    taşır ve arayüz onu kullanır.
 *
 *  · iyzico kart bilgisini KENDİ sunucunuzdan alabilir (Non-3DS/3DS API).
 *    Bu durumda kart alanları gerçekten kendi input'larımız olur. PCI
 *    yükümlülüğü artar; iyzico'nun sunduğu "iyzico Checkout Form" ile
 *    çalışmak daha güvenlidir ve kart verisi bize hiç uğramaz.
 *
 *  · iyzico geri bildirimi webhook yerine callbackUrl ile gelir:
 *      /api/payment/callback → token doğrulanır → force_complete_order
 *    Bu uç zaten hazırdır; yalnızca sağlayıcı doğrulaması değişir.
 *
 *  · iyzico tutarları KURUŞ DEĞİL, ondalıklı TL bekler ("30.00").
 *    toMinorUnit() çağrısı iyzico uygulamasında kullanılmaz.
 *
 *  · İade: iyzico'da refund için paymentTransactionId gerekir.
 *    payments.provider_transaction_id bu amaçla zaten mevcut.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PAYTR İÇİN NOTLAR
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  · PayTR iframe token üretir; clientSecret bu token olur, arayüz iframe
 *    gösterir. Kart alanları PayTR tarafındadır.
 *  · Bildirim POST ile bildirim URL'sine gelir ve "OK" yanıtı beklenir;
 *    aksi hâlde PayTR tekrar dener. verifyCallback() bunu döndürür.
 *  · Tutar kuruş cinsindendir (Stripe gibi), toMinorUnit kullanılabilir.
 */

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  /** Sunucudan okunan tutar — istemciden ASLA alınmaz */
  amount: number;
  currency: string;
  description: string;
  /** Kullanıcıya ait bilgiler (sağlayıcı fatura/risk için isteyebilir) */
  buyer?: {
    name?: string | null;
    email?: string | null;
    ip?: string | null;
  };
}

export interface CreatePaymentResult {
  ok: boolean;
  /** Sağlayıcının işlem kimliği (Stripe: pi_..., iyzico: token) */
  reference?: string;
  /** İstemcinin ödemeyi tamamlamak için kullanacağı sır/token */
  clientSecret?: string;
  /** Barındırılan sayfaya yönlendirme gerekiyorsa adres */
  redirectUrl?: string;
  message?: string;
}

export interface PaymentStatusResult {
  /** Sağlayıcının ham durumu */
  status: string;
  /** Para gerçekten alındı mı */
  succeeded: boolean;
  /** Alınan tutar (TL cinsinden) */
  amount: number | null;
  /** Bu işlem hangi siparişe ait */
  orderRef?: string | null;
}

export interface RefundInput {
  /** Ödeme kimliği (Stripe: payment_intent, iyzico: paymentTransactionId) */
  reference: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  message?: string;
}

/**
 * Ödeme sağlayıcısı.
 *
 * Yeni bir sağlayıcı eklerken bu arayüzün tamamı uygulanmalıdır. Eksik
 * bırakılan bir yöntem, ilgili akışın sessizce çalışmaması demektir.
 */
export interface PaymentProvider {
  /** Sağlayıcı adı — veritabanına bu değer yazılır */
  readonly name: "stripe" | "iyzico" | "paytr";

  /** Yapılandırma tamam mı (anahtarlar tanımlı mı) */
  readonly configured: boolean;

  /** Test ortamında mı çalışıyor */
  readonly testMode: boolean;

  /** Ödeme başlatır */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /** Ödemenin gerçek durumunu sağlayıcıya sorar */
  getStatus(reference: string): Promise<PaymentStatusResult>;

  /**
   * Sağlayıcıdan gelen bildirimi doğrular.
   *
   * Stripe: imza doğrulaması (constructEvent)
   * iyzico: token ile retrieve
   * PayTR: hash doğrulaması
   */
  verifyCallback(input: {
    rawBody: string;
    headers: Record<string, string>;
  }): Promise<{
    ok: boolean;
    eventId?: string;
    eventType?: string;
    reference?: string;
    orderRef?: string | null;
    succeeded?: boolean;
    amount?: number | null;
    message?: string;
  }>;

  /** İade yapar */
  refund(input: RefundInput): Promise<RefundResult>;
}
