"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, useStripe, useElements,
  CardNumberElement, CardExpiryElement, CardCvcElement,
} from "@stripe/react-stripe-js";
import { Alert, Button, Card, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCard, IconBank, IconShield, IconCheck, IconCopy } from "@/components/ui/icons";
import { startRenewal, finalizePaymentNow } from "@/lib/actions/payment";
import type { BankInfoProps } from "@/components/site/bank-details";

/**
 * Kart yenileme — kartın kendi sayfasında.
 *
 * Süresi dolan ya da dolmak üzere olan kartın hemen altında görünür.
 * Kullanıcı başka bir ekrana gitmeden, sipariş numarası aramadan yeniler:
 * yöntemi seçer, bilgileri girer, biter.
 *
 * Yeni kart BASILMAZ — mevcut kartın süresi uzatılır, numara ve QR aynı
 * kalır. Kalan süre varsa kaybolmaz, üzerine eklenir.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

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

export function RenewCard({
  cardId, cardNumber, childName, price, expired, bank, cardEnabled, bankEnabled,
}: {
  cardId: string;
  cardNumber: string;
  childName: string;
  price: string;
  /** Süresi doldu mu — başlık ve renk buna göre değişir */
  expired: boolean;
  bank: BankInfoProps;
  cardEnabled: boolean;
  bankEnabled: boolean;
}) {
  const [method, setMethod] = React.useState<"card" | "bank">(
    cardEnabled ? "card" : "bank");

  if (!cardEnabled && !bankEnabled) {
    return (
      <Card className="p-6">
        <Alert tone="orange">
          Ödeme yöntemleri şu anda kapalı. Kısa süre içinde tekrar deneyin.
        </Alert>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col gap-5 p-6 sm:p-7 ${
      expired ? "border-orange-line" : ""}`}>

      <div className="flex flex-col gap-1.5">
        <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
          {expired ? "Kartın süresi doldu" : "Kartı yenile"}
        </span>
        <span className="text-[13.5px] leading-[1.6] text-muted">
          {expired
            ? `${childName} için kartı yenileyin; etkinliklere katılım hemen devam etsin.`
            : "Şimdi yenilerseniz kalan süreniz kaybolmaz, üzerine eklenir."}
          {" "}Kart numarası ve QR kodu değişmez.
        </span>
      </div>

      {/* Yöntem seçimi */}
      {cardEnabled && bankEnabled && (
        <div className="grid grid-cols-2 gap-3">
          <MethodBox
            icon={IconCard} title="Kart ile öde" note="Anında onay"
            active={method === "card"} onClick={() => setMethod("card")}
          />
          <MethodBox
            icon={IconBank} title="IBAN ile öde" note="Havale / EFT"
            active={method === "bank"} onClick={() => setMethod("bank")}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
        <span className="text-[13.5px] text-muted">Yıllık üyelik</span>
        <span className="font-display text-[20px] font-semibold tracking-[-.02em]">
          {price}
        </span>
      </div>

      {method === "card" && cardEnabled ? (
        <CardFlow cardId={cardId} price={price} />
      ) : (
        <BankFlow cardId={cardId} cardNumber={cardNumber} bank={bank} />
      )}
    </Card>
  );
}

/* ── Kart ile ödeme ── */
function CardFlow({ cardId, price }: { cardId: string; price: string }) {
  if (!stripePromise) {
    return <Alert tone="orange">Kart ile ödeme şu anda kullanılamıyor.</Alert>;
  }

  return (
    <Elements stripe={stripePromise} options={{ locale: "tr" }}>
      <CardFields cardId={cardId} price={price} />
    </Elements>
  );
}

function CardFields({ cardId, price }: { cardId: string; price: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [holder, setHolder] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [focused, setFocused] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const setFieldError = (f: string, m: string | undefined) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (m) next[f] = m; else delete next[f];
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

    setBusy(true);
    setMessage(null);

    // 1) Yenileme siparişi + ödeme niyeti
    const prep = await startRenewal({ cardId, method: "card" });

    if (!prep.ok || !prep.clientSecret) {
      setMessage(prep.ok
        ? "Ödeme hazırlanamadı. Lütfen birazdan tekrar deneyin."
        : prep.message);
      setBusy(false);
      return;
    }

    // 2) Kart onayı (gerekirse 3D Secure)
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      prep.clientSecret,
      { payment_method: { card: numberEl, billing_details: { name: holder.trim() } } },
    );

    if (error) {
      setMessage(
        error.type === "card_error" || error.type === "validation_error"
          ? (error.message ?? "Kart bilgileri doğrulanamadı.")
          : "Ödeme tamamlanamadı. Lütfen tekrar deneyin.",
      );
      setBusy(false);
      return;
    }

    // 3) Kartın süresini hemen uzat
    if (paymentIntent?.status === "succeeded") {
      await finalizePaymentNow(prep.orderId, paymentIntent.id);
      router.push(`/panel/odeme-basarili?siparis=${prep.orderNumber}`);
      return;
    }

    if (paymentIntent?.status === "processing") {
      router.push(`/panel/odeme-basarili?siparis=${prep.orderNumber}`);
      return;
    }

    setMessage("Ödeme tamamlanamadı. Lütfen tekrar deneyin.");
    setBusy(false);
  };

  const box = (n: string) =>
    `flex h-[52px] items-center rounded-[14px] border bg-field px-4 transition-colors ${
      errors[n] ? "border-danger" : focused === n ? "border-accent" : "border-line"
    }`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="renewHolder" className="text-[13px] font-semibold text-ink2">
          Kart üzerindeki ad soyad
        </label>
        <Input id="renewHolder" value={holder}
          onChange={(e) => {
            setHolder(e.target.value);
            if (e.target.value.trim().length >= 3) setFieldError("holder", undefined);
          }}
          placeholder="AD SOYAD" autoComplete="cc-name" maxLength={80}
          className="uppercase" />
        {errors.holder && (
          <span className="text-[12.5px] font-medium text-danger">{errors.holder}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-ink2">Kart numarası</label>
        <div className={box("number")}>
          <span className="w-full">
            <CardNumberElement
              options={{ style: elementStyle, placeholder: "0000 0000 0000 0000",
                disableLink: true }}
              onFocus={() => setFocused("number")}
              onBlur={() => setFocused(null)}
              onChange={(e) => setFieldError("number", e.error?.message)} />
          </span>
          <Icon icon={IconCard} size={17} className="ml-3 shrink-0 text-muted2" />
        </div>
        {errors.number && (
          <span className="text-[12.5px] font-medium text-danger">{errors.number}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-ink2">Son kullanma</label>
          <div className={box("expiry")}>
            <span className="w-full">
              <CardExpiryElement
                options={{ style: elementStyle, placeholder: "AA / YY" }}
                onFocus={() => setFocused("expiry")}
                onBlur={() => setFocused(null)}
                onChange={(e) => setFieldError("expiry", e.error?.message)} />
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
                onChange={(e) => setFieldError("cvc", e.error?.message)} />
            </span>
          </div>
          {errors.cvc && (
            <span className="text-[12.5px] font-medium text-danger">{errors.cvc}</span>
          )}
        </div>
      </div>

      {message && <Alert tone="danger">{message}</Alert>}

      <Button type="submit" size="lg" loading={busy} disabled={!stripe}
        className="w-full">
        <Icon icon={IconCard} size={17} /> {price} öde ve yenile
      </Button>

      <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
        <Icon icon={IconShield} size={15} className="mt-[2px] shrink-0 text-muted" />
        <span className="text-[12.5px] leading-[1.5] text-muted">
          Kart bilgileriniz şifrelenerek doğrudan bankaya iletilir,
          sunucularımıza kaydedilmez.
        </span>
      </div>
    </form>
  );
}

/* ── Havale ── */
function BankFlow({
  cardId, cardNumber, bank,
}: { cardId: string; cardNumber: string; bank: BankInfoProps }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* pano erişimi yoksa sessizce geç */ }
  };

  const createOrder = async () => {
    setBusy(true);
    setMessage(null);

    const res = await startRenewal({ cardId, method: "bank" });

    if (!res.ok) {
      setMessage(res.message);
      setBusy(false);
      return;
    }

    // Dekont yüklemek için sipariş sayfasına
    router.push(`/panel/siparislerim/${res.orderNumber}`);
  };

  if (!bank.iban) {
    return (
      <Alert tone="orange">
        Havale bilgileri henüz tanımlanmamış. Kart ile ödeyebilirsiniz.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[14px] bg-field px-4 py-4">
        <Line label="Banka" value={bank.name} />
        <Line label="Alıcı" value={bank.holder} />

        <div className="flex flex-col gap-1.5 border-t border-line2 pt-3">
          <span className="text-[11.5px] font-bold tracking-[.1em] text-muted2">
            IBAN
          </span>
          <button type="button"
            onClick={() => copy(bank.iban.replace(/\s/g, ""), "iban")}
            className="inline-flex items-center gap-2 self-start font-mono text-[15px] font-semibold">
            {bank.iban}
            <Icon icon={copied === "iban" ? IconCheck : IconCopy} size={15}
              className="text-muted" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-line2 pt-3">
          <span className="text-[11.5px] font-bold tracking-[.1em] text-muted2">
            AÇIKLAMA
          </span>
          <span className="font-mono text-[13.5px] font-semibold">
            {cardNumber} yenileme
          </span>
        </div>
      </div>

      {message && <Alert tone="danger">{message}</Alert>}

      <p className="text-[13px] leading-[1.6] text-muted">
        Siparişi oluşturduktan sonra dekontunuzu yükleyin; ekibimiz genellikle
        1 iş günü içinde onaylar.
      </p>

      <Button size="lg" loading={busy} onClick={() => void createOrder()}
        className="w-full">
        <Icon icon={IconBank} size={17} /> Yenileme siparişi oluştur
      </Button>
    </div>
  );
}

function MethodBox({
  icon, title, note, active, onClick,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  title: string; note: string; active: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex flex-col items-start gap-1 rounded-[16px] border-2 p-4 text-left transition-all ${
        active ? "border-accent bg-accent-soft"
               : "border-line bg-surface hover:border-accent-line"
      }`}>
      <span className="flex items-center gap-2">
        <Icon icon={icon} size={17} className={active ? "" : "text-muted"} />
        <span className="text-[14px] font-semibold">{title}</span>
      </span>
      <span className="text-[12px] text-muted">{note}</span>
    </button>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-right text-[13.5px] font-semibold">{value}</span>
    </div>
  );
}
