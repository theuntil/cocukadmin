"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, H3, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconEdit, IconCheck, IconClose, IconUser } from "@/components/ui/icons";
import { TeamPicker } from "@/components/ui/team-picker";
import { updateMember } from "@/lib/actions/members";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

interface Member {
  id: string; first_name: string | null; last_name: string | null;
  username: string | null; account_status: string;
  city: string | null; team: string | null;
  city_id: number | null; team_id: string | null;
  email_verified_at: string | null; phone_verified_at: string | null;
}

const STATUSES = [
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Askıda" },
  { value: "pending", label: "Beklemede" },
];

/**
 * Üye bilgilerini düzenleme.
 *
 * Görüntüleme ve düzenleme aynı kartta: "Düzenle" ile alanlar açılır,
 * kaydedince kapanır. Doğrulama durumları elle işaretlenebilir — telefonu
 * çalışmayan üye için destek ekibi doğrulamayı tamamlayabilsin diye.
 */
export function MemberEditor({
  member, cities, teams,
}: {
  member: Member;
  cities: { id: number; name: string }[];
  teams: { id: string; name: string; short_name?: string | null;
           logo_path?: string | null; city_name?: string | null }[];
}) {
  const [state, action, pending] = useActionState(updateMember, IDLE);
  useActionToast(state);
  const [editing, setEditing] = React.useState(false);
  const [teamId, setTeamId] = React.useState(member.team_id ?? "");

  React.useEffect(() => { if (state.ok) setEditing(false); }, [state.ok]);

  if (!editing) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon icon={IconUser} size={18} className="text-muted" />
            <H3 className="text-[18px]">Profil</H3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Icon icon={IconEdit} size={14} /> Düzenle
          </Button>
        </div>

        {state.message && state.ok && <Alert tone="green">{state.message}</Alert>}

        <div className="flex flex-col gap-3">
          <Row label="Ad soyad"
            value={[member.first_name, member.last_name].filter(Boolean).join(" ") || "—"} />
          <Row label="Kullanıcı adı" value={member.username ? `@${member.username}` : "—"} />
          <Row label="Şehir" value={member.city ?? "—"} />
          <Row label="Takım" value={member.team ?? "—"} />
          <Row label="Hesap durumu"
            value={STATUSES.find((s) => s.value === member.account_status)?.label
              ?? member.account_status} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
          <VerifyChip label="E-posta" ok={Boolean(member.email_verified_at)} />
          <VerifyChip label="Telefon" ok={Boolean(member.phone_verified_at)} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconEdit} size={18} className="text-muted" />
        <H3 className="text-[18px]">Profili düzenle</H3>
      </div>

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="userId" value={member.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="mFirst" error={state.fieldErrors?.firstName}>
            <Input id="mFirst" name="firstName" maxLength={80}
              defaultValue={member.first_name ?? ""} />
          </Field>
          <Field label="Soyad" htmlFor="mLast" error={state.fieldErrors?.lastName}>
            <Input id="mLast" name="lastName" maxLength={80}
              defaultValue={member.last_name ?? ""} />
          </Field>
        </div>

        <Field label="Kullanıcı adı" htmlFor="mUsername"
          hint="benzersiz olmalı" error={state.fieldErrors?.username}>
          <Input id="mUsername" name="username" maxLength={30}
            defaultValue={member.username ?? ""} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Şehir" htmlFor="mCity">
            <Select id="mCity" name="cityId" defaultValue={member.city_id ?? ""}>
              <option value="">Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {/* Açılır liste yerine alttan yükselen seçici: takımlar
              logolarıyla görünüyor, aranabiliyor. Sitedeki başvuru
              formuyla aynı bileşen — iki yerde iki farklı deneyim
              olmasın. */}
          <TeamPicker teams={teams} label="Takım"
            defaultValue={member.team_id ?? ""} onChange={setTeamId} />
          <input type="hidden" name="teamId" value={teamId} />
        </div>

        <Field label="Hesap durumu" htmlFor="mStatus">
          <Select id="mStatus" name="status" defaultValue={member.account_status}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>

        {/* Doğrulama durumu buradan kaldırıldı: artık "İletişim"
            kartında, bilginin kendisiyle birlikte yönetiliyor.
            Aynı şeyi iki yerden değiştirmek karışıklık yaratıyordu. */}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending}>Kaydet</Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Vazgeç</Button>
        </div>
      </form>
    </Card>
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

function VerifyChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Badge tone={ok ? "green" : "muted"}>
      <Icon icon={ok ? IconCheck : IconClose} size={11} /> {label}
    </Badge>
  );
}
