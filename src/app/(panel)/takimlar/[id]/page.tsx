import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft } from "@/components/ui/icons";
import { TeamDetailBoard } from "@/components/admin/team-detail-board";
import { getTeamDetail } from "@/lib/team-accounts/data";
import { createClient } from "@/lib/supabase/server";
import { getCities, getLeagues, getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Takım" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) redirect("/");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createClient();

  const [{ data, error }, cities, leagues, statsRes] = await Promise.all([
    getTeamDetail(id),
    getCities(),
    getLeagues(),
    /* İstatistik bileşeni takım listesini bekliyor. Hata olursa boş
       geçilir: istatistik ikincil, sayfanın geri kalanı çalışsın. */
    supabase.rpc("admin_team_list"),
  ]);

  /* Erişim hatası 404 DEĞİLDİR: sayfa var, veriye ulaşılamıyor.
     İkisini ayırmak sorunu bulmayı kolaylaştırır. */
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <Link href="/takimlar"
          className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Takımlar
        </Link>
        <Alert tone="danger" title="Takım bilgileri alınamadı">{error}</Alert>
      </div>
    );
  }

  if (!data) notFound();

  return (
    <TeamDetailBoard
      detail={data}
      cities={cities}
      leagues={leagues}
      statsTeams={(statsRes.data ?? []) as never}
    />
  );
}
