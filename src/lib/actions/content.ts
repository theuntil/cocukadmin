"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { storageRemove } from "@/lib/storage";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { slugify } from "@/lib/utils";

/**
 * İçerik yönetimi (blog, etkinlik, medya, ayarlar).
 * Yetki kontrolü RLS politikalarında: yalnızca editor/admin yazabilir.
 */

const uuid = z.string().uuid();

/* ═══════════════ BLOG ═══════════════ */

const newsSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter").max(200),
  slug: z.string().trim().max(200).optional().or(z.literal("")),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  body: z.string().trim().min(10, "İçerik en az 10 karakter"),
  coverPath: z.string().trim().max(400).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]),
  publishedAt: z.string().optional().or(z.literal("")),
});

export async function saveNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get("id");
  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body"),
    coverPath: formData.get("coverPath") ?? "",
    category: formData.get("category") ?? "",
    status: formData.get("status") ?? "draft",
    publishedAt: formData.get("publishedAt") ?? "",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // Sütun eşlemesi ve kısa yol benzersizliği veritabanında yapılır:
  // panel "body/cover_path/category" der, tabloda "content/og_image_path/category_id" durur.
  const { data, error } = await supabase.rpc("admin_save_news", {
    p_id: id && typeof id === "string" && id.length > 0 ? id : null,
    p_title: d.title,
    p_slug: d.slug || null,
    p_excerpt: d.excerpt || null,
    p_body: d.body,
    p_cover_path: d.coverPath || null,
    p_category: d.category || null,
    p_status: d.status,
    p_published_at: d.publishedAt || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/blog");
  revalidatePath("/", "layout");

  if (id && typeof id === "string" && id.length > 0) {
    return { ok: true, message: "Yazı güncellendi." };
  }

  redirect(`/blog/${(data as { id: string }).id}`);
}

export async function deleteNews(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("news").delete().eq("id", id);

  revalidatePath("/blog");
  redirect("/blog");
}

/* ═══════════════ ETKİNLİK ═══════════════ */

const eventSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter").max(200),
  slug: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Açıklama en az 10 karakter"),
  coverPath: z.string().trim().max(400).optional().or(z.literal("")),
  startsAt: z.string().min(1, "Başlangıç tarihi zorunlu"),
  endsAt: z.string().optional().or(z.literal("")),
  venueName: z.string().trim().max(200).optional().or(z.literal("")),
  venueAddress: z.string().trim().max(500).optional().or(z.literal("")),
  cityId: z.coerce.number().int().positive().optional(),
  capacity: z.coerce.number().int().nonnegative().optional(),
  accessType: z.enum(["public", "card_holders", "team_card_holders", "invite_only"]),
  status: z.enum(["draft", "published", "ongoing", "completed", "cancelled"]),
  waitlist: z.boolean().optional(),
  guardianRequired: z.boolean().optional(),
});

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get("id");
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description"),
    coverPath: formData.get("coverPath") ?? "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") ?? "",
    venueName: formData.get("venueName") ?? "",
    venueAddress: formData.get("venueAddress") ?? "",
    cityId: formData.get("cityId") || undefined,
    capacity: formData.get("capacity") || undefined,
    accessType: formData.get("accessType") ?? "public",
    status: formData.get("status") ?? "draft",
    waitlist: formData.get("waitlist") === "on",
    guardianRequired: formData.get("guardianRequired") === "on",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const d = parsed.data;

  if (d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt)) {
    return { ok: false, fieldErrors: { endsAt: "Bitiş, başlangıçtan sonra olmalı" } };
  }

  const supabase = await createClient();

  // Sütun eşlemesi ve kısa yol benzersizliği veritabanında yapılır:
  // panel "cover_path/description" der, tabloda "short_description/description" durur.
  const { data, error } = await supabase.rpc("admin_save_event", {
    p_id: id && typeof id === "string" && id.length > 0 ? id : null,
    p_title: d.title,
    p_summary: null,
    p_description: d.description,
    p_event_type: null,
    p_city_id: d.cityId ?? null,
    p_venue_name: d.venueName || null,
    p_venue_address: d.venueAddress || null,
    p_starts_at: new Date(d.startsAt).toISOString(),
    p_ends_at: d.endsAt ? new Date(d.endsAt).toISOString() : null,
    p_capacity: d.capacity ?? null,
    p_status: d.status,
    p_registration_required: true,
    p_cover_path: d.coverPath || null,
    p_access_type: d.accessType,
    p_min_age: null,
    p_max_age: null,
    p_fee: null,
    p_registration_note: null,
    p_contact_phone: null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/etkinlikler");
  revalidatePath("/", "layout");

  if (id && typeof id === "string" && id.length > 0) {
    return { ok: true, message: "Etkinlik güncellendi." };
  }

  redirect(`/etkinlikler/${(data as { id: string }).id}`);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id);

  revalidatePath("/etkinlikler");
  redirect("/etkinlikler");
}

/* ═══════════════ MEDYA ═══════════════ */

export async function saveMedia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    path: z.string().min(1).max(400),
    fileName: z.string().min(1).max(200),
    mimeType: z.string().max(120).optional().or(z.literal("")),
    fileSize: z.coerce.number().int().nonnegative().optional(),
    folder: z.string().regex(/^[a-z0-9-]+$/, "Klasör adı küçük harf ve tire olmalı").default("genel"),
    altText: z.string().trim().max(300).optional().or(z.literal("")),
  }).safeParse({
    path: formData.get("path"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType") ?? "",
    fileSize: formData.get("fileSize") ?? undefined,
    folder: formData.get("folder") || "genel",
    altText: formData.get("altText") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz dosya bilgisi." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from("media_library").insert({
    path: parsed.data.path,
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType || null,
    file_size: parsed.data.fileSize ?? null,
    folder: parsed.data.folder,
    alt_text: parsed.data.altText || null,
    uploaded_by: auth.user?.id ?? null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/medya");
  return { ok: true, message: "Dosya kütüphaneye eklendi." };
}

export async function deleteMedia(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("media_library").select("path").eq("id", id).maybeSingle();

  await supabase.from("media_library").delete().eq("id", id);

  // Depolamadan da sil (trigger temizlik kuyruğuna da yazar)
  const path = (row as { path: string } | null)?.path;
  if (path) await storageRemove("galeri", [path]);

  revalidatePath("/medya");
}

/* ═══════════════ AYARLAR ═══════════════ */

export async function updateSetting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const key = String(formData.get("key") ?? "");
  const raw = formData.get("value");
  const kind = String(formData.get("kind") ?? "text");

  if (!/^[a-z0-9._]+$/.test(key)) return { ok: false, message: "Geçersiz ayar." };

  // update_setting jsonb bekler; JS değerini olduğu gibi göndeririz
  // (supabase-js JSON'a çevirir). Tek aşırı yükleme olduğu için
  // PostgREST'te belirsizlik oluşmaz.
  let value: unknown;
  if (kind === "boolean") value = raw === "true";
  else if (kind === "number") value = Number(raw);
  else value = String(raw ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_setting", {
    p_key: key, p_value: value,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/ayarlar");
  revalidatePath("/", "layout");

  // Yazılan değer geri döner; istemci iyimser durumunu buna göre düzeltir
  return {
    ok: true,
    message: "Ayar güncellendi.",
    data: { value: (data as { value?: unknown } | null)?.value },
  };
}

export async function updatePlanPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.coerce.number().positive("Geçerli bir tutar girin").max(100000)
    .safeParse(formData.get("price"));

  if (!parsed.success) return { ok: false, fieldErrors: { price: "Geçerli bir tutar girin" } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_plan_price", {
    p_slug: "yillik-kombine", p_price: parsed.data,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/ayarlar");
  return { ok: true, message: "Fiyat güncellendi. Mevcut siparişler etkilenmez." };
}

/* ═══════════════ ETKİNLİK YÖNETİMİ ═══════════════ */

/** Etkinliğin QR anahtarını yeniler — eski QR anında geçersizleşir */
export async function regenerateEventQr(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(formData.get("eventId"));
  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_regenerate_event_qr", {
    p_event_id: parsed.data,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/etkinlikler/${parsed.data}`);
  return { ok: true, message: "QR yenilendi. Eski QR artık geçersiz." };
}

/** Etkinliği sil — katılımcısı varsa iptal edilir */
export async function removeEvent(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    eventId: z.string().uuid(),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  }).safeParse({
    eventId: formData.get("eventId"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_event", {
    p_event_id: parsed.data.eventId,
    p_reason: parsed.data.reason || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { deleted: boolean; message: string };
  revalidatePath("/etkinlikler");

  if (result.deleted) redirect("/etkinlikler");
  return { ok: true, message: result.message };
}

/** Katılım işaretle / geri al */
export async function toggleCheckIn(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    registrationId: z.string().uuid(),
    undo: z.enum(["true", "false"]),
    eventId: z.string().uuid(),
  }).safeParse({
    registrationId: formData.get("registrationId"),
    undo: formData.get("undo"),
    eventId: formData.get("eventId"),
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_check_in", {
    p_registration_id: parsed.data.registrationId,
    p_undo: parsed.data.undo === "true",
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath(`/etkinlikler/${parsed.data.eventId}`);
  return { ok: true };
}
