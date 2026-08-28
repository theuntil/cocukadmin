"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import QRCode from "qrcode";
import {
  Alert, Badge, Button, Card, Checkbox, Divider, EmptyState, Field, Input, Textarea,
} from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconQr, IconPlus, IconEdit, IconTrash, IconDownload, IconSearch,
  IconLink, IconRefresh, IconCheck, IconClose,
} from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { saveQr, deleteQr, resetQrScans } from "@/lib/actions/qr";
import { IDLE } from "@/lib/actions/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { QrRow, QrList } from "@/lib/qr/types";

/**
 * QR KODU YÖNETİMİ
 *
 * ┌─ QR HEDEF ADRESİ İÇERMEZ ─────────────────────────────────────┐
 * │ Kod, kendi sitemizdeki kısa adresi gösterir (/q/<kod>). O da   │
 * │ hedefe yönlendirir.                                            │
 * │                                                                │
 * │ Böylece afişe basılmış bir QR ölmeden hedefi değiştirebilir,   │
 * │ kaç kez okutulduğunu sayabilirsiniz. Kısa kod bir kez üretilir │
 * │ ve DEĞİŞTİRİLEMEZ — basılmış kodlar bozulmasın diye.           │
 * └────────────────────────────────────────────────────────────────┘
 */
export function QrManager({ data, search, baseUrl }: {
  data: QrList;
  search: string | null;
  /** QR'ın göstereceği adresin kökü (ör. https://cocuktribunu.org) */
  baseUrl: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveQr, IDLE);

  const [duzenlenen, setDuzenlenen] = React.useState<QrRow | null>(null);
  const [yeni, setYeni] = React.useState(false);
  const [silinecek, setSilinecek] = React.useState<QrRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [not, setNot] = React.useState<{ ok: boolean; text: string } | null>(null);

  const formAcik = duzenlenen !== null || yeni;

  React.useEffect(() => {
    if (state.ok) {
      setDuzenlenen(null);
      setYeni(false);
      setNot({ ok: true, text: state.message ?? "Kaydedildi." });
      router.refresh();
    } else if (state.message) {
      setNot({ ok: false, text: state.message });
    }
  }, [state, router]);

  React.useEffect(() => {
    if (!not?.ok) return;
    const t = window.setTimeout(() => setNot(null), 4000);
    return () => window.clearTimeout(t);
  }, [not]);

  const sil = async () => {
    if (!silinecek) return;
    setBusy(true);
    try {
      const res = await deleteQr(silinecek.id);
      setNot({ ok: res.ok, text: res.message ?? "" });
      setSilinecek(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const sifirla = async (row: QrRow) => {
    setBusy(true);
    try {
      const res = await resetQrScans(row.id);
      setNot({ ok: res.ok, text: res.message ?? "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Başlık ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
            QR kodları
          </h1>
          <span className="text-[13.5px] text-muted">
            Hedefi sonradan değiştirebilirsiniz — basılı kodlar çalışmaya devam eder
          </span>
        </div>
        {!formAcik && (
          <Button type="button" variant="ink" size="md"
            onClick={() => { setYeni(true); setDuzenlenen(null); }}>
            <Icon icon={IconPlus} size={16} /> Yeni QR
          </Button>
        )}
      </div>

      {not && <Alert tone={not.ok ? "green" : "danger"}>{not.text}</Alert>}

      {/* ── Sayaçlar ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Sayac etiket="Toplam QR" deger={data.total} />
        <Sayac etiket="Aktif" deger={data.active} />
        <Sayac etiket="Toplam okutma" deger={data.total_scans} />
      </div>

      {/* ── Form ── */}
      {formAcik && (
        <Card className="flex flex-col gap-5 p-6">
          <span className="font-display text-[18px] font-semibold tracking-[-.02em]">
            {duzenlenen ? "QR kodunu düzenle" : "Yeni QR kodu"}
          </span>

          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={duzenlenen?.id ?? ""} />

            <Field label="Başlık" htmlFor="title" hint="panelde tanımak için"
              error={state.fieldErrors?.title}>
              <Input id="title" name="title" required maxLength={120}
                defaultValue={duzenlenen?.title ?? ""}
                placeholder="Örn. Katar pankartı" />
            </Field>

            <Field label="Hedef adres" htmlFor="target_url"
              hint="QR okutulunca gidilecek yer · sonradan değiştirilebilir"
              error={state.fieldErrors?.target_url}>
              <Input id="target_url" name="target_url" required maxLength={1200}
                defaultValue={duzenlenen?.target_url ?? ""}
                placeholder="https://cocuktribunu.org/kombine-kart" />
            </Field>

            <Field label="Not" htmlFor="description" hint="isteğe bağlı — nerede kullanıldığı">
              <Textarea id="description" name="description" rows={2} maxLength={400}
                defaultValue={duzenlenen?.description ?? ""}
                placeholder="Stadyum girişindeki pankart" />
            </Field>

            <Checkbox id="is_active" name="is_active"
              defaultChecked={duzenlenen?.is_active ?? true}
              label="Aktif (kapalıyken okutan kişi yönlendirilmez)" />

            {duzenlenen && (
              <div className="flex items-start gap-2.5 rounded-[14px] bg-field px-4 py-3">
                <Icon icon={IconLink} size={16} className="mt-[2px] shrink-0 text-muted" />
                <span className="text-[13px] leading-[1.6] text-muted">
                  Kısa kod <strong className="text-ink2">{duzenlenen.code}</strong> değiştirilemez.
                  Basılmış QR&apos;lar bu koda göre çalışıyor; değişse hepsi bozulurdu.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="ink" loading={pending}>Kaydet</Button>
              <Button type="button" variant="outline"
                onClick={() => { setDuzenlenen(null); setYeni(false); }}>
                Vazgeç
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Arama ── */}
      <form action="/qr" method="get" className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-[340px]">
          <Icon icon={IconSearch} size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
          <input name="ara" defaultValue={search ?? ""} placeholder="Başlık, kod veya adres ara"
            className="h-[40px] w-full rounded-full border border-line bg-field pl-9 pr-4 text-[13.5px] text-ink placeholder:text-muted2 focus:border-green focus:outline-none" />
        </div>
        {search && (
          <a href="/qr" className="shrink-0 text-[13px] font-semibold text-muted hover:text-ink">
            Temizle
          </a>
        )}
      </form>

      {/* ── Liste ── */}
      {data.rows.length === 0 ? (
        <EmptyState
          icon={<Icon icon={IconQr} size={24} />}
          title={search ? "Sonuç bulunamadı" : "Henüz QR kodu yok"}
          description={search
            ? "Farklı bir kelime deneyin."
            : "Afiş, pankart veya bilet için QR üretin; hedefini sonradan değiştirebilirsiniz."}
          action={!search
            ? <Button type="button" variant="ink" onClick={() => setYeni(true)}>Yeni QR</Button>
            : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.rows.map((q) => (
            <QrKart key={q.id} row={q} baseUrl={baseUrl} busy={busy}
              onEdit={() => { setDuzenlenen(q); setYeni(false); }}
              onDelete={() => setSilinecek(q)}
              onReset={() => void sifirla(q)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={silinecek !== null}
        onClose={() => setSilinecek(null)}
        loading={busy}
        title="QR kodu silinsin mi?"
        description={silinecek
          ? `“${silinecek.title}” silinecek. Basılmış QR'lar bundan sonra çalışmaz.`
          : ""}
        confirmLabel="Sil"
        onConfirm={() => void sil()}
      />
    </div>
  );
}

/* ══════════════════ QR KARTI ══════════════════ */

function QrKart({
  row, baseUrl, busy, onEdit, onDelete, onReset,
}: {
  row: QrRow; baseUrl: string; busy: boolean;
  onEdit: () => void; onDelete: () => void; onReset: () => void;
}) {
  const adres = `${baseUrl.replace(/\/$/, "")}/q/${row.code}`;
  const [png, setPng] = React.useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = React.useState(false);

  /* QR görseli TARAYICIDA üretilir: sunucuya iş düşmez, liste anında
     gelir. Hata olursa kart yine çalışır, yalnızca görsel çıkmaz. */
  React.useEffect(() => {
    let alive = true;
    QRCode.toDataURL(adres, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then((url) => { if (alive) setPng(url); })
      .catch(() => { if (alive) setPng(null); });
    return () => { alive = false; };
  }, [adres]);

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(adres);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      /* Pano izni yoksa sessiz geç: adres zaten ekranda yazıyor. */
    }
  };

  return (
    <Card className={cn("flex flex-col gap-4 p-5", !row.is_active && "opacity-70")}>
      <div className="flex items-start gap-4">
        {/* QR görseli */}
        <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-line bg-white">
          {png ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={png} alt={`${row.title} QR kodu`} className="h-full w-full object-contain p-1" />
          ) : (
            <Icon icon={IconQr} size={26} className="text-muted2" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{row.title}</span>
            {!row.is_active && <Badge tone="muted">Pasif</Badge>}
          </div>

          <button type="button" onClick={() => void kopyala()}
            title="Adresi kopyala"
            className="group flex min-w-0 items-center gap-1.5 text-left">
            <span className="truncate font-mono text-[12.5px] text-ink2">{adres}</span>
            <Icon icon={kopyalandi ? IconCheck : IconLink} size={12}
              className={cn("shrink-0", kopyalandi ? "text-green" : "text-muted2 group-hover:text-ink")} />
          </button>

          <span className="truncate text-[12.5px] text-muted" title={row.target_url}>
            → {row.target_url}
          </span>

          {row.description && (
            <span className="line-clamp-2 text-[12.5px] text-muted2">{row.description}</span>
          )}
        </div>
      </div>

      <Divider />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[12.5px] text-muted">
          <span>
            <strong className="text-ink">{row.scan_count}</strong> okutma
          </span>
          <span className="text-line">·</span>
          <span>
            {row.last_scan_at ? formatDate(row.last_scan_at, true) : "hiç okutulmadı"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {png && (
            <a href={png} download={`qr-${row.code}.png`} title="PNG indir"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-ink/30 hover:text-ink">
              <Icon icon={IconDownload} size={14} />
            </a>
          )}
          <button type="button" onClick={onReset} disabled={busy} title="Sayacı sıfırla"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50">
            <Icon icon={IconRefresh} size={14} />
          </button>
          <button type="button" onClick={onEdit} title="Düzenle"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-ink/30 hover:text-ink">
            <Icon icon={IconEdit} size={14} />
          </button>
          <button type="button" onClick={onDelete} title="Sil"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger">
            <Icon icon={IconTrash} size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function Sayac({ etiket, deger }: { etiket: string; deger: number }) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <span className="font-display text-[26px] font-semibold leading-none tracking-[-.02em]">
        {new Intl.NumberFormat("tr-TR").format(deger)}
      </span>
      <span className="text-[12.5px] text-muted">{etiket}</span>
    </Card>
  );
}
