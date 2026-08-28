"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, Field, H3, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconEdit, IconChild, IconTrash, IconGirl, IconBoy, IconFootball,
} from "@/components/ui/icons";
import { publicStorageUrl } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { updateChildRecord, deleteChildRecord } from "@/lib/actions/members";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { useActionToast } from "@/components/ui/action-toast";
import { formatDate } from "@/lib/utils";

interface Child {
  id: string; first_name: string; last_name: string; birth_date: string;
  gender: string | null; notes: string | null; status: string;
  city_id: number | null; city_name: string | null;
  team_id: string | null; team_name: string | null; team_logo: string | null;
  parent: { id: string } | null;
}

const GENDER_TR: Record<string, string> = {
  female: "Kız", male: "Erkek", unspecified: "Belirtilmemiş",
};

export function ChildEditor({
  child, canEdit, cities, teams,
}: {
  child: Child; canEdit: boolean;
  cities: { id: number; name: string }[];
  teams: { id: string; name: string; logo_path?: string | null }[];
}) {
  const [state, action, pending] = useActionState(updateChildRecord, IDLE);
  useActionToast(state);
  const [editing, setEditing] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  React.useEffect(() => { if (state.ok) setEditing(false); }, [state.ok]);

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon icon={IconChild} size={18} className="text-muted" />
            <H3 className="text-[18px]">Bilgiler</H3>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Icon icon={IconEdit} size={14} /> Düzenle
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRemoving(true)}
                className="!text-danger hover:!bg-danger-soft">
                <Icon icon={IconTrash} size={14} />
              </Button>
            </div>
          )}
        </div>

        {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

        <div className="flex flex-col gap-3">
          <Row label="Ad" value={child.first_name} />
          <Row label="Soyad" value={child.last_name} />
          <Row label="Doğum tarihi" value={formatDate(child.birth_date)} />
          <Row label="Cinsiyet" value={GENDER_TR[child.gender ?? "unspecified"] ?? "—"} />
          <Row label="Şehir" value={child.city_name ?? "—"} />
          <Row label="Takım" value={child.team_name ?? "—"} />
          {child.notes && <Row label="Not" value={child.notes} />}
        </div>
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)}
        title="Çocuk bilgilerini düzenle" size="sm">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="childId" value={child.id} />

          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad" htmlFor="chFirst">
              <Input id="chFirst" name="firstName" maxLength={80}
                defaultValue={child.first_name} />
            </Field>
            <Field label="Soyad" htmlFor="chLast">
              <Input id="chLast" name="lastName" maxLength={80}
                defaultValue={child.last_name} />
            </Field>
          </div>

          <Field label="Doğum tarihi" htmlFor="chBirth">
            <Input id="chBirth" name="birthDate" type="date"
              defaultValue={child.birth_date.slice(0, 10)} />
          </Field>

          {/* Cinsiyet: açılır liste yerine ikonlu kutular */}
          <GenderBoxes defaultValue={child.gender ?? "unspecified"} />

          <Field label="Şehir" htmlFor="chCity">
            <Select id="chCity" name="cityId" defaultValue={child.city_id ?? ""}>
              <option value="">Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>

          {/* Takım: logolu kutular */}
          <TeamBoxes teams={teams} defaultValue={child.team_id ?? ""} />

          <Field label="Not" htmlFor="chNotes" hint="yalnızca yönetim panelinde görünür">
            <Textarea id="chNotes" name="notes" rows={2} maxLength={1000}
              defaultValue={child.notes ?? ""} />
          </Field>

          <Button type="submit" size="lg" loading={pending}>Kaydet</Button>
        </form>
      </Modal>

      <DeleteChild open={removing} onClose={() => setRemoving(false)}
        child={child} />
    </>
  );
}

function DeleteChild({
  open, onClose, child,
}: { open: boolean; onClose: () => void; child: Child }) {
  const [state, action, pending] = useActionState(deleteChildRecord, IDLE);

  useActionEffect(state, onClose);

  return (
    <Modal open={open} onClose={onClose}
      title={`${child.first_name} silinsin mi?`} size="sm">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="childId" value={child.id} />
        <input type="hidden" name="parentId" value={child.parent?.id ?? ""} />

        {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

        <p className="text-[13.5px] leading-[1.6] text-ink2">
          Çocuğun aktif kartı varsa kayıt silinmez, pasife alınır. Böylece kart
          ve sipariş geçmişi bozulmaz.
        </p>

        <Field label="Gerekçe" htmlFor="delChildReason" error={state.fieldErrors?.reason}>
          <Textarea id="delChildReason" name="reason" rows={2} required minLength={3} maxLength={500} />
        </Field>

        <Button type="submit" size="lg" variant="outline" loading={pending}
          className="!border-danger !text-danger hover:!bg-danger-soft">
          Kaydı sil
        </Button>
      </form>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-right text-[14px] font-semibold">{value}</span>
    </div>
  );
}


/**
 * Cinsiyet seçimi — ikonlu kutular.
 *
 * Sitedeki çocuk ekleme ekranıyla aynı görsel dil kullanılır; yönetici
 * ile kullanıcı aynı arayüzü görür.
 */
function GenderBoxes({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = React.useState(defaultValue);

  const options = [
    { value: "female", label: "Kız", icon: IconGirl },
    { value: "male", label: "Erkek", icon: IconBoy },
    { value: "unspecified", label: "Belirtilmemiş", icon: IconChild },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink2">Cinsiyet</span>
      <input type="hidden" name="gender" value={value} />

      <div className="grid grid-cols-3 gap-2.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue(o.value)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-2 rounded-[14px] border-2 p-3 transition-all ${
                active ? "border-solid bg-chip"
                       : "border-line bg-surface hover:border-ink/25"
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
                active ? "bg-solid text-white" : "bg-chip text-muted"}`}>
                <Icon icon={o.icon} size={17} />
              </span>
              <span className="text-center text-[12px] font-semibold leading-tight">
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Takım seçimi — logolu kutular.
 *
 * Takım sayısı fazla olabildiği için arama kutusu vardır.
 */
function TeamBoxes({
  teams, defaultValue,
}: {
  teams: { id: string; name: string; logo_path?: string | null }[];
  defaultValue: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [query, setQuery] = React.useState("");

  const q = query.trim().toLocaleLowerCase("tr-TR");
  const list = q
    ? teams.filter((t) => t.name.toLocaleLowerCase("tr-TR").includes(q))
    : teams;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink2">Takım</span>
      <input type="hidden" name="teamId" value={value} />

      <Input value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Takım ara" className="!h-10 !text-[13.5px]" />

      <div className="ct-noscrollbar grid max-h-[220px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        {list.map((t) => {
          const active = value === t.id;
          const logo = publicStorageUrl("team-logos", t.logo_path ?? null);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setValue(t.id)}
              aria-pressed={active}
              title={t.name}
              className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 p-2 transition-all ${
                active ? "border-solid bg-chip"
                       : "border-line bg-surface hover:border-ink/25"
              }`}
            >
              {logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logo} alt="" className="h-8 w-8 object-contain" />
              ) : (
                <Icon icon={IconFootball} size={16} className="text-muted2" />
              )}
              <span className="line-clamp-2 text-center text-[10.5px] font-semibold leading-tight">
                {t.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
