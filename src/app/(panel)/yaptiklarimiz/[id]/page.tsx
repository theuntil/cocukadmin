import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { notFound } from "next/navigation";
import { ActivityEditor } from "@/components/admin/activity-editor";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "İçeriği düzenle" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error: hataMesaji } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();

  if (!data) notFound();

  /* Hata yutulmuyor: "kayıt yok" ile "erişemedim" ayrı şeyler. */
  if (hataMesaji) {
    return <Alert tone="danger" title="Liste alınamadı">{hataMesaji.message}</Alert>;
  }

  return <ActivityEditor item={data as never} />;
}
