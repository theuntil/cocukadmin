"use client";

import * as React from "react";
import { Alert, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCard, IconBank } from "@/components/ui/icons";
import { CardPaymentForm } from "@/components/panel/card-payment-form";
import { BankDetails, type BankInfoProps } from "@/components/site/bank-details";
import { ReceiptUpload } from "@/components/site/receipt-upload";

/**
 * Ödeme bölümü.
 *
 * İki yöntem sekme olarak sunulur; seçilen yöntemin alanları hemen altında
 * açılır. Kullanıcı başvuruda hangisini seçtiyse o açık gelir, ama diğerine
 * de geçebilir — fikrini değiştirince baştan başvurmak zorunda kalmaz.
 */
export function PaymentSection({
  orderId, orderNumber, amount, paymentId, preferred, reviewing, bank,
  cardEnabled = true,
}: {
  orderId: string;
  orderNumber: string;
  amount: string;
  paymentId: string | null;
  preferred: "card" | "bank";
  reviewing: boolean;
  bank: BankInfoProps;
  /** Kart ile ödeme yönetim panelinden kapatılabilir */
  cardEnabled?: boolean;
}) {
  // Dekont incelemedeyse havale sekmesi açık gelir
  const [tab, setTab] = React.useState<"card" | "bank">(
    reviewing || !cardEnabled ? "bank" : preferred);

  // IBAN tanımlı değilse havale sekmesi gösterilmez: kullanıcı boş
  // bilgilerle karşılaşmasın
  const bankAvailable = Boolean(bank.iban);

  const tabs = [
    ...(cardEnabled
      ? [{ id: "card" as const, label: "Kart ile öde", icon: IconCard, note: "Anında onay" }]
      : []),
    ...(bankAvailable
      ? [{ id: "bank" as const, label: "IBAN ile öde", icon: IconBank, note: "Havale / EFT" }]
      : []),
  ];

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      {tabs.length > 1 && (
      <div className="grid grid-cols-2 gap-3">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={`flex flex-col items-start gap-1 rounded-[16px] border-2 p-4 text-left transition-all ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-accent-line"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon icon={t.icon} size={17} className={active ? "" : "text-muted"} />
                <span className="text-[14px] font-semibold">{t.label}</span>
              </span>
              <span className="text-[12px] text-muted">{t.note}</span>
            </button>
          );
        })}
      </div>
      )}

      {!cardEnabled && !bankAvailable ? (
        <Alert tone="orange">
          Şu anda hiçbir ödeme yöntemi açık değil. Kısa süre içinde tekrar
          deneyin veya bizimle iletişime geçin.
        </Alert>
      ) : !cardEnabled ? (
        <div className="flex flex-col gap-4">
          <Alert tone="orange">
            Kart ile ödeme şu anda aktif değil. Aşağıdaki bilgilerle havale
            yapabilirsiniz.
          </Alert>
          <BankDetails reference={orderNumber} amount={amount} bank={bank} />
          {paymentId && <ReceiptUpload paymentId={paymentId} disabled={reviewing} />}
        </div>
      ) : tab === "card" || !bankAvailable ? (
        <CardPaymentForm orderId={orderId} orderNumber={orderNumber} amount={amount} />
      ) : (
        <div className="flex flex-col gap-4">
          <BankDetails reference={orderNumber} amount={amount} bank={bank} />
          {paymentId && <ReceiptUpload paymentId={paymentId} disabled={reviewing} />}
        </div>
      )}
    </Card>
  );
}
