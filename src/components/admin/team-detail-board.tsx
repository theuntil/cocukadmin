"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  Alert, Badge, Button, Card, Checkbox, Divider, Field, Input, Select,
} from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconArrowLeft, IconFootball, IconShield, IconUsers, IconPlus, IconTrash,
  IconLink, IconCheck, IconClock, IconRefresh, IconQr, IconAlert, IconChart, IconEdit, IconArrowRight,
} from "@/components/ui/icons";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { saveTeam, deleteTeam } from "@/lib/actions/teams";
import {
  inviteTeamMember, reissueInvite, cancelInvite,
  deleteTeamAccount, setAccountActive,
} from "@/lib/actions/team-accounts";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { formatDate, publicStorageUrl, cn } from "@/lib/utils";
import type { TeamDetail } from "@/lib/team-accounts/data";

const SONUC_TR: Record<string, { etiket: string; ok: boolean }> = {
  ok:         { etiket: "Geçerli",       ok: true },
  expired:    { etiket: "Süresi dolmuş", ok: false },
  revoked:    { etiket: "İptal edilmiş", ok: false },
  inactive:   { etiket: "Pasif kart",    ok: false },
  wrong_team: { etiket: "Başka takım",   ok: false },
  not_found:  { etiket: "Bulunamadı",    ok: false },
};

/**
 * TAKIM DETAYI — TEK YERDEN TÜM YÖNETİM
 *
 * Üç sekme:
 *   Bilgiler  → ad, kısa ad, şehir, renk, logo, aktiflik
 *   Hesaplar  → yetkililer, görevliler, bekleyen davetler
 *   Hareket   → son QR okutmaları
 *
 * Sekmeler ayrı çünkü işler ayrı: takım bilgisi düzenlerken hesap
 * listesine bakmak gerekmiyor. Ama hepsi aynı sayfada, aynı takımın
 * altında — iki ayrı menü maddesinde aramaya gerek yok.
 */
export function TeamDetailBoard({
  detail, cities, leagues, statsTeams,
}: {
  detail: TeamDetail;
  cities: { id: number; name: string }[];
  leagues: { id: string; name: string }[];
  /** İstatistik bölümü için takım listesi (tek takıma kilitlenir) */
  statsTeams: { id: string; name: string; slug: string; logo_path: string | null;
    city_name: string | null; is_active: boolean;
    supporters: number; children: number; active_cards: number }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [silOnay, setSilOnay] = React.useState(false);
  const [duzenle, setDuzenle] = React.useState(false);
  const [siliniyor, setSiliniyor] = React.useState(false);

  const { team, accounts, invitations, checkins } = detail;
  const logo = publicStorageUrl("team-logos", team.logo_path);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/takimlar"
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Takımlar
      </Link>

      {/* ── Başlık ── */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-chip">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logo} alt="" className="h-full w-full object-contain p-2" />
          ) : (
            <Icon icon={IconFootball} size={24} className="text-muted2" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate font-display text-[26px] font-semibold tracking-[-.03em]">
            {team.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span>{new Intl.NumberFormat("tr-TR").format(team.card_count)} kombine kart</span>
            <span className="text-line">·</span>
            <span>{team.account_count} hesap</span>
            {!team.is_active && <Badge tone="muted">Pasif</Badge>}
          </div>
        </div>

        {/* Düzenle — silmenin yanında, pencere açar */}
        <button type="button" onClick={() => setDuzenle(true)} title="Takım bilgilerini düzenle"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-ink/30 hover:text-ink">
          <Icon icon={IconEdit} size={17} />
        </button>

        {/* Takımı sil — sağ üstte, onaylı */}
        <button type="button" onClick={() => setSilOnay(true)} title="Takımı sil"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger">
          <Icon icon={IconTrash} size={17} />
        </button>
      </div>

      {/* ── HESAPLAR ÖNCE ──
          Takım sayfasına en çok yetki vermek/almak için giriliyor;
          bilgi düzenleme daha seyrek. Sık kullanılan üstte. */}
      <HesapSekmesi teamId={team.id} teamName={team.name}
        accounts={accounts} invitations={invitations} />

      {/* ── Ayrı sayfalar ──
          İstatistik ve okutma geçmişi bu sayfada değil kendi
          sayfalarında: ikisi de uzun içerik, detay sayfasını
          şişiriyordu. Buradan tek tıkla gidiliyor. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/takimlar/${team.id}/uyeler`}>
          <Card className="flex h-full items-center gap-3.5 p-5 transition-colors hover:border-ink/25">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-solid text-on-solid">
              <Icon icon={IconUsers} size={19} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">Üyelerimiz</span>
              <span className="text-[12.5px] text-muted">
                {new Intl.NumberFormat("tr-TR").format(team.card_count)} kombine · dışa aktar
              </span>
            </span>
            <Icon icon={IconArrowRight} size={16} className="shrink-0 text-muted2" />
          </Card>
        </Link>

        <Link href={`/takimlar/${team.id}/istatistik`}>
          <Card className="flex h-full items-center gap-3.5 p-5 transition-colors hover:border-ink/25">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-chip text-ink2">
              <Icon icon={IconChart} size={19} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">İstatistikler</span>
              <span className="text-[12.5px] text-muted">
                Kart, sipariş, yaş ve şehir dağılımı
              </span>
            </span>
            <Icon icon={IconArrowRight} size={16} className="shrink-0 text-muted2" />
          </Card>
        </Link>

        <Link href={`/takimlar/${team.id}/qr`}>
          <Card className="flex h-full items-center gap-3.5 p-5 transition-colors hover:border-ink/25">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-chip text-ink2">
              <Icon icon={IconQr} size={19} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">QR okutmaları</span>
              <span className="text-[12.5px] text-muted">
                {checkins.length > 0
                  ? `Son okutma ${formatDate(checkins[0].checked_at, true)}`
                  : "Henüz okutma yok"}
              </span>
            </span>
            <Icon icon={IconArrowRight} size={16} className="shrink-0 text-muted2" />
          </Card>
        </Link>
      </div>

      {/* Düzenleme penceresi — form sayfayı uzatmasın */}
      <Modal open={duzenle} onClose={() => setDuzenle(false)}
        title="Takım bilgileri" size="md">
        <BilgiSekmesi team={team} cities={cities} leagues={leagues}
          onDone={() => { setDuzenle(false); router.refresh(); }} />
      </Modal>

      <ConfirmDialog
        open={silOnay}
        onClose={() => setSilOnay(false)}
        loading={siliniyor}
        title="Takım silinsin mi?"
        description={
          team.card_count > 0
            ? `${team.name} takımının ${team.card_count} kombine kartı var. ` +
              "Takım silinirse bu kartlar sahipsiz kalır. Silmek yerine " +
              "“Aktif” kutusunu kapatmayı düşünün."
            : `${team.name} kalıcı olarak silinecek. Bu işlem geri alınamaz.`
        }
        confirmLabel="Sil"
        onConfirm={async () => {
          setSiliniyor(true);
          try {
            const fd = new FormData();
            fd.set("id", team.id);
            const res = await deleteTeam(IDLE, fd);
            if (res.ok) {
              toast.success("Takım silindi");
              router.push("/takimlar");
            } else {
              toast.error("Silinemedi", res.message);
              setSilOnay(false);
            }
          } finally {
            setSiliniyor(false);
          }
        }}
      />
    </div>
  );
}

/* ═══════════════════ BİLGİLER ═══════════════════ */

function BilgiSekmesi({
  team, cities, leagues, onDone,
}: {
  team: TeamDetail["team"];
  cities: { id: number; name: string }[];
  leagues: { id: string; name: string }[];
  onDone: () => void;
}) {
  const toast = useToast();
  const [state, action, pending] = useActionState(saveTeam, IDLE);
  const [logoPath, setLogoPath] = React.useState(team.logo_path ?? "");

  /* `onDone` her render'da yeni bir fonksiyon; bağımlılığa konursa
     efekt döngüye giriyor. `useActionEffect` bunu kimliğe göre
     çözüyor. */
  useActionEffect(state, () => { toast.success("Takım bilgileri kaydedildi"); onDone(); });

  /* Pencerenin içinde çiziliyor: kendi Card sarmalayıcısı yok,
     yoksa çerçeve içinde çerçeve görünüyordu. */
  return (
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={team.id} />
        <input type="hidden" name="logoPath" value={logoPath} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Takım adı" htmlFor="name" error={state.fieldErrors?.name}>
            <Input id="name" name="name" required maxLength={120} defaultValue={team.name} />
          </Field>
          <Field label="Kısa ad" htmlFor="shortName" hint="en fazla 12 karakter">
            <Input id="shortName" name="shortName" maxLength={12}
              defaultValue={team.short_name ?? ""} />
          </Field>
          <Field label="Şehir" htmlFor="cityId">
            <Select id="cityId" name="cityId" defaultValue={team.city_id ?? ""}>
              <option value="">Seçilmedi</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {/* Lig zorunlu — takım seçicilerde gruplama buna dayanıyor */}
          <Field label="Lig" htmlFor="leagueId" hint="zorunlu"
            error={state.fieldErrors?.leagueId}>
            <Select id="leagueId" name="leagueId" required
              defaultValue={team.league_id ?? ""}>
              <option value="" disabled>Lig seçin…</option>
              {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>

          <Field label="Ana renk" htmlFor="colorPrimary" hint="#RRGGBB"
            error={state.fieldErrors?.colorPrimary}>
            <Input id="colorPrimary" name="colorPrimary"
              defaultValue={team.color_primary ?? ""} placeholder="#1B4DFF" />
          </Field>
          <Field label="Sıra" htmlFor="sortOrder" hint="küçük olan önce">
            <Input id="sortOrder" name="sortOrder" type="number"
              defaultValue={team.sort_order ?? ""} />
          </Field>
        </div>

        <ImageUploadField
          bucket="team-logos"
          label="Logo"
          hint="PNG · şeffaf zemin önerilir"
          value={logoPath}
          onChange={setLogoPath}
        />

        <Checkbox id="isActive" name="isActive" defaultChecked={team.is_active}
          label="Aktif (pasif takım sitede ve başvuru formunda görünmez)" />

        <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
          <Button type="submit" variant="ink" loading={pending}>Kaydet</Button>
        </div>
      </form>
  );
}

/* ═══════════════════ HESAPLAR ═══════════════════ */

function HesapSekmesi({
  teamId, teamName, accounts, invitations,
}: {
  teamId: string;
  teamName: string;
  accounts: TeamDetail["accounts"];
  invitations: TeamDetail["invitations"];
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState(inviteTeamMember, IDLE);
  const [reState, reAction, rePending] = useActionState(reissueInvite, IDLE);

  const [form, setForm] = React.useState(false);
  const [yenilenen, setYenilenen] = React.useState<string | null>(null);
  const [silinecek, setSilinecek] = React.useState<
    { id: string; ad: string; kind: "account" | "invite" } | null
  >(null);
  const [busy, setBusy] = React.useState(false);

  const link = (state.data?.link as string | undefined)
    ?? (reState.data?.link as string | undefined) ?? null;
  const mailGitti = (state.data?.mailSent as boolean | undefined)
    ?? (reState.data?.mailSent as boolean | undefined) ?? false;

  useActionEffect(state, () => {
    setForm(false);
    toast.success(mailGitti ? "Davet e-postası gönderildi" : "Davet oluşturuldu",
      mailGitti ? undefined : "E-posta gönderilemedi, bağlantıyı elle iletin.");
    router.refresh();
  });

  useActionEffect(reState, () => {
    setYenilenen(null); toast.success("Yeni bağlantı üretildi"); router.refresh();
  });

  const sil = async () => {
    if (!silinecek) return;
    setBusy(true);
    try {
      const res = silinecek.kind === "invite"
        ? await cancelInvite(silinecek.id)
        : await deleteTeamAccount(silinecek.id);
      if (res.ok) toast.success(res.message ?? "Silindi");
      else toast.error("Silinemedi", res.message);
      setSilinecek(null);
      router.refresh();
    } finally { setBusy(false); }
  };

  const durumDegistir = async (id: string, aktif: boolean) => {
    setBusy(true);
    try {
      const res = await setAccountActive(id, aktif);
      if (res.ok) toast.success(res.message ?? "Güncellendi");
      else toast.error("Güncellenemedi", res.message);
      router.refresh();
    } finally { setBusy(false); }
  };

  const sahipler = accounts.filter((a) => a.role === "owner");
  const gorevliler = accounts.filter((a) => a.role === "steward");

  return (
    <div className="flex flex-col gap-4">
      {link && <LinkKarti link={link} mailGitti={mailGitti} />}

      <Button type="button" variant="ink" className="self-start" onClick={() => setForm(true)}>
        <Icon icon={IconPlus} size={16} /> Hesap davet et
      </Button>

      {/* Davet penceresi — sayfa içinde açılan form listeyi aşağı
          itiyordu; pencere kapanınca liste yerinde kalıyor. */}
      <Modal open={form} onClose={() => setForm(false)}
        title={`${teamName} için hesap davet et`} size="md">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-[1.6] text-ink2">
            <strong>Yetkili</strong> üyeleri, istatistikleri ve görevlileri yönetir.{" "}
            <strong>Görevli</strong> yalnızca QR kontrolü yapar. Davet edilen kişi
            bağlantıdan kendi şifresini belirler.
          </p>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="teamId" value={teamId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-posta" htmlFor="email" error={state.fieldErrors?.email}>
                <Input id="email" name="email" type="email" required autoComplete="off"
                  placeholder="yetkili@kulup.org" />
              </Field>
              <Field label="Rol" htmlFor="role">
                <Select id="role" name="role" defaultValue="owner">
                  <option value="owner">Yetkili — tam erişim</option>
                  <option value="steward">Görevli — yalnızca QR</option>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
              <Button type="submit" variant="ink" loading={pending}>Davet oluştur</Button>
              <Button type="button" variant="outline" onClick={() => setForm(false)}>Vazgeç</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Bekleyen davetler */}
      {invitations.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <span className="text-[12.5px] font-bold tracking-[.08em] text-muted2">
            BEKLEYEN DAVETLER
          </span>
          <Divider />
          {invitations.map((i) => (
            <div key={i.id} className="flex flex-col gap-2.5 rounded-[14px] bg-field px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <Icon icon={i.expired ? IconAlert : IconClock} size={15}
                  className={cn("shrink-0", i.expired ? "text-danger" : "text-orange")} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{i.email}</span>
                <Badge tone="muted">{i.role === "owner" ? "Yetkili" : "Görevli"}</Badge>
                <span className="text-[12px] text-muted">
                  {i.expired ? "Süresi doldu" : `${formatDate(i.expires_at)} tarihine kadar`}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" title="Yeni bağlantı / e-postayı değiştir"
                    onClick={() => setYenilenen(yenilenen === i.id ? null : i.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-ink/30 hover:text-ink">
                    <Icon icon={IconRefresh} size={13} />
                  </button>
                  <button type="button" title="Daveti iptal et"
                    onClick={() => setSilinecek({ id: i.id, ad: i.email, kind: "invite" })}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger">
                    <Icon icon={IconTrash} size={13} />
                  </button>
                </div>
              </div>

              {yenilenen === i.id && (
                <form action={reAction} className="flex flex-wrap items-end gap-2 border-t border-line2 pt-3">
                  <input type="hidden" name="id" value={i.id} />
                  <div className="min-w-[220px] flex-1">
                    <Field label="E-posta" htmlFor={`m-${i.id}`}
                      hint="değiştirebilirsiniz — eski bağlantı geçersizleşir">
                      <Input id={`m-${i.id}`} name="email" type="email" required
                        defaultValue={i.email} />
                    </Field>
                  </div>
                  <Button type="submit" variant="ink" loading={rePending}>Yeni bağlantı</Button>
                </form>
              )}
            </div>
          ))}
        </Card>
      )}

      <HesapListesi baslik="YETKİLİLER" icon={IconUsers} rows={sahipler} busy={busy}
        onToggle={durumDegistir}
        onDelete={(a) => setSilinecek({ id: a.id, ad: a.ad ?? a.email ?? "Hesap", kind: "account" })} />

      <HesapListesi baslik="GÖREVLİLER" icon={IconShield} rows={gorevliler} busy={busy}
        onToggle={durumDegistir}
        onDelete={(a) => setSilinecek({ id: a.id, ad: a.ad ?? a.email ?? "Hesap", kind: "account" })} />

      <ConfirmDialog
        open={silinecek !== null}
        onClose={() => setSilinecek(null)}
        loading={busy}
        title={silinecek?.kind === "invite" ? "Davet iptal edilsin mi?" : "Hesap silinsin mi?"}
        description={silinecek
          ? silinecek.kind === "invite"
            ? `${silinecek.ad} adresine gönderilen bağlantı geçersiz olacak.`
            : `${silinecek.ad} bu takıma erişimini tamamen kaybedecek. Kullanıcı hesabı silinmez; yalnızca takım bağı kopar.`
          : ""}
        confirmLabel={silinecek?.kind === "invite" ? "İptal et" : "Sil"}
        onConfirm={() => void sil()}
      />
    </div>
  );
}

function HesapListesi({
  baslik, icon, rows, busy, onToggle, onDelete,
}: {
  baslik: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  rows: TeamDetail["accounts"];
  busy: boolean;
  onToggle: (id: string, aktif: boolean) => void;
  onDelete: (a: TeamDetail["accounts"][number]) => void;
}) {
  if (rows.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-5 text-[13.5px] text-muted">
        <Icon icon={icon} size={16} className="shrink-0 text-muted2" />
        {baslik === "YETKİLİLER" ? "Henüz yetkili hesabı yok." : "Henüz görevli yok."}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="text-[12.5px] font-bold tracking-[.08em] text-muted2">{baslik}</span>
      <Divider />
      <ul className="flex flex-col gap-3">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chip">
              <Icon icon={icon} size={15} className="text-ink2" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-semibold">{a.ad ?? "—"}</span>
              <span className="truncate text-[12.5px] text-muted">{a.email ?? "e-posta yok"}</span>
            </span>
            {!a.is_active && <Badge tone="muted">Askıda</Badge>}
            <span className="hidden text-[12px] text-muted lg:block">
              {a.last_seen_at ? `Son giriş ${formatDate(a.last_seen_at)}` : "Hiç girmedi"}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" disabled={busy} onClick={() => onToggle(a.id, !a.is_active)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50",
                  a.is_active
                    ? "border-line text-ink2 hover:border-danger hover:text-danger"
                    : "border-line text-green hover:border-green",
                )}>
                {a.is_active ? "Askıya al" : "Aç"}
              </button>
              <button type="button" title="Sil" disabled={busy} onClick={() => onDelete(a)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger disabled:opacity-50">
                <Icon icon={IconTrash} size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}


/* ═══════════════════ DAVET BAĞLANTISI ═══════════════════ */

function LinkKarti({ link, mailGitti }: { link: string; mailGitti: boolean }) {
  const toast = useToast();
  const [kopyalandi, setKopyalandi] = React.useState(false);

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setKopyalandi(true);
      toast.success("Bağlantı kopyalandı");
      window.setTimeout(() => setKopyalandi(false), 2500);
    } catch {
      toast.warning("Kopyalanamadı", "Bağlantıyı elle seçip kopyalayın.");
    }
  };

  return (
    <Card className="flex flex-col gap-3 border-green p-5">
      <span className="flex items-center gap-2 text-[14px] font-semibold text-green">
        <Icon icon={IconCheck} size={16} />
        {mailGitti ? "Davet e-postası gönderildi" : "Davet bağlantısı hazır"}
      </span>
      <p className="text-[13px] leading-[1.6] text-ink2">
        <strong>Yalnızca şimdi görüntüleniyor</strong> — veritabanında bağlantının
        kendisi değil özeti tutulur. Kaybolursa yeni bağlantı üretin.
      </p>
      <div className="flex flex-wrap gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[10px] bg-field px-3 py-2.5 font-mono text-[12px] text-ink2">
          {link}
        </code>
        <Button type="button" variant="ink" onClick={() => void kopyala()}>
          <Icon icon={kopyalandi ? IconCheck : IconLink} size={15} />
          {kopyalandi ? "Kopyalandı" : "Kopyala"}
        </Button>
      </div>
    </Card>
  );
}
