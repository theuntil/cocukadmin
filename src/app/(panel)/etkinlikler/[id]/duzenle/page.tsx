import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/data";

export const metadata: Metadata = { title: "Etkinliği düzenle" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data }, cities] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    getCities(),
  ]);

  if (!data) notFound();

  return <EventForm event={data as never} cities={cities} />;
}
