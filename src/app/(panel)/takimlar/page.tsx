import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { TeamsBoard } from "@/components/admin/teams-board";
import { getTeamCards } from "@/lib/team-accounts/data";
import { getCities, getLeagues, getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Takımlar" };
export const dynamic = "force-dynamic";

/**
 * TAKIMLAR — TEK EKRAN
 *
 * Eskiden ikiye bölünmüştü: "Takımlar" (bilgi düzenleme) ve
 * "Takım hesapları" (giriş yetkileri). İkisi de aynı nesneyi
 * yönetiyordu ve kullanıcı hangi işin nerede olduğunu hatırlamak
 * zorunda kalıyordu.
 *
 * Artık tek liste: takıma tıklarsınız, detay sayfasında hem bilgileri
 * hem hesapları yönetirsiniz. Bölümler ayrı sekmelerde — birleşik ama
 * karışık değil.
 */
export default async function Page() {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) redirect("/");

  const [{ data: teams, error }, cities, leagues] = await Promise.all([
    getTeamCards(),
    getCities(),
    getLeagues(),
  ]);

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Takımlar</h1>
        <Alert tone="danger" title="Takım listesi alınamadı">{error}</Alert>
      </div>
    );
  }

  return <TeamsBoard teams={teams} cities={cities} leagues={leagues} />;
}
