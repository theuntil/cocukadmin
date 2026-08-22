"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconCheck, IconAlert } from "@/components/ui/icons";
import { subscribeNewsletter } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { cn } from "@/lib/utils";

/**
 * E-posta bülteni formu — yalnızca e-posta alanı.
 * `onLime`, lime zemin üzerinde kullanıldığında kontrast renklerini ayarlar.
 */
export function NewsletterForm({ onLime = false }: { onLime?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, IDLE);
  useActionToast(state);

  if (state.ok) {
    return (
      <div
        className={cn(
          "ct-scale flex items-center gap-3 rounded-[16px] border px-5 py-4",
          onLime ? "border-on-lime/20 bg-on-lime/8" : "border-accent-line bg-accent-soft",
        )}
        role="status"
      >
        <Icon icon={IconCheck} size={20} className={cn("shrink-0", onLime ? "text-on-lime" : "text-accent-ink")} />
        <span className={cn("text-[14px] font-semibold", onLime ? "text-on-lime" : "text-accent-ink")}>
          {state.message}
        </span>
      </div>
    );
  }

  const errorText = state.fieldErrors?.email ?? (state.message && !state.ok ? state.message : null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          name="email"
          type="email"
          required
          placeholder="E-posta adresiniz"
          autoComplete="email"
          aria-label="E-posta adresiniz"
          className={cn(
            "flex-1",
            onLime && "border-on-lime/25 bg-on-lime/5 text-on-lime placeholder:text-on-lime/45 focus:border-on-lime",
          )}
        />
        <Button
          type="submit"
          size="lg"
          variant={onLime ? "solid" : "green"}
          loading={pending}
          className="shrink-0"
        >
          <Icon icon={IconMail} size={17} />
          Abone ol
        </Button>
      </div>

      {errorText && (
        <span
          className={cn(
            "flex items-center gap-2 text-[12.5px] font-medium",
            onLime ? "text-on-lime" : "text-danger",
          )}
        >
          <Icon icon={IconAlert} size={14} className="shrink-0" />
          {errorText}
        </span>
      )}

      <span className={cn("text-[12.5px] leading-[1.5]", onLime ? "text-on-lime/70" : "text-muted")}>
        Kaydolarak{" "}
        <Link
          href="/kvkk"
          className={cn("font-semibold underline-offset-2 hover:underline", onLime ? "text-on-lime" : "text-accent-ink")}
        >
          KVKK aydınlatma metnini
        </Link>{" "}
        okuduğunuzu kabul edersiniz. İstediğiniz an çıkabilirsiniz.
      </span>
    </form>
  );
}
