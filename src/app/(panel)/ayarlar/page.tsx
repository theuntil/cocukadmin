import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { getAdminUser, hasRole, getSettings, getActivePlan } from "@/lib/data";

export const metadata: Metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) redirect("/");

  const [settings, plan] = await Promise.all([getSettings(), getActivePlan()]);

  return (
    <SettingsPanel
      settings={settings}
      price={plan ? Number(plan.price) : 0}
      currency={plan?.currency ?? "TRY"}
    />
  );
}
