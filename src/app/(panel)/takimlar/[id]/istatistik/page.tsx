import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft } from "@/components/ui/icons";
import { TeamStats } from "@/components/admin/team-stats";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Takım istatistikleri" };
export const dynamic = "force-dynamic";

/**
 * TAKIM İSTATİSTİKLERİ — AYRI SAYFA
 *
 * Detay sayfasının içinde açılır bölüm olarak duruyordu; sayfa çok
 * uzuyordu ve grafikler dar alana sıkışıyordu. Kendi sayfasında tüm
 * genişliği kullanıyor ve adres çubuğundan paylaşılabiliyor.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) redirect("/");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createClient();

  const [teamRes, listRes] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", id).maybeSingle(),
    supabase.rpc("admin_team_list"),
  ]);

  if (teamRes.error) {
    return <Alert tone="danger" title="Takım bulunamadı">{teamRes.error.message}</Alert>;
  }
  if (!teamRes.data) notFound();

  const team = teamRes.data as { id: string; name: string };

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/takimlar/${id}`}
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> {team.name}
      </Link>

      {listRes.error ? (
        <Alert tone="danger" title="İstatistikler alınamadı">{listRes.error.message}</Alert>
      ) : (
        <TeamStats teams={(listRes.data ?? []) as never} lockedTeamId={id} />
      )}
    </div>
  );
}
