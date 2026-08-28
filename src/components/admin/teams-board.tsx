"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Button, Card, EmptyState, Field, Input, Select, Checkbox } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Icon } from "@/components/ui/icon";
import { IconFootball, IconPlus, IconSearch, IconArrowRight, IconChart } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { saveTeam } from "@/lib/actions/teams";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { publicStorageUrl, cn } from "@/lib/utils";
import type { TeamCard } from "@/lib/team-accounts/data";

/**
 * TAKIMLAR PANOSU
 *
 * Izgara: mobilde 3, geniş ekranda 5 sütun. Logonun köşesindeki nokta
 * hesap durumunu gösterir — yeşil hesap var, turuncu davet bekliyor,
 * gri hesap yok.
 *
 * Karta tıklanınca detay sayfasına gidilir; orada hem takım bilgileri
 * hem giriş yetkileri yönetilir.
 */
export function TeamsBoard({
  teams, cities, leagues,
}: {
  teams: TeamCard[];
  cities: { id: number; name: string }[];
  leagues: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState(saveTeam, IDLE);

  const [form, setForm] = React.useState(false);
  const [logoPath, setLogoPath] = React.useState("");
  const [ara, setAra] = React.useState("");

  useActionEffect(state, () => {
    setForm(false);
    setLogoPath("");
    toast.success("Takım eklendi");
    router.refresh();
  });

  const q = ara.trim().toLocaleLowerCase("tr-TR");
  const gorunen = q
    ? teams.filter((t) => t.name.toLocaleLowerCase("tr-TR").includes(q))
    : teams;


  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
            Takımlar
          </h1>
          <span className="text-[13.5px] text-muted">
            Takım bilgileri ve panel giriş yetkileri
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Genel istatistikler — hangi takım kaç kombine satmış */}
          <Link href="/takimlar/istatistik"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink2 transition-colors hover:border-ink/25 hover:text-ink">
            <Icon icon={IconChart} size={16} /> İstatistikler
          </Link>

          <Button type="button" variant="ink" size="md" onClick={() => setForm(true)}>
            <Icon icon={IconPlus} size={16} /> Yeni takım
          </Button>
        </div>
      </div>


      {/* Arama — süzgeç kaldırıldı: 28 takım için gereksiz bir katmandı,
          arama zaten yeterli. */}
      <div className="relative max-w-[320px]">
        <Icon icon={IconSearch} size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Takım ara"
          className="h-[40px] w-full rounded-full border border-line bg-field pl-9 pr-4 text-[13.5px] text-ink placeholder:text-muted2 focus:border-green focus:outline-none" />
      </div>

      {gorunen.length === 0 ? (
        <EmptyState icon={<Icon icon={IconFootball} size={24} />}
          title={teams.length === 0 ? "Henüz takım yok" : "Takım bulunamadı"}
          description={teams.length === 0
            ? "“Yeni takım” ile ilk takımı ekleyin."
            : "Süzgeci veya aramayı değiştirin."} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line2">
            {gorunen.map((t) => {
              const logo = publicStorageUrl("team-logos", t.logo_path);

              return (
                <li key={t.id}>
                  <Link href={`/takimlar/${t.id}`}
                    className={cn(
                      "flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-chip/40 sm:px-5",
                      !t.is_active && "opacity-55",
                    )}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-chip">
                      {logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <Icon icon={IconFootball} size={18} className="text-muted2" />
                      )}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[14.5px] font-semibold">{t.name}</span>
                      <span className="truncate text-[12.5px] text-muted">
                        {t.short_name || "—"}
                      </span>
                    </span>


                    {!t.is_active && (
                      <span className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                        Pasif
                      </span>
                    )}

                    <Icon icon={IconArrowRight} size={15} className="shrink-0 text-muted2" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* ── Yeni takım penceresi ──
          Sayfa içinde açılan form listeyi aşağı itiyor ve kullanıcı
          nerede olduğunu kaybediyordu. Ayrı pencere, işi bitince
          kapanıyor ve liste yerinde kalıyor. */}
      <Modal
        open={form}
        onClose={() => { setForm(false); setLogoPath(""); }}
        title="Yeni takım"
        description="Takımı ekledikten sonra detay sayfasından her ayarı düzenleyebilirsiniz."
        size="md"
      >
        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="logoPath" value={logoPath} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Takım adı" htmlFor="name" error={state.fieldErrors?.name}>
              <Input id="name" name="name" required maxLength={120} autoFocus
                placeholder="Örn. Adana Demirspor" />
            </Field>
            <Field label="Kısa ad" htmlFor="shortName" hint="en fazla 12 karakter">
              <Input id="shortName" name="shortName" maxLength={12} placeholder="ADS" />
            </Field>
            <Field label="Şehir" htmlFor="cityId">
              <Select id="cityId" name="cityId" defaultValue="">
                <option value="">Seçilmedi</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            {/* ┌─ LİG ZORUNLU ⚠️ ────────────────────────────────┐
                │ Takım seçicilerde gruplama buna dayanıyor. Ligsiz  │
                │ takım "Diğer" başlığında en sonda kalır ve         │
                │ kullanıcı bulamaz.                                 │
                └────────────────────────────────────────────────────┘ */}
            <Field label="Lig" htmlFor="leagueId" hint="zorunlu"
              error={state.fieldErrors?.leagueId}>
              <Select id="leagueId" name="leagueId" required defaultValue={""}>
                <option value="" disabled>Lig seçin…</option>
                {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>

            <Field label="Ana renk" htmlFor="colorPrimary" hint="#RRGGBB"
              error={state.fieldErrors?.colorPrimary}>
              <Input id="colorPrimary" name="colorPrimary" placeholder="#1B4DFF" />
            </Field>
          </div>

          <ImageUploadField
            bucket="team-logos"
            label="Logo"
            hint="PNG · şeffaf zemin önerilir"
            value={logoPath}
            onChange={setLogoPath}
          />

          <Checkbox id="isActive" name="isActive" defaultChecked label="Aktif" />

          <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
            <Button type="submit" variant="ink" loading={pending}>Takımı ekle</Button>
            <Button type="button" variant="outline"
              onClick={() => { setForm(false); setLogoPath(""); }}>
              Vazgeç
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

