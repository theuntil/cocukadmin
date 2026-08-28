"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card, Checkbox, EmptyState, Field, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconUsers, IconSearch, IconArrowRight, IconDownload, IconPhone, IconMail, IconCalendar,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, cn } from "@/lib/utils";
import type { UyeRow, UyeDurum } from "@/lib/team-accounts/members";

/**
 * TAKIM ÜYELERİ
 *
 * Kombine kartı bu takıma ait çocuklar. Satıra tıklanınca kartın
 * kendi sayfası açılır — üye kaydından karta tek adımda geçiliyor.
 */
export function TeamMembersBoard({
  teamId, teamName, rows, durum,
}: {
  teamId: string;
  teamName: string;
  rows: UyeRow[];
  durum: UyeDurum;
}) {
  const [ara, setAra] = React.useState("");
  const [exportAcik, setExportAcik] = React.useState(false);

  const bugun = new Date().toISOString().slice(0, 10);
  const q = ara.trim().toLocaleLowerCase("tr-TR");

  const gorunen = q
    ? rows.filter((r) =>
        `${r.child_ad} ${r.child_soyad}`.toLocaleLowerCase("tr-TR").includes(q) ||
        r.card_number.toLocaleLowerCase("tr-TR").includes(q) ||
        (r.veli_ad ?? "").toLocaleLowerCase("tr-TR").includes(q))
    : rows;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
            Üyelerimiz
          </h1>
          <span className="text-[13.5px] text-muted">
            {teamName} · {new Intl.NumberFormat("tr-TR").format(rows.length)} kombine kart
          </span>
        </div>

        <Button type="button" variant="ink" size="md" onClick={() => setExportAcik(true)}>
          <Icon icon={IconDownload} size={16} /> Dışa aktar
        </Button>
      </div>

      {/* Durum süzgeci — sunucu tarafında uygulanıyor */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { k: "hepsi", l: "Tümü" },
          { k: "aktif", l: "Aktif" },
          { k: "gecmis", l: "Süresi geçmiş" },
        ] as const).map((f) => (
          <Link key={f.k}
            href={`/takimlar/${teamId}/uyeler${f.k === "hepsi" ? "" : `?durum=${f.k}`}`}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
              durum === f.k
                ? "border-solid bg-solid text-on-solid"
                : "border-line bg-surface text-ink2 hover:border-ink/25",
            )}>
            {f.l}
          </Link>
        ))}

        <div className="relative ml-auto min-w-0 flex-1 sm:max-w-[280px]">
          <Icon icon={IconSearch} size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
          <input value={ara} onChange={(e) => setAra(e.target.value)}
            placeholder="Çocuk, veli veya kart no"
            className="h-[40px] w-full rounded-full border border-line bg-field pl-9 pr-4 text-[13.5px] text-ink placeholder:text-muted2 focus:border-green focus:outline-none" />
        </div>
      </div>

      {gorunen.length === 0 ? (
        <EmptyState icon={<Icon icon={IconUsers} size={24} />}
          title={rows.length === 0 ? "Henüz üye yok" : "Sonuç bulunamadı"}
          description={rows.length === 0
            ? "Bu takım için kombine kart alındıkça üyeler burada listelenir."
            : "Aramayı veya süzgeci değiştirin."} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line2">
            {gorunen.map((r) => {
              const gecerli = r.card_status === "active"
                && (!r.valid_until || r.valid_until >= bugun);

              return (
                <li key={r.card_id}>
                  {/* Karta tıklayınca kartın sayfasına — üyeden karta
                      tek adım. */}
                  <Link href={`/kartlar/${r.card_id}`}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-chip/40 sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chip text-[14px] font-bold text-muted2">
                      {(r.child_ad[0] ?? "").toLocaleUpperCase("tr-TR")}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[14.5px] font-semibold">
                        {r.child_ad} {r.child_soyad}
                      </span>
                      <span className="truncate text-[12.5px] text-muted">
                        {r.child_yas} yaş
                        {r.child_sehir ? ` · ${r.child_sehir}` : ""}
                        <span className="hidden sm:inline"> · {r.card_number}</span>
                      </span>
                    </span>

                    <span className="hidden min-w-0 flex-col items-end lg:flex">
                      <span className="truncate text-[12.5px] font-medium">{r.veli_ad ?? "—"}</span>
                      {r.veli_telefon && (
                        <span className="truncate text-[12px] text-muted">{r.veli_telefon}</span>
                      )}
                    </span>

                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
                      gecerli ? "bg-green-soft text-green" : "bg-chip text-muted",
                    )}>
                      {gecerli ? "Geçerli" : "Doldu"}
                    </span>

                    <Icon icon={IconArrowRight} size={15} className="shrink-0 text-muted2" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ExportModal open={exportAcik} onClose={() => setExportAcik(false)}
        teamId={teamId} teamName={teamName} baslangicDurum={durum} />
    </div>
  );
}

/* ═══════════════════ DIŞA AKTARMA ═══════════════════ */

/** Kayıtların başladığı ay — bundan öncesi seçilemez */
const ILK_YIL = 2026;
const ILK_AY = 8;

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function aySecenekleri() {
  const liste: { deger: string; etiket: string }[] = [];
  const simdi = new Date();

  let y = ILK_YIL, a = ILK_AY;
  while (y < simdi.getFullYear() || (y === simdi.getFullYear() && a <= simdi.getMonth() + 1)) {
    liste.push({
      deger: `${y}-${String(a).padStart(2, "0")}`,
      etiket: `${AYLAR[a - 1]} ${y}`,
    });
    a += 1;
    if (a > 12) { a = 1; y += 1; }
  }
  return liste.reverse();   // en yeni ay üstte
}

type Aralik = "hepsi" | "7g" | "30g" | "ay" | "ozel";

function ExportModal({
  open, onClose, teamId, teamName, baslangicDurum,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  baslangicDurum: UyeDurum;
}) {
  const toast = useToast();

  const [durum, setDurum] = React.useState<UyeDurum>(baslangicDurum);
  const [aralik, setAralik] = React.useState<Aralik>("hepsi");
  const [ay, setAy] = React.useState<string>(aySecenekleri()[0]?.deger ?? "");
  const [ozelBas, setOzelBas] = React.useState("");
  const [ozelBit, setOzelBit] = React.useState("");
  const [telefon, setTelefon] = React.useState(true);
  const [eposta, setEposta] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const aylar = React.useMemo(aySecenekleri, []);

  const tarihAralik = (): { from: string | null; to: string | null } => {
    const bugun = new Date();

    if (aralik === "7g" || aralik === "30g") {
      const gun = aralik === "7g" ? 7 : 30;
      const bas = new Date(bugun.getTime() - gun * 24 * 60 * 60 * 1000);
      return { from: bas.toISOString(), to: null };
    }

    if (aralik === "ay" && ay) {
      const [y, a] = ay.split("-").map(Number);
      /* Ayın son gününü elle hesaplamak yerine bir sonraki ayın
         ilk gününü üst sınır yapıyoruz: artık yıl ve 31 çeken ay
         sorunları kendiliğinden çözülüyor. */
      const bas = new Date(Date.UTC(y, a - 1, 1));
      const bit = new Date(Date.UTC(a === 12 ? y + 1 : y, a === 12 ? 0 : a, 1));
      return { from: bas.toISOString(), to: bit.toISOString() };
    }

    if (aralik === "ozel") {
      return {
        from: ozelBas ? new Date(`${ozelBas}T00:00:00`).toISOString() : null,
        to: ozelBit ? new Date(`${ozelBit}T23:59:59`).toISOString() : null,
      };
    }

    return { from: null, to: null };
  };

  const indir = async () => {
    if (aralik === "ozel" && !ozelBas && !ozelBit) {
      toast.warning("Tarih seçilmedi", "Başlangıç ya da bitiş tarihi girin.");
      return;
    }

    setBusy(true);
    try {
      const { from, to } = tarihAralik();
      const p = new URLSearchParams({ takim: teamId, durum });
      if (from) p.set("baslangic", from);
      if (to) p.set("bitis", to);
      if (telefon) p.set("telefon", "1");
      if (eposta) p.set("eposta", "1");

      const res = await fetch(`/api/export/uyeler?${p.toString()}`);

      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Bilinmeyen hata" }));
        toast.error("Dışa aktarılamadı", j.error);
        return;
      }

      /* Tarayıcıya indirtmek için geçici bağlantı: dosya adı sunucudan
         gelen başlıktan alınıyor, burada tekrar üretilmiyor. */
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${teamName}-uyeler.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Excel dosyası indirildi");
      onClose();
    } catch (err) {
      toast.error("Dışa aktarılamadı", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Üye listesini dışa aktar"
      description="Seçtiğiniz kayıtlar Excel dosyası olarak inecek." size="md">
      <div className="flex flex-col gap-6">

        {/* ── Hangi kartlar ── */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-semibold text-ink2">Hangi kartlar</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              { k: "hepsi", l: "Tümü", h: "Bütün kayıtlar" },
              { k: "aktif", l: "Aktif", h: "Geçerli kartlar" },
              { k: "gecmis", l: "Süresi geçmiş", h: "Yenilenmemişler" },
            ] as const).map((o) => (
              <button key={o.k} type="button" onClick={() => setDurum(o.k)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-[14px] border px-4 py-3 text-left transition-colors",
                  durum === o.k
                    ? "border-solid bg-solid text-on-solid"
                    : "border-line bg-surface hover:border-ink/25",
                )}>
                <span className="text-[13.5px] font-semibold">{o.l}</span>
                <span className={cn("text-[11.5px]", durum === o.k ? "opacity-75" : "text-muted")}>
                  {o.h}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tarih aralığı ── */}
        <div className="flex flex-col gap-2.5">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink2">
            <Icon icon={IconCalendar} size={14} /> Kayıt tarihi
          </span>

          <div className="flex flex-wrap gap-2">
            {([
              { k: "hepsi", l: "Tüm zamanlar" },
              { k: "7g", l: "Son 7 gün" },
              { k: "30g", l: "Son 30 gün" },
              { k: "ay", l: "Belirli ay" },
              { k: "ozel", l: "Özel aralık" },
            ] as const).map((o) => (
              <button key={o.k} type="button" onClick={() => setAralik(o.k)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                  aralik === o.k
                    ? "border-solid bg-solid text-on-solid"
                    : "border-line bg-surface text-ink2 hover:border-ink/25",
                )}>
                {o.l}
              </button>
            ))}
          </div>

          {aralik === "ay" && (
            <Field label="Ay" htmlFor="ay">
              <Select id="ay" value={ay} onChange={(e) => setAy(e.target.value)}>
                {aylar.map((a) => (
                  <option key={a.deger} value={a.deger}>{a.etiket}</option>
                ))}
              </Select>
            </Field>
          )}

          {aralik === "ozel" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlangıç" htmlFor="bas">
                <input id="bas" type="date" value={ozelBas}
                  onChange={(e) => setOzelBas(e.target.value)}
                  className="h-[42px] w-full rounded-[12px] border border-line bg-field px-3.5 text-[14px] text-ink focus:border-green focus:outline-none" />
              </Field>
              <Field label="Bitiş" htmlFor="bit">
                <input id="bit" type="date" value={ozelBit}
                  onChange={(e) => setOzelBit(e.target.value)}
                  className="h-[42px] w-full rounded-[12px] border border-line bg-field px-3.5 text-[14px] text-ink focus:border-green focus:outline-none" />
              </Field>
            </div>
          )}
        </div>

        {/* ── Sütunlar ── */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-semibold text-ink2">Dosyadaki bilgiler</span>

          <div className="rounded-[14px] bg-field px-4 py-3">
            <span className="text-[12.5px] leading-[1.6] text-muted">
              Her zaman yer alır: <strong className="text-ink2">ad, soyad, doğum tarihi,
              yaş, şehir, kart no, kart durumu, başlangıç ve bitiş tarihi, veli adı</strong>.
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <Checkbox id="tel" checked={telefon} onChange={(e) => setTelefon(e.target.checked)}
              label={<span className="inline-flex items-center gap-1.5">
                <Icon icon={IconPhone} size={13} /> Veli telefonu
              </span> as unknown as string} />
            <Checkbox id="mail" checked={eposta} onChange={(e) => setEposta(e.target.checked)}
              label={<span className="inline-flex items-center gap-1.5">
                <Icon icon={IconMail} size={13} /> Veli e-postası
              </span> as unknown as string} />
          </div>

          <span className="text-[12px] leading-[1.55] text-muted2">
            İletişim bilgisi kişisel veridir. Dosya elden ele dolaşabileceği için
            gerekmiyorsa kapalı bırakın.
          </span>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
          <Button type="button" variant="ink" loading={busy} onClick={() => void indir()}>
            <Icon icon={IconDownload} size={16} /> Excel indir
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
        </div>
      </div>
    </Modal>
  );
}
