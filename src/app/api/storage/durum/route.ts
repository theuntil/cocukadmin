import { NextResponse } from "next/server";
import { getAdminUser, hasRole } from "@/lib/data";
import { r2Ready, readFrom, dualWrite } from "@/lib/storage";
import { r2Config } from "@/lib/storage/config";
import { publicStorageUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEPOLAMA TANI UCU
 *
 * ┌─ NEDEN GEREKLİ ⚠️ ────────────────────────────────────────────┐
 * │ `NEXT_PUBLIC_*` değişkenleri DERLEME ANINDA tarayıcı koduna     │
 * │ gömülüyor. Dokploy'a sonradan eklenirse ya da `build.args`      │
 * │ listesinde yoksa değer BOŞ kalıyor — ama uygulama hatasız       │
 * │ çalışmaya devam ediyor, sadece eski adresi üretiyor.            │
 * │                                                                  │
 * │ Bu sessiz hata dışarıdan anlaşılmıyor. Bu uç, değerin gerçekten │
 * │ derlemeye girip girmediğini gösteriyor.                          │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Kullanım: /api/storage/durum
 */
export async function GET() {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const ornekYol = "1787924719546-ornek.png";
  const uretilen = publicStorageUrl("galeri", ornekYol);

  const r2Adres = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const tarayiciOkuma = process.env.NEXT_PUBLIC_STORAGE_READ_FROM ?? "";
  const sunucuOkuma = readFrom();
  const sorunlar: string[] = [];

  /* ┌─ İKİ AYRI OKUMA ANAHTARI ⚠️ ────────────────────────────────┐
     │ Sunucu `STORAGE_READ_FROM` ile, tarayıcı                      │
     │ `NEXT_PUBLIC_STORAGE_READ_FROM` ile karar veriyor.            │
     │                                                                 │
     │ İkisi ayrı olmak ZORUNDA: öneksiz değişkenler tarayıcıya      │
     │ gitmiyor. Ama farklı değer alırlarsa sinsi bir hata çıkıyor —  │
     │ sunucu R2'den okuyor, tarayıcı Supabase adresi üretiyor.       │
     │                                                                 │
     │ Bu kontrol tam olarak o durumu yakalıyor.                      │
     └─────────────────────────────────────────────────────────────────┘ */
  if (tarayiciOkuma !== sunucuOkuma) {
    sorunlar.push(
      `UYUŞMAZLIK: sunucu "${sunucuOkuma}" kaynağından okuyor ama tarayıcı ` +
      `"${tarayiciOkuma || "(BOŞ)"}" ayarıyla adres üretiyor. ` +
      `NEXT_PUBLIC_STORAGE_READ_FROM değerini "${sunucuOkuma}" yapıp ` +
      `YENİDEN DEPLOY edin (rebuild şart).`,
    );
  }

  if (!r2Adres) {
    sorunlar.push(
      "NEXT_PUBLIC_R2_PUBLIC_URL derlemeye GİRMEMİŞ. Dokploy → Environment'a " +
      "eklendiğinden VE docker-compose.yml içindeki build.args listesinde " +
      "bulunduğundan emin olun, sonra YENİDEN DEPLOY edin (rebuild şart).",
    );
  }

  if (!r2Ready()) {
    sorunlar.push(
      "R2 sunucu tarafında yapılandırılmamış. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
      "R2_SECRET_ACCESS_KEY ve R2_BUCKET değerlerini kontrol edin.",
    );
  }

  /* ┌─ EN SIK YAPILAN HATA ⚠️ ────────────────────────────────────┐
     │ Tarayıcıdan yapılan yüklemeler artık DOĞRUDAN R2'ye gidiyor  │
     │ (ön imzalı adres). Yani çift yazma bunları KAPSAMIYOR.       │
     │                                                                │
     │ Okuma hâlâ Supabase'den yapılıyorsa yeni yüklenen dosya       │
     │ orada olmadığı için 404 verir — yükleme "başarılı" görünür     │
     │ ama görsel çıkmaz.                                             │
     └────────────────────────────────────────────────────────────────┘ */
  if (r2Ready() && !r2Adres) {
    sorunlar.push(
      "KRİTİK: Dosyalar R2'ye yükleniyor ama adresler hâlâ Supabase'i " +
      "gösteriyor. Yeni yüklenen görseller 404 verir. NEXT_PUBLIC_R2_PUBLIC_URL " +
      "ayarlanana kadar bu böyle kalır.",
    );
  }

  /* ┌─ EN ÇOK SORULAN SORU ⚠️ ────────────────────────────────────┐
     │ "Dosyalar hâlâ Supabase'e mi kaydediliyor?"                    │
     │                                                                  │
     │ Cevap `STORAGE_DUAL_WRITE` ayarında ama bunu ayar isminden     │
     │ anlamak zor. Burada düz Türkçe yazılıyor.                       │
     └──────────────────────────────────────────────────────────────────┘ */
  const yuklemeHedefi = !r2Ready()
    ? "YALNIZCA Supabase (R2 yapılandırılmamış)"
    : dualWrite()
      ? "R2 + Supabase kopyası — Supabase'i tamamen bırakmak için STORAGE_DUAL_WRITE=false yapın"
      : "YALNIZCA R2 ✓";

  return NextResponse.json({
    durum: sorunlar.length === 0 ? "hazır" : "eksik yapılandırma",
    yuklemeler_nereye_gidiyor: yuklemeHedefi,
    gorseller_nereden_okunuyor: tarayiciOkuma === "r2" && r2Adres
      ? "R2 ✓"
      : "Supabase",
    sorunlar,

    tarayiciya_gomulen: {
      NEXT_PUBLIC_R2_PUBLIC_URL: r2Adres || "(BOŞ)",
      NEXT_PUBLIC_STORAGE_READ_FROM: tarayiciOkuma || "(BOŞ)",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(BOŞ)",
    },

    sunucu: {
      r2_hazir: r2Ready(),
      okuma_kaynagi: readFrom(),
      cift_yazma: dualWrite(),
      acik_kova: r2Config.bucket || "(BOŞ)",
      ozel_kova: r2Config.privateBucket || "(BOŞ)",
      hesap_kimligi: r2Config.accountId ? "tanımlı" : "(BOŞ)",
    },

    ornek: {
      yol: ornekYol,
      uretilen_adres: uretilen,
      beklenen: r2Adres
        ? `${r2Adres}/galeri/${ornekYol}`
        : "NEXT_PUBLIC_R2_PUBLIC_URL ayarlanınca R2 adresi üretilecek",
    },
  });
}
