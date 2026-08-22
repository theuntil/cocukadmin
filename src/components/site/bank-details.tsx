"use client";

import * as React from "react";
import { Alert, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconBank, IconCopy, IconCheck } from "@/components/ui/icons";


export interface BankInfoProps {
  name: string; holder: string; iban: string;
  branch?: string; swift?: string; note?: string;
}

/**
 * Havale bilgileri.
 *
 * Bilgiler yönetim panelindeki ayarlardan gelir; burada sabit değer yoktur.
 */
export function BankDetails({
  reference, amount, bank,
}: { reference: string; amount: string; bank: BankInfoProps }) {
  const BANK = bank;

  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* pano yoksa yoksay */ }
  };

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      <span className="flex items-center gap-2.5 font-display text-[19px] font-semibold tracking-[-.02em]">
        <Icon icon={IconBank} size={20} className="text-accent-ink" /> Havale / EFT bilgileri
      </span>

      <Alert tone="orange" title="Açıklama alanına mutlaka yazın">
        <button type="button" onClick={() => copy(reference, "ref")}
          className="mt-1.5 inline-flex items-center gap-2 rounded-[10px] bg-white/60 px-3 py-2 font-mono text-[16px] font-bold text-orange-ink">
          {reference}
          <Icon icon={copied === "ref" ? IconCheck : IconCopy} size={16} />
        </button>
        <p className="mt-2 text-[13px]">
          Bu numarayı yazmazsanız ödemenizi siparişinizle eşleştiremeyiz ve onay gecikir.
        </p>
      </Alert>

      <div className="flex flex-col gap-4 rounded-[16px] bg-field p-5">
        <Line label="Banka" value={BANK.name} />
        <Line label="Alıcı" value={BANK.holder} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-bold tracking-[.1em] text-muted2">IBAN</span>
          <button type="button" onClick={() => copy(BANK.iban.replace(/\s/g, ""), "iban")}
            className="inline-flex items-center gap-2 self-start font-mono text-[15.5px] font-semibold text-ink">
            {BANK.iban}
            <Icon icon={copied === "iban" ? IconCheck : IconCopy} size={15} className="text-muted" />
          </button>
        </div>
        <Line label="Tutar" value={amount} strong />
      </div>
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11.5px] font-bold tracking-[.1em] text-muted2">{label.toUpperCase()}</span>
      <span className={strong ? "text-[17px] font-bold text-accent-ink" : "text-[14.5px] font-semibold text-ink"}>{value}</span>
    </div>
  );
}
