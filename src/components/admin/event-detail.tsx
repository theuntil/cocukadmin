"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, ButtonLink, Card, Divider, H3 } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import {
  IconArrowLeft, IconTrash, IconEdit, IconQr, IconUsers, IconCalendar,
  IconLocation, IconCheck, IconClock, IconTicket,
} from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { regenerateEventQr, removeEvent, toggleCheckIn } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { formatDate, publicStorageUrl } from "@/lib/utils";
import { ChildPhoto } from "@/components/admin/child-photo";

interface Registration {
  id: string; status: string; attendee_count: number;
  created_at: string; checked_in_at: string | null;
  child_id: string | null; child_name: string | null; child_photo: string | null;
  guest_name: string | null;
  parent_id: string | null; parent_name: string | null; parent_email: string | null;
  card_number: string | null;
}

interface EventData {
  id: string; title: string; slug: string;
  summary: string | null; description: string | null;
  event_type: string; status: string;
  cover_path: string | null; qr_token: string | null;
  starts_at: string; ends_at: string | null;
  capacity: number | null; access_type: string;
  min_age: number | null; max_age: number | null; fee: number | null;
  registration_required: boolean; registration_note: string | null;
  contact_phone: string | null;
  venue_name: string | null; venue_address: string | null;
  city_name: string | null; published_at: string | null; created_at: string;
  stats: {
    total: number; confirmed: number; waitlisted: number;
    cancelled: number; attended: number; seats: number;
  };
  registrations: Registration[];
}

const STATUS_TR: Record<string, string> = {
  draft: "Taslak", published: "Yayında", ongoing: "Devam ediyor",
  completed: "Tamamlandı", cancelled: "İptal",
};

const ACCESS_TR: Record<string, string> = {
  public: "Herkese açık",
  card_holders: "Kombine kart sahipleri",
  team_card_holders: "Takım kartı sahipleri",
  invite_only: "Davetliler",
};

export function EventDetail({
  event, canDelete,
}: { event: EventData; canDelete: boolean }) {
  const [removing, setRemoving] = React.useState(false);
  const [delState, delAction, deleting] = useActionState(removeEvent, IDLE);
  const delRef = React.useRef<HTMLFormElement>(null);

  const cover = publicStorageUrl("event-media", event.cover_path);
  const past = new Date(event.starts_at).getTime() < Date.now();

  return (
    <div className="flex flex-col gap-6">
      {/* Üst çubuk: geri + işlemler */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/etkinlikler"
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Etkinlikler
        </Link>

        <div className="flex items-center gap-2">
          <ButtonLink href={`/etkinlikler/${event.id}/duzenle`} size="sm" variant="outline">
            <Icon icon={IconEdit} size={14} /> Düzenle
          </ButtonLink>
          {canDelete && (
            <Button size="sm" variant="ghost" onClick={() => setRemoving(true)}
              aria-label="Etkinliği sil"
              className="!text-danger hover:!bg-danger-soft">
              <Icon icon={IconTrash} size={15} />
            </Button>
          )}
        </div>
      </div>

      {delState.message && (
        <Alert tone={delState.ok ? "green" : "danger"}>{delState.message}</Alert>
      )}

      {/* Kapak + başlık */}
      <Card className="overflow-hidden p-0">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cover} alt="" className="h-[220px] w-full object-cover sm:h-[280px]" />
        ) : (
          <div className="flex h-[140px] items-center justify-center bg-chip">
            <Icon icon={IconCalendar} size={28} className="text-muted2" />
          </div>
        )}

        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[26px] font-semibold tracking-[-.03em]">
              {event.title}
            </h1>
            <Badge tone={event.status === "published" ? "green"
              : event.status === "cancelled" ? "danger" : "muted"}>
              {STATUS_TR[event.status] ?? event.status}
            </Badge>
            {past && <Badge tone="muted">Geçmiş</Badge>}
          </div>

          {event.summary && (
            <p className="max-w-[720px] text-[14.5px] leading-[1.6] text-ink2">
              {event.summary}
            </p>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={IconCalendar} size={14} />
              {formatDate(event.starts_at, true)}
            </span>
            {event.ends_at && (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={IconClock} size={14} />
                Bitiş: {formatDate(event.ends_at, true)}
              </span>
            )}
            {(event.venue_name || event.city_name) && (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={IconLocation} size={14} />
                {[event.venue_name, event.city_name].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Sayılar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={IconUsers} label="Toplam kayıt" value={event.stats.total} />
        <Stat icon={IconCheck} label="Onaylı" value={event.stats.confirmed} />
        <Stat icon={IconTicket} label="Katılan" value={event.stats.attended} />
        <Stat icon={IconUsers} label="Ayrılan koltuk"
          value={event.stats.seats}
          hint={event.capacity ? `${event.capacity} kapasite` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Katılımcılar */}
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Icon icon={IconUsers} size={18} className="text-muted" />
              <H3 className="text-[18px]">Katılımcılar ({event.registrations.length})</H3>
            </div>
            {event.stats.waitlisted > 0 && (
              <Badge tone="orange">{event.stats.waitlisted} sırada</Badge>
            )}
          </div>

          {event.registrations.length === 0 ? (
            <span className="py-6 text-center text-[13.5px] text-muted">
              Henüz kayıt yok.
            </span>
          ) : (
            <div className="flex flex-col divide-y divide-line2">
              {event.registrations.map((r) => (
                <RegistrationRow key={r.id} reg={r} eventId={event.id} />
              ))}
            </div>
          )}
        </Card>

        {/* Sağ sütun */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <QrPanel eventId={event.id} token={event.qr_token} slug={event.slug} />

          <Card className="flex flex-col gap-3.5 p-6">
            <H3 className="text-[17px]">Ayrıntılar</H3>
            <Divider />
            <Row label="Katılım" value={ACCESS_TR[event.access_type] ?? event.access_type} />
            <Row label="Kayıt" value={event.registration_required ? "Zorunlu" : "Gerekmiyor"} />
            <Row label="Kapasite" value={event.capacity ? String(event.capacity) : "Sınırsız"} />
            <Row label="Yaş aralığı"
              value={event.min_age || event.max_age
                ? `${event.min_age ?? 0} – ${event.max_age ?? "∞"}` : "Sınır yok"} />
            <Row label="Ücret" value={event.fee ? `${event.fee} ₺` : "Ücretsiz"} />
            {event.contact_phone && <Row label="İletişim" value={event.contact_phone} />}
          </Card>
        </div>
      </div>

      <form ref={delRef} action={delAction} className="hidden">
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="reason" value="Yönetici tarafından silindi" />
      </form>

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        loading={deleting}
        title={`${event.title} silinsin mi?`}
        description="Kayıtlı katılımcısı varsa etkinlik silinmez, iptal edilir. Böylece kayıtlar ve bildirim geçmişi korunur."
        confirmLabel="Evet, sil"
        onConfirm={() => delRef.current?.requestSubmit()}
      />
    </div>
  );
}

/* ── QR ── */
function QrPanel({
  eventId, token, slug,
}: { eventId: string; token: string | null; slug: string }) {
  const [state, action, pending] = useActionState(regenerateEventQr, IDLE);
  const [asking, setAsking] = React.useState(false);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";
  const target = token ? `${site}/e/${token}` : null;
  const qrUrl = target
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${
        encodeURIComponent(target)}`
    : null;

  React.useEffect(() => { if (state.ok) setAsking(false); }, [state.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconQr} size={18} className="text-muted" />
        <H3 className="text-[17px]">Etkinlik QR kodu</H3>
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      {qrUrl ? (
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-[16px] border border-line bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Etkinlik QR kodu" width={200} height={200} />
          </span>
          <span className="text-center text-[12.5px] leading-[1.5] text-muted">
            Girişte bu kodu okutun. Kod etkinliğe özeldir; adres tahmin edilemez.
          </span>
          <a href={qrUrl} download={`etkinlik-${slug}.png`}
            className="text-[13px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
            QR görselini indir
          </a>
        </div>
      ) : (
        <span className="text-[13.5px] text-muted">Bu etkinliğin QR anahtarı yok.</span>
      )}

      {!asking ? (
        <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
          QR&apos;ı yenile
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-3 border-t border-line2 pt-4">
          <input type="hidden" name="eventId" value={eventId} />
          <p className="text-[13px] leading-[1.55] text-ink2">
            Yeni QR üretilecek, <strong>eski QR anında geçersizleşecek</strong>.
            Basılı materyaldeki kodlar çalışmaz olur.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending}>Evet, yenile</Button>
            <Button type="button" size="sm" variant="ghost"
              onClick={() => setAsking(false)}>Vazgeç</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ── Katılımcı satırı ── */
function RegistrationRow({ reg, eventId }: { reg: Registration; eventId: string }) {
  const [state, action, pending] = useActionState(toggleCheckIn, IDLE);
  const formRef = React.useRef<HTMLFormElement>(null);

  const name = reg.child_name ?? reg.guest_name ?? reg.parent_name ?? "İsimsiz";
  const attended = Boolean(reg.checked_in_at);

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <ChildPhoto childId={reg.child_id ?? ""} name={name}
        hasPhoto={Boolean(reg.child_photo)} size="sm" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold">{name}</span>
        <span className="truncate text-[12px] text-muted">
          {reg.parent_name ?? reg.parent_email ?? "—"}
          {reg.card_number ? ` · ${reg.card_number}` : ""}
          {reg.attendee_count > 1 ? ` · ${reg.attendee_count} kişi` : ""}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={reg.status === "confirmed" ? "green"
          : reg.status === "waitlisted" ? "orange"
          : reg.status === "cancelled" ? "danger" : "muted"}>
          {reg.status === "confirmed" ? "Onaylı"
            : reg.status === "waitlisted" ? "Sırada"
            : reg.status === "cancelled" ? "İptal" : reg.status}
        </Badge>

        {reg.status !== "cancelled" && (
          <>
            <form ref={formRef} action={action} className="hidden">
              <input type="hidden" name="registrationId" value={reg.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="undo" value={attended ? "true" : "false"} />
            </form>

            <Button size="sm" variant={attended ? "solid" : "outline"} loading={pending}
              onClick={() => formRef.current?.requestSubmit()}
              className={attended ? "!bg-green !text-white" : ""}>
              <Icon icon={IconCheck} size={13} />
              {attended ? "Katıldı" : "İşaretle"}
            </Button>
          </>
        )}
      </div>

      {state.message && !state.ok && (
        <span className="w-full text-[12px] text-danger">{state.message}</span>
      )}
    </div>
  );
}

function Stat({
  icon, label, value, hint,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  label: string; value: number; hint?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-chip">
        <Icon icon={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-[22px] font-semibold leading-none tracking-[-.02em]">
          {value}
        </span>
        <span className="truncate text-[12.5px] text-muted">
          {label}{hint ? ` · ${hint}` : ""}
        </span>
      </div>
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
