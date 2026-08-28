import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { PressManager } from "@/components/admin/press-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Basında biz" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data, error: hataMesaji } = await supabase.from("press_coverage").select("*")
    .order("published_at", { ascending: false });
  /* Hata yutulmuyor: "kayıt yok" ile "erişemedim" ayrı şeyler. */
  if (hataMesaji) {
    return <Alert tone="danger" title="Liste alınamadı">{hataMesaji.message}</Alert>;
  }

  return <PressManager items={(data ?? []) as never} />;
}
