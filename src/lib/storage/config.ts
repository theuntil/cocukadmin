/**
 * ═══════════════════════════════════════════════════════════════════
 *  DEPOLAMA YAPILANDIRMASI
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Tek yerden okunur; uygulama kodu Supabase'i de R2'yi de tanımaz.
 */

/** Kişisel veri içeren kovalar — internetten doğrudan erişilemez */
export const OZEL_KOVALAR = new Set([
  "avatars",
  "child-photos",
  "certificates",
  "invoices",
  "payment-receipts",
  /* ┌─ BAĞIŞ MAKBUZLARI ⚠️ ────────────────────────────────────────┐
     │ Bu kova ilk listede YOKTU — taşıma sayımında fark edildi.     │
     │ Makbuzda bağışçının adı ve tutarı yazıyor; açık kovaya        │
     │ gitseydi adresi bilen herkese açık olurdu.                     │
     │                                                                  │
     │ Şu an boş, ama bağış modülü kullanılmaya başlandığında sessiz │
     │ bir sızıntı olurdu.                                             │
     └──────────────────────────────────────────────────────────────────┘ */
  "donation-receipts",
  "mail-attachments",
  "card-documents",
]);

export function isPrivateBucket(bucket: string): boolean {
  return OZEL_KOVALAR.has(bucket);
}

/**
 * R2 yapılandırılmış mı.
 *
 * ┌─ NEDEN AYAR DEĞİL, ORTAM DEĞİŞKENİ ⚠️ ────────────────────────┐
 * │ Depolama sağlayıcısı veritabanı ayarından okunsaydı, veritabanı │
 * │ erişilemediğinde hiçbir görsel yüklenemezdi. Ortam değişkeni    │
 * │ uygulama başlarken belli oluyor ve dış bir servise bağlı değil. │
 * └─────────────────────────────────────────────────────────────────┘
 */
export function r2Ready(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET,
  );
}

/**
 * Geçiş dönemi: yeni dosyalar hem Supabase'e hem R2'ye yazılır.
 *
 * ★ Bu sayede R2'de sorun çıkarsa okuma tek satırla Supabase'e
 *   döndürülebiliyor ve dosyalar orada duruyor.
 */
export function dualWrite(): boolean {
  return process.env.STORAGE_DUAL_WRITE === "true";
}

/** Okuma kaynağı: `r2` ya da `supabase` */
export function readFrom(): "r2" | "supabase" {
  return process.env.STORAGE_READ_FROM === "r2" ? "r2" : "supabase";
}

export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID ?? "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  /** Açık kova — özel alan adıyla sunulur */
  bucket: process.env.R2_BUCKET ?? "",
  /** Kapalı kova — alan adı YOK, yalnızca sunucu erişir */
  privateBucket: process.env.R2_BUCKET_PRIVATE ?? `${process.env.R2_BUCKET ?? ""}-ozel`,
  publicUrl: (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/+$/, ""),
};

/**
 * Kova + yol → R2 anahtarı.
 *
 * ★ Kova adı KLASÖR olarak korunuyor. Böylece veritabanındaki mevcut
 *   yollara hiç dokunmadan geçiş yapılabiliyor: kayıtta `abc.jpg`
 *   yazıyorsa R2'de `team-logos/abc.jpg` oluyor.
 */
export function r2Key(bucket: string, path: string): string {
  return `${bucket}/${path.replace(/^\/+/, "")}`;
}
