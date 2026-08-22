"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconCheck, IconAlert } from "@/components/ui/icons";
import { startPasswordReset, completePasswordReset } from "@/lib/actions/verify";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/**
 * Şifre sıfırlama — tamamen kendi servisimiz üzerinden.
 * Adım 1: e-posta → kod gönderilir
 * Adım 2: kod + yeni şifre tek istekte doğrulanır ve uygulanır
 *
 * Kod doğrulandı bilgisi istemciye hiç gitmez; taklit edilemez.
 */
export function PasswordResetForm() {
  const [sendState, sendAction, sending] = useActionState(startPasswordReset, IDLE);
  useActionToast(sendState);
  const [doneState, doneAction, saving] = useActionState(completePasswordReset, IDLE);

  const requestId = (sendState.data?.requestId as string) ?? "";
  const email = (sendState.data?.email as string) ?? "";
  const masked = (sendState.data?.maskedTarget as string) ?? email;
  const step2 = sendState.ok && requestId;

  if (doneState.ok) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
          <Icon icon={IconCheck} size={26} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.02em]">Şifreniz güncellendi</h1>
          <p className="text-[14.5px] leading-[1.6] text-ink2">{doneState.message}</p>
        </div>
        <Link href="/giris" className="w-full">
          <Button size="lg" className="w-full">Giriş yap</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] font-semibold tracking-[-.03em]">Şifremi unuttum</h1>
        <p className="text-[14.5px] leading-[1.6] text-ink2">
          {step2
            ? `${masked} adresine 6 haneli bir kod gönderdik. Kodu ve yeni şifrenizi girin.`
            : "E-posta adresinizi girin, size bir doğrulama kodu gönderelim."}
        </p>
      </div>

      {!step2 ? (
        <form action={sendAction} className="flex flex-col gap-4">
          {sendState.message && !sendState.ok && <Alert tone="danger">{sendState.message}</Alert>}

          <Field label="E-posta" htmlFor="email" error={sendState.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required
              placeholder="ornek@eposta.com" />
          </Field>

          <Button type="submit" size="lg" loading={sending}>
            <Icon icon={IconMail} size={17} /> Kod gönder
          </Button>
        </form>
      ) : (
        <form action={doneAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="email" value={email} />

          {sendState.message && <Alert tone="green">{sendState.message}</Alert>}

          {doneState.message && !doneState.ok && (
            <Alert tone="danger">
              <span className="flex items-start gap-2">
                <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0" />
                <span>
                  {doneState.message}
                  {typeof doneState.data?.attemptsLeft === "number" && (
                    <> Kalan deneme: <strong>{String(doneState.data.attemptsLeft)}</strong></>
                  )}
                </span>
              </span>
            </Alert>
          )}

          <Field label="Doğrulama kodu" htmlFor="code" hint="6 hane" error={doneState.fieldErrors?.code}>
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code"
              required maxLength={6} placeholder="000000"
              className="text-center font-mono text-[24px] font-bold tracking-[.35em]" />
          </Field>

          <Field label="Yeni şifre" htmlFor="password" hint="en az 8 karakter, harf ve rakam"
            error={doneState.fieldErrors?.password}>
            <Input id="password" name="password" type="password" autoComplete="new-password"
              required minLength={8} />
          </Field>

          <Field label="Yeni şifre (tekrar)" htmlFor="confirm" error={doneState.fieldErrors?.confirm}>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password"
              required minLength={8} />
          </Field>

          <Button type="submit" size="lg" loading={saving}>Şifremi güncelle</Button>
        </form>
      )}

      <Link href="/giris" className="text-center text-[14px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
        Girişe dön
      </Link>
    </div>
  );
}
