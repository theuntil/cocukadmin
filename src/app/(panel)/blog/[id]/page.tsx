import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/news-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Yazıyı düzenle" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error: hataMesaji } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  /* Hata yutulmuyor: "kayıt yok" ile "erişemedim" ayrı şeyler. */
  if (hataMesaji) {
    return <Alert tone="danger" title="Liste alınamadı">{hataMesaji.message}</Alert>;
  }

  return <NewsForm news={data as never} />;
}
