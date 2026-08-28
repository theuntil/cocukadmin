"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

const uuid = z.string().uuid();

/**
 * Takım yönetimi.
 * Yetki kontrolü RPC içinde (app.is_admin). Silme, bağlı kayıt varsa
 * otomatik olarak pasifleştirmeye döner — yetim kayıt oluşmaz.
 */
export async function saveTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    id: uuid.optional().or(z.literal("")),
    name: z.string().trim().min(2, "Takım adı en az 2 karakter").max(120),
    slug: z.string().trim().max(120).optional().or(z.literal("")),
    shortName: z.string().trim().max(12).optional().or(z.literal("")),
    logoPath: z.string().trim().max(400).optional().or(z.literal("")),
    colorPrimary: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Renk #RRGGBB olmalı")
      .optional().or(z.literal("")),
    cityId: z.coerce.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    /* Lig ZORUNLU: seçicilerde gruplama buna dayanıyor. Ligsiz takım
       "Diğer" başlığında en sonda kalır ve kimse bulamaz. */
    leagueId: z.string().trim().min(1, "Lig seçin"),
  }).safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    shortName: formData.get("shortName") ?? "",
    logoPath: formData.get("logoPath") ?? "",
    colorPrimary: formData.get("colorPrimary") ?? "",
    cityId: formData.get("cityId") || undefined,
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
    leagueId: formData.get("leagueId") ?? "",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_team", {
    p_id: parsed.data.id || null,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug || null,
    p_short_name: parsed.data.shortName || null,
    p_logo_path: parsed.data.logoPath || null,
    p_color_primary: parsed.data.colorPrimary || null,
    p_city_id: parsed.data.cityId ?? null,
    p_is_active: parsed.data.isActive ?? true,
    p_sort_order: parsed.data.sortOrder ?? null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  /* Lig ayrı yazılıyor: `admin_save_team` fonksiyonunun imzasını
     değiştirmek, onu çağıran başka yerleri de kırardı. Tablo
     güncellemesi hem daha basit hem de şema önbelleğine takılmıyor. */
  if (parsed.data.leagueId) {
    const hedefId = parsed.data.id || null;

    const { data: sonTakim } = hedefId
      ? { data: { id: hedefId } }
      : await supabase.from("teams").select("id").eq("name", parsed.data.name)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const tid = (sonTakim as { id?: string } | null)?.id;
    if (tid) {
      await supabase.from("teams").update({ league_id: parsed.data.leagueId }).eq("id", tid);
    }
  }

  revalidatePath("/takimlar");
  return { ok: true, message: parsed.data.id ? "Takım güncellendi." : "Takım eklendi." };
}

export async function deleteTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = uuid.safeParse(formData.get("id"));
  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  /* ★ Parametre adı `p_id` korundu (migration 077). Fonksiyon artık takıma
     bağlı GİRİŞ HESAPLARINI da siliyor — silinen kulübün yetkilisi
     sistemde hesapsız kalmalı. */
  const { data, error } = await supabase.rpc("admin_delete_team", { p_id: parsed.data });

  if (error) return { ok: false, message: error.message };

  const r = data as {
    name?: string;
    deleted?: { ad: string; rol: string }[];
    kept?: { ad: string; sebep: string }[];
  } | null;

  const silinen = r?.deleted?.length ?? 0;
  const korunan = r?.kept ?? [];

  revalidatePath("/takimlar");

  /* Korunan hesaplar açıkça söyleniyor: yönetici "hepsi silindi"
     sanmasın. Sebebi de yazılıyor ki gerekirse elle müdahale etsin. */
  const parcalar = [`${r?.name ?? "Takım"} silindi.`];
  if (silinen > 0) parcalar.push(`${silinen} giriş hesabı kaldırıldı.`);
  if (korunan.length > 0) {
    parcalar.push(
      `${korunan.length} hesap korundu (${korunan.map((k) => `${k.ad}: ${k.sebep}`).join(", ")}).`,
    );
  }

  return { ok: true, message: parcalar.join(" ") };
}
