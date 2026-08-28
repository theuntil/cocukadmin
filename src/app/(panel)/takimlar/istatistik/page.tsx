import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconArrowLeft, IconChart, IconFootball, IconCard, IconCalendar, IconArrowRight,
} from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";
import { publicStorageUrl, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Takım istatistikleri" };
export const dynamic = "force-dynamic";

const ARALIKLAR = [
  { k: "hepsi", l: "Tüm zamanlar" },
  { k: "bugun", l: "Bugün" },
  { k: "7g",    l: "Son 7 gün" },
  { k: "30g",   l: "Son 30 gün" },
  { k: "ay",    l: "Bu ay" },
] as const;

/**
 * GENEL TAKIM İSTATİSTİKLERİ
 *
 * Hangi takım kaç kombine satmış — sıralı liste. Üstte seçilen aralığa
 * göre süzülüyor.
 *
 * ┌─ SAYIM NEDEN BÖYLE ───────────────────────────────────────────┐
 * │ PostgREST gruplama yapamıyor. Tüm kart satırlarını çekip       │
 * │ tarayıcıda saymak, satır sınırına takılıp YANLIŞ sayı üretir.  │
 * │ Onun yerine takım başına `head: true` sayım isteği atılıyor:   │
 * │ gövde inmiyor, yalnızca sayı geliyor ve hepsi paralel gidiyor. │
 * └─────────────────────────────────────────────────────────────────┘
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ aralik?: string }>;
}) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) redirect("/");

  const sp = await searchParams;
  const aralik = ARALIKLAR.find((a) => a.k === sp.aralik)?.k ?? "hepsi";

  const simdi = new Date();
  let from: string | null = null;

  if (aralik === "bugun") {
    from = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).toISOString();
  } else if (aralik === "7g") {
    from = new Date(simdi.getTime() - 7 * 86400000).toISOString();
  } else if (aralik === "30g") {
    from = new Date(simdi.getTime() - 30 * 86400000).toISOString();
  } else if (aralik === "ay") {
    from = new Date(simdi.getFullYear(), simdi.getMonth(), 1).toISOString();
  }

  const supabase = await createClient();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, logo_path, is_active")
    .order("name");

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">
          Takım istatistikleri
        </h1>
        <Alert tone="danger" title="Veriler alınamadı">{error.message}</Alert>
      </div>
    );
  }

  const liste = (teams ?? []) as { id: string; name: string; logo_path: string | null; is_active: boolean }[];
  const bugun = new Date().toISOString().slice(0, 10);

  const sayimlar = await Promise.all(
    liste.map(async (t) => {
      let kart = supabase.from("cards").select("id", { count: "exact", head: true })
        .eq("team_id", t.id).neq("status", "cancelled");
      if (from) kart = kart.gte("created_at", from);

      const [toplam, aktif] = await Promise.all([
        kart,
        supabase.from("cards").select("id", { count: "exact", head: true })
          .eq("team_id", t.id).eq("status", "active")
          .or(`valid_until.is.null,valid_until.gte.${bugun}`),
      ]);

      return { toplam: toplam.count ?? 0, aktif: aktif.count ?? 0 };
    }),
  );

  const satirlar = liste
    .map((t, i) => ({ ...t, ...sayimlar[i] }))
    .sort((a, b) => b.toplam - a.toplam);

  const genelToplam = satirlar.reduce((a, t) => a + t.toplam, 0);
  const genelAktif = satirlar.reduce((a, t) => a + t.aktif, 0);
  const enYuksek = Math.max(1, ...satirlar.map((t) => t.toplam));
  const kartliTakim = satirlar.filter((t) => t.toplam > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/takimlar"
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Takımlar
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
          Takım istatistikleri
        </h1>
        <span className="text-[13.5px] text-muted">
          Hangi takım kaç kombine kart · sıralı
        </span>
      </div>

      {/* Aralık süzgeci */}
      <div className="flex flex-wrap items-center gap-2">
        {ARALIKLAR.map((a) => (
          <Link key={a.k}
            href={`/takimlar/istatistik${a.k === "hepsi" ? "" : `?aralik=${a.k}`}`}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
              aralik === a.k
                ? "border-solid bg-solid text-on-solid"
                : "border-line bg-surface text-ink2 hover:border-ink/25",
            )}>
            {a.l}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Sayac icon={IconCard} etiket={aralik === "hepsi" ? "Toplam kombine" : "Seçilen dönemde"}
          deger={genelToplam} vurgu />
        <Sayac icon={IconChart} etiket="Şu an geçerli" deger={genelAktif} />
        <Sayac icon={IconFootball} etiket="Kartı olan takım" deger={kartliTakim} />
      </div>

      {satirlar.length === 0 ? (
        <EmptyState icon={<Icon icon={IconCalendar} size={24} />}
          title="Takım yok" description="Önce takım ekleyin." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line2">
            {satirlar.map((t, i) => {
              const logo = publicStorageUrl("team-logos", t.logo_path);
              return (
                <li key={t.id}>
                  <Link href={`/takimlar/${t.id}/istatistik`}
                    className={cn(
                      "flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-chip/40 sm:px-5",
                      !t.is_active && "opacity-55",
                    )}>
                    <span className="w-6 shrink-0 text-[13px] font-bold text-muted2">{i + 1}</span>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-chip">
                      {logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <Icon icon={IconFootball} size={16} className="text-muted2" />
                      )}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-[14px] font-semibold">{t.name}</span>
                      {/* Oran çubuğu: sayıları karşılaştırmak için */}
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-chip">
                        <span className="block h-full rounded-full bg-solid"
                          style={{ width: `${(t.toplam / enYuksek) * 100}%` }} />
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-[15px] font-bold tabular-nums">
                        {new Intl.NumberFormat("tr-TR").format(t.toplam)}
                      </span>
                      <span className="text-[11.5px] text-muted">{t.aktif} geçerli</span>
                    </span>

                    <Icon icon={IconArrowRight} size={15} className="shrink-0 text-muted2" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Sayac({
  icon, etiket, deger, vurgu,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  etiket: string; deger: number; vurgu?: boolean;
}) {
  return (
    <Card className="flex items-center gap-3.5 p-5">
      <span className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]",
        vurgu ? "bg-solid text-on-solid" : "bg-chip text-ink2",
      )}>
        <Icon icon={icon} size={19} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-[24px] font-semibold leading-none tracking-[-.02em] tabular-nums">
          {new Intl.NumberFormat("tr-TR").format(deger)}
        </span>
        <span className="mt-1 truncate text-[12.5px] text-muted">{etiket}</span>
      </span>
    </Card>
  );
}
