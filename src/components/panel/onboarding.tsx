"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Checkbox, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUser, IconAlert, IconCheck, IconArrowRight } from "@/components/ui/icons";
import { completeProfile } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import type { City, Team } from "@/lib/types";
import type { ProfileCompletion } from "@/lib/data";

const LABELS: Record<string, string> = {
  first_name: "Ad",
  last_name: "Soyad",
  city_id: "Şehir",
  favorite_team_id: "Takım",
};

/**
 * Profil tamamlama formu.
 * Google/Apple girişinde yalnızca ad, soyad ve e-posta geldiği için
 * şehir ve takım burada toplanır.
 */
export function OnboardingForm({
  completion, cities, teams, compact = false,
}: {
  completion: ProfileCompletion;
  cities: City[];
  teams: Team[];
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(completeProfile, IDLE);
  useActionToast(state);

  if (state.ok) {
    return (
      <Card className="ct-scale flex flex-col items-center gap-5 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon icon={IconCheck} size={26} />
        </span>
        <div className="flex flex-col gap-2">
          <span className="font-display text-[22px] font-semibold tracking-[-.02em]">Her şey hazır</span>
          <p className="text-[14.5px] text-ink2">Artık kart başvurusu yapabilir, etkinliklere katılabilirsiniz.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/panel/kombine-kart"><Button variant="solid" size="lg">Kombine kart başvurusu</Button></Link>
          <Link href="/panel"><Button variant="outline" size="lg">Panele dön</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className={compact ? "p-6" : "p-6 sm:p-8"}>
      <form action={action} className="flex flex-col gap-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
            <Icon icon={IconUser} size={20} />
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-[20px] font-semibold tracking-[-.02em]">
              Profilinizi tamamlayın
            </span>
            <span className="text-[13.5px] leading-[1.55] text-muted">
              Kart başvurusu ve etkinlik kaydı için bu bilgilere ihtiyacımız var.
              Bir dakikadan kısa sürer.
            </span>
          </div>
        </div>

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        {completion.missing.length > 0 && (
          <Alert tone="orange">
            <span className="flex items-start gap-2">
              <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0" />
              Eksik alanlar: <strong>{completion.missing.map((m) => LABELS[m] ?? m).join(", ")}</strong>
            </span>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="obFirstName" error={state.fieldErrors?.firstName}>
            <Input id="obFirstName" name="firstName" required maxLength={80}
              defaultValue={completion.first_name ?? ""} autoComplete="given-name" />
          </Field>
          <Field label="Soyad" htmlFor="obLastName" error={state.fieldErrors?.lastName}>
            <Input id="obLastName" name="lastName" required maxLength={80}
              defaultValue={completion.last_name ?? ""} autoComplete="family-name" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Şehir" htmlFor="obCityId" error={state.fieldErrors?.cityId}>
            <Select id="obCityId" name="cityId" required defaultValue={completion.city_id ?? ""}>
              <option value="" disabled>Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Takımınız" htmlFor="obTeamId" error={state.fieldErrors?.teamId}>
            <Select id="obTeamId" name="teamId" required defaultValue={completion.favorite_team_id ?? ""}>
              <option value="" disabled>Seçiniz</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>

        <Checkbox id="obMarketing" name="marketing"
          label="Kampanya ve etkinlik duyurularının e-posta ile gönderilmesini istiyorum." />

        <Button type="submit" variant="solid" size="lg" loading={pending}>
          Kaydet ve devam et
          <Icon icon={IconArrowRight} size={17} />
        </Button>
      </form>
    </Card>
  );
}

/** Panel içinde gösterilen uyarı bandı — tıklanınca tamamlama sayfasına gider */
export function ProfileBanner({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;

  return (
    <Link href="/kurulum" className="block">
      <div className="ct-fade flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-orange-line bg-orange-bg px-5 py-4 transition-colors hover:border-orange">
        <div className="flex items-start gap-3">
          <Icon icon={IconAlert} size={19} className="mt-[2px] shrink-0 text-orange" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold text-orange-ink">
              Profiliniz eksik — kart başvurusu ve etkinlik kaydı yapamazsınız
            </span>
            <span className="text-[13px] text-orange-ink/80">
              Eksik: {missing.map((m) => LABELS[m] ?? m).join(", ")}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-[13.5px] font-semibold text-white">
          Tamamla <Icon icon={IconArrowRight} size={15} />
        </span>
      </div>
    </Link>
  );
}
