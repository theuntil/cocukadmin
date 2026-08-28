import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft } from "@/components/ui/icons";
import { TeamMembersBoard } from "@/components/admin/team-members-board";
import { getTeamMembers, type UyeDurum } from "@/lib/team-accounts/members";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Takım üyeleri" };
export const dynamic = "force-dynamic";

export default async function Page({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) redirect("/");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const sp = await searchParams;
  const durum: UyeDurum =
    sp.durum === "aktif" || sp.durum === "gecmis" ? sp.durum : "hepsi";

  const supabase = await createClient();
  const [teamRes, { rows, error }] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", id).maybeSingle(),
    getTeamMembers({ teamId: id, durum }),
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

      {error ? (
        <Alert tone="danger" title="Üye listesi alınamadı">{error}</Alert>
      ) : (
        <TeamMembersBoard teamId={id} teamName={team.name} rows={rows} durum={durum} />
      )}
    </div>
  );
}
