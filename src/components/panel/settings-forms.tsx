"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState, useTransition } from "react";
import { Alert, Button, Card, Checkbox, Divider, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { updateProfile, requestAccountDeletion, cancelAccountDeletion, setProfileAvatar } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { formatDate, publicStorageUrl, initials } from "@/lib/utils";
import { PhotoPicker } from "@/components/ui/image-cropper";
import { uploadProfileAvatar } from "@/lib/upload";
import type { City } from "@/lib/types";

export function ProfileForm({
  profile, cities, email,
}: {
  profile: { first_name: string | null; last_name: string | null; username: string | null; city_id: number | null; consent_marketing: boolean; avatar_path: string | null };
  cities: City[];
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, IDLE);
  useActionToast(state);

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      <span className="font-display text-[19px] font-semibold tracking-[-.02em]">Profil bilgileri</span>

      <AvatarField profile={profile} />

      {state.message && (
        <Alert tone={state.ok ? "green" : "danger"}>
          <span className="flex items-start gap-2">
            {state.ok && <Icon icon={IconCheck} size={16} className="mt-[2px] shrink-0" />}
            {state.message}
          </span>
        </Alert>
      )}

      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="pFirstName" error={state.fieldErrors?.firstName}>
            <Input id="pFirstName" name="firstName" required maxLength={80} defaultValue={profile.first_name ?? ""} />
          </Field>
          <Field label="Soyad" htmlFor="pLastName" error={state.fieldErrors?.lastName}>
            <Input id="pLastName" name="lastName" required maxLength={80} defaultValue={profile.last_name ?? ""} />
          </Field>
        </div>

        {/* E-posta ve telefon İletişim bölümünden değiştirilir; burada
            yalnızca mevcut değer hatırlatılır. */}
        <Field label="E-posta" htmlFor="pEmail" hint="İletişim bölümünden değiştirilir">
          <Input id="pEmail" value={email} disabled readOnly />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kullanıcı adı" htmlFor="username" hint="isteğe bağlı" error={state.fieldErrors?.username}>
            <Input id="username" name="username" maxLength={30} defaultValue={profile.username ?? ""} placeholder="kullanici_adi" />
          </Field>
          <Field label="Şehir" htmlFor="pCityId" hint="isteğe bağlı">
            <Select id="pCityId" name="cityId" defaultValue={profile.city_id ?? ""}>
              <option value="">Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>

        <Checkbox id="marketing" name="marketing" defaultChecked={profile.consent_marketing}
          label="Kampanya ve etkinlik duyurularının e-posta ile gönderilmesini istiyorum." />

        <div className="pt-1">
          <Button type="submit" variant="solid" size="lg" loading={pending}>Değişiklikleri kaydet</Button>
        </div>
      </form>
    </Card>
  );
}

export function DangerZone({ purgeAfter, requestedAt }: { purgeAfter: string | null; requestedAt: string | null }) {
  const [state, action, pending] = useActionState(requestAccountDeletion, IDLE);
  const [cancelling, startCancel] = useTransition();
  const [open, setOpen] = React.useState(false);

  if (purgeAfter || requestedAt) {
    return (
      <Card className="flex flex-col gap-4 border-danger p-6 sm:p-7">
        <span className="flex items-center gap-2.5 font-display text-[19px] font-semibold tracking-[-.02em] text-danger">
          <Icon icon={IconAlert} size={20} /> Hesabınız silinmek üzere
        </span>
        <p className="text-[14.5px] leading-[1.65] text-ink2">
          Hesabınız <strong>{formatDate(purgeAfter)}</strong> tarihinde kalıcı olarak silinecek.
          O tarihe kadar bu talebi iptal edebilirsiniz; sonrasında geri dönüşü yoktur.
        </p>
        <Button variant="solid" size="lg" loading={cancelling}
          onClick={() => startCancel(() => { void cancelAccountDeletion(); })} className="self-start">
          Silme talebini iptal et
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-7">
      <span className="font-display text-[19px] font-semibold tracking-[-.02em] text-danger">Hesabı sil</span>
      <p className="text-[14.5px] leading-[1.65] text-ink2">
        Hesabınızı sildiğinizde çocuk kayıtlarınız, adresleriniz ve profiliniz kalıcı olarak silinir.
        Mali kayıtlar (sipariş ve ödemeler) mevzuat gereği saklanır ancak kimliğinizle bağı koparılır.
        İmzalarınız anonimleştirilir. Talep <strong>7 gün</strong> boyunca iptal edilebilir.
      </p>
      <Link href="/kvkk" className="self-start text-[13.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">
        Silme sürecinin detayları →
      </Link>

      <Divider />

      {!open ? (
        <Button variant="outline" size="lg" onClick={() => setOpen(true)}
          className="self-start !border-danger !text-danger hover:!bg-danger-soft">
          Hesabımı silmek istiyorum
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
          {state.ok && <Alert tone="green">{state.message}</Alert>}

          <Field label="Ayrılma nedeniniz" htmlFor="reason" hint="isteğe bağlı">
            <Input id="reason" name="reason" maxLength={300} placeholder="Bize yardımcı olur" />
          </Field>
          <Field label="Onaylamak için «HESABIMI SİL» yazın" htmlFor="confirm" error={state.fieldErrors?.confirm}>
            <Input id="confirm" name="confirm" required placeholder="HESABIMI SİL" autoComplete="off" />
          </Field>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" size="lg" loading={pending}>Silme talebi oluştur</Button>
            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Vazgeç</Button>
          </div>
        </form>
      )}
    </Card>
  );
}


/** Kullanıcının kendi profil fotoğrafı */
function AvatarField({
  profile,
}: {
  profile: { first_name: string | null; last_name: string | null; avatar_path: string | null };
}) {
  const [path, setPath] = React.useState<string | null>(profile.avatar_path);
  const [, startSave] = useTransition();

  const save = (next: string | null) =>
    new Promise<void>((resolve) => {
      startSave(async () => {
        const fd = new FormData();
        if (next) fd.set("path", next);
        const res = await setProfileAvatar(IDLE, fd);
        if (res.ok) setPath(next);
        resolve();
      });
    });

  return (
    <div className="border-b border-line2 pb-5">
      <PhotoPicker
        label="Profil fotoğrafınız"
        currentUrl={publicStorageUrl("avatars", path)}
        fallback={initials(profile.first_name, profile.last_name)}
        onUpload={async (blob) => {
          const uploaded = await uploadProfileAvatar(blob);
          await save(uploaded);
        }}
        onRemove={async () => { await save(null); }}
      />
    </div>
  );
}
