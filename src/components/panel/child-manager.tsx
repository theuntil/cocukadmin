"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, Input, Select, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconChild, IconPlus, IconEdit, IconTrash, IconClose } from "@/components/ui/icons";
import { GenderPicker } from "@/components/ui/gender-picker";
import { addChild, updateChild, deleteChild, setChildPhoto, setChildNationalId } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { calcAge, formatDate, initials, publicStorageUrl } from "@/lib/utils";
import { PhotoPicker } from "@/components/ui/image-cropper";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { uploadChildPhoto } from "@/lib/upload";
import type { Child, City, Team } from "@/lib/types";
import { TeamPicker } from "@/components/ui/team-picker";
import { ChildPhoto } from "@/components/panel/child-photo";

export function ChildManager({ children, teams, cities }: { children: Child[]; teams: Team[]; cities: City[] }) {
  const [editing, setEditing] = React.useState<Child | null>(null);
  const [creating, setCreating] = React.useState(children.length === 0);
  const [removing, setRemoving] = React.useState<Child | null>(null);
  const [deleting, startDelete] = React.useTransition();

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const cityMap = new Map(cities.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      {!creating && !editing && (
        <div className="flex justify-end">
          <Button variant="solid" size="lg" onClick={() => setCreating(true)}>
            <Icon icon={IconPlus} size={17} /> Çocuk ekle
          </Button>
        </div>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Çocuk bilgilerini düzenle" : "Yeni çocuk ekle"}
        size="md"
      >
        <ChildForm
          key={editing?.id ?? "new"}
          child={editing}
          teams={teams}
          cities={cities}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      </Modal>

      {children.length === 0 && !creating ? (
        <EmptyState
          icon={<Icon icon={IconChild} size={26} />}
          title="Henüz çocuk kaydınız yok"
          description="Kombine kart çocuğun adına düzenlendiği için önce bir çocuk kaydı eklemeniz gerekiyor."
          action={<Button variant="solid" onClick={() => setCreating(true)}>Çocuk ekle</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <Card key={c.id} className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3.5">
                <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-display text-[16px] font-bold text-muted"
                  style={{ width: 52, height: 52 }}>
                  <ChildPhoto childId={c.id} name={`${c.first_name} ${c.last_name}`}
                    hasPhoto={Boolean(c.photo_path)} rounded="lg"
                    className="h-full w-full" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[17px] font-bold">{c.first_name} {c.last_name}</span>
                  <span className="text-[13.5px] text-muted">
                    {formatDate(c.birth_date)} · {calcAge(c.birth_date)} yaş
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[13.5px]">
                <Meta label="TAKIM" value={c.favorite_team_id ? (teamMap.get(c.favorite_team_id) ?? "—") : "—"} />
                <Meta label="ŞEHİR" value={c.city_id ? (cityMap.get(c.city_id) ?? "—") : "—"} />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-line2 pt-4">
                <Badge tone="green">Aktif</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(c); setCreating(false); }}>
                    <Icon icon={IconEdit} size={14} /> Düzenle
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(c)}
                    className="!text-danger hover:!bg-danger-soft" aria-label={`${c.first_name} kaydını sil`}>
                    <Icon icon={IconTrash} size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        loading={deleting}
        title="Çocuk kaydını sil"
        description={removing
          ? `${removing.first_name} ${removing.last_name} kaydı ve varsa fotoğrafı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
          : undefined}
        confirmLabel="Evet, sil"
        onConfirm={() => {
          const target = removing;
          if (!target) return;
          startDelete(async () => {
            const fd = new FormData();
            fd.set("id", target.id);
            await deleteChild(fd);
            setRemoving(null);
          });
        }}
      />

      <Alert tone="muted" title="Neden bu bilgiler?">
        Kart çocuğun adına düzenlendiği için ad, soyad ve doğum tarihi gerekir.
        Okul ve sağlık bilgisi istemiyoruz. Kimlik numarası zorunlu değildir;
        girerseniz ham hâliyle saklanmaz. Bu veriler yalnızca sizin hesabınızdan görülebilir.
      </Alert>
    </div>
  );
}

function ChildForm({
  child, teams, cities, onClose,
}: { child: Child | null; teams: Team[]; cities: City[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(child ? updateChild : addChild, IDLE);
  useActionToast(state);

  // Yeni kayıt eklendiğinde formu hemen kapatmıyoruz:
  // önce fotoğraf ekleme adımını gösteriyoruz (isteğe bağlı).
  const [justAdded, setJustAdded] = React.useState<Child | null>(null);

  React.useEffect(() => {
    if (!state.ok) return;
    if (child) { onClose(); return; }
    const created = state.data?.child as Child | undefined;
    if (created) setJustAdded(created);
    else onClose();
  }, [state, child, onClose]);

  if (justAdded) {
    return (
      <div className="flex flex-col gap-5">
        <Alert tone="green">{justAdded.first_name} eklendi.</Alert>

        <span className="text-[13.5px] text-muted">
          Profil fotoğrafı ve kimlik bilgisi isteğe bağlıdır; şimdi ya da sonra
          ekleyebilirsiniz.
        </span>

        <ChildPhotoField child={justAdded} />

        <NationalIdField child={justAdded} />

        <Button variant="solid" size="lg" onClick={onClose}>Tamam</Button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const minDate = new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      {child && <ChildPhotoField child={child} />}

      <form action={action} className="flex flex-col gap-4">
        {child && <input type="hidden" name="id" value={child.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="cFirstName" error={state.fieldErrors?.firstName}>
            <Input id="cFirstName" name="firstName" required maxLength={80} defaultValue={child?.first_name} />
          </Field>
          <Field label="Soyad" htmlFor="cLastName" error={state.fieldErrors?.lastName}>
            <Input id="cLastName" name="lastName" required maxLength={80} defaultValue={child?.last_name} />
          </Field>
        </div>

        <Field label="Doğum tarihi" htmlFor="birthDate" hint="0–18 yaş" error={state.fieldErrors?.birthDate}>
          <Input id="birthDate" name="birthDate" type="date" required min={minDate} max={today}
            defaultValue={child?.birth_date?.slice(0, 10)} />
        </Field>

        <GenderPicker defaultValue={child?.gender ?? ""} error={state.fieldErrors?.gender} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TeamPicker teams={teams} label="Takımı"
            defaultValue={child?.favorite_team_id ?? ""} />
          <Field label="Şehir" htmlFor="cCityId" hint="isteğe bağlı">
            <Select id="cCityId" name="cityId" defaultValue={child?.city_id ?? ""}>
              <option value="">Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" variant="solid" size="lg" loading={pending}>
            {child ? "Değişiklikleri kaydet" : "Çocuğu ekle"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>Vazgeç</Button>
        </div>
      </form>

      {child && <NationalIdField child={child} />}
    </div>
  );
}

/**
 * T.C. kimlik numarası — İSTEĞE BAĞLI.
 *
 * Bazı etkinliklerde kurum kaydı için istenebiliyor. Numara ham hâliyle
 * saklanmaz: veritabanına yalnızca geri döndürülemez özeti ve son 2 hanesi
 * yazılır. Boş bırakılıp kaydedilirse kayıt tamamen silinir.
 */
function NationalIdField({ child }: { child: Child }) {
  const [value, setValue] = React.useState("");
  const [saved, setSaved] = React.useState<string | null>(
    (child as Child & { national_id_last2?: string | null }).national_id_last2 ?? null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, startSave] = React.useTransition();

  const save = () => {
    setError(null);
    startSave(async () => {
      const fd = new FormData();
      fd.set("childId", child.id);
      fd.set("nationalId", value);
      const res = await setChildNationalId(IDLE, fd);
      if (res.ok) {
        setSaved(value.replace(/\D/g, "").slice(-2) || null);
        setValue("");
      } else {
        setError(res.message ?? "Kaydedilemedi.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line2 pt-5">
      <div className="flex flex-col gap-1">
        <span className="text-[13.5px] font-semibold text-ink2">
          T.C. kimlik numarası <span className="font-normal text-muted">· isteğe bağlı</span>
        </span>
        <span className="text-[12.5px] leading-[1.55] text-muted">
          Bazı etkinliklerde kurum kaydı için istenir. Numara ham hâliyle saklanmaz;
          yalnızca son 2 hanesi görünür.
        </span>
      </div>

      {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}

      {saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-field px-4 py-3">
          <span className="font-mono text-[14px] font-semibold">*********{saved}</span>
          <Button type="button" size="sm" variant="ghost" loading={busy}
            onClick={() => { setValue(""); setSaved(null); save(); }}
            className="!text-danger hover:!bg-danger-soft">
            Kaldır
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)}
            inputMode="numeric" maxLength={11} placeholder="11 haneli"
            className="max-w-[200px]" aria-label="T.C. kimlik numarası" />
          <Button type="button" variant="outline" loading={busy}
            disabled={value.replace(/\D/g, "").length !== 11} onClick={save}>
            Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11.5px] font-bold tracking-[.08em] text-muted2">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}


/** Çocuk fotoğrafı: seç → kırp → yükle → kaydet */
function ChildPhotoField({ child }: { child: Child }) {
  const [path, setPath] = React.useState<string | null>(child.photo_path);
  const [, startSave] = React.useTransition();

  /* Fotoğraf değişince adres aynı kaldığı için tarayıcı eski görseli
     gösterebilir; zaman damgası bunu engeller. */
  const [stamp, setStamp] = React.useState(() => Date.now());

  const save = (next: string | null) =>
    new Promise<void>((resolve) => {
      startSave(async () => {
        const fd = new FormData();
        fd.set("childId", child.id);
        if (next) fd.set("path", next);
        const res = await setChildPhoto(IDLE, fd);
        if (res.ok) { setPath(next); setStamp(Date.now()); }
        resolve();
      });
    });

  return (
    <div className="border-b border-line2 pb-5">
      <PhotoPicker
        label="Profil fotoğrafı"
        /* Fotoğraf güvenli uçtan gelir; depolama adresi kullanılmaz.
           Yükleme sonrası tarayıcı önbelleğini atlamak için zaman damgası. */
        currentUrl={path ? `/api/child-photo/${child.id}?v=${stamp}` : null}
        fallback={initials(child.first_name, child.last_name)}
        onUpload={async (blob) => {
          const uploaded = await uploadChildPhoto(child.id, blob);
          await save(uploaded);
        }}
        onRemove={async () => { await save(null); }}
      />
    </div>
  );
}
