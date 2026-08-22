"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, useStripe, useElements,
  CardNumberElement, CardExpiryElement, CardCvcElement,
} from "@stripe/react-stripe-js";
import { Alert, Button, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCard, IconShield, IconTicket } from "@/components/ui/icons";
import { createPaymentIntent, finalizePaymentNow } from "@/lib/actions/payment";

/**
 * Kart ile ödeme formu — kendi alanlarımız.
 *
 * Stripe'ın hazır ödeme bloğu kullanılmaz. Kart numarası, son kullanma ve CVC
 * ayrı ayrı yerleştirilir; etiketler, kutular, hata metinleri ve dizilim
 * bizim tasarımımızdır. Formda yalnızca dört alan vardır:
 * ad soyad, kart numarası, son kullanma, CVC.
 *
 * Kart alanlarının İÇİ Stripe'ın güvenli çerçevesidir. Bu bilinçli bir
 * tercihtir: ham kart numarasını kendi sunucumuza almak PCI DSS kapsamını
 * en ağır seviyeye (yıllık denetim, sızma testi, ağ ayrıştırma) çıkarır.
 * Kullanıcı açısından fark yoktur — alanlar bizim formumuzun parçasıdır.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/** Kart alanlarının iç görünümü — sitenin yazı tipi ve renkleriyle */
const elementStyle = {
  base: {
    fontSize: "15px",
    color: "#0f1f1a",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSmoothing: "antialiased",
    "::placeholder": { color: "#8a9790" },
  },
  invalid: { color: "#b3261e", iconColor: "#b3261e" },
};

export function CardPaymentForm({
  orderId, orderNumber, amount,
}: { orderId: string; orderNumber: string; amount: string }) {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    void (async () => {
      const res = await createPaymentIntent(orderId);
      if (!alive) return;

      if (res.ok) setClientSecret(res.clientSecret);
      else setError(res.message);

      setLoading(false);
    })();

    return () => { alive = false; };
  }, [orderId]);

  if (!publishableKey || !stripePromise) {
    return (
      <Alert tone="orange">
        Kart ile ödeme şu anda kullanılamıyor. Havale ile ödeyebilirsiniz.
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <span className="h-[52px] w-full animate-pulse rounded-[14px] bg-field" />
        <span className="h-[52px] w-full animate-pulse rounded-[14px] bg-field" />
        <div className="grid grid-cols-2 gap-3">
          <span className="h-[52px] animate-pulse rounded-[14px] bg-field" />
          <span className="h-[52px] animate-pulse rounded-[14px] bg-field" />
        </div>
      </div>
    );
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        locale: "tr",
      }}
    >
      <Form clientSecret={clientSecret} orderId={orderId}
        orderNumber={orderNumber} amount={amount} />
    </Elements>
  );
}

function Form({
  clientSecret, orderId, orderNumber, amount,
}: { clientSecret: string; orderId: string; orderNumber: string; amount: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [holder, setHolder] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  // Her alanın kendi hatası, kendi kutusunun altında gösterilir
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [focused, setFocused] = React.useState<string | null>(null);

  const setFieldError = (field: string, msg: string | undefined) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (holder.trim().length < 3) {
      setFieldError("holder", "Kart üzerindeki adı yazın");
      return;
    }

    const numberEl = elements.getElement(CardNumberElement);
    if (!numberEl) return;

    setSubmitting(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: numberEl,
        billing_details: { name: holder.trim() },
      },
    });

    if (error) {
      setMessage(
        error.type === "card_error" || error.type === "validation_error"
          ? (error.message ?? "Kart bilgileri doğrulanamadı.")
          : "Ödeme tamamlanamadı. Lütfen tekrar deneyin.",
      );
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      /* Kartı HEMEN oluştur: webhook'u veya sayfa geçişini bekleme.
         Bu çağrı başarısız olsa bile dönüş sayfası ve webhook aynı işi
         yeniden dener; ikinci kez işlenmez. */
      await finalizePaymentNow(orderId, paymentIntent.id);
      router.push(`/panel/odeme-basarili?siparis=${orderNumber}`);
      return;
    }

    if (paymentIntent?.status === "processing") {
      setMessage("Ödemeniz işleniyor. Sonuç birkaç saniye içinde belli olacak.");
      setSubmitting(false);
      return;
    }

    setMessage("Ödeme tamamlanamadı. Lütfen tekrar deneyin.");
    setSubmitting(false);
  };

  /** Kart alanı kutusu — kendi Input'umuzla aynı görünür */
  const box = (name: string) =>
    `flex h-[52px] items-center rounded-[14px] border bg-field px-4 transition-colors ${
      errors[name] ? "border-danger"
        : focused === name ? "border-accent" : "border-line"
    }`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Ad soyad — tamamen bizim alanımız */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cardHolder" className="text-[13px] font-semibold text-ink2">
          Kart üzerindeki ad soyad
        </label>
        <Input
          id="cardHolder"
          value={holder}
          onChange={(e) => {
            setHolder(e.target.value);
            if (e.target.value.trim().length >= 3) setFieldError("holder", undefined);
          }}
          placeholder="AD SOYAD"
          autoComplete="cc-name"
          maxLength={80}
          className="uppercase"
        />
        {errors.holder && (
          <span className="text-[12.5px] font-medium text-danger">{errors.holder}</span>
        )}
      </div>

      {/* Kart numarası */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-ink2">Kart numarası</label>
        <div className={box("number")}>
          <span className="w-full">
            <CardNumberElement
              options={{
                style: elementStyle,
                placeholder: "0000 0000 0000 0000",
                disableLink: true,
              }}
              onFocus={() => setFocused("number")}
              onBlur={() => setFocused(null)}
              onChange={(e) => setFieldError("number", e.error?.message)}
            />
          </span>
          <Icon icon={IconCard} size={17} className="ml-3 shrink-0 text-muted2" />
        </div>
        {errors.number && (
          <span className="text-[12.5px] font-medium text-danger">{errors.number}</span>
        )}
      </div>

      {/* Son kullanma + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-ink2">Son kullanma</label>
          <div className={box("expiry")}>
            <span className="w-full">
              <CardExpiryElement
                options={{ style: elementStyle, placeholder: "AA / YY" }}
                onFocus={() => setFocused("expiry")}
                onBlur={() => setFocused(null)}
                onChange={(e) => setFieldError("expiry", e.error?.message)}
              />
            </span>
          </div>
          {errors.expiry && (
            <span className="text-[12.5px] font-medium text-danger">{errors.expiry}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-ink2">CVC</label>
          <div className={box("cvc")}>
            <span className="w-full">
              <CardCvcElement
                options={{ style: elementStyle, placeholder: "000" }}
                onFocus={() => setFocused("cvc")}
                onBlur={() => setFocused(null)}
                onChange={(e) => setFieldError("cvc", e.error?.message)}
              />
            </span>
          </div>
          {errors.cvc && (
            <span className="text-[12.5px] font-medium text-danger">{errors.cvc}</span>
          )}
        </div>
      </div>

      {message && <Alert tone="danger">{message}</Alert>}

      <Button type="submit" size="lg" loading={submitting}
        disabled={!stripe || !elements} className="w-full">
        <Icon icon={submitting ? IconTicket : IconCard} size={17} />
        {amount} öde
      </Button>

      <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
        <Icon icon={IconShield} size={15} className="mt-[2px] shrink-0 text-muted" />
        <span className="text-[12.5px] leading-[1.5] text-muted">
          Kart bilgileriniz şifrelenerek doğrudan bankaya iletilir,
          sunucularımıza kaydedilmez. Gerekirse bankanız 3D Secure ister.
        </span>
      </div>
    </form>
  );
}
