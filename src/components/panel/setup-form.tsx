"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUser, IconChild, IconFootball, IconArrowRight } from "@/components/ui/icons";
import { TeamPicker } from "@/components/ui/team-picker";
import { useActionToast } from "@/components/ui/action-toast";
import { completeSetup } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import type { PickerTeam } from "@/components/ui/team-picker";

/**
 * KURULUM — TEK SAYFA, TEK ADIM
 *
 * ┌─ NEDEN SİHİRBAZ DEĞİL ────────────────────────────────────────┐
 * │ Çok adımlı sihirbaz her adımda bir karar noktası yaratıyor ve  │
 * │ kullanıcı ortada bırakabiliyordu: adı girilmiş, çocuğu yok.    │
 * │ Sonra panele girdiğinde nereye devam edeceğini bilmiyordu.     │
 * │                                                                 │
 * │ Tek sayfa: hepsi görünür, hepsi bir kerede kaydedilir. Bir yer │
 * │ patlarsa hiçbiri yazılmaz (tek veritabanı işlemi).             │
 * └─────────────────────────────────────────────────────────────────┘
 */
export function SetupForm({
  teams, cities, email, defaults,
}: {
  teams: PickerTeam[];
  cities: { id: number; name: string }[];
  email: string;
  /** Kayıt sırasında girilmişse ad-soyad önden dolu gelir */
  defaults?: { firstName?: string | null; lastName?: string | null };
}) {
  const [state, action, pending] = useActionState(completeSetup, IDLE);
  useActionToast(state, { hata: "Kurulum tamamlanamadı" });

  const [teamId, setTeamId] = React.useState("");

  /* Çocuk 18'den küçük olmalı; tarayıcı sınırı kullanıcıya yardım
     eder, sunucu ayrıca doğrular. */
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      {/* ── Veli ── */}
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-chip text-ink">
            <Icon icon={IconUser} size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-[15.5px] font-semibold">Siz</span>
            <span className="text-[12.5px] text-muted">Veli bilgileri</span>
          </span>
        </span>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adınız" htmlFor="parentFirstName" error={state.fieldErrors?.parentFirstName}>
            <Input id="parentFirstName" name="parentFirstName" required autoFocus
              defaultValue={defaults?.firstName ?? ""}
              autoComplete="given-name" maxLength={60} />
          </Field>
          <Field label="Soyadınız" htmlFor="parentLastName" error={state.fieldErrors?.parentLastName}>
            <Input id="parentLastName" name="parentLastName" required defaultValue={defaults?.lastName ?? ""}
              autoComplete="family-name" maxLength={60} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* E-posta salt okunur: hesabın kimliği, burada değiştirilmez */}
          <Field label="E-posta" htmlFor="email" hint="hesabınızın adresi">
            <Input id="email" value={email} readOnly disabled />
          </Field>
          <Field label="Telefon" htmlFor="phone" hint="isteğe bağlı"
            error={state.fieldErrors?.phone}>
            <Input id="phone" name="phone" type="tel" autoComplete="tel"
              placeholder="05XX XXX XX XX" />
          </Field>
        </div>
      </Card>

      {/* ── Çocuk ── */}
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-chip text-ink">
            <Icon icon={IconChild} size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-[15.5px] font-semibold">Çocuğunuz</span>
            <span className="text-[12.5px] text-muted">Kart onun adına düzenlenecek</span>
          </span>
        </span>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adı" htmlFor="childFirstName" error={state.fieldErrors?.childFirstName}>
            <Input id="childFirstName" name="childFirstName" required maxLength={60} />
          </Field>
          <Field label="Soyadı" htmlFor="childLastName" error={state.fieldErrors?.childLastName}>
            <Input id="childLastName" name="childLastName" required maxLength={60} />
          </Field>
          <Field label="Doğum tarihi" htmlFor="childBirthDate"
            error={state.fieldErrors?.childBirthDate}>
            <input id="childBirthDate" name="childBirthDate" type="date" required max={bugun}
              className="h-[46px] w-full rounded-[12px] border border-line bg-field px-4 text-[15px] text-ink focus:border-green focus:outline-none" />
          </Field>
          <Field label="Şehir" htmlFor="cityId" error={state.fieldErrors?.cityId}>
            <Select id="cityId" name="cityId" required defaultValue="">
              <option value="" disabled>Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {/* ── Takım ── */}
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-chip text-ink">
            <Icon icon={IconFootball} size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-[15.5px] font-semibold">Takımı</span>
            <span className="text-[12.5px] text-muted">Sonradan değiştirilebilir</span>
          </span>
        </span>

        <TeamPicker teams={teams} label="Takım" required
          defaultValue={teamId} onChange={setTeamId}
          error={state.fieldErrors?.teamId} />
        <input type="hidden" name="teamId" value={teamId} />
      </Card>

      <Button type="submit" variant="lime" size="lg" loading={pending} className="w-full">
        Kurulumu tamamla <Icon icon={IconArrowRight} size={17} />
      </Button>

      <p className="text-center text-[12.5px] leading-[1.6] text-muted">
        Bu bilgiler olmadan kombine kart düzenlenemiyor. Hepsini daha sonra
        panelinizden değiştirebilirsiniz.
      </p>
    </form>
  );
}
