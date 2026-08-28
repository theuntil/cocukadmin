import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { IconUsers, IconSearch, IconCheck, IconCard, IconStar } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getUserTeamBadges } from "@/lib/team-accounts/data";

export const metadata: Metadata = { title: "Üyeler" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*, cities(name), teams:favorite_team_id(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.q) {
    const term = `%${sp.q}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},username.ilike.${term}`);
  }

  // Üst şeritteki sayılar tüm veriyi kapsar; liste ilk 200 kaydı gösterir
  const [{ data }, statsRes] = await Promise.all([
    query,
    supabase.rpc("admin_member_stats"),
  ]);

  const stats = (statsRes.data ?? {}) as {
    total?: number; with_card?: number; verified?: number;
    blocked?: number; this_month?: number;
  };
  const rowsRaw = (data ?? []) as unknown as {
    id: string; first_name: string | null; last_name: string | null; username: string | null;
    account_status: string; created_at: string; blocked_at: string | null;
    avatar_path: string | null;
    email_verified_at: string | null; phone_verified_at: string | null;
    onboarding_completed_at: string | null;
    cities: { name: string } | null;
    teams: { name: string } | null;
  }[];

  const rows = rowsRaw;

  /* Takım ve görevli hesapları listede işaretlenir. `admin_list_users`
     yerine ayrı çağrı: o sorgu başka ekranlarda da kullanılıyor,
     dokunmak gereksiz risk. */
  const takimIsaretleri = await getUserTeamBadges(rows.map((r) => r.id));


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Üyeler</h1>
        <span className="text-[14px] text-muted">{rows.length} kayıt</span>
      </div>

      <form action="/uyeler" className="max-w-[360px]">
        <div className="relative">
          <Icon icon={IconSearch} size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Ad, soyad veya kullanıcı adı"
            className="h-11 w-full rounded-[12px] border border-line bg-field pl-10 pr-3 text-[14px] outline-none focus:border-ink/25" />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<Icon icon={IconUsers} size={26} />} title="Üye bulunamadı" />
      ) : (
        <Card className="overflow-hidden">
          <div className="ct-scrollbar overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line2 text-[11.5px] font-bold tracking-[.06em] text-muted2">
                  <th className="px-5 py-3">AD SOYAD</th>
                  <th className="px-3 py-3">ŞEHİR</th>
                  <th className="px-3 py-3">TAKIM</th>
                  <th className="px-3 py-3">DOĞRULAMA</th>
                  <th className="px-3 py-3">DURUM</th>
                  <th className="px-5 py-3">KAYIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line2 text-[13.5px]">
                {rows.map((p) => (
                  <tr key={p.id} className="cursor-pointer transition-colors hover:bg-chip">
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <Link href={`/uyeler/${p.id}`}
                          className="inline-flex items-center gap-3 font-semibold hover:underline">
                          <Avatar
                            name={[p.first_name, p.last_name].filter(Boolean).join(" ") || "?"}
                            path={p.avatar_path} size="sm" />
                          {[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
                        </Link>
                        {p.username && <span className="text-[12px] text-muted">@{p.username}</span>}
                        {/* Takım / görevli işareti */}
                        {(takimIsaretleri[p.id] ?? []).map((r, i) => (
                          <span key={i}
                            className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                              r.role === "owner"
                                ? "bg-green-soft text-green"
                                : "bg-orange-soft text-orange-ink"
                            }`}>
                            {r.role === "owner" ? "TAKIM" : "GÖREVLİ"} · {r.team}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">{p.cities?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-muted">{p.teams?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <VerifyDot label="E-posta" ok={Boolean(p.email_verified_at)} />
                        <VerifyDot label="Telefon" ok={Boolean(p.phone_verified_at)} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={p.blocked_at ? "danger" : p.account_status === "active" ? "green" : "orange"}>
                        {p.blocked_at ? "Engelli" : p.account_status === "active" ? "Aktif" : p.account_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-muted">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function VerifyDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span title={`${label}: ${ok ? "doğrulandı" : "bekliyor"}`}
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${
        ok ? "bg-green-soft text-green" : "bg-chip text-muted2"
      }`}>
      {ok && <Icon icon={IconCheck} size={11} />}
      {label.slice(0, 3)}
    </span>
  );
}

/** Üst şeritteki özet kutusu */
function StatCard({
  icon, label, value, hint,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  label: string; value: number; hint?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-chip">
        <Icon icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-[24px] font-semibold leading-none tracking-[-.02em]">
          {value.toLocaleString("tr-TR")}
        </span>
        <span className="truncate text-[12.5px] text-muted">
          {label}{hint ? ` · ${hint}` : ""}
        </span>
      </div>
    </Card>
  );
}
