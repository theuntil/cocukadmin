"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconAward, IconSearch, IconDownload, IconTrash, IconMail,
  IconArrowRight, IconCheck, IconAlert,
} from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { deleteCertificate, resendCertificate, reissueCertificate } from "@/lib/actions/certificates";
import { formatDate, cn } from "@/lib/utils";

export interface CertRow {
  id: string;
  number: string;
  child_id: string;
  child_name: string;
  parent_name: string;
  team_name: string | null;
  issued_at: string;
  emailed_at: string | null;
  storage_path: string;
}

/**
 * SERTİFİKALAR
 *
 * Üretilen belgeler listelenir; her satırdan önizleme, indirme,
 * yeniden gönderme ve silme yapılabilir.
 *
 * ★ Çocuk adına tıklayınca çocuğun sayfasına gidilir — belgeden
 *   kayda tek adım.
 */
export interface EksikRow {
  cardId: string;
  childId: string;
  childName: string;
}

export function CertificatesBoard({
  rows, eksikler = [],
}: {
  rows: CertRow[];
  /** Kartı olup sertifikası olmayan çocuklar */
  eksikler?: EksikRow[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [ara, setAra] = React.useState("");
  const [onizleme, setOnizleme] = React.useState<CertRow | null>(null);
  const [silinecek, setSilinecek] = React.useState<CertRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const q = ara.trim().toLocaleLowerCase("tr-TR");
  const gorunen = q
    ? rows.filter((r) =>
        r.child_name.toLocaleLowerCase("tr-TR").includes(q) ||
        r.parent_name.toLocaleLowerCase("tr-TR").includes(q) ||
        r.number.toLocaleLowerCase("tr-TR").includes(q))
    : rows;

  const gonderilen = rows.filter((r) => r.emailed_at).length;

  const sil = async () => {
    if (!silinecek) return;
    setBusy(true);
    try {
      const res = await deleteCertificate(silinecek.id);
      if (res.ok) toast.success(res.message ?? "Silindi");
      else toast.error("Silinemedi", res.message);
      setSilinecek(null);
      router.refresh();
    } finally { setBusy(false); }
  };

  const uret = async (e: EksikRow) => {
    setBusy(true);
    try {
      const res = await reissueCertificate(e.childId);
      if (res.ok) {
        toast.success("Sertifika üretildi", res.message);
      } else {
        /* Hata bildirimde KAPANMIYOR: kullanıcı okuyup ne yapacağına
           karar verebilsin. */
        toast.error(`${e.childName} için üretilemedi`, res.message);
      }
      router.refresh();
    } finally { setBusy(false); }
  };

  const gonder = async (r: CertRow) => {
    setBusy(true);
    try {
      const res = await resendCertificate(r.id);
      if (res.ok) toast.success("E-posta gönderildi", res.message);
      else toast.error("Gönderilemedi", res.message);
      router.refresh();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
            Sertifikalar
          </h1>
          <span className="text-[13.5px] text-muted">
            {rows.length} belge · {gonderilen} e-posta gönderildi
          </span>
        </div>

        <div className="relative min-w-0 flex-1 sm:max-w-[300px]">
          <Icon icon={IconSearch} size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
          <input value={ara} onChange={(e) => setAra(e.target.value)}
            placeholder="Çocuk, veli veya belge no"
            className="h-[40px] w-full rounded-full border border-line bg-field pl-9 pr-4 text-[13.5px] text-ink placeholder:text-muted2 focus:border-green focus:outline-none" />
        </div>
      </div>

      {/* ┌─ EKSİKLER ⚠️ ────────────────────────────────────────┐
          │ Kartı olup sertifikası olmayanlar. Üretim otomatik      │
          │ çalışmadıysa buradan elle üretilir ve hata görünür.     │
          └────────────────────────────────────────────────────────┘ */}
      {eksikler.length > 0 && (
        <Card className="flex flex-col gap-3 border-orange/40 bg-orange-bg p-5">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-orange-ink">
            <Icon icon={IconAlert} size={16} />
            {eksikler.length} çocuğun kartı var ama sertifikası yok
          </span>

          <p className="text-[12.5px] leading-[1.55] text-ink2">
            Sertifika normalde ödeme onaylandığında kendiliğinden üretilir.
            Aşağıdakiler üretilmemiş; tek tek üretebilirsiniz. Bir sorun varsa
            hata mesajı ekranda görünür.
          </p>

          <ul className="flex flex-col gap-2">
            {eksikler.slice(0, 30).map((e) => (
              <li key={e.childId}
                className="flex flex-wrap items-center gap-3 rounded-[12px] bg-surface px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                  {e.childName}
                </span>
                <Button type="button" variant="ink" size="sm" disabled={busy}
                  onClick={() => void uret(e)}>
                  Sertifika üret
                </Button>
              </li>
            ))}
          </ul>

          {eksikler.length > 30 && (
            <span className="text-[12px] text-muted">
              …ve {eksikler.length - 30} kişi daha. İlk 30 gösteriliyor.
            </span>
          )}
        </Card>
      )}

      {gorunen.length === 0 ? (
        <EmptyState icon={<Icon icon={IconAward} size={24} />}
          title={rows.length === 0 ? "Henüz sertifika yok" : "Sonuç bulunamadı"}
          description={rows.length === 0
            ? "Kombine kart oluştuğunda sertifika kendiliğinden üretilir."
            : "Aramayı değiştirin."} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line2">
            {gorunen.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-chip text-ink2">
                  <Icon icon={IconAward} size={18} />
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* Çocuk sayfasına git */}
                  <Link href={`/cocuklar/${r.child_id}`}
                    className="group inline-flex items-center gap-1.5 self-start">
                    <span className="truncate text-[14.5px] font-semibold group-hover:underline">
                      {r.child_name}
                    </span>
                    <Icon icon={IconArrowRight} size={13}
                      className="shrink-0 text-muted2 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <span className="truncate text-[12.5px] text-muted">
                    {r.parent_name}
                    {r.team_name ? ` · ${r.team_name}` : ""}
                    <span className="hidden sm:inline"> · {r.number}</span>
                  </span>
                </span>

                <span className={cn(
                  "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold sm:inline-flex",
                  r.emailed_at ? "bg-green-soft text-green" : "bg-chip text-muted",
                )}>
                  <Icon icon={r.emailed_at ? IconCheck : IconAlert} size={12} />
                  {r.emailed_at ? "Gönderildi" : "Gönderilmedi"}
                </span>

                <span className="hidden text-[12px] text-muted2 lg:block">
                  {formatDate(r.issued_at)}
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                  <IkonDugme icon={IconAward} title="Önizle" onClick={() => setOnizleme(r)} />
                  <a href={`/api/sertifika?id=${r.id}&indir=1`} download title="İndir"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-ink/30 hover:text-ink">
                    <Icon icon={IconDownload} size={13} />
                  </a>
                  <IkonDugme icon={IconMail} title="E-postayı yeniden gönder"
                    disabled={busy} onClick={() => void gonder(r)} />
                  <IkonDugme icon={IconTrash} title="Sil" tehlike
                    disabled={busy} onClick={() => setSilinecek(r)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Tam ekran önizleme */}
      <Modal open={onizleme !== null} onClose={() => setOnizleme(null)}
        title={onizleme?.number ?? ""} size="lg">
        {onizleme && (
          <div className="flex flex-col gap-3">
            {/* PDF tarayıcının kendi görüntüleyicisinde: ayrı bir
                kütüphane yüklemek yerine yerleşik olanı kullanmak
                hem hızlı hem güvenilir. */}
            <iframe
              src={`/api/sertifika?id=${onizleme.id}`}
              title={onizleme.number}
              className="h-[68dvh] w-full rounded-[14px] border border-line bg-field"
            />
            <div className="flex flex-wrap gap-2">
              <a href={`/api/sertifika?id=${onizleme.id}&indir=1`} download>
                <Button type="button" variant="ink">
                  <Icon icon={IconDownload} size={15} /> İndir
                </Button>
              </a>
              <Button type="button" variant="outline" onClick={() => setOnizleme(null)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={silinecek !== null}
        onClose={() => setSilinecek(null)}
        loading={busy}
        title="Sertifika silinsin mi?"
        description={silinecek
          ? `${silinecek.child_name} için düzenlenen ${silinecek.number} numaralı belge ve PDF dosyası kalıcı olarak silinecek. Veli panelinde de görünmez olur.`
          : ""}
        confirmLabel="Sil"
        onConfirm={() => void sil()}
      />
    </div>
  );
}

function IkonDugme({
  icon, title, onClick, disabled, tehlike,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  title: string; onClick: () => void; disabled?: boolean; tehlike?: boolean;
}) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 transition-colors disabled:opacity-50",
        tehlike ? "hover:border-danger hover:text-danger" : "hover:border-ink/30 hover:text-ink",
      )}>
      <Icon icon={icon} size={13} />
    </button>
  );
}
