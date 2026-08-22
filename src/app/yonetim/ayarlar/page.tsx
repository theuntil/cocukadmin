import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/panel/settings-admin";
import { createClient } from "@/lib/supabase/server";
import { getMyRoles, getActivePlan } from "@/lib/data";

export const metadata: Metadata = { title: "Site Ayarları", robots: { index: false } };
export const dynamic = "force-dynamic";

export interface SettingRow {
  key: string; value: unknown; label: string; description: string | null; category: string;
}

export default async function Page() {
  const roles = await getMyRoles();
  if (!roles.some((r) => ["admin", "super_admin"].includes(r))) redirect("/yonetim");

  const supabase = await createClient();
  const [{ data }, plan] = await Promise.all([
    supabase.from("app_settings").select("*").order("category").order("key"),
    getActivePlan(),
  ]);

  return (
    <SettingsPanel
      settings={(data ?? []) as unknown as SettingRow[]}
      price={plan ? Number(plan.price) : 0}
      currency={plan?.currency ?? "TRY"}
    />
  );
}
