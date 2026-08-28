"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { adminSignIn } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignIn, IDLE);
  const params = useSearchParams();
  const next = params.get("devam") ?? "/";

  return (
    <Card className="p-7">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Field label="E-posta" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" required autoComplete="email"
            autoFocus placeholder="ornek@cocuktribunu.com" />
        </Field>

        <Field label="Şifre" htmlFor="password" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" required
            autoComplete="current-password" />
        </Field>

        <Button type="submit" size="lg" loading={pending}>Giriş yap</Button>
      </form>
    </Card>
  );
}
