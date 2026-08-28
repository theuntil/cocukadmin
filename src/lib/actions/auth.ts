"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/types";

/**
 * Yönetim paneli girişi.
 *
 * Şifre doğru olsa bile personel rolü yoksa oturum HEMEN kapatılır.
 * Böylece normal üyeler panele erişemez ve giriş denemesi kayda geçer.
 */
export async function adminSignIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
    password: z.string().min(1, "Şifrenizi girin"),
    next: z.string().default("/"),
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? "/",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Kullanıcının var olup olmadığını sızdırmamak için tek mesaj
  if (error) return { ok: false, message: "E-posta veya şifre hatalı." };

  const { data: roles } = await supabase.rpc("my_roles");
  const staff = ["super_admin", "admin", "editor", "finance", "support", "moderator"];
  const isStaff = ((roles ?? []) as string[]).some((r) => staff.includes(r));

  if (!isStaff) {
    await supabase.auth.signOut();
    return { ok: false, message: "Bu hesabın yönetim paneline erişim yetkisi yok." };
  }

  // Açık yönlendirme koruması
  const target = parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//")
    ? parsed.data.next : "/";

  redirect(target);
}
