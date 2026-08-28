"use client";

/**
 * Dosya siler.
 *
 * Silme sunucudan geçiyor: tarayıcıya ön imzalı silme adresi vermek,
 * o adres sızdığında başkasının dosyasının silinebilmesi demekti.
 */
export async function removeFromStorage(
  bucket: string,
  paths: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/storage/sil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, paths }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j.error ?? `Silinemedi (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
