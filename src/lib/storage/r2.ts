import "server-only";
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Config, r2Key, isPrivateBucket } from "./config";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  CLOUDFLARE R2 İSTEMCİSİ
 * ═══════════════════════════════════════════════════════════════════
 *
 *  R2, S3 uyumlu bir arayüz sunuyor; bu yüzden AWS'in kendi SDK'sı
 *  kullanılıyor. Ayrı bir R2 kütüphanesi yok ve gerekmiyor.
 *
 *  ★ BÖLGE `auto` OLMALI. R2'nin bölgesi yok; SDK bir değer istediği
 *    için `auto` veriliyor. Başka bir değer imza hatası üretir.
 */

let istemci: S3Client | null = null;

function client(): S3Client {
  if (istemci) return istemci;

  istemci = new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },

    /* ┌─ SAĞLAMA KAPATILMALI ⚠️ ──────────────────────────────────┐
       │ AWS SDK v3 varsayılan olarak her isteğe bir CRC32 sağlaması │
       │ ekliyor. Ön imzalı adres üretirken GÖVDE HENÜZ YOK, bu      │
       │ yüzden SDK BOŞ içeriğin sağlamasını hesaplayıp adrese       │
       │ gömüyor:                                                      │
       │                                                                │
       │     x-amz-checksum-crc32=AAAAAA==   (= sıfır)                │
       │                                                                │
       │ Tarayıcı o adrese gerçek dosyayı gönderince sağlama tutmuyor │
       │ ve R2 isteği reddediyor.                                      │
       │                                                                │
       │ `WHEN_REQUIRED` ile sağlama yalnızca gerçekten gerektiğinde  │
       │ ekleniyor — ön imzalı yüklemede eklenmiyor.                   │
       │                                                                │
       │ ★ Bu, CORS hatasının ARKASINDA duran ikinci bir hataydı:     │
       │   CORS düzeltilse bile yükleme çalışmazdı.                    │
       └────────────────────────────────────────────────────────────────┘ */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return istemci;
}

/** Dosyanın hangi kovaya gideceği — kova adından belirlenir, tahminle değil */
function hedefKova(bucket: string): string {
  return isPrivateBucket(bucket) ? r2Config.privateBucket : r2Config.bucket;
}

export async function r2Upload(opts: {
  bucket: string;
  path: string;
  body: Uint8Array | Buffer;
  contentType?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await client().send(new PutObjectCommand({
      Bucket: hedefKova(opts.bucket),
      Key: r2Key(opts.bucket, opts.path),
      Body: opts.body,
      ContentType: opts.contentType || "application/octet-stream",
    }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function r2Download(
  bucket: string, path: string,
): Promise<{ ok: true; body: Uint8Array; contentType?: string } | { ok: false; error: string }> {
  try {
    const res = await client().send(new GetObjectCommand({
      Bucket: hedefKova(bucket),
      Key: r2Key(bucket, path),
    }));

    if (!res.Body) return { ok: false, error: "Dosya boş döndü." };

    const bytes = await res.Body.transformToByteArray();
    return { ok: true, body: bytes, contentType: res.ContentType };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function r2Remove(
  bucket: string, paths: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    /* Tek tek siliniyor: toplu silme (DeleteObjects) R2'de destekli
       ama hata ayrıntısı kaybolduğu için tercih edilmedi. Dosya
       sayısı zaten düşük. */
    for (const p of paths) {
      await client().send(new DeleteObjectCommand({
        Bucket: hedefKova(bucket),
        Key: r2Key(bucket, p),
      }));
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function r2Exists(bucket: string, path: string): Promise<boolean> {
  try {
    await client().send(new HeadObjectCommand({
      Bucket: hedefKova(bucket),
      Key: r2Key(bucket, path),
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Tarayıcının doğrudan R2'ye yüklemesi için kısa ömürlü adres.
 *
 * ┌─ NEDEN SUNUCUDAN GEÇİRMİYORUZ ⚠️ ─────────────────────────────┐
 * │ Dosyayı önce sunucuya alıp sonra R2'ye göndermek daha basit    │
 * │ görünüyor. Ama 200 MB'lık hero videosu Next.js sunucusunun     │
 * │ belleğinden geçerdi: istek gövdesi sınırına takılır ve sunucu  │
 * │ o süre boyunca meşgul kalır.                                     │
 * │                                                                  │
 * │ Ön imzalı adreste dosya doğrudan R2'ye gidiyor. Sunucu yalnızca │
 * │ "bu kişi bu yola yükleyebilir" diyor.                           │
 * │                                                                  │
 * │ ★ Adres 5 dakikalık. Sızsa bile kısa sürede geçersizleşiyor ve │
 * │   YALNIZCA belirtilen yola yazma izni veriyor.                  │
 * └──────────────────────────────────────────────────────────────────┘
 */
export async function r2SignedUploadUrl(opts: {
  bucket: string;
  path: string;
  contentType?: string;
  expiresIn?: number;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const url = await getSignedUrl(
      client(),
      new PutObjectCommand({
        Bucket: hedefKova(opts.bucket),
        Key: r2Key(opts.bucket, opts.path),
        ContentType: opts.contentType || "application/octet-stream",
      }),
      { expiresIn: opts.expiresIn ?? 300 },
    );

    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
