import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { ActivityManager } from "@/components/admin/activity-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bizden Haberler" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data, error: hataMesaji } = await supabase.from("activities").select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  /* Hata yutulmuyor: "kayıt yok" ile "erişemedim" ayrı şeyler. */
  if (hataMesaji) {
    return <Alert tone="danger" title="Liste alınamadı">{hataMesaji.message}</Alert>;
  }

  return <ActivityManager items={(data ?? []) as never} />;
}
