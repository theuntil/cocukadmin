"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconClock, IconShield } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { requestEmailChange } from "@/lib/actions/profile";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/**
 * E-posta adresi değiştirme.
 *
 * Onay bağlantısı yeni adrese gider; kullanıcı orada tıklayana kadar
 * mevcut adres geçerli kalır. Böylece yanlış yazılan bir adres hesabı kilitlemez.
 */
export function EmailChange({
  currentEmail, pending,
}: {
  currentEmail: string;
  pending: { new_email: string; expires_at: string } | null;
}) {
  const [state, action, submitting] = useActionState(requestEmailChange, IDLE);
  useActionToast(state);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-7">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconMail} size={18} className="text-muted" />
        <span className="font-display text-[18px] font-semibold tracking-[-.02em]">
          E-posta adresi
        </span>
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12.5px] text-muted">Mevcut adres</span>
          <span className="truncate text-[14.5px] font-semibold">{currentEmail}</span>
        </div>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Değiştir
          </Button>
        )}
      </div>

      {pending && (
        <div className="flex items-start gap-3 rounded-[14px] border border-orange-line bg-orange-bg px-4 py-3.5">
          <Icon icon={IconClock} size={17} className="mt-[2px] shrink-0 text-orange-ink" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold">{pending.new_email}</span>
              <Badge tone="orange">Onay bekliyor</Badge>
            </div>
            <span className="text-[13px] leading-[1.55] text-ink2">
              Bu adrese onay bağlantısı gönderdik. Tıklayana kadar adresiniz değişmez.
              Bağlantı 2 saat geçerlidir.
            </span>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)}
        title="E-posta adresini değiştir" size="sm">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-[12px] bg-field px-4 py-3">
            <span className="text-[12px] text-muted">Mevcut</span>
            <span className="truncate text-[14px] font-semibold">{currentEmail}</span>
          </div>

          <Field label="Yeni e-posta adresi" htmlFor="newEmail"
            error={state.fieldErrors?.email}>
            <Input id="newEmail" name="email" type="email" required autoComplete="email"
              placeholder="yeni@ornek.com" autoFocus />
          </Field>

          <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
            <Icon icon={IconShield} size={15} className="mt-[2px] shrink-0 text-muted" />
            <span className="text-[12.5px] leading-[1.5] text-muted">
              Onay bağlantısı yeni adrese gönderilir. Siz onaylayana kadar
              mevcut adresinizle giriş yapmaya devam edersiniz.
            </span>
          </div>

          <Button type="submit" size="lg" loading={submitting}>
            Onay bağlantısı gönder
          </Button>
        </form>
      </Modal>
    </Card>
  );
}
