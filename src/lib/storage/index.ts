import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { r2Upload, r2Download, r2Remove, r2SignedUploadUrl } from "./r2";
import { r2Ready, dualWrite, readFrom, isPrivateBucket } from "./config";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  ORTAK DEPOLAMA KATMANI
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Uygulama kodu Supabase'i de R2'yi de tanımaz; yalnızca bunu çağırır.
 *  Sağlayıcı değişimi tek dosyada olur.
 *
 *  ┌─ GEÇİŞ DÖNEMİ ⚠️ ─────────────────────────────────────────────┐
 *  │ `STORAGE_DUAL_WRITE=true` iken yeni dosyalar HER İKİ yere de   │
 *  │ yazılıyor. Okuma `STORAGE_READ_FROM` ile seçiliyor.             │
 *  │                                                                  │
 *  │ Bu ikisi ayrı olduğu için geri dönüş mümkün: R2'de sorun        │
 *  │ çıkarsa okuma Supabase'e döndürülüyor ve dosyalar orada         │
 *  │ olduğu için hiçbir şey kaybolmuyor.                             │
 *  │                                                                  │
 *  │ Geçiş bitince `STORAGE_DUAL_WRITE=false`.                        │
 *  └──────────────────────────────────────────────────────────────────┘
 */

export interface UploadResult {
  ok: boolean;
  error?: string;
  /** Yazılan yerler — günlük ve tanı için */
  wrote?: ("r2" | "supabase")[];
}

export async function storageUpload(opts: {
  bucket: string;
  path: string;
  body: Uint8Array | Buffer;
  contentType?: string;
}): Promise<UploadResult> {
  const yazilan: ("r2" | "supabase")[] = [];
  const hatalar: string[] = [];

  const r2Aktif = r2Ready();

  /* ┌─ SUPABASE'E YAZMA KOŞULU SADELEŞTİRİLDİ ⚠️ ───────────────┐
     │ Önce şöyleydi:                                               │
     │                                                                │
     │   !r2Aktif || dualWrite() || readFrom() === "supabase"       │
     │                                                                │
     │ Son koşul gizli bir bağımlılıktı: çift yazma KAPALI olsa     │
     │ bile, okuma Supabase'den yapılıyorsa dosya oraya da           │
     │ yazılıyordu. Kullanıcı "çift yazmayı kapattım, artık          │
     │ Supabase'e hiçbir şey gitmiyor" sanıyor ama gidiyordu.        │
     │                                                                │
     │ Artık tek kural: R2 yoksa ya da çift yazma AÇIKSA yazılır.   │
     │ `STORAGE_DUAL_WRITE=false` demek, Supabase'e hiç             │
     │ dokunulmaması demek.                                           │
     └────────────────────────────────────────────────────────────────┘ */
  const supabaseGerekli = !r2Aktif || dualWrite();

  if (r2Aktif) {
    const res = await r2Upload(opts);
    if (res.ok) yazilan.push("r2");
    else hatalar.push(`R2: ${res.error}`);
  }

  if (supabaseGerekli) {
    try {
      const svc = createServiceClient();
      const { error } = await svc.storage
        .from(opts.bucket)
        .upload(opts.path, opts.body, {
          contentType: opts.contentType || undefined,
          upsert: true,
        });

      if (error) hatalar.push(`Supabase: ${error.message}`);
      else yazilan.push("supabase");
    } catch (err) {
      hatalar.push(`Supabase: ${(err as Error).message}`);
    }
  }

  /* ★ EN AZ BİR YERE yazıldıysa başarılı sayılıyor. İkisinden biri
     geçici olarak erişilemezse kullanıcının işlemi durmuyor; eksik
     kopya taşıma betiğiyle tamamlanıyor. */
  if (yazilan.length > 0) {
    if (hatalar.length > 0) {
      console.warn("[storage] kısmi yazma:", hatalar.join(" | "));
    }
    return { ok: true, wrote: yazilan };
  }

  return { ok: false, error: hatalar.join(" | ") || "Hiçbir yere yazılamadı." };
}

export async function storageDownload(
  bucket: string, path: string,
): Promise<{ ok: true; body: Uint8Array; contentType?: string } | { ok: false; error: string }> {
  const oncelik = readFrom();

  /* Önce tercih edilen kaynak, sonra diğeri. Geçiş sırasında bazı
     dosyalar yalnızca birinde olabiliyor — kullanıcı bunu görmemeli. */
  if (oncelik === "r2" && r2Ready()) {
    const res = await r2Download(bucket, path);
    if (res.ok) return res;
  }

  try {
    const svc = createServiceClient();
    const { data, error } = await svc.storage.from(bucket).download(path);

    if (!error && data) {
      return {
        ok: true,
        body: new Uint8Array(await data.arrayBuffer()),
        contentType: data.type || undefined,
      };
    }
  } catch {
    /* aşağıdaki yedeğe düşülüyor */
  }

  if (oncelik !== "r2" && r2Ready()) {
    const res = await r2Download(bucket, path);
    if (res.ok) return res;
  }

  return { ok: false, error: "Dosya bulunamadı." };
}

export async function storageRemove(
  bucket: string, paths: string[],
): Promise<{ ok: boolean; error?: string }> {
  const hatalar: string[] = [];

  if (r2Ready()) {
    const res = await r2Remove(bucket, paths);
    if (!res.ok) hatalar.push(`R2: ${res.error}`);
  }

  try {
    const svc = createServiceClient();
    const { error } = await svc.storage.from(bucket).remove(paths);
    if (error) hatalar.push(`Supabase: ${error.message}`);
  } catch (err) {
    hatalar.push(`Supabase: ${(err as Error).message}`);
  }

  /* Silmede İKİ TARAF DA denenmeli: birinde kalan dosya, kişisel veri
     içeriyorsa sızıntı riskidir. */
  return hatalar.length === 0
    ? { ok: true }
    : { ok: false, error: hatalar.join(" | ") };
}

/** Tarayıcının doğrudan yüklemesi için kısa ömürlü adres */
export async function storageSignedUpload(opts: {
  bucket: string;
  path: string;
  contentType?: string;
}): Promise<{ ok: true; url: string; provider: "r2" | "supabase" } | { ok: false; error: string }> {
  if (r2Ready()) {
    const res = await r2SignedUploadUrl(opts);
    if (res.ok) return { ok: true, url: res.url, provider: "r2" };
    return { ok: false, error: res.error };
  }

  try {
    const svc = createServiceClient();
    const { data, error } = await svc.storage
      .from(opts.bucket)
      .createSignedUploadUrl(opts.path);

    if (error || !data) return { ok: false, error: error?.message ?? "Adres üretilemedi." };
    return { ok: true, url: data.signedUrl, provider: "supabase" };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export { isPrivateBucket, r2Ready, readFrom, dualWrite };
