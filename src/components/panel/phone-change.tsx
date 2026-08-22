"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPhone, IconCheck, IconShield } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { requestPhoneChange, confirmPhoneChange } from "@/lib/actions/profile";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/**
 * Telefon numarası değiştirme.
 *
 * İki adım: numara girilir, oraya kod gider, kod doğrulanınca numara
 * kaydedilir. Doğrulanmadan eski numara geçerli kalır.
 */
export function PhoneChange({
  verified, last4,
}: { verified: boolean; last4: string | null }) {
  const [step, setStep] = React.useState<"idle" | "code">("idle");
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [requestId, setRequestId] = React.useState("");

  const [reqState, reqAction, reqPending] = useActionState(requestPhoneChange, IDLE);
  useActionToast(reqState);
  const [okState, okAction, okPending] = useActionState(confirmPhoneChange, IDLE);

  React.useEffect(() => {
    if (!reqState.ok) return;
    const d = reqState.data as { phone?: string; requestId?: string } | undefined;
    if (d?.phone) setPhone(d.phone);
    if (d?.requestId) setRequestId(d.requestId);
    setStep("code");
    setOpen(false);
  }, [reqState]);

  React.useEffect(() => {
    if (okState.ok) { setStep("idle"); setPhone(""); setRequestId(""); }
  }, [okState.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconPhone} size={18} className="text-muted" />
          <span className="font-display text-[18px] font-semibold tracking-[-.02em]">
            Telefon numarası
          </span>
        </div>
        {verified && (
          <Badge tone="green">
            <Icon icon={IconCheck} size={11} /> Doğrulandı
          </Badge>
        )}
      </div>

      {reqState.message && (
        <Alert tone={reqState.ok ? "green" : "danger"}>{reqState.message}</Alert>
      )}
      {okState.message && (
        <Alert tone={okState.ok ? "green" : "danger"}>{okState.message}</Alert>
      )}

      {last4 && step === "idle" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] text-muted">Kayıtlı numara</span>
            <span className="font-mono text-[14.5px] font-semibold">
              +90 5** *** ** {last4}
            </span>
          </div>
        </div>
      )}

      {step === "idle" ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="self-start">
          {last4 ? "Numarayı değiştir" : "Numara ekle"}
        </Button>
      ) : (
        <form action={okAction} className="flex flex-col gap-4">
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="requestId" value={requestId} />

          <div className="flex items-start gap-3 rounded-[14px] bg-chip px-4 py-3.5">
            <Icon icon={IconPhone} size={16} className="mt-[2px] shrink-0 text-muted" />
            <span className="text-[13px] leading-[1.55] text-ink2">
              <strong>{phone}</strong> numarasına 6 haneli bir kod gönderdik.
              Kodu girene kadar numaranız değişmez.
            </span>
          </div>

          <Field label="Doğrulama kodu" htmlFor="phoneCode"
            error={okState.fieldErrors?.code}>
            <Input id="phoneCode" name="code" required inputMode="numeric"
              maxLength={6} placeholder="000000" autoComplete="one-time-code"
              className="max-w-[180px] text-center font-mono text-[18px] tracking-[.3em]" />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={okPending}>Doğrula ve kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => setStep("idle")}>
              Vazgeç
            </Button>
          </div>
        </form>
      )}
      <Modal open={open} onClose={() => setOpen(false)}
        title={last4 ? "Telefon numarasını değiştir" : "Telefon numarası ekle"} size="sm">
        <form action={reqAction} className="flex flex-col gap-4">
          {last4 && (
            <div className="flex flex-col gap-1 rounded-[12px] bg-field px-4 py-3">
              <span className="text-[12px] text-muted">Mevcut</span>
              <span className="font-mono text-[14px] font-semibold">
                +90 5** *** ** {last4}
              </span>
            </div>
          )}

          <Field label="Yeni numara" htmlFor="newPhone"
            error={reqState.fieldErrors?.phone}>
            <Input id="newPhone" name="phone" type="tel" required
              inputMode="numeric" maxLength={20} placeholder="5XX XXX XX XX"
              autoComplete="tel" autoFocus />
          </Field>

          <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
            <Icon icon={IconShield} size={15} className="mt-[2px] shrink-0 text-muted" />
            <span className="text-[12.5px] leading-[1.5] text-muted">
              Bu numaraya doğrulama kodu gönderilir. Kod girilene kadar
              mevcut numaranız geçerli kalır.
            </span>
          </div>

          <Button type="submit" size="lg" loading={reqPending}>Kod gönder</Button>
        </form>
      </Modal>
    </Card>
  );
}
