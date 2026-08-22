"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconCheck } from "@/components/ui/icons";
import { startEmailVerification, confirmEmailVerification } from "@/lib/actions/verify";
import { IDLE, type ActionState } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/** E-posta doğrulama — kod kendi servisimizden gider */
export function EmailVerify({
  verified, verifiedAt, email,
}: { verified: boolean; verifiedAt: string | null; email: string }) {
  const [sendState, setSendState] = React.useState<ActionState>(IDLE);
  const [sending, startSend] = useTransition();
  const [confirmState, confirmAction, confirming] = useActionState(confirmEmailVerification, IDLE);
  useActionToast(confirmState);

  const requestId = (sendState.data?.requestId as string) ?? "";
  const masked = (sendState.data?.maskedTarget as string) ?? email;

  if (verified || confirmState.ok) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-green-soft text-green">
            <Icon icon={IconCheck} size={20} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">E-postanız doğrulandı</span>
            <span className="text-[13px] text-muted">
              {verifiedAt && !confirmState.ok
                ? `Doğrulama tarihi: ${new Date(verifiedAt).toLocaleDateString("tr-TR")}`
                : email}
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
          <Icon icon={IconMail} size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-[19px] font-semibold tracking-[-.02em]">E-posta doğrulama</span>
          <span className="text-[13.5px] leading-[1.55] text-muted">
            {email} adresine kod göndereceğiz.
          </span>
        </div>
      </div>

      {!requestId ? (
        <>
          {sendState.message && !sendState.ok && <Alert tone="danger">{sendState.message}</Alert>}
          <Button
            size="lg" loading={sending} className="self-start"
            onClick={() => startSend(async () => setSendState(await startEmailVerification()))}
          >
            Doğrulama kodu gönder
          </Button>
        </>
      ) : (
        <form action={confirmAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />

          <Alert tone="green"><strong>{masked}</strong> adresine 6 haneli kod gönderildi.</Alert>

          {confirmState.message && !confirmState.ok && (
            <Alert tone="danger">
              {confirmState.message}
              {typeof confirmState.data?.attemptsLeft === "number" && (
                <> Kalan deneme: <strong>{String(confirmState.data.attemptsLeft)}</strong></>
              )}
            </Alert>
          )}

          <Field label="Doğrulama kodu" htmlFor="ecode" hint="6 hane" error={confirmState.fieldErrors?.code}>
            <Input id="ecode" name="code" inputMode="numeric" autoComplete="one-time-code"
              required maxLength={6} placeholder="000000"
              className="text-center font-mono text-[24px] font-bold tracking-[.35em]" />
          </Field>

          <Button type="submit" size="lg" loading={confirming} className="self-start">Doğrula</Button>
        </form>
      )}
    </Card>
  );
}
