"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Checkbox, Field, Input, Divider } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconCheck, IconAlert } from "@/components/ui/icons";
import { signIn, signUp } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/**
 * bir sağlayıcıya tıklanıp "provider is not enabled" hatası alınmaz.
 */

/*
 * ┌─ GOOGLE / APPLE GİRİŞİ KALDIRILDI ⚠️ ─────────────────────────┐
 * │ Kurulum artık zorunlu ve tek ekranda: veli adı, çocuk adı,     │
 * │ takım, şehir birlikte alınıyor.                                 │
 * │                                                                  │
 * │ Sosyal giriş bu akışla çelişiyordu: kişi tek tıkla hesap        │
 * │ açıyor ama hiçbir bilgi gelmiyor, yine kurulum ekranına         │
 * │ düşüyordu. İki farklı yol aynı yere çıkıyor, biri fazladan      │
 * │ adım ekliyordu.                                                  │
 * │                                                                  │
 * │ Tek yol: e-posta ve şifre.                                       │
 * └──────────────────────────────────────────────────────────────────┘
 */

export function SignInForm() {
  const params = useSearchParams();
  const next = params.get("devam") ?? "/panel";
  const urlError = params.get("hata");
  const [state, action, pending] = useActionState(signIn, IDLE);
  useActionToast(state);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] font-semibold tracking-[-.03em]">Tekrar hoş geldiniz</h1>
        <p className="text-[14.5px] text-ink2">Panelinize giriş yapın.</p>
      </div>

      {(state.message || urlError) && (
        <Alert tone="danger"><span className="flex items-start gap-2"><Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0" />{state.message ?? urlError}</span></Alert>
      )}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label="E-posta" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="ornek@eposta.com" />
        </Field>
        <Field label="Şifre" htmlFor="password" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        </Field>
        <div className="flex justify-end">
          <Link href="/sifremi-unuttum" className="text-[13.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Şifremi unuttum</Link>
        </div>
        <Button type="submit" size="lg" loading={pending}>Giriş yap</Button>
      </form>

      <p className="text-center text-[14px] text-ink2">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Kayıt olun</Link>
      </p>
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, IDLE);

  const router = useRouter();

  /* Kayıt sonrası oturum zaten açılıyor; kullanıcı giriş ekranına
     gönderilmez, doğrudan kart başvurusuna alınır. */
  React.useEffect(() => {
    if (state.ok) {
      router.push("/panel/kombine-kart/basvuru");
      router.refresh();
    }
  }, [state.ok, router]);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
          <Icon icon={IconCheck} size={26} />
        </span>
        <h1 className="font-display text-[26px] font-semibold tracking-[-.02em]">
          Hoş geldiniz
        </h1>
        <p className="text-[14.5px] leading-[1.6] text-ink2">
          Kart başvurunuza yönlendiriliyorsunuz…
        </p>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line2 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] font-semibold tracking-[-.03em]">Aramıza katılın</h1>
        <p className="text-[14.5px] text-ink2">Kombine kart başvurusu için önce hesap oluşturun.</p>
      </div>

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="firstName" error={state.fieldErrors?.firstName}>
            <Input id="firstName" name="firstName" autoComplete="given-name" required />
          </Field>
          <Field label="Soyad" htmlFor="lastName" error={state.fieldErrors?.lastName}>
            <Input id="lastName" name="lastName" autoComplete="family-name" required />
          </Field>
        </div>
        <Field label="E-posta" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Şifre" htmlFor="password" hint="en az 8 karakter" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>

        <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-4">
          <Checkbox id="terms" name="terms" required
            label={<><Link href="/uyelik-kosullari" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Üyelik koşullarını</Link> okudum, kabul ediyorum.</>} />
          <Checkbox id="kvkk" name="kvkk" required
            label={<><Link href="/kvkk" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">KVKK aydınlatma metnini</Link> okudum.</>} />
        </div>
        {(state.fieldErrors?.terms || state.fieldErrors?.kvkk) && (
          <span className="text-[12.5px] font-medium text-danger">{state.fieldErrors?.terms ?? state.fieldErrors?.kvkk}</span>
        )}

        <Button type="submit" size="lg" loading={pending}>Hesap oluştur</Button>
      </form>

      <p className="text-center text-[14px] text-ink2">
        Zaten üye misiniz? <Link href="/giris" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Giriş yapın</Link>
      </p>
    </div>
  );
}

/* ForgotPasswordForm ve ResetPasswordForm kaldırıldı.
   Şifre sıfırlama artık kendi servisimizden kod ile yapılıyor:
   components/site/password-reset.tsx */
