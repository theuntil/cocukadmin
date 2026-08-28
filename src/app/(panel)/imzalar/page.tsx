import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, Divider } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconSignature, IconUserGroup, IconAward, IconLocation, IconTrend,
  IconSearch, IconCalendar, IconShield,
} from "@/components/ui/icons";
import {
  getSignatureOverview, getSignaturesByTeam, getSignaturesByCity,
  getSignatureDaily, getSignatureCampaigns, listSignatures,
} from "@/lib/signatures/data";
import { formatDate, publicStorageUrl } from "@/lib/utils";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "İmzalar" };
export const dynamic = "force-dynamic";

/**
 * İMZA RAPORLARI
 *
 * Dört bakış: özet sayaçlar · günlük seyir · takım ve şehir kırılımı ·
 * imza atanların listesi.
 *
 * ⚠️  Kimlik ve iletişim bilgileri veritabanında HASH'li tutuluyor;
 * ham telefon ya da e-posta hiçbir yerde yok. Bu sayfa da yalnızca
 * ad-soyad, takım, şehir ve tarih gösterir.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string; takim?: string; kampanya?: string }>;
}) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor", "support")) redirect("/");

  const sp = await searchParams;
  const search = sp.ara?.trim() || null;
  const takim = sp.takim || null;
  const kampanya = sp.kampanya || null;

  const [ozet, takimlar, sehirler, gunluk, kampanyalar, liste] = await Promise.all([
    getSignatureOverview(),
    getSignaturesByTeam(),
    getSignaturesByCity(),
    getSignatureDaily(30),
    getSignatureCampaigns(),
    listSignatures({ search, teamId: takim, campaignId: kampanya, limit: 50 }),
  ]);

  const hedefYuzde = ozet.target > 0
    ? Math.min(Math.round((ozet.total / ozet.target) * 100), 100)
    : 0;

  const enYuksekGun = Math.max(1, ...gunluk.map((g) => g.imza));
  const enYuksekTakim = Math.max(1, ...takimlar.map((t) => t.imza));
  const enYuksekSehir = Math.max(1, ...sehirler.map((c) => c.imza));

  return (
    <div className="flex flex-col gap-6">

      {/* ── Başlık ── */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
          İmzalar
        </h1>
        <span className="text-[13.5px] text-muted">
          Kampanya sayıları, takım ve şehir dağılımı, imza atanlar
        </span>
      </div>

      {/* ── Sayaçlar ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Sayac icon={IconSignature} etiket="Toplam imza" deger={ozet.total} vurgu />
        <Sayac icon={IconCalendar} etiket="Bugün" deger={ozet.today} />
        <Sayac icon={IconTrend} etiket="Son 7 gün" deger={ozet.week} />
        <Sayac icon={IconLocation} etiket="Şehir" deger={ozet.cities} />
      </div>

      {/* ── Hedefe ilerleme ── */}
      {ozet.target > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="text-[14px] font-semibold">Hedefe ilerleme</span>
            <span className="text-[13px] text-muted">
              <strong className="text-ink">
                {new Intl.NumberFormat("tr-TR").format(ozet.total)}
              </strong>
              {" / "}
              {new Intl.NumberFormat("tr-TR").format(ozet.target)}
              {" · %"}{hedefYuzde}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-chip">
            <div className="h-full rounded-full bg-solid transition-[width] duration-700"
              style={{ width: `${hedefYuzde}%` }} />
          </div>
        </Card>
      )}

      {/* ── Günlük seyir ── */}
      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <span className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-.02em]">
          <Icon icon={IconTrend} size={18} className="text-ink2" /> Son 30 gün
        </span>
        {gunluk.length === 0 ? (
          <span className="text-[13.5px] text-muted">Henüz veri yok.</span>
        ) : (
          <>
            {/* Sütun grafiği — kütüphane yok, saf CSS. Yüksekliği en
                yüksek güne göre oranlanır. */}
            <div className="flex h-[120px] items-end gap-[3px]">
              {gunluk.map((g) => (
                <div key={g.gun}
                  title={`${formatDate(g.gun)} · ${g.imza} imza`}
                  className="group relative flex-1 rounded-t-[3px] bg-chip transition-colors hover:bg-solid"
                  style={{ height: `${Math.max((g.imza / enYuksekGun) * 100, 3)}%` }}>
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-solid px-2 py-1 text-[11px] font-semibold text-on-solid group-hover:block">
                    {g.imza}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11.5px] text-muted2">
              <span>{formatDate(gunluk[0]?.gun ?? "")}</span>
              <span>{formatDate(gunluk[gunluk.length - 1]?.gun ?? "")}</span>
            </div>
          </>
        )}
      </Card>

      {/* ── Takım ve şehir kırılımı ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <span className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-.02em]">
            <Icon icon={IconAward} size={18} className="text-ink2" /> Takımlara göre
          </span>
          <Divider />
          {takimlar.length === 0 ? (
            <span className="text-[13.5px] text-muted">Takım seçilmiş imza yok.</span>
          ) : (
            <ul className="flex flex-col gap-3">
              {takimlar.slice(0, 12).map((t, i) => {
                const logo = publicStorageUrl("team-logos", t.logo_path);
                return (
                  <li key={t.id}>
                    <Link href={`/imzalar?takim=${t.id}`}
                      className="flex items-center gap-3 rounded-[10px] p-1 transition-colors hover:bg-chip/50">
                      <span className="w-5 shrink-0 text-[12.5px] font-bold text-muted2">
                        {i + 1}
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-chip">
                        {logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={logo} alt="" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Icon icon={IconUserGroup} size={14} className="text-muted2" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 block truncate text-[13.5px] font-semibold">
                          {t.name}
                        </span>
                        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-chip">
                          <span className="block h-full rounded-full bg-solid"
                            style={{ width: `${(t.imza / enYuksekTakim) * 100}%` }} />
                        </span>
                      </span>
                      <span className="shrink-0 text-[13.5px] font-bold tabular-nums">
                        {new Intl.NumberFormat("tr-TR").format(t.imza)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <span className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-.02em]">
            <Icon icon={IconLocation} size={18} className="text-ink2" /> Şehirlere göre
          </span>
          <Divider />
          {sehirler.length === 0 ? (
            <span className="text-[13.5px] text-muted">Şehir bilgisi olan imza yok.</span>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {sehirler.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-[12.5px] font-bold text-muted2">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block truncate text-[13.5px] font-medium">{c.name}</span>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-chip">
                      <span className="block h-full rounded-full bg-solid"
                        style={{ width: `${(c.imza / enYuksekSehir) * 100}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-[13.5px] font-bold tabular-nums">
                    {new Intl.NumberFormat("tr-TR").format(c.imza)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Kampanyalar ── */}
      {kampanyalar.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/imzalar"
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
              !kampanya && !takim
                ? "border-solid bg-solid text-on-solid"
                : "border-line bg-surface text-ink2 hover:border-ink/25"
            }`}>
            Tümü
          </Link>
          {kampanyalar.map((k) => (
            <Link key={k.id} href={`/imzalar?kampanya=${k.id}`}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                kampanya === k.id
                  ? "border-solid bg-solid text-on-solid"
                  : "border-line bg-surface text-ink2 hover:border-ink/25"
              }`}>
              <span className="max-w-[180px] truncate">{k.title}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                kampanya === k.id ? "bg-on-solid/20" : "bg-chip text-ink2"
              }`}>
                {k.imza}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ── İmza atanlar ── */}
      <Card className="flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line2 px-5 py-4">
          <span className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-.02em]">
            <Icon icon={IconUserGroup} size={18} className="text-ink2" /> İmza atanlar
            <span className="text-[13px] font-normal text-muted">
              ({new Intl.NumberFormat("tr-TR").format(liste.total)})
            </span>
          </span>

          <form action="/imzalar" method="get" className="flex items-center gap-2">
            {takim && <input type="hidden" name="takim" value={takim} />}
            {kampanya && <input type="hidden" name="kampanya" value={kampanya} />}
            <div className="relative">
              <Icon icon={IconSearch} size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
              <input name="ara" defaultValue={search ?? ""} placeholder="Ad soyad ara"
                className="h-[38px] w-[200px] rounded-full border border-line bg-field pl-9 pr-4 text-[13.5px] text-ink placeholder:text-muted2 focus:border-green focus:outline-none" />
            </div>
            {(search || takim || kampanya) && (
              <Link href="/imzalar" className="text-[13px] font-semibold text-muted hover:text-ink">
                Temizle
              </Link>
            )}
          </form>
        </div>

        {liste.rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Icon icon={IconSignature} size={24} />}
              title={search || takim || kampanya ? "Sonuç bulunamadı" : "Henüz imza yok"}
              description={search || takim || kampanya
                ? "Süzgeci temizleyip tekrar deneyin."
                : "Kampanya yayınlandığında imzalar burada listelenir."}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line2">
            {liste.rows.map((s) => {
              const logo = publicStorageUrl("team-logos", s.team_logo_path);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-chip/30">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip">
                    {logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={logo} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-[12px] font-bold text-muted2">
                        {(s.first_name[0] ?? "").toLocaleUpperCase("tr-TR")}
                      </span>
                    )}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-semibold">
                      {s.is_anonymized
                        ? "(anonimleştirildi)"
                        : `${s.first_name} ${s.last_name}`}
                    </span>
                    <span className="truncate text-[12.5px] text-muted">
                      {[s.team_name, s.city_name, s.campaign_title].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    {s.consent_contact && (
                      <Badge tone="muted">İletişim izni</Badge>
                    )}
                    <span className="hidden text-[12.5px] text-muted sm:block">
                      {formatDate(s.created_at, true)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {liste.total > liste.rows.length && (
          <div className="border-t border-line2 px-5 py-3 text-center text-[12.5px] text-muted">
            {liste.rows.length} / {liste.total} kayıt gösteriliyor. Aramayla daraltabilirsiniz.
          </div>
        )}
      </Card>

      {/* ── Gizlilik notu ── */}
      <div className="flex items-start gap-2.5 rounded-[14px] border border-line2 bg-field px-4 py-3">
        <Icon icon={IconShield} size={16} className="mt-[2px] shrink-0 text-muted" />
        <span className="text-[12.5px] leading-[1.6] text-muted">
          Telefon, e-posta ve kimlik numarası hiçbir zaman ham hâlde saklanmaz;
          veritabanında yalnızca geri döndürülemez özetleri (hash) tutulur ve
          bunlar bu ekrana da getirilmez. Görünen bilgiler ad-soyad, takım,
          şehir ve tarihle sınırlıdır.
        </span>
      </div>
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
    <Card className={`flex items-center gap-3.5 p-5 ${vurgu ? "border-ink/20" : ""}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
        vurgu ? "bg-solid text-on-solid" : "bg-chip text-ink2"}`}>
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
