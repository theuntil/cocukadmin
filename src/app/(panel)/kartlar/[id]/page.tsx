import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CardDetail } from "@/components/admin/card-detail";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Kart detayı" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data }, admin] = await Promise.all([
    supabase.rpc("admin_card_detail", { p_card_id: id }),
    getAdminUser(),
  ]);

  if (!data) notFound();

  return <CardDetail card={data as never} canExtend={hasRole(admin, "admin")} />;
}
