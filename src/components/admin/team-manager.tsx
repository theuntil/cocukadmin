"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconEdit, IconTrash, IconFootball } from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveTeam, deleteTeam } from "@/lib/actions/teams";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { publicStorageUrl } from "@/lib/utils";

interface Team {
  id: string; name: string; slug: string; short_name: string | null;
  logo_path: string | null; color_primary: string | null;
  city_id: number | null; is_active: boolean; sort_order: number;
}

export function TeamManager({
  teams, cities,
}: { teams: Team[]; cities: { id: number; name: string }[] }) {
  const [editing, setEditing] = React.useState<Team | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [removing, setRemoving] = React.useState<Team | null>(null);
  const [delState, delAction, deleting] = useActionState(deleteTeam, IDLE);
  const delRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => { if (delState.ok) setRemoving(null); }, [delState.ok]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Takımlar</h1>
          <span className="text-[14px] text-muted">
            {teams.length} takım · {teams.filter((t) => t.is_active).length} aktif
          </span>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Icon icon={IconPlus} size={17} /> Yeni takım
        </Button>
      </div>

      {delState.message && (
        <Alert tone={delState.ok ? "green" : "danger"}>{delState.message}</Alert>
      )}

      {teams.length === 0 ? (
        <EmptyState icon={<Icon icon={IconFootball} size={26} />} title="Henüz takım yok"
          action={<Button onClick={() => setCreating(true)}>Yeni takım</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const logo = publicStorageUrl("team-logos", t.logo_path);
            return (
              <Card key={t.id} className={`flex flex-col gap-4 p-5 ${!t.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3.5">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-chip">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Icon icon={IconFootball} size={20} className="text-muted2" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[15px] font-semibold">{t.name}</span>
                    <span className="truncate font-mono text-[12px] text-muted">{t.slug}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!t.is_active && <Badge tone="muted">Pasif</Badge>}
                      {t.short_name && <Badge tone="muted">{t.short_name}</Badge>}
                      {t.color_primary && (
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted">
                          <span className="h-3 w-3 rounded-full border border-line"
                            style={{ background: t.color_primary }} />
                          {t.color_primary}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex gap-2 border-t border-line2 pt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)} className="flex-1">
                    <Icon icon={IconEdit} size={14} /> Düzenle
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(t)}
                    className="!text-danger hover:!bg-danger-soft">
                    <Icon icon={IconTrash} size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TeamForm key={`new-${creating}`} open={creating}
        onClose={() => setCreating(false)} team={null} cities={cities} />
      <TeamForm key={editing?.id ?? "edit-closed"} open={Boolean(editing)}
        onClose={() => setEditing(null)} team={editing} cities={cities} />

      <form ref={delRef} action={delAction} className="hidden">
        <input type="hidden" name="id" value={removing?.id ?? ""} />
      </form>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        loading={deleting}
        title={`${removing?.name ?? ""} silinsin mi?`}
        description="Bu takıma bağlı kart, sipariş veya imza varsa silinmez; pasife alınır. Böylece mevcut kayıtlar bozulmaz."
        confirmLabel="Evet, sil"
        onConfirm={() => delRef.current?.requestSubmit()}
      />
    </div>
  );
}

function TeamForm({
  open, onClose, team, cities,
}: {
  open: boolean; onClose: () => void; team: Team | null;
  cities: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveTeam, IDLE);
  const [logo, setLogo] = React.useState(team?.logo_path ?? "");

  React.useEffect(() => { setLogo(team?.logo_path ?? ""); }, [team]);
  useActionEffect(state, onClose);

  return (
    <Modal open={open} onClose={onClose} title={team ? "Takımı düzenle" : "Yeni takım"} size="md">
      <form action={action} className="flex flex-col gap-4">
        {team && <input type="hidden" name="id" value={team.id} />}
        <input type="hidden" name="logoPath" value={logo} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Field label="Takım adı" htmlFor="tName" error={state.fieldErrors?.name}>
          <Input id="tName" name="name" required maxLength={120} defaultValue={team?.name ?? ""} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kısa yol" htmlFor="tSlug" hint="boşsa addan üretilir">
            <Input id="tSlug" name="slug" maxLength={120} defaultValue={team?.slug ?? ""} />
          </Field>
          <Field label="Kısaltma" htmlFor="tShort" hint="örn. GS">
            <Input id="tShort" name="shortName" maxLength={12} defaultValue={team?.short_name ?? ""} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ana renk" htmlFor="tColor" hint="#RRGGBB"
            error={state.fieldErrors?.colorPrimary}>
            <Input id="tColor" name="colorPrimary" maxLength={7} placeholder="#A90432"
              defaultValue={team?.color_primary ?? ""} />
          </Field>
          <Field label="Şehir" htmlFor="tCity">
            <Select id="tCity" name="cityId" defaultValue={team?.city_id ?? ""}>
              <option value="">Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Sıra" htmlFor="tSort" hint="küçük olan önce görünür">
          <Input id="tSort" name="sortOrder" type="number" defaultValue={team?.sort_order ?? 100} />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink2">Takım logosu</span>
          <MediaPicker value={logo} onChange={setLogo} bucket="team-logos" />
        </div>

        <Checkbox id="tActive" name="isActive" label="Aktif (sitede görünür)"
          defaultChecked={team?.is_active ?? true} />

        <Button type="submit" size="lg" loading={pending}>
          {team ? "Değişiklikleri kaydet" : "Takımı ekle"}
        </Button>
      </form>
    </Modal>
  );
}
