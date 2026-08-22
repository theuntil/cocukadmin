"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Çocuk fotoğrafını ÖZEL kovaya yükler ve depolama yolunu döndürür.
 *
 * child-photos kovası herkese açık değildir: fotoğrafı yalnızca çocuğun
 * velisi ve yetkili personel görebilir. Adres tahmin edilse bile açılamaz.
 */
export async function uploadChildPhoto(childId: string, blob: Blob): Promise<string> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Oturum bulunamadı");

  // Yol biçimi veritabanı trigger'ı ile doğrulanır: {uid}/children/{dosya}
  const path = `${auth.user.id}/children/${childId}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("child-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);

  return path;
}

/** Kullanıcının kendi profil fotoğrafını yükler. */
export async function uploadProfileAvatar(blob: Blob): Promise<string> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Oturum bulunamadı");

  const path = `${auth.user.id}/avatar-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);

  return path;
}
