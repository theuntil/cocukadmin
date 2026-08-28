"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Checkbox, Field, H3, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconTrash } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveEvent, deleteEvent } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { slugify } from "@/lib/utils";

interface EventRow {
  id: string; title: string; slug: string; description: string;
  cover_path: string | null; starts_at: string; ends_at: string | null;
  venue_name: string | null; venue_address: string | null;
  city_id: number | null; capacity: number | null;
  access_type: string; status: string;
  waitlist_enabled: boolean; guardian_required: boolean;
}

export function EventForm({
  event, cities,
}: { event: EventRow | null; cities: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveEvent, IDLE);
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [slug, setSlug] = React.useState(event?.slug ?? "");
  const [cover, setCover] = React.useState(event?.cover_path ?? "");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const deleteRef = React.useRef<HTMLFormElement>(null);

  const slugTouched = React.useRef(Boolean(event));
  React.useEffect(() => {
    if (!slugTouched.current) setSlug(slugify(title));
  }, [title]);

  const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/etkinlikler"
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Etkinlikler
        </Link>
        {event && (
          <Button type="button" variant="ghost" size="sm"
            onClick={() => setConfirmDelete(true)}
            className="!text-danger hover:!bg-danger-soft">
            <Icon icon={IconTrash} size={15} /> Sil
          </Button>
        )}
      </div>

      <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">
        {event ? "Etkinliği düzenle" : "Yeni etkinlik"}
      </h1>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <form action={action} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {event && <input type="hidden" name="id" value={event.id} />}
        <input type="hidden" name="coverPath" value={cover} />

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <Field label="Başlık" htmlFor="etitle" error={state.fieldErrors?.title}>
              <Input id="etitle" name="title" required maxLength={200}
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <Field label="Kısa yol (slug)" htmlFor="eslug" hint="boş bırakılırsa başlıktan üretilir">
              <Input id="eslug" name="slug" maxLength={200} value={slug}
                onChange={(e) => { slugTouched.current = true; setSlug(e.target.value); }} />
            </Field>

            <Field label="Açıklama" htmlFor="edesc" hint="HTML kullanabilirsiniz"
              error={state.fieldErrors?.description}>
              <Textarea id="edesc" name="description" required minLength={10} rows={12}
                defaultValue={event?.description ?? ""} />
            </Field>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">Yer ve zaman</H3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Başlangıç" htmlFor="startsAt" error={state.fieldErrors?.startsAt}>
                <Input id="startsAt" name="startsAt" type="datetime-local" required
                  defaultValue={toLocal(event?.starts_at ?? null)} />
              </Field>
              <Field label="Bitiş" htmlFor="endsAt" hint="isteğe bağlı" error={state.fieldErrors?.endsAt}>
                <Input id="endsAt" name="endsAt" type="datetime-local"
                  defaultValue={toLocal(event?.ends_at ?? null)} />
              </Field>
            </div>

            <Field label="Mekan adı" htmlFor="venueName">
              <Input id="venueName" name="venueName" maxLength={200}
                defaultValue={event?.venue_name ?? ""} />
            </Field>

            <Field label="Adres" htmlFor="venueAddress">
              <Textarea id="venueAddress" name="venueAddress" rows={2} maxLength={500}
                defaultValue={event?.venue_address ?? ""} />
            </Field>

            <Field label="Şehir" htmlFor="ecity">
              <Select id="ecity" name="cityId" defaultValue={event?.city_id ?? ""}>
                <option value="">Seçiniz</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">Yayın ve katılım</H3>

            {/* Yeni etkinlik doğrudan yayına girer; durum yalnızca düzenlerken
                anlamlıdır (yayından kaldırma, arşivleme). */}
            {event ? (
              <Field label="Durum" htmlFor="estatus">
              <Select id="estatus" name="status" defaultValue={event?.status ?? "draft"}>
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
                <option value="ongoing">Devam ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </Select>
            </Field>
            ) : (
              <input type="hidden" name="status" value="published" />
            )}

            <Field label="Kimler katılabilir?" htmlFor="accessType">
              <Select id="accessType" name="accessType" defaultValue={event?.access_type ?? "public"}>
                <option value="public">Herkese açık</option>
                <option value="card_holders">Kombine kart sahipleri</option>
                <option value="team_card_holders">Aynı takımın kart sahipleri</option>
                <option value="invite_only">Yalnızca davetli</option>
              </Select>
            </Field>

            <Field label="Kontenjan" htmlFor="capacity" hint="boşsa sınırsız">
              <Input id="capacity" name="capacity" type="number" min={0}
                defaultValue={event?.capacity ?? ""} />
            </Field>

            <Checkbox id="waitlist" name="waitlist" label="Bekleme listesi açık"
              defaultChecked={event?.waitlist_enabled ?? false} />
            <Checkbox id="guardianRequired" name="guardianRequired"
              label="Veli katılımı zorunlu"
              defaultChecked={event?.guardian_required ?? false} />

            <Button type="submit" size="lg" loading={pending}>
              {event ? "Değişiklikleri kaydet" : "Etkinliği oluştur"}
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[18px]">Kapak görseli</H3>
            <MediaPicker value={cover} onChange={setCover} bucket="event-media" />
          </Card>
        </div>
      </form>

      {event && (
        <>
          <form ref={deleteRef} action={deleteEvent} className="hidden">
            <input type="hidden" name="id" value={event.id} />
          </form>
          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title="Etkinlik silinsin mi?"
            description={`"${event.title}" ve tüm kayıtları silinecek. Bu işlem geri alınamaz.`}
            confirmLabel="Evet, sil"
            onConfirm={() => { setConfirmDelete(false); deleteRef.current?.requestSubmit(); }}
          />
        </>
      )}
    </div>
  );
}
