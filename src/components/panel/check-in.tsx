"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconAlert, IconQr } from "@/components/ui/icons";
import { checkIn } from "@/lib/actions/admin";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

export function CheckInScanner() {
  const [state, action, pending] = useActionState(checkIn, IDLE);
  useActionToast(state);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Her sonuçtan sonra alanı temizle ve odakla — arka arkaya okutma için
  React.useEffect(() => {
    if (state.message && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [state]);

  const attendee = state.data?.attendee as { first_name?: string; last_name?: string; age?: number } | undefined;
  const eventTitle = state.data?.event_title as string | undefined;

  return (
    <div className="flex max-w-[560px] flex-col gap-5">
      <Card className="p-6 sm:p-7">
        <form action={action} className="flex flex-col gap-4">
          <Field label="Giriş kodu" htmlFor="code" hint="8 karakter" error={state.fieldErrors?.code}>
            <Input ref={inputRef} id="code" name="code" required autoFocus autoComplete="off"
              maxLength={12} placeholder="ABCD1234"
              className="text-center font-mono text-[22px] font-bold tracking-[.2em] uppercase" />
          </Field>
          <Button type="submit" size="lg" variant="solid" loading={pending}>
            <Icon icon={IconQr} size={18} /> Kodu doğrula
          </Button>
        </form>
      </Card>

      {state.message && (
        <Card className={`ct-scale flex flex-col items-center gap-4 p-8 text-center ${state.ok ? "border-accent-line" : "border-danger"}`}>
          <span className={`flex h-16 w-16 items-center justify-center rounded-full ${state.ok ? "bg-accent-soft text-accent-ink" : "bg-danger-soft text-danger"}`}>
            <Icon icon={state.ok ? IconCheck : IconAlert} size={30} />
          </span>
          <span className="font-display text-[22px] font-semibold tracking-[-.02em]">{state.message}</span>

          {state.ok && attendee && (
            <div className="flex flex-col gap-1">
              <span className="text-[18px] font-bold">{attendee.first_name} {attendee.last_name}</span>
              {attendee.age !== undefined && <span className="text-[14px] text-muted">{attendee.age} yaş</span>}
              {eventTitle && <span className="text-[13.5px] text-muted">{eventTitle}</span>}
              {typeof state.data?.attendee_count === "number" && (
                <span className="mt-1 text-[13.5px] font-semibold text-accent-ink">
                  Toplam {String(state.data.attendee_count)} kişi giriş yapacak
                </span>
              )}
            </div>
          )}

          {!state.ok && (
            <Alert tone="muted">
              Kod geçersiz, iptal edilmiş veya daha önce kullanılmış olabilir. Katılımcının kaydını
              panelden kontrol edin.
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
}
