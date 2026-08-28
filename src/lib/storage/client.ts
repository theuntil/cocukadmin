"use client";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  TARAYICI TARAFI YÜKLEME
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Dosya doğrudan depolamaya gidiyor; sunucu yalnızca izin veriyor.
 *
 *  ┌─ NEDEN `fetch` + PUT ⚠️ ──────────────────────────────────────┐
 *  │ Supabase istemcisi kendi yükleme yöntemini sunuyordu. R2 ön    │
 *  │ imzalı adresle çalışıyor ve o adrese düz bir PUT isteği        │
 *  │ gerekiyor — araya kütüphane girmesine gerek yok.                │
 *  │                                                                   │
 *  │ ★ `Content-Type` başlığı, adres üretilirken verilenle AYNI      │
 *  │   olmalı. Farklı olursa imza doğrulaması başarısız oluyor ve    │
 *  │   R2 isteği reddediyor. Bu yüzden ikisi de aynı değerden        │
 *  │   besleniyor.                                                     │
 *  └───────────────────────────────────────────────────────────────────┘
 */
export async function uploadToStorage(opts: {
  bucket: string;
  path: string;
  file: File | Blob;
  contentType?: string;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const tur =
    opts.contentType ||
    (opts.file instanceof File ? opts.file.type : "") ||
    "application/octet-stream";

  try {
    const izin = await fetch("/api/storage/yukleme-adresi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket: opts.bucket, path: opts.path, contentType: tur }),
    });

    if (!izin.ok) {
      const j = await izin.json().catch(() => ({}));
      return { ok: false, error: j.error ?? `Yükleme izni alınamadı (${izin.status})` };
    }

    const izinBilgi = (await izin.json()) as { url: string; dualWrite?: boolean };
    const url = izinBilgi.url;

    const yukleme = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": tur },
      body: opts.file,
    });

    if (!yukleme.ok) {
      return { ok: false, error: `Dosya yüklenemedi (${yukleme.status})` };
    }

    /* ┌─ GEÇİŞ DÖNEMİ İKİNCİ KOPYA ⚠️ ────────────────────────────┐
       │ Tarayıcıdan yapılan yükleme DOĞRUDAN R2'ye gidiyor; sunucu  │
       │ taraflı çift yazma bunu kapsamıyordu.                        │
       │                                                                │
       │ Sonuç sinsi bir hataydı: dosya R2'ye yükleniyor, "başarılı"  │
       │ deniyor, ama okuma hâlâ Supabase'den yapıldığı için görsel   │
       │ 404 veriyordu. Yükleme çalışıyor gibi görünüp aslında        │
       │ görünmeyen bir dosya bırakıyordu.                             │
       │                                                                │
       │ Sunucu `STORAGE_DUAL_WRITE=true` iken ikinci kopyayı da      │
       │ yazıyor. Geçiş bitince (`false`) bu adım atlanıyor.          │
       │                                                                │
       │ ★ Başarısız olursa yükleme BAŞARILI sayılıyor: asıl kopya   │
       │   R2'de duruyor ve eksik kopya taşıma betiğiyle              │
       │   tamamlanabiliyor.                                            │
       └────────────────────────────────────────────────────────────────┘ */
    if (izinBilgi.dualWrite) {
      try {
        const govde = new FormData();
        govde.append("bucket", opts.bucket);
        govde.append("path", opts.path);
        govde.append("file", opts.file);

        await fetch("/api/storage/ikinci-kopya", { method: "POST", body: govde });
      } catch {
        /* Sessiz: asıl kopya yerinde. */
      }
    }

    return { ok: true, path: opts.path };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Dosya adını depolama için güvenli hâle getirir.
 *
 * Türkçe karakter ve boşluk yollarda soruna yol açıyor; zaman damgası
 * çakışmayı önlüyor. Özgün ad gerekiyorsa ayrıca saklanmalı.
 */
export function safeFileName(name: string): string {
  const uzanti = (name.split(".").pop() ?? "bin").toLowerCase().slice(0, 6);
  const govde = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "dosya";

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${govde}.${uzanti}`;
}
