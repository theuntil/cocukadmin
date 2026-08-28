import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeroEditor } from "@/components/admin/hero-editor";
import { getAdminUser, hasRole, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Ana sayfa" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) redirect("/");

  const settings = await getSettings();
  const hero = settings.filter((s) => s.category === "hero");

  return <HeroEditor settings={hero as never} />;
}
