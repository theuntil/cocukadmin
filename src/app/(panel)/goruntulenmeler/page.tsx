import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ViewStats } from "@/components/admin/view-stats";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Görüntülenmeler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAdminUser();
  if (!hasRole(user, "editor")) redirect("/");

  return <ViewStats />;
}
