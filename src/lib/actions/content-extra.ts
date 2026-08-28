"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { slugify } from "@/lib/utils";

const uuid = z.string().uuid();

/* ═══════════════ DESTEKÇİLER ═══════════════ */

export async function saveSupporter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    id: uuid.optional().or(z.literal("")),
    name: z.string().trim().min(2, "Ad en az 2 karakter").max(200),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    websiteUrl: z.string().trim().url("Geçerli bir adres girin").optional().or(z.literal("")),
    logoPath: z.string().trim().max(400).optional().or(z.literal("")),
    documentPath: z.string().trim().max(400).optional().or(z.literal("")),
    documentType: z.string().trim().max(60).optional().or(z.literal("")),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }).safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    logoPath: formData.get("logoPath") ?? "",
    documentPath: formData.get("documentPath") ?? "",
    documentType: formData.get("documentType") ?? "",
    sortOrder: formData.get("sortOrder") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const d = parsed.data;
  const payload = {
    name: d.name,
    slug: slugify(d.name),
    description: d.description || null,
    website_url: d.websiteUrl || null,
    logo_path: d.logoPath || null,
    document_path: d.documentPath || null,
    document_type: d.documentType || null,
    sort_order: d.sortOrder ?? 100,
    is_active: d.isActive ?? true,
  };

  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("supporters").update(payload).eq("id", d.id)
    : await supabase.from("supporters").insert(payload);

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/destekciler");
  return { ok: true, message: d.id ? "Destekçi güncellendi." : "Destekçi eklendi." };
}

export async function deleteSupporter(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("supporters").delete().eq("id", id);
  revalidatePath("/destekciler");
}

/* ═══════════════ YAPTIKLARIMIZ ═══════════════ */

export async function saveActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    id: uuid.optional().or(z.literal("")),
    title: z.string().trim().min(3, "Başlık en az 3 karakter").max(250),
    summary: z.string().trim().max(500).optional().or(z.literal("")),
    body: z.string().trim().min(10, "İçerik en az 10 karakter"),
    coverPath: z.string().trim().max(400).optional().or(z.literal("")),
    status: z.enum(["draft", "published", "archived"]),
    publishedAt: z.string().optional().or(z.literal("")),
  }).safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title"),
    summary: formData.get("summary") ?? "",
    body: formData.get("body"),
    coverPath: formData.get("coverPath") ?? "",
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

  const { data, error } = await supabase.rpc("admin_save_activity", {
    p_id: d.id || null,
    p_title: d.title,
    p_summary: d.summary || null,
    p_body: d.body,
    p_cover_path: d.coverPath || null,
    p_status: d.status,
    p_published_at: d.publishedAt || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yaptiklarimiz");
  return {
    ok: true,
    message: d.id ? "İçerik güncellendi." : "İçerik eklendi. Şimdi medya ekleyebilirsiniz.",
    data: { id: (data as { id?: string } | null)?.id ?? d.id },
  };
}

export async function deleteActivity(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("activities").delete().eq("id", id);
  revalidatePath("/yaptiklarimiz");
}

/* ═══════════════ BASINDA BİZ ═══════════════ */

export async function savePress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    id: uuid.optional().or(z.literal("")),
    title: z.string().trim().min(3, "Başlık en az 3 karakter").max(250),
    sourceName: z.string().trim().min(2, "Kaynak adı girin").max(120),
    sourceUrl: z.string().trim().url("Geçerli bir adres girin"),
    excerpt: z.string().trim().max(1000).optional().or(z.literal("")),
    body: z.string().trim().max(20000).optional().or(z.literal("")),
    logoPath: z.string().trim().max(400).optional().or(z.literal("")),
    coverPath: z.string().trim().max(400).optional().or(z.literal("")),
    publishedAt: z.string().optional().or(z.literal("")),
    isFeatured: z.boolean().optional(),
  }).safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title"),
    sourceName: formData.get("sourceName"),
    sourceUrl: formData.get("sourceUrl"),
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body") ?? "",
    logoPath: formData.get("logoPath") ?? "",
    coverPath: formData.get("coverPath") ?? "",
    publishedAt: formData.get("publishedAt") ?? "",
    isFeatured: formData.get("isFeatured") === "on",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // Kısa yol veritabanında üretilir: aynı başlıklı iki haber olduğunda
  // çakışmasın, düzenlerken de kendi kısa yoluyla çakışmasın diye.
  const { data, error } = await supabase.rpc("admin_save_press", {
    p_id: d.id || null,
    p_title: d.title,
    p_source_name: d.sourceName,
    p_source_url: d.sourceUrl,
    p_excerpt: d.excerpt || null,
    p_body: d.body || null,
    p_logo_path: d.logoPath || null,
    p_cover_path: d.coverPath || null,
    p_published_at: d.publishedAt || null,
    p_is_featured: d.isFeatured ?? false,
    p_is_published: true,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/basin");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: d.id ? "Haber güncellendi." : "Haber eklendi.",
    data: { id: (data as { id?: string } | null)?.id ?? d.id },
  };
}

export async function deletePress(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  const supabase = await createClient();
  await supabase.from("press_coverage").delete().eq("id", id);
  revalidatePath("/basin");
}

/* ═══════════════ POLİTİKALAR ═══════════════ */

export async function saveLegal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    id: uuid.optional().or(z.literal("")),
    slug: z.string().trim().max(120).optional().or(z.literal("")),
    title: z.string().trim().min(3, "Başlık en az 3 karakter").max(200),
    body: z.string().trim().min(20, "İçerik en az 20 karakter"),
    isActive: z.boolean().optional(),
  }).safeParse({
    id: formData.get("id") ?? "",
    slug: formData.get("slug") ?? "",
    title: formData.get("title"),
    body: formData.get("body"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_legal", {
    p_id: parsed.data.id || null,
    p_slug: parsed.data.slug || null,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_active: parsed.data.isActive ?? true,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/politikalar");
  return { ok: true, message: "Politika kaydedildi. Sürüm numarası artırıldı." };
}

/**
 * Bekleyen medyayı içeriğe bağlar.
 *
 * Dosyalar depolamaya kayıttan ÖNCE yüklenebiliyor; içerik kaydedilince
 * veritabanı satırları tek seferde burada oluşturulur.
 */
export async function attachActivityMedia(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    activityId: uuid,
    items: z.string(),
  }).safeParse({
    activityId: formData.get("activityId"),
    items: formData.get("items"),
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  let rows: { path: string; bucket: string; type: string; order: number }[];
  try {
    rows = JSON.parse(parsed.data.items) as typeof rows;
  } catch {
    return { ok: false, message: "Medya listesi okunamadı." };
  }

  if (rows.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("content_media").insert(
    rows.map((r) => ({
      entity_type: "activity",
      entity_id: parsed.data.activityId,
      media_type: r.type === "video" ? "video" : "image",
      bucket_id: r.bucket,
      path: r.path,
      sort_order: r.order,
    })),
  );

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yaptiklarimiz");
  return { ok: true };
}
