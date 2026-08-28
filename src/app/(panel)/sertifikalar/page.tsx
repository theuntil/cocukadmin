import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { CertificatesBoard } from "@/components/admin/certificates-board";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Sertifikalar" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) redirect("/");

  const supabase = await createClient();

  const [certRes, kartRes] = await Promise.all([
    supabase
      .from("certificates")
      .select("id, number, child_id, child_name, parent_name, team_name, issued_at, emailed_at, storage_path")
      .order("issued_at", { ascending: false })
      .limit(500),

    /* ┌─ EKSİKLER DE LİSTELENİYOR ⚠️ ─────────────────────────────┐
       │ Sayfa yalnızca ÜRETİLMİŞ sertifikaları gösteriyordu. Üretim │
       │ herhangi bir sebeple çalışmazsa sayfa boş kalıyor ve         │
       │ "sistem yok" gibi görünüyordu — sorunun nerede olduğu        │
       │ anlaşılmıyordu.                                                │
       │                                                                 │
       │ Artık kartı olup sertifikası olmayan çocuklar da listeleniyor │
       │ ve tek tıkla üretilebiliyor. Üretim başarısız olursa HATA     │
       │ EKRANDA görünüyor.                                             │
       └─────────────────────────────────────────────────────────────────┘ */
    supabase
      .from("cards")
      .select("id, child_id, children(first_name, last_name)")
      .eq("status", "active")
      .limit(500),
  ]);

  const { data, error } = certRes;

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Sertifikalar</h1>
        <Alert tone="danger" title="Liste alınamadı">{error.message}</Alert>
      </div>
    );
  }

  const mevcut = new Set(
    ((data ?? []) as { child_id: string }[]).map((c) => c.child_id),
  );

  const eksikler = ((kartRes.data ?? []) as unknown as {
    id: string; child_id: string | null;
    children: { first_name: string; last_name: string } | null;
  }[])
    .filter((k) => k.child_id && k.children && !mevcut.has(k.child_id))
    .map((k) => ({
      cardId: k.id,
      childId: k.child_id!,
      childName: `${k.children!.first_name} ${k.children!.last_name}`.trim(),
    }));

  return <CertificatesBoard rows={(data ?? []) as never} eksikler={eksikler} />;
}
