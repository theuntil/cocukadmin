import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/admin/event-detail";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Etkinlik detayı" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data }, admin] = await Promise.all([
    supabase.rpc("admin_event_detail", { p_event_id: id }),
    getAdminUser(),
  ]);

  if (!data) notFound();

  return <EventDetail event={data as never} canDelete={hasRole(admin, "admin")} />;
}
