"use client";

import { useActionState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconShield, IconCheck } from "@/components/ui/icons";
import { changePassword } from "@/lib/actions/verify";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/** Oturum içi şifre değiştirme — mevcut şifre doğrulanmadan değişmez */
export function ChangePassword() {
  const [state, action, pending] = useActionState(changePassword, IDLE);
  useActionToast(state);

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-accent-ink">
          <Icon icon={IconShield} size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-[19px] font-semibold tracking-[-.02em]">Şifre değiştir</span>
          <span className="text-[13.5px] leading-[1.55] text-muted">
            Güvenliğiniz için önce mevcut şifrenizi soruyoruz.
          </span>
        </div>
      </div>

      {state.message && (
        <Alert tone={state.ok ? "green" : "danger"}>
          <span className="flex items-start gap-2">
            {state.ok && <Icon icon={IconCheck} size={16} className="mt-[2px] shrink-0" />}
            {state.message}
          </span>
        </Alert>
      )}

      <form action={action} className="flex flex-col gap-4">
        <Field label="Mevcut şifreniz" htmlFor="current" error={state.fieldErrors?.current}>
          <Input id="current" name="current" type="password" autoComplete="current-password" required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Yeni şifre" htmlFor="newpass" hint="en az 8 karakter, harf ve rakam"
            error={state.fieldErrors?.password}>
            <Input id="newpass" name="password" type="password" autoComplete="new-password"
              required minLength={8} />
          </Field>
          <Field label="Yeni şifre (tekrar)" htmlFor="newconfirm" error={state.fieldErrors?.confirm}>
            <Input id="newconfirm" name="confirm" type="password" autoComplete="new-password"
              required minLength={8} />
          </Field>
        </div>

        <Button type="submit" size="lg" loading={pending} className="self-start">Şifreyi güncelle</Button>
      </form>
    </Card>
  );
}
