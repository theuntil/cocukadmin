"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";

const kayitSemasi = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2, "Başlık en az 2 karakter olmalı").max(120),
  description: z.string().trim().max(400).optional().default(""),
  target_url: z.string().trim().max(1200)
    .refine((v) => /^https?:\/\//i.test(v), "Adres https:// ile başlamalı"),
  is_active: z.boolean(),
});

export async function saveQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = kayitSemasi.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    target_url: formData.get("target_url"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_save_qr", { p_patch: parsed.data });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/qr");
  return {
    ok: true,
    message: parsed.data.id
      ? "QR kodu güncellendi."
      : `QR kodu oluşturuldu: ${(data as { code?: string })?.code ?? ""}`,
  };
}

export async function deleteQr(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_qr", { p_id: parsed.data });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/qr");
  return { ok: true, message: "QR kodu silindi." };
}

export async function resetQrScans(id: string): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reset_qr_scans", { p_id: parsed.data });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/qr");
  return { ok: true, message: "Okutma sayacı sıfırlandı." };
}
