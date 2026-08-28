import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, Divider, H3 } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconCard, IconCalendar, IconCheck, IconUser } from "@/components/ui/icons";
import { ChildEditor } from "@/components/admin/child-editor";
import { ChildAvatar } from "@/components/admin/child-avatar";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole, getCities, getTeams } from "@/lib/data";
import { formatDate, CARD_STATUS_TR } from "@/lib/utils";

export const metadata: Metadata = { title: "Çocuk detayı" };
export const dynamic = "force-dynamic";

interface ChildDetail {
  id: string; first_name: string; last_name: string; birth_date: string;
  gender: string | null; photo_path: string | null;
  national_id_last2: string | null; notes: string | null;
  status: string; created_at: string;
  city_id: number | null; city_name: string | null;
  team_id: string | null; team_name: string | null; team_logo: string | null;
  parent: { id: string; first_name: string | null; last_name: string | null;
            email: string | null; avatar_path: string | null } | null;
  cards: { id: string; card_number: string; status: string;
           valid_until: string | null; lifecycle: string }[];
  events: { id: string; event_id: string; title: string; starts_at: string;
            status: string; attended: boolean }[];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data }, admin, cities, teams] = await Promise.all([
    supabase.rpc("admin_child_detail", { p_child_id: id }),
    getAdminUser(),
    getCities(),
    getTeams(),
  ]);

  if (!data) notFound();

  const c = data as unknown as ChildDetail;
  const name = `${c.first_name} ${c.last_name}`;
  const parentName = c.parent
    ? [c.parent.first_name, c.parent.last_name].filter(Boolean).join(" ") || "İsimsiz"
    : "—";

  const age = Math.floor(
    (Date.now() - new Date(c.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000));

  return (
    <div className="flex flex-col gap-6">
      <Link href={c.parent ? `/uyeler/${c.parent.id}` : "/uyeler"}
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> {c.parent ? parentName : "Üyeler"}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ChildAvatar childId={c.id} parentId={c.parent?.id ?? ""} name={name} path={c.photo_path}
            canEdit={hasRole(admin, "admin")} />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[26px] font-semibold tracking-[-.03em]">{name}</h1>
              {c.status !== "active" && <Badge tone="muted">Pasif</Badge>}
              {c.gender && c.gender !== "unspecified" && (
                <Badge tone="muted">{c.gender === "female" ? "Kız" : "Erkek"}</Badge>
              )}
            </div>
            <span className="text-[13.5px] text-muted">
              {formatDate(c.birth_date)} · {age} yaş
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChildEditor child={c} canEdit={hasRole(admin, "admin")}
          cities={cities} teams={teams} />

        {/* Veli */}
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2.5">
            <Icon icon={IconUser} size={18} className="text-muted" />
            <H3 className="text-[18px]">Veli</H3>
          </div>
          <Divider />

          {c.parent ? (
            <Link href={`/uyeler/${c.parent.id}`}
              className="flex items-center gap-3.5 rounded-[12px] p-2 transition-colors hover:bg-chip">
              <Avatar name={parentName} path={c.parent.avatar_path}
                userId={c.parent.id} size="md" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14.5px] font-semibold">{parentName}</span>
                <span className="truncate text-[12.5px] text-muted">{c.parent.email ?? "—"}</span>
              </div>
            </Link>
          ) : (
            <span className="text-[13.5px] text-muted">Veli kaydı yok.</span>
          )}

          {c.national_id_last2 && (
            <>
              <Divider />
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-muted">Kimlik numarası</span>
                <span className="font-mono text-[14px] font-semibold">
                  *********{c.national_id_last2}
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kartlar */}
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-2.5">
            <Icon icon={IconCard} size={18} className="text-muted" />
            <H3 className="text-[18px]">Kartlar ({c.cards.length})</H3>
          </div>
          <Divider />

          {c.cards.length === 0 ? (
            <span className="text-[13.5px] text-muted">Kart yok.</span>
          ) : (
            c.cards.map((card) => (
              <Link key={card.id} href={`/kartlar/${card.id}`}
                className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 hover:bg-chip">
                <span className="font-mono text-[13px] font-semibold">{card.card_number}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={card.lifecycle === "expired" ? "danger"
                    : card.lifecycle === "expiring_soon" ? "orange" : "green"}>
                    {CARD_STATUS_TR[card.status] ?? card.status}
                  </Badge>
                  {card.valid_until && (
                    <span className="text-[12px] text-muted">{formatDate(card.valid_until)}</span>
                  )}
                </span>
              </Link>
            ))
          )}
        </Card>

        {/* Etkinlikler */}
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-2.5">
            <Icon icon={IconCalendar} size={18} className="text-muted" />
            <H3 className="text-[18px]">Etkinlikler ({c.events.length})</H3>
          </div>
          <Divider />

          {c.events.length === 0 ? (
            <span className="text-[13.5px] text-muted">Kayıt yok.</span>
          ) : (
            c.events.slice(0, 12).map((e) => (
              <Link key={e.id} href={`/etkinlikler/${e.event_id}`}
                className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-chip">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] font-semibold">{e.title}</span>
                  <span className="text-[12px] text-muted">{formatDate(e.starts_at, true)}</span>
                </div>
                {e.attended && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[11.5px] font-semibold text-green">
                    <Icon icon={IconCheck} size={11} /> Katıldı
                  </span>
                )}
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
