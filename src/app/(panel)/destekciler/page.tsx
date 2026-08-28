import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { SupporterManager } from "@/components/admin/supporter-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Destekçiler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data, error: hataMesaji } = await supabase.from("supporters").select("*").order("sort_order").order("name");
  /* Hata yutulmuyor: "kayıt yok" ile "erişemedim" ayrı şeyler. */
  if (hataMesaji) {
    return <Alert tone="danger" title="Liste alınamadı">{hataMesaji.message}</Alert>;
  }

  return <SupporterManager supporters={(data ?? []) as never} />;
}
