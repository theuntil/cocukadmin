"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Card, Field, H3, Input, Textarea } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import {
  IconTrash,  IconArrowLeft, IconQr, IconClock, IconCheck, IconClose, IconCard,
  IconCopy, IconEdit, IconArrowRight, IconFootball, IconOrder, IconAlert, IconCalendar,
} from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setCardStatus, regenerateQr, extendCard, deleteCard } from "@/lib/actions/cards";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { formatDate, formatMoney, publicStorageUrl } from "@/lib/utils";
import { ChildPhoto } from "@/components/admin/child-photo";

interface CardData {
  id: string; card_number: string; qr_token: string | null;
  status: string; lifecycle: string;
  valid_from: string | null; valid_until: string | null; days_left: number | null;
  activated_at: string | null; created_at: string;
  child: { id: string; first_name: string; last_name: string;
           birth_date: string; photo_path: string | null } | null;
  team: { id: string; name: string; logo_path: string | null } | null;
  owner: { id: string; first_name: string | null; last_name: string | null;
           email: string | null; avatar_path: string | null } | null;
  orders: { id: string; order_number: string; status: string; amount: number; created_at: string }[];
  events: {
    registration_id: string; event_id: string; title: string; slug: string;
    starts_at: string; city_name: string | null; venue_name: string | null;
    status: string; attended: boolean;
  }[];
  history: { action: string; created_at: string; new_data: Record<string, unknown> | null }[];
}

/* Durum kutucukları — liste yerine görsel seçim.
   ★ "Beklemede" ve "Hazırlanıyor" kaldırıldı (migration 074): kart
     dijital, ödeme tamamlanınca anında aktifleşiyor, arada aşama yok. */
const STATUSES = [
  { value: "active",     label: "Aktif",        icon: IconCheck, tone: "green" as const,
    hint: "Kullanıma hazır" },
  { value: "suspended",  label: "Askıda",       icon: IconAlert, tone: "orange" as const,
    hint: "Geçici olarak durduruldu" },
  { value: "expired",    label: "Süresi doldu", icon: IconClock, tone: "danger" as const,
    hint: "Yenilenmesi gerekiyor" },
  { value: "cancelled",  label: "İptal",        icon: IconClose, tone: "danger" as const,
    hint: "Geri alınamaz" },
];

/* Hangi durumdan hangisine geçilebilir — veritabanındaki kuralın aynısı */
const ALLOWED: Record<string, string[]> = {
  active:     ["expired", "suspended", "cancelled"],
  suspended:  ["active", "cancelled", "expired"],
  expired:    ["active", "cancelled"],
  cancelled:  [],

  /* ┌─ ESKİ DURUMLAR: ÇIKIŞ VAR, GİRİŞ YOK ─────────────────────┐
     │ Bu durumlar artık üretilmiyor (kart dijital; hazırlık ve   │
     │ kargo aşaması yok). Ama eski kayıtlar bu hâlde kalmış      │
     │ olabilir — çıkış yolu bırakıldı ki takılıp kalmasınlar.    │
     └────────────────────────────────────────────────────────────┘ */
  pending:    ["active", "cancelled"],
  processing: ["active", "cancelled"],
  ready:      ["active", "cancelled"],
  shipped:    ["active", "cancelled"],
  delivered:  ["active", "cancelled"],
  lost:       ["active", "cancelled"],
};

export function CardDetail({ card, canExtend }: { card: CardData; canExtend: boolean }) {
  const childName = card.child
    ? `${card.child.first_name} ${card.child.last_name}` : "Çocuk kaydı yok";
  const ownerName = card.owner
    ? [card.owner.first_name, card.owner.last_name].filter(Boolean).join(" ") || "İsimsiz"
    : "—";

  const router = useRouter();
  const toast = useToast();
  const [silOnay, setSilOnay] = React.useState(false);
  const [siliniyor, setSiliniyor] = React.useState(false);
  const [zorla, setZorla] = React.useState(false);
  const [silUyari, setSilUyari] = React.useState<string | null>(null);

  const kartiSil = async () => {
    setSiliniyor(true);
    try {
      const res = await deleteCard(card.id, zorla);
      if (res.ok) {
        toast.success(res.message ?? "Kart silindi");
        router.push("/kartlar");
      } else {
        /* "Kart hâlâ geçerli" uyarısı pencerede kalsın ki kullanıcı
           okuyup onay kutusunu işaretleyebilsin. */
        setSilUyari(res.message ?? "Silinemedi");
        toast.error("Silinemedi", res.message);
      }
    } finally {
      setSiliniyor(false);
    }
  };

  const lifecycleTone = card.lifecycle === "expired" ? "danger"
    : card.lifecycle === "expiring_soon" ? "orange"
    : card.lifecycle === "active" ? "green" : "muted";

  return (
    <div className="flex flex-col gap-6">
      {/* Üst çubuk: geri + kart no + durum rozeti */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/kartlar"
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Kombine kartlar
        </Link>
        <div className="flex items-center gap-2.5">
          <Badge tone={lifecycleTone}>
            {card.days_left !== null && card.lifecycle !== "expired"
              ? `${card.days_left} gün kaldı`
              : card.lifecycle === "expired" ? "Süresi doldu" : "—"}
          </Badge>

          {/* Kaydı sil — iptalden ayrı iş: iptal kaydı korur, silme
              kaydı kaldırır (test kartları, yanlış giriş). */}
          <button type="button" onClick={() => { setSilOnay(true); setSilUyari(null); }}
            title="Kart kaydını sil"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger">
            <Icon icon={IconTrash} size={16} />
          </button>
        </div>
      </div>

      {/* Kart görseli + kimlik */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <CardVisual card={card} childName={childName} />

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[17px]">Kart bilgileri</H3>

            <CopyRow label="Kart numarası" value={card.card_number} mono />

            <Row label="Geçerlilik"
              value={card.valid_from && card.valid_until
                ? `${formatDate(card.valid_from)} — ${formatDate(card.valid_until)}`
                : "—"} />
            <Row label="Aktifleşme"
              value={card.activated_at ? formatDate(card.activated_at, true) : "Henüz aktifleşmedi"} />
            <Row label="Oluşturulma" value={formatDate(card.created_at, true)} />
          </Card>

          {/* Sahip ve çocuk */}
          <Card className="flex flex-col gap-4 p-6">
            <H3 className="text-[17px]">Kimin kartı</H3>

            {card.owner ? (
              <Link href={`/uyeler/${card.owner.id}`}
                className="flex items-center gap-3 rounded-[12px] p-2 transition-colors hover:bg-chip">
                <Avatar name={ownerName} path={card.owner.avatar_path}
                  userId={card.owner.id} size="md" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[14.5px] font-semibold">{ownerName}</span>
                  <span className="truncate text-[12.5px] text-muted">
                    {card.owner.email ?? "—"}
                  </span>
                </div>
                <Icon icon={IconArrowRight} size={15} className="ml-auto shrink-0 text-muted" />
              </Link>
            ) : (
              <span className="text-[13.5px] text-muted">Sahip bilgisi yok</span>
            )}

            {card.child ? (
              <Link href={`/cocuklar/${card.child.id}`}
                className="flex items-center gap-3 rounded-[12px] border-t border-line2 p-2 pt-4 transition-colors hover:bg-chip">
                <ChildPhoto childId={card.child.id} name={childName}
                  hasPhoto={Boolean(card.child.photo_path)} size="md" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[14.5px] font-semibold">{childName}</span>
                  <span className="text-[12.5px] text-muted">
                    {formatDate(card.child.birth_date)}
                  </span>
                </div>
                <Icon icon={IconArrowRight} size={15} className="ml-auto shrink-0 text-muted" />
              </Link>
            ) : (
              <div className="flex items-center gap-3 border-t border-line2 pt-4">
                <span className="text-[13.5px] text-muted">Çocuk kaydı yok</span>
              </div>
            )}

            {card.team && (
              <div className="flex items-center gap-3 border-t border-line2 pt-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-chip">
                  {publicStorageUrl("team-logos", card.team.logo_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicStorageUrl("team-logos", card.team.logo_path)!} alt=""
                      className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Icon icon={IconFootball} size={17} className="text-muted2" />
                  )}
                </span>
                <span className="text-[14.5px] font-semibold">{card.team.name}</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      <StatusPicker cardId={card.id} current={card.status} />

      <div className="grid gap-6 lg:grid-cols-2">
        <QrPanel cardId={card.id} token={card.qr_token} />
        {canExtend && <ExtendPanel cardId={card.id} validUntil={card.valid_until} />}
      </div>

      <EventsPanel events={card.events ?? []} />

      <div className="grid gap-6 lg:grid-cols-2">
        <OrdersPanel orders={card.orders} />
        <HistoryPanel history={card.history} />
      </div>

      <ConfirmDialog
        open={silOnay}
        onClose={() => { setSilOnay(false); setZorla(false); setSilUyari(null); }}
        loading={siliniyor}
        title={`${card.card_number} kaydı silinsin mi?`}
        description={silUyari ??
          "Kart kaydı tamamen kaldırılacak. Sipariş silinmez, yalnızca kart bağı kopar. Bu işlem geri alınamaz."}
        confirmLabel="Kalıcı olarak sil"
        onConfirm={() => void kartiSil()}
        extra={
          <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] bg-field px-3.5 py-3">
            <input type="checkbox" checked={zorla} onChange={(e) => setZorla(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--solid)]" />
            <span className="text-[12.5px] leading-[1.5] text-ink2">
              Kart geçerli olsa bile sil.
              <span className="block text-muted">
                Çocuk bu kartla etkinliklere giremez hâle gelir.
              </span>
            </span>
          </label>
        }
      />
    </div>
  );
}

/* ── Kart görseli ── */
function CardVisual({ card, childName }: { card: CardData; childName: string }) {
  const teamLogo = publicStorageUrl("team-logos", card.team?.logo_path ?? null);
  const expired = card.lifecycle === "expired";

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-[24px] p-7 text-white shadow-[0_16px_40px_-16px_rgba(15,31,26,.5)] ${
        expired ? "grayscale" : ""}`}
      style={{
        aspectRatio: "1.586 / 1",
        background: "linear-gradient(140deg, #14352A 0%, #1D4936 55%, #245B41 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold tracking-[.2em] text-white/55">
            ÇOCUK TRİBÜNÜ
          </span>
          <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
            Kombine Kart
          </span>
        </div>

        {teamLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teamLogo} alt="" className="h-14 w-14 object-contain" />
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[10.5px] font-bold tracking-[.16em] text-white/50">KART SAHİBİ</span>
          <span className="truncate font-display text-[20px] font-semibold tracking-[-.02em]">
            {childName}
          </span>
          <span className="font-mono text-[13px] tracking-[.12em] text-white/70">
            {card.card_number}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[10.5px] font-bold tracking-[.16em] text-white/50">GEÇERLİ</span>
          <span className="text-[14px] font-semibold">
            {card.valid_until ? formatDate(card.valid_until) : "—"}
          </span>
        </div>
      </div>

      {expired && (
        <span className="absolute right-6 top-1/2 -translate-y-1/2 rotate-[-14deg] rounded-[10px] border-2 border-white/60 px-4 py-1.5 text-[15px] font-bold tracking-[.1em] text-white/75">
          SÜRESİ DOLDU
        </span>
      )}
    </div>
  );
}

/* ── Durum seçici: kutucuklar ── */
function StatusPicker({ cardId, current }: { cardId: string; current: string }) {
  const [state, action, pending] = useActionState(setCardStatus, IDLE);
  useActionToast(state);
  const [picked, setPicked] = React.useState<string | null>(null);
  const allowed = ALLOWED[current] ?? [];

  React.useEffect(() => { if (state.ok) setPicked(null); }, [state.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <H3 className="text-[17px]">Kart durumu</H3>
        <span className="text-[12.5px] text-muted">
          Yalnızca geçerli geçişler seçilebilir
        </span>
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => {
          const isCurrent = s.value === current;
          const canPick = allowed.includes(s.value);
          const isPicked = picked === s.value;

          return (
            <button
              key={s.value}
              type="button"
              disabled={!canPick || pending}
              onClick={() => setPicked(isPicked ? null : s.value)}
              className={`flex flex-col items-center gap-2 rounded-[16px] border-2 p-4 text-center transition-all ${
                isCurrent
                  ? "border-ink bg-chip"
                  : isPicked
                    ? "border-solid bg-chip"
                    : canPick
                      ? "border-line bg-surface hover:border-ink/25 hover:bg-chip/40"
                      : "cursor-not-allowed border-line2 bg-field opacity-40"
              }`}
            >
              <Icon icon={s.icon} size={19} />
              <span className="text-[12.5px] font-semibold leading-tight">{s.label}</span>
              {isCurrent && <Badge tone="muted">Şu an</Badge>}
            </button>
          );
        })}
      </div>

      {picked && (
        <form action={action} className="flex flex-col gap-3 border-t border-line2 pt-4">
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="status" value={picked} />

          <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
            <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0 text-muted" />
            <span className="text-[13px] leading-[1.55] text-ink2">
              Durum <strong>{STATUSES.find((s) => s.value === picked)?.label}</strong> olarak
              değiştirilecek. {STATUSES.find((s) => s.value === picked)?.hint}.
              {picked === "cancelled" && " İptal edilen kart geri açılamaz."}
            </span>
          </div>

          <Field label="Not" htmlFor="statusNote" hint="isteğe bağlı, kayıtlara işlenir">
            <Input id="statusNote" name="note" maxLength={500} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>Durumu değiştir</Button>
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>Vazgeç</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ── QR paneli ── */
function QrPanel({ cardId, token }: { cardId: string; token: string | null }) {
  const [state, action, pending] = useActionState(regenerateQr, IDLE);
  const [confirming, setConfirming] = React.useState(false);
  const qrUrl = token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org"}/k/${token}`)}`
    : null;

  React.useEffect(() => { if (state.ok) setConfirming(false); }, [state.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconQr} size={18} className="text-muted" />
        <H3 className="text-[17px]">QR kod</H3>
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      {qrUrl ? (
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-[16px] border border-line bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Kart QR kodu" width={180} height={180} />
          </span>
          <span className="text-center text-[12.5px] leading-[1.5] text-muted">
            QR&apos;da kart numarası taşınmaz; tahmin edilemez bir anahtar kullanılır.
          </span>
        </div>
      ) : (
        <span className="text-[13.5px] text-muted">Bu kartın QR anahtarı yok.</span>
      )}

      {!confirming ? (
        <Button variant="outline" onClick={() => setConfirming(true)} className="mt-auto">
          <Icon icon={IconEdit} size={15} /> QR&apos;ı yenile
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-3 border-t border-line2 pt-4">
          <input type="hidden" name="cardId" value={cardId} />
          <p className="text-[13px] leading-[1.55] text-ink2">
            Yeni QR üretilecek ve <strong>eski QR anında geçersizleşecek</strong>.
            Kart paylaşıldıysa veya ekran görüntüsü sızdıysa bunu yapın.
          </p>
          <div className="flex gap-2">
            <Button type="submit" loading={pending}>Evet, yenile</Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Vazgeç</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ── Süre uzatma ── */
function ExtendPanel({ cardId, validUntil }: { cardId: string; validUntil: string | null }) {
  const [state, action, pending] = useActionState(extendCard, IDLE);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconClock} size={18} className="text-muted" />
          <H3 className="text-[17px]">Üyelik süresi</H3>
        </div>

        {state.message && state.ok && <Alert tone="green">{state.message}</Alert>}

        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">Bitiş tarihi</span>
          <span className="font-display text-[24px] font-semibold tracking-[-.02em]">
            {validUntil ? formatDate(validUntil) : "—"}
          </span>
        </div>

        <p className="text-[13px] leading-[1.55] text-ink2">
          Ödeme almadan süre eklemek için kullanılır (telafi, hediye vb.).
          Normal yenileme sipariş üzerinden yapılır.
        </p>

        <Button variant="outline" onClick={() => setOpen(true)} className="mt-auto">
          Süre ekle
        </Button>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Üyelik süresi ekle" size="sm">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="cardId" value={cardId} />

          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

          <Field label="Kaç gün" htmlFor="extDays" error={state.fieldErrors?.days}>
            <Input id="extDays" name="days" type="number" min={1} max={1095}
              defaultValue={30} required />
          </Field>

          <div className="flex flex-wrap gap-2">
            {[30, 90, 180, 365].map((d) => (
              <span key={d} className="rounded-full bg-chip px-3 py-1 text-[12px] text-muted">
                {d} gün
              </span>
            ))}
          </div>

          <Field label="Gerekçe" htmlFor="extReason" error={state.fieldErrors?.reason}>
            <Textarea id="extReason" name="reason" rows={2} required minLength={3} maxLength={500}
              placeholder="Örn. etkinlik iptali telafisi" />
          </Field>

          <Button type="submit" size="lg" loading={pending}>Süreyi ekle</Button>
        </form>
      </Modal>
    </>
  );
}

/* ── Bu kartla katılınan etkinlikler ── */
function EventsPanel({ events }: { events: CardData["events"] }) {
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);
  const attended = events.filter((e) => e.attended).length;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconCalendar} size={18} className="text-muted" />
          <H3 className="text-[17px]">Etkinlikler ({events.length})</H3>
        </div>
        {events.length > 0 && (
          <div className="flex gap-2">
            <Badge tone="muted">{upcoming.length} yaklaşan</Badge>
            <Badge tone="green">{attended} katılım</Badge>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <span className="text-[13.5px] text-muted">
          Bu kartla henüz bir etkinliğe kayıt olunmamış.
        </span>
      ) : (
        <div className="flex flex-col gap-2.5">
          {[...upcoming, ...past].slice(0, 15).map((e) => {
            const isPast = new Date(e.starts_at).getTime() < now;
            return (
              <div key={e.registration_id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line2 px-4 py-3 ${
                  isPast ? "opacity-70" : ""}`}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-semibold">{e.title}</span>
                  <span className="text-[12.5px] text-muted">
                    {formatDate(e.starts_at, true)}
                    {e.city_name ? ` · ${e.city_name}` : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {e.attended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[11.5px] font-semibold text-green">
                      <Icon icon={IconCheck} size={11} /> Katıldı
                    </span>
                  )}
                  <Badge tone={e.status === "confirmed" ? "green"
                    : e.status === "waitlisted" ? "orange" : "muted"}>
                    {e.status === "confirmed" ? "Kayıtlı"
                      : e.status === "waitlisted" ? "Sırada"
                      : e.status === "cancelled" ? "İptal" : e.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ── Siparişler ── */
function OrdersPanel({ orders }: { orders: CardData["orders"] }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconOrder} size={18} className="text-muted" />
        <H3 className="text-[17px]">Siparişler ({orders.length})</H3>
      </div>

      {orders.length === 0 ? (
        <span className="text-[13.5px] text-muted">Sipariş yok.</span>
      ) : (
        orders.map((o) => (
          <Link key={o.id} href={`/siparisler/${o.id}`}
            className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 hover:bg-chip">
            <span className="font-mono text-[13px] font-semibold">{o.order_number}</span>
            <span className="flex items-center gap-2.5">
              <span className="text-[12.5px] text-muted">{formatDate(o.created_at)}</span>
              <span className="text-[13px] font-semibold">{formatMoney(o.amount)}</span>
            </span>
          </Link>
        ))
      )}
    </Card>
  );
}

/* ── Geçmiş ── */
const ACTION_TR: Record<string, string> = {
  "card.status_changed": "Durum değişti",
  "card.qr_regenerated": "QR yenilendi",
  "card.extended": "Süre eklendi",
  "card.created": "Kart oluşturuldu",
  "card.cancelled": "Kart iptal edildi",
};

function HistoryPanel({ history }: { history: CardData["history"] }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconClock} size={18} className="text-muted" />
        <H3 className="text-[17px]">İşlem geçmişi</H3>
      </div>

      {history.length === 0 ? (
        <span className="text-[13.5px] text-muted">Kayıt yok.</span>
      ) : (
        <div className="flex flex-col gap-3">
          {history.slice(0, 12).map((h, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-line2 pb-3 last:border-0 last:pb-0">
              <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-line" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold">
                  {ACTION_TR[h.action] ?? h.action}
                </span>
                <span className="text-[12px] text-muted">{formatDate(h.created_at, true)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Yardımcılar ── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line2 pb-3 last:border-0 last:pb-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-right text-[13.5px] font-semibold">{value}</span>
    </div>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line2 pb-3">
      <span className="text-[13px] text-muted">{label}</span>
      <button type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="inline-flex items-center gap-2 rounded-[8px] px-2 py-1 hover:bg-chip">
        <span className={`text-[13.5px] font-semibold ${mono ? "font-mono tracking-[.06em]" : ""}`}>
          {value}
        </span>
        <Icon icon={copied ? IconCheck : IconCopy} size={13}
          className={copied ? "text-green" : "text-muted"} />
      </button>

    </div>
  );
}
