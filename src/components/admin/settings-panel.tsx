"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, Field, H3, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconSun, IconMoon,  IconAward,
  IconLogin, IconCard, IconHeart, IconSignature, IconTicket, IconCalendar,
  IconSettings, IconMoney, IconAlert, IconImage, IconPhone } from "@/components/ui/icons";
import { BrandUploader } from "@/components/admin/brand-uploader";
import { updateSetting, updatePlanPrice } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { formatMoney } from "@/lib/utils";

interface SettingRow {
  key: string; value: unknown; label: string; description: string | null; category: string;
}

const CATEGORY: Record<string, { title: string; icon: Parameters<typeof Icon>[0]["icon"]; note?: string }> = {
  payments:   { title: "Ödeme yöntemleri", icon: IconCard,
                note: "İkisi de kapalıysa kullanıcılar başvuru yapamaz." },
  signatures: { title: "İmza kampanyası", icon: IconSignature },
  cards:      { title: "Kombine kart", icon: IconTicket },
  events:     { title: "Etkinlikler", icon: IconCalendar },
  notify:     { title: "Bildirimler", icon: IconPhone,
                note: "Kapalıyken doğrulama kodu ve bilgilendirme e-postaları gönderilmez." },
  hero:       { title: "Ana sayfa ve video", icon: IconImage,
                note: "Arka plan videosu, tanıtım metinleri ve öne çıkan destekçi." },
  brand:      { title: "Logo ve görseller", icon: IconImage },
  trademark:  { title: "Tescil belgeleri", icon: IconAward,
                note: "Marka tescil belgeleri. Belge yüklenmemiş kurum sitede yine görünür — bayrağıyla gösterilir, “belge yok” yazmaz." },
  auth:       { title: "Giriş ekranı", icon: IconLogin,
                note: "Giriş sayfasının sağ panelindeki yazı, görsel ve sayaçlar. Hepsi boş bırakılabilir — boş olan hiç gösterilmez." },
  contact:    { title: "İletişim ve sosyal medya", icon: IconSettings },
  site:       { title: "Site", icon: IconSettings },
  general:    { title: "Genel", icon: IconSettings },
};

/**
 * ┌─ KATEGORİLER BEŞE İNDİRİLDİ ⚠️ ───────────────────────────────┐
 * │ On iki kategori vardı. Aradığı ayarın hangi başlıkta olduğunu  │
 * │ hatırlamak gerekiyordu — "video ana sayfada mı görsellerde mi",│
 * │ "giriş ekranı markada mı sitede mi".                            │
 * │                                                                  │
 * │ Yakın işler birleştirildi. Beş başlık tek bakışta taranabilir.  │
 * └──────────────────────────────────────────────────────────────────┘
 */
const GRUPLAR: { id: string; title: string; icon: Parameters<typeof Icon>[0]["icon"];
                 note?: string; kategoriler: string[] }[] = [
  {
    id: "gorunum",
    title: "Görünüm",
    icon: IconImage,
    note: "Logo, favicon, tema, ana sayfa görselleri ve giriş ekranı.",
    kategoriler: ["brand", "hero", "auth", "site"],
  },
  {
    id: "satis",
    title: "Satış",
    icon: IconCard,
    note: "Ödeme yöntemleri ve kombine kart kuralları. İkisi de kapalıysa kullanıcılar başvuru yapamaz.",
    kategoriler: ["payments", "cards"],
  },
  {
    id: "icerik",
    title: "İçerik",
    icon: IconCalendar,
    note: "Etkinlikler, imza kampanyası ve tescil belgeleri.",
    kategoriler: ["events", "signatures", "trademark"],
  },
  {
    id: "iletisim",
    title: "İletişim",
    icon: IconPhone,
    note: "Bildirimler, sosyal medya ve iletişim bilgileri.",
    kategoriler: ["notify", "contact"],
  },
  {
    id: "genel",
    title: "Genel",
    icon: IconSettings,
    kategoriler: ["general"],
  },
];

export function SettingsPanel({
  settings, price, currency,
}: { settings: SettingRow[]; price: number; currency: string }) {
  const cardOn = settings.find((s) => s.key === "payments.card_enabled")?.value === true;
  const ibanOn = settings.find((s) => s.key === "payments.iban_enabled")?.value === true;
  const maintenance = settings.find((s) => s.key === "site.maintenance_mode")?.value === true;

  /* Bilinen gruplara girmeyen kategoriler "Genel"e düşer: yeni bir
     ayar eklendiğinde listeden kaybolmasın. */
  const bilinen = new Set(GRUPLAR.flatMap((g) => g.kategoriler));
  const gruplar = GRUPLAR.map((g) => ({
    ...g,
    satirlar: settings.filter((s) =>
      g.id === "genel"
        ? g.kategoriler.includes(s.category ?? "general") || !bilinen.has(s.category ?? "general")
        : g.kategoriler.includes(s.category ?? "general")),
  })).filter((g) => g.satirlar.length > 0);

  const [aktif, setAktif] = React.useState<string>(gruplar[0]?.id ?? "genel");

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Ayarlar</h1>
        <span className="text-[14px] text-muted">
          Değişiklikler anında yayına girer ve denetim kaydına yazılır.
        </span>
      </div>

      {maintenance && (
        <Alert tone="danger" title="Bakım modu açık">
          Ziyaretçiler bakım sayfası görüyor. Yöneticiler siteyi normal kullanmaya devam eder.
        </Alert>
      )}

      {!cardOn && !ibanOn && (
        <Alert tone="danger" title="Hiçbir ödeme yöntemi açık değil">
          Kullanıcılar kart başvurusu yapamaz. En az bir yöntem açın.
        </Alert>
      )}

      <PriceCard price={price} currency={currency} />

      {/* ┌─ YATAY KATEGORİ SEÇİCİ ───────────────────────────────────┐
          │ Tüm ayarlar alt alta uzuyordu; aradığını bulmak için      │
          │ sayfayı taramak gerekiyordu. Artık kategori seçiliyor,    │
          │ yalnızca o bölüm çiziliyor.                               │
          │                                                            │
          │ Mobilde yatay kayan şerit: seçenekler ekrana sığmıyor     │
          │ ama kenardan devamı olduğu görünüyor.                     │
          └────────────────────────────────────────────────────────────┘ */}
      <div className="ct-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
        {gruplar.map((grup) => {
          const meta = grup;
          const secili = aktif === grup.id;
          const adet = grup.satirlar.length;

          return (
            <button key={grup.id} type="button" onClick={() => setAktif(grup.id)}
              aria-pressed={secili}
              className={`flex w-[104px] shrink-0 flex-col items-center gap-2.5 rounded-[16px] border px-3 py-4 transition-colors sm:w-[116px] ${
                secili
                  ? "border-solid bg-solid text-on-solid"
                  : "border-line bg-surface text-ink2 hover:border-ink/25 hover:text-ink"
              }`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${
                secili ? "bg-on-solid/15" : "bg-chip"}`}>
                <Icon icon={meta.icon} size={19} />
              </span>
              <span className="text-center text-[12px] font-semibold leading-tight">
                {meta.title}
              </span>
              <span className={`text-[11px] ${secili ? "opacity-70" : "text-muted2"}`}>
                {adet} ayar
              </span>
            </button>
          );
        })}
      </div>

      {gruplar.filter((g) => g.id === aktif).map((grup) => (
        <Card key={grup.id} className="flex flex-col gap-6 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-solid text-on-solid">
              <Icon icon={grup.icon} size={20} />
            </span>
            <div className="flex flex-col gap-1">
              <H3 className="text-[19px]">{grup.title}</H3>
              {grup.note && (
                <span className="text-[13px] leading-[1.55] text-muted">{grup.note}</span>
              )}
            </div>
          </div>

          {/* Grup içinde eski kategoriler alt başlık olarak duruyor:
              birleştirme okumayı kolaylaştırdı ama hangi ayarın neyle
              ilgili olduğu yine görünür kalmalı. */}
          {grup.kategoriler
            .filter((cat) => grup.satirlar.some((r) => (r.category ?? "general") === cat))
            .map((cat) => {
              const alt = CATEGORY[cat] ?? CATEGORY.general;
              const rows = grup.satirlar.filter((r) => (r.category ?? "general") === cat);

              return (
                <div key={cat} className="flex flex-col gap-4 border-t border-line2 pt-5 first:border-0 first:pt-0">
                  <span className="text-[12.5px] font-bold tracking-[.1em] text-muted2">
                    {alt.title.toLocaleUpperCase("tr-TR")}
                  </span>
                  <SettingRows cat={cat} rows={rows} />
                </div>
              );
            })}

          {/* Bilinen kategorilere girmeyen ayarlar */}
          {grup.id === "genel" && (() => {
            const artik = grup.satirlar.filter(
              (r) => !grup.kategoriler.includes(r.category ?? "general"));
            return artik.length > 0
              ? <SettingRows cat="general" rows={artik} />
              : null;
          })()}
        </Card>
      ))}

    </div>
  );
}

function ToggleRow({ row }: { row: SettingRow }) {
  const [state, action, pending] = useActionState(updateSetting, IDLE);
  const serverValue = row.value === true;

  /*
   * ┌─ ANAHTAR NEDEN İLK BASIŞTA ÇALIŞMIYORDU ⚠️ ────────────────────┐
   * │ Gizli alan şöyleydi:                                            │
   * │                                                                  │
   * │     value={String(!on)}      ← gönderilecek değer                │
   * │     onClick={() => setOptimistic(!on)}                           │
   * │                                                                  │
   * │ Tıklama olayı `on`'u değiştiriyordu. React bu güncellemeyi       │
   * │ tıklama olayında ANINDA uyguluyor, form verisi ise ondan SONRA   │
   * │ toplanıyor. Yani `on` çoktan yeni değere dönmüş oluyor ve        │
   * │ `!on` hesabı ESKİ değeri veriyordu.                              │
   * │                                                                  │
   * │ Sonuç: sunucuya "değişme" emri gidiyordu. Anahtar bir an oynayıp │
   * │ geri dönüyor, ikinci basışta durum kaydığı için tesadüfen        │
   * │ çalışıyordu.                                                     │
   * │                                                                  │
   * │ ÇÖZÜM: gönderilecek değer artık `on`'a değil `serverValue`'ya    │
   * │ bakıyor. Tıklama onu değiştirmiyor, dolayısıyla emir her zaman   │
   * │ doğru: "sunucudaki değerin tersini yaz".                         │
   * └──────────────────────────────────────────────────────────────────┘
   */
  const [optimistic, setOptimistic] = React.useState<boolean | null>(null);

  /* Sunucu yetişince iyimser durum bırakılır. Basitçe `null` yapmak
     yetmiyordu: yeniden doğrulama biraz gecikince anahtar önce eskiye
     dönüp sonra yeniye zıplıyordu. Değerler eşitlenene kadar tutuluyor. */
  React.useEffect(() => {
    if (optimistic !== null && serverValue === optimistic) setOptimistic(null);
  }, [serverValue, optimistic]);

  /* İşlem başarısızsa gerçeğe dön — kullanıcı olmayan bir durumu
     açık sanmasın. */
  React.useEffect(() => {
    if (state.message && !state.ok) setOptimistic(null);
  }, [state]);

  const on = optimistic ?? serverValue;

  return (
    <form action={action} className="flex items-center justify-between gap-4 py-4">
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="kind" value="boolean" />
      {/* ★ `on` DEĞİL `serverValue`: tıklama bu değeri kaydırmasın */}
      <input type="hidden" name="value" value={String(!serverValue)} />

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">{row.label}</span>
        {row.description && (
          <span className="text-[12.5px] leading-[1.5] text-muted">{row.description}</span>
        )}
        {state.message && !state.ok && (
          <span className="mt-1 text-[12.5px] font-medium text-danger">{state.message}</span>
        )}
      </div>

      <button type="submit" role="switch" aria-checked={on} aria-label={row.label}
        disabled={pending}
        onClick={() => setOptimistic(!serverValue)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
          on ? "bg-solid" : "bg-line"}`}>
        <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200"
          style={{ left: on ? 26 : 4 }} />
      </button>
    </form>
  );
}

/**
 * Logo boyutu ayarı.
 *
 * Kaydırıcıyla seçilir, canlı önizleme gösterir. Değer piksel cinsinden
 * yüksekliktir; responsive yapı bozulmasın diye 32–160 ile sınırlanır.
 */
function SizeRow({ row }: { row: SettingRow }) {
  const [state, action, pending] = useActionState(updateSetting, IDLE);
  const initial = typeof row.value === "number" ? row.value : Number(row.value ?? 64);

  const [size, setSize] = React.useState(Number.isFinite(initial) ? initial : 64);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (Number.isFinite(initial)) setSize(initial);
  }, [initial]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 border-b border-line2 py-4 last:border-0">
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="kind" value="number" />
      <input type="hidden" name="value" value={String(size)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">{row.label}</span>
          {row.description && (
            <span className="text-[12.5px] leading-[1.5] text-muted">{row.description}</span>
          )}
        </div>
        <span className="shrink-0 font-mono text-[15px] font-bold">{size}px</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input type="range" min={32} max={160} step={2} value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label={row.label}
          className="h-1.5 min-w-[200px] flex-1 cursor-pointer appearance-none rounded-full bg-line accent-[var(--solid)]" />

        {/* Canlı önizleme: seçilen yükseklik gerçek ölçüyle gösterilir */}
        <span className="flex h-[168px] w-[168px] shrink-0 items-center justify-center rounded-[14px] bg-field">
          <span className="rounded-[10px] bg-ink" style={{ height: size, width: size }} />
        </span>
      </div>

      {state.message && (
        <span className={`text-[12.5px] font-medium ${state.ok ? "text-green" : "text-danger"}`}>
          {state.message}
        </span>
      )}

      <Button type="submit" size="sm" loading={pending} className="self-start">
        Boyutu kaydet
      </Button>
    </form>
  );
}

function TextRow({ row }: { row: SettingRow }) {
  const [state, action, pending] = useActionState(updateSetting, IDLE);
  const current = typeof row.value === "string" ? row.value : "";
  const isMethod = row.key === "payments.default_method";

  return (
    <form action={action} className="flex flex-col gap-2.5 py-4">
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="kind" value="text" />

      <div className="flex flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">{row.label}</span>
        {row.description && (
          <span className="text-[12.5px] leading-[1.5] text-muted">{row.description}</span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        {isMethod ? (
          <Select name="value" defaultValue={current} className="flex-1">
            <option value="credit_card">Kredi / banka kartı</option>
            <option value="bank_transfer">Havale / EFT</option>
          </Select>
        ) : (
          <Input name="value" defaultValue={current} maxLength={500} className="flex-1"
            placeholder="Boş bırakılabilir" />
        )}
        <Button type="submit" variant="outline" size="md" loading={pending} className="shrink-0">
          Kaydet
        </Button>
      </div>

      {state.message && (
        <span className={`text-[12.5px] font-medium ${state.ok ? "text-muted" : "text-danger"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}

function PriceCard({ price, currency }: { price: number; currency: string }) {
  const [state, action, pending] = useActionState(updatePlanPrice, IDLE);

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-solid text-on-solid">
          <Icon icon={IconMoney} size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <H3 className="text-[19px]">Kombine kart bedeli</H3>
          <span className="text-[13px] text-muted">
            Şu anki fiyat: <strong className="text-ink">{formatMoney(price, currency)}</strong> / yıl
          </span>
        </div>
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
        <Field label="Yeni fiyat (TRY)" htmlFor="price" error={state.fieldErrors?.price}>
          <Input id="price" name="price" type="number" min={1} step="1" inputMode="numeric"
            defaultValue={price} className="sm:w-48" />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="shrink-0">Fiyatı güncelle</Button>
      </form>

      <div className="flex items-start gap-2.5 rounded-[14px] bg-chip px-4 py-3">
        <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0 text-muted" />
        <span className="text-[13px] leading-[1.55] text-ink2">
          Yalnızca yeni siparişleri etkiler. Mevcut siparişlerde sipariş anındaki tutar korunur.
        </span>
      </div>
    </Card>
  );
}

/**
 * Bir kategorinin ayar satırları.
 *
 * Görsel alanları yükleyiciyle, tema seçimi kutucuklarla, boolean'lar
 * anahtarla, geri kalanı metin alanıyla çiziliyor. Tip kararı tek
 * yerde: yeni ayar eklendiğinde doğru bileşen kendiliğinden seçiliyor.
 */
function SettingRows({ cat, rows }: { cat: string; rows: SettingRow[] }) {
  /* Görsel ayarları: anahtar adından tanınıyor. Yol yazdırmak yerine
     yükleyici gösteriliyor — kullanıcı dosya seçiyor, önizlemesini
     görüyor, isterse kaldırıyor. */
  const gorselMi = (k: string) =>
    /logo|favicon|image|gorsel|og_image|payment_logos|signature|imza|trademark\.(tr|us|eu)$/.test(k);

  const gorseller = rows.filter((r) => gorselMi(r.key));
  const digerleri = rows.filter((r) => !gorselMi(r.key));

  return (
    <div className="flex flex-col gap-6">
      {gorseller.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gorseller.map((row) => (
            <BrandUploader key={row.key} settingKey={row.key} label={row.label}
              description={row.description} current={String(row.value ?? "")} />
          ))}
        </div>
      )}

      {digerleri.length > 0 && (
        <div className="flex flex-col divide-y divide-line2">
          {digerleri.map((row) =>
            row.key === "site.default_theme"
              ? <ThemeRow key={row.key} row={row} />
              : typeof row.value === "boolean"
                ? <ToggleRow key={row.key} row={row} />
                : row.key.includes("logo_size")
                  ? <SizeRow key={row.key} row={row} />
                  : <TextRow key={row.key} row={row} />,
          )}
        </div>
      )}
    </div>
  );
}

/**
 * VARSAYILAN TEMA — ÜÇ KUTU
 *
 * ┌─ NEDEN METİN ALANI DEĞİL ⚠️ ──────────────────────────────────┐
 * │ Değer serbest metin olarak yazılıyordu: "system" yazmak        │
 * │ gerekiyordu ve hangi değerlerin geçerli olduğu hiçbir yerde     │
 * │ yazmıyordu. "koyu" yazan biri sessizce yanlış değer kaydediyordu.│
 * │                                                                  │
 * │ Üç kutu: geçerli olmayan bir değer seçilemiyor ve her birinin   │
 * │ ne yaptığı ikonuyla birlikte görünüyor.                          │
 * └──────────────────────────────────────────────────────────────────┘
 */
function ThemeRow({ row }: { row: SettingRow }) {
  const [state, action, pending] = useActionState(updateSetting, IDLE);
  const serverValue = String(row.value ?? "system").replace(/^"|"$/g, "");

  const [optimistic, setOptimistic] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (optimistic !== null && serverValue === optimistic) setOptimistic(null);
  }, [serverValue, optimistic]);

  React.useEffect(() => {
    if (state.message && !state.ok) setOptimistic(null);
  }, [state]);

  const secili = optimistic ?? serverValue;

  const secenekler = [
    { k: "light",  l: "Açık",  h: "Herkese açık tema", icon: IconSun },
    { k: "dark",   l: "Koyu",  h: "Herkese koyu tema", icon: IconMoon },
    { k: "system", l: "Cihaz", h: "Ziyaretçinin ayarı", icon: IconSettings },
  ];

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">{row.label}</span>
        {row.description && (
          <span className="text-[12.5px] leading-[1.5] text-muted">{row.description}</span>
        )}
        {state.message && !state.ok && (
          <span className="mt-1 text-[12.5px] font-medium text-danger">{state.message}</span>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {secenekler.map((o) => {
          const aktif = secili === o.k;
          return (
            <form key={o.k} action={action}>
              <input type="hidden" name="key" value={row.key} />
              <input type="hidden" name="kind" value="string" />
              <input type="hidden" name="value" value={o.k} />

              <button type="submit" disabled={pending}
                onClick={() => setOptimistic(o.k)}
                aria-pressed={aktif}
                className={`flex w-full flex-col items-center gap-2 rounded-[16px] border px-3 py-4 transition-colors disabled:opacity-60 ${
                  aktif
                    ? "border-solid bg-solid text-on-solid"
                    : "border-line bg-surface text-ink2 hover:border-ink/25 hover:text-ink"
                }`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${
                  aktif ? "bg-on-solid/15" : "bg-chip"}`}>
                  <Icon icon={o.icon} size={18} />
                </span>
                <span className="text-[13px] font-semibold">{o.l}</span>
                <span className={`text-center text-[11px] leading-tight ${
                  aktif ? "opacity-75" : "text-muted2"}`}>
                  {o.h}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
