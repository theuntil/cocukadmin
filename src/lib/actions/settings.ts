"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

/** Aç/kapa ayarları — yetki kontrolü veritabanında yapılır. */
export async function toggleSetting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ key: z.string().min(1), value: z.enum(["true", "false"]) })
    .safeParse({ key: formData.get("key"), value: formData.get("value") });

  if (!parsed.success) return { ok: false, message: "Geçersiz ayar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_setting", {
    p_key: parsed.data.key,
    p_value: parsed.data.value === "true",
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yonetim/ayarlar");
  revalidatePath("/", "layout");
  return { ok: true, message: "Ayar güncellendi." };
}

/** Metin ayarları (bakım mesajı, duyuru şeridi, varsayılan ödeme yöntemi) */
export async function updateTextSetting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ key: z.string().min(1), value: z.string().max(500) })
    .safeParse({ key: formData.get("key"), value: formData.get("value") ?? "" });

  if (!parsed.success) return { ok: false, message: "Geçersiz değer." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_setting", {
    p_key: parsed.data.key,
    p_value: parsed.data.value,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yonetim/ayarlar");
  revalidatePath("/", "layout");
  return { ok: true, message: "Kaydedildi." };
}

/** Kombine kart yıllık üyelik bedeli */
export async function updatePlanPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ price: z.coerce.number().positive("Geçerli bir tutar girin").max(100000) })
    .safeParse({ price: formData.get("price") });

  if (!parsed.success) return { ok: false, fieldErrors: { price: "Geçerli bir tutar girin" } };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_plan_price", {
    p_slug: "yillik-kombine",
    p_price: parsed.data.price,
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/yonetim/ayarlar");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: "Fiyat güncellendi. Mevcut siparişlerin tutarı değişmez.",
    data: data as Record<string, unknown>,
  };
}
