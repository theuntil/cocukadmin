"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPhone, IconCheck, IconAlert } from "@/components/ui/icons";
import { startPhoneVerification, confirmPhoneVerification } from "@/lib/actions/verify";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/**
 * Telefon doğrulama.
 * Kod ct-notify servisinden gönderilir; doğrulama başarılıysa
 * veritabanına yalnızca "doğrulandı" bilgisi ve numaranın hash'i yazılır.
 */
export function PhoneVerify({ verified, verifiedAt }: { verified: boolean; verifiedAt: string | null }) {
  const [sendState, sendAction, sending] = useActionState(startPhoneVerification, IDLE);
  useActionToast(sendState);
  const [confirmState, confirmAction, confirming] = useActionState(confirmPhoneVerification, IDLE);
  const [cooldown, setCooldown] = React.useState(0);

  const sent = sendState.ok && sendState.data;
  const requestId = (sendState.data?.requestId as string) ?? "";
  const phone = (sendState.data?.phone as string) ?? "";
  const masked = (sendState.data?.maskedTarget as string) ?? "";

  // Yeniden gönderme sayacı
  React.useEffect(() => {
    const secs = Number(sendState.data?.resendAfterSec ?? 0);
    if (secs > 0) setCooldown(secs);
  }, [sendState]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (verified || confirmState.ok) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-green-soft text-green">
            <Icon icon={IconCheck} size={20} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Telefonunuz doğrulandı</span>
            <span className="text-[13px] text-muted">
              {confirmState.ok
                ? "Artık kart başvurusu yapabilirsiniz."
                : verifiedAt
                  ? `Doğrulama tarihi: ${new Date(verifiedAt).toLocaleDateString("tr-TR")}`
                  : ""}
            </span>
          </div>
        </div>
        <Badge tone="green">Doğrulandı</Badge>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-accent-ink">
          <Icon icon={IconPhone} size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
            Telefon doğrulama
          </span>
          <span className="text-[13.5px] leading-[1.55] text-muted">
            Kombine kart başvurusu için telefon numaranızı doğrulamanız gerekiyor.
            Numaranız açık şekilde saklanmaz.
          </span>
        </div>
      </div>

      {!sent ? (
        <form action={sendAction} className="flex flex-col gap-4">
          {sendState.message && !sendState.ok && (
            <Alert tone="danger">
              <span className="flex items-start gap-2">
                <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0" />
                {sendState.message}
              </span>
            </Alert>
          )}

          <Field label="Telefon numaranız" htmlFor="phone" hint="SMS ile kod gönderilecek"
            error={sendState.fieldErrors?.phone}>
            <Input id="phone" name="phone" type="tel" inputMode="tel" required
              placeholder="0532 000 00 00" autoComplete="tel" />
          </Field>

          <Button type="submit" size="lg" loading={sending} className="self-start">
            Doğrulama kodu gönder
          </Button>
        </form>
      ) : (
        <form action={confirmAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="phone" value={phone} />

          <Alert tone="green">
            <strong>{masked}</strong> numarasına 6 haneli kod gönderildi.
          </Alert>

          {confirmState.message && !confirmState.ok && (
            <Alert tone="danger">
              {confirmState.message}
              {typeof confirmState.data?.attemptsLeft === "number" && (
                <> Kalan deneme: <strong>{String(confirmState.data.attemptsLeft)}</strong></>
              )}
            </Alert>
          )}

          <Field label="Doğrulama kodu" htmlFor="code" hint="6 hane"
            error={confirmState.fieldErrors?.code}>
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code"
              required maxLength={6} placeholder="000000"
              className="text-center font-mono text-[24px] font-bold tracking-[.35em]" />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={confirming}>Doğrula</Button>
            <span className="text-[13px] text-muted">
              {cooldown > 0
                ? `Yeni kod ${cooldown} saniye sonra istenebilir`
                : "Kod gelmediyse sayfayı yenileyip tekrar deneyin"}
            </span>
          </div>
        </form>
      )}
    </Card>
  );
}
