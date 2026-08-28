import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, Divider, H3 } from "@/components/ui";
import { getUserTeamBadges } from "@/lib/team-accounts/data";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import { UserActions } from "@/components/admin/user-actions";
import { AvatarManager } from "@/components/admin/avatar-manager";
import { MemberEditor } from "@/components/admin/member-editor";
import { ContactPanel } from "@/components/admin/contact-panel";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole, getCities, getTeams } from "@/lib/data";
import { formatDate, formatMoney, statusTone, ORDER_STATUS_TR, CARD_STATUS_TR } from "@/lib/utils";
import { ChildPhoto } from "@/components/admin/child-photo";

export const metadata: Metadata = { title: "Üye detayı" };
export const dynamic = "force-dynamic";

interface UserDetail {
  id: string; email: string | null; phone?: string | null;
  first_name: string | null; last_name: string | null; username: string | null;
  account_status: string; blocked_at: string | null; blocked_reason: string | null;
  email_verified_at: string | null; phone_verified_at: string | null;
  onboarding_completed_at: string | null; created_at: string; avatar_path: string | null;
  city: string | null; team: string | null;
  city_id: number | null; team_id: string | null;
  roles: string[];
  children: { id: string; name: string; birth_date: string; status: string;
              photo_path: string | null }[];
  orders: { id: string; order_number: string; status: string; amount: number; created_at: string }[];
  cards: { id: string; card_number: string; status: string; valid_until: string; lifecycle: string }[];
  signatures: number; total_spent: number;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  /* Bu kişi bir takım hesabı mı? Detayda da belirtilir ki personel
     "bu kim" diye takım hesapları ekranına gitmek zorunda kalmasın. */
  const takimRolleri = (await getUserTeamBadges([id]))[id] ?? [];

  const supabase = await createClient();
  const [{ data }, admin, cities, teams] = await Promise.all([
    supabase.rpc("admin_user_detail", { p_user_id: id }),
    getAdminUser(),
    getCities(),
    getTeams(),
  ]);

  if (!data) notFound();
  const u = data as unknown as UserDetail;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "İsimsiz üye";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/uyeler"
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Üyeler
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <AvatarManager userId={u.id} userName={name} currentPath={u.avatar_path} size="lg" />
          <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[26px] font-semibold tracking-[-.03em]">{name}</h1>
            {u.blocked_at && <Badge tone="danger">Engelli</Badge>}
            {u.roles.length > 0 && <Badge tone="lime">{u.roles.join(", ")}</Badge>}
            {takimRolleri.map((r, i) => (
              <Badge key={i} tone={r.role === "owner" ? "green" : "orange"}>
                {r.role === "owner" ? "Takım yetkilisi" : "Görevli"} · {r.team}
              </Badge>
            ))}
          </div>
          <span className="text-[13.5px] text-muted">
            {u.email} {u.username ? `· @${u.username}` : ""} · Kayıt: {formatDate(u.created_at)}
          </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display text-[22px] font-semibold tracking-[-.02em]">
            {formatMoney(u.total_spent)}
          </span>

          {/* Yıkıcı işlemler başlıkta, pencerede açılıyor — sayfanın
              altında büyük kartlar olarak durmuyor. */}
          <UserActions
            userId={u.id}
            userName={name}
            blocked={Boolean(u.blocked_at)}
            canBlock={hasRole(admin, "admin")}
            canDelete={hasRole(admin, "super_admin")}
          />
        </div>
      </div>

      {u.blocked_at && (
        <Card className="border-danger bg-danger-soft p-5">
          <span className="text-[14px] font-semibold text-danger">
            Engellendi: {formatDate(u.blocked_at, true)}
          </span>
          {u.blocked_reason && (
            <p className="mt-1 text-[13.5px] text-danger/85">Gerekçe: {u.blocked_reason}</p>
          )}
        </Card>
      )}

      {/* İletişim ve doğrulama — yönetici değiştirebilir */}
      <ContactPanel
        userId={u.id}
        email={u.email}
        phone={u.phone ?? null}
        emailVerifiedAt={u.email_verified_at}
        phoneVerifiedAt={u.phone_verified_at}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <MemberEditor
          member={{
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            username: u.username,
            account_status: u.account_status,
            city: u.city,
            team: u.team,
            city_id: u.city_id,
            team_id: u.team_id,
            email_verified_at: u.email_verified_at,
            phone_verified_at: u.phone_verified_at,
          }}
          cities={cities}
          teams={teams}
        />

        <Card className="flex flex-col gap-4 p-6">
          <H3 className="text-[18px]">Çocuklar ({u.children.length})</H3>
          <Divider />
          {u.children.length === 0 ? (
            <span className="text-[13.5px] text-muted">Kayıt yok.</span>
          ) : (
            u.children.map((c) => (
              <Link key={c.id} href={`/cocuklar/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-chip">
                <span className="inline-flex items-center gap-2.5">
                  <ChildPhoto childId={c.id} name={c.name}
                    hasPhoto={Boolean(c.photo_path)} size="sm" />
                  <span className="text-[14px] font-semibold">{c.name}</span>
                </span>
                <span className="inline-flex items-center gap-2 text-[12.5px] text-muted">
                  {formatDate(c.birth_date)}
                  <Icon icon={IconArrowRight} size={13} />
                </span>
              </Link>
            ))
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <H3 className="text-[18px]">Siparişler ({u.orders.length})</H3>
          <Divider />
          {u.orders.length === 0 ? (
            <span className="text-[13.5px] text-muted">Sipariş yok.</span>
          ) : (
            u.orders.slice(0, 8).map((o) => (
              <Link key={o.id} href={`/siparisler/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-1.5 hover:bg-chip">
                <span className="font-mono text-[13px] font-semibold">{o.order_number}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={statusTone(o.status)}>{ORDER_STATUS_TR[o.status] ?? o.status}</Badge>
                  <span className="text-[13px] font-semibold">{formatMoney(o.amount)}</span>
                </span>
              </Link>
            ))
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <H3 className="text-[18px]">Kartlar ({u.cards.length})</H3>
          <Divider />
          {u.cards.length === 0 ? (
            <span className="text-[13.5px] text-muted">Kart yok.</span>
          ) : (
            u.cards.map((c) => (
              <Link key={c.id} href={`/kartlar/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-chip">
                <span className="font-mono text-[13px]">{c.card_number}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={c.lifecycle === "expired" ? "danger"
                    : c.lifecycle === "expiring_soon" ? "orange" : "green"}>
                    {CARD_STATUS_TR[c.status] ?? c.status}
                  </Badge>
                  <span className="text-[12px] text-muted">{formatDate(c.valid_until)}</span>
                </span>
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-right text-[14px] font-semibold">{value}</span>
    </div>
  );
}
