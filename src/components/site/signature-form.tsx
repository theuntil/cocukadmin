"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Checkbox, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconSignature, IconShare } from "@/components/ui/icons";
import { submitSignature } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import type { City, Team } from "@/lib/types";
import { TeamPicker } from "@/components/ui/team-picker";

export function SignatureForm({
  campaignSlug, teams, cities, requiresTeam = true,
}: {
  campaignSlug: string; teams: Team[]; cities: City[]; requiresTeam?: boolean;
}) {
  const [state, action, pending] = useActionState(submitSignature, IDLE);
  useActionToast(state);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (state.ok) {
    const total = Number((state.data as { total?: number } | undefined)?.total ?? 0);
    return (
      <Card className="ct-scale flex flex-col items-center gap-5 p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon icon={IconCheck} size={30} />
        </span>
        <div className="flex flex-col gap-2">
          <span className="font-display text-[24px] font-semibold tracking-[-.02em]">İmzanız alındı</span>
          <p className="text-[14.5px] leading-[1.6] text-ink2">
            Desteğiniz için teşekkürler. Şu ana kadar{" "}
            <strong className="text-accent-ink">{new Intl.NumberFormat("tr-TR").format(total)}</strong> imza toplandı.
          </p>
        </div>
        <ShareButtons />
        <Link href="/kombine-kart" className="text-[14px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">
          Kombine kartı incele
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="campaignSlug" value={campaignSlug} />

        <div className="flex flex-col gap-1">
          <span className="font-display text-[21px] font-semibold tracking-[-.02em]">Kampanyayı imzala</span>
          <span className="text-[13.5px] text-muted">Üye olmanıza gerek yok. 30 saniye sürer.</span>
        </div>

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="firstName" error={state.fieldErrors?.firstName}>
            <Input id="firstName" name="firstName" required maxLength={80} autoComplete="given-name" />
          </Field>
          <Field label="Soyad" htmlFor="lastName" error={state.fieldErrors?.lastName}>
            <Input id="lastName" name="lastName" required maxLength={80} autoComplete="family-name" />
          </Field>
        </div>

        <Field
          label="Telefon numarası"
          htmlFor="contact"
          hint="doğrulama için"
          error={state.fieldErrors?.contact}
        >
          <Input id="contact" name="contact" type="tel" required placeholder="0532 000 00 00" autoComplete="tel" inputMode="tel" />
        </Field>
        <p className="-mt-2 text-[12.5px] leading-[1.5] text-muted">
          Numaranız <strong>açık şekilde saklanmaz</strong>. Yalnızca aynı kişinin iki kez imza vermesini
          engellemek için geri döndürülemez bir özeti tutulur.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {requiresTeam && (
            <TeamPicker teams={teams} label="Takımınız" required
              error={state.fieldErrors?.teamId} />
          )}
          <Field label="Şehir" htmlFor="cityId" hint="isteğe bağlı" error={state.fieldErrors?.cityId}>
            <Select id="cityId" name="cityId" defaultValue="">
              <option value="">Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-field p-4">
          <Checkbox id="kvkk" name="kvkk" required
            label={<><Link href="/kvkk" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">KVKK aydınlatma metnini</Link> okudum ve verilerimin bu kapsamda işlenmesini kabul ediyorum.</>} />
          <Checkbox id="terms" name="terms" required
            label={<><Link href="/uyelik-kosullari" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Kullanım koşullarını</Link> kabul ediyorum.</>} />
          <Checkbox id="contactConsent" name="contactConsent"
            label="Kampanya sonucu hakkında bana bilgi verilmesini istiyorum. (isteğe bağlı)" />
        </div>

        {(state.fieldErrors?.kvkk || state.fieldErrors?.terms) && (
          <span className="text-[12.5px] font-medium text-danger">{state.fieldErrors?.kvkk ?? state.fieldErrors?.terms}</span>
        )}

        {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} />}

        <Button type="submit" size="lg" variant="solid" loading={pending}>
          <Icon icon={IconSignature} size={18} />
          İmzamı ekle
        </Button>
      </form>
    </Card>
  );
}

function ShareButtons() {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* pano erişimi yoksa sessizce geç */ }
  };

  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Icon icon={IconShare} size={15} />
        {copied ? "Bağlantı kopyalandı" : "Bağlantıyı paylaş"}
      </Button>
    </div>
  );
}
