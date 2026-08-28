import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { redirect } from "next/navigation";
import { LegalManager } from "@/components/admin/legal-manager";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Politikalar" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getAdminUser();
  if (!hasRole(admin, "admin")) redirect("/");

  const supabase = await createClient();
  const { data, error: hataMesaji } = await supabase.from("legal_documents").select("*")
    .order("sort_order").order("title");

  /* Hata yutulmuyor: "kayıt yok" ile "erişemedim" ayrı şeyler. */
  if (hataMesaji) {
    return <Alert tone="danger" title="Liste alınamadı">{hataMesaji.message}</Alert>;
  }

  return <LegalManager documents={(data ?? []) as never} />;
}
