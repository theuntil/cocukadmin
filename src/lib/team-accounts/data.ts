import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  TAKIM VERİSİ — YALNIZCA TABLO SORGULARI
 * ═══════════════════════════════════════════════════════════════════
 *
 *  ┌─ VERİTABANI FONKSİYONU KULLANILMIYOR ⚠️ ─────────────────────┐
 *  │ Bu ekranlar önce `admin_team_cards()`, `admin_team_detail()`  │
 *  │ gibi fonksiyonlara dayanıyordu ve sürekli şu hatayı veriyordu:│
 *  │                                                                │
 *  │   Could not find the function … in the schema cache            │
 *  │                                                                │
 *  │ Supabase'in HTTP katmanı yeni eklenen fonksiyonu, kendisi      │
 *  │ yeniden başlatılana kadar görmüyor. Her yeni fonksiyon için    │
 *  │ sunucu yeniden başlatmayı gerektiren bir tasarım kabul         │
 *  │ edilemez.                                                      │
 *  │                                                                │
 *  │ Buradaki her şey ZATEN VAR OLAN tablolardan okunuyor:          │
 *  │ teams · cards · team_accounts · team_invitations · profiles    │
 *  │ Hiçbir yeni nesne gerekmiyor, hiçbir yeniden başlatma da.      │
 *  └────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ E-POSTA NEREDEN GELİYOR ─────────────────────────────────────┐
 *  │ Kullanıcının e-postası `auth.users` içinde ve PostgREST o      │
 *  │ şemayı dışarı açmıyor. Bu yüzden e-posta, hesabı yaratan       │
 *  │ DAVET kaydından okunuyor (`team_invitations.accepted_by`).     │
 *  │ Davet zaten o adrese gönderilmişti; kaynağı orası.             │
 *  └────────────────────────────────────────────────────────────────┘
 */

export interface TeamCard {
  id: string;
  name: string;
  short_name: string | null;
  logo_path: string | null;
  is_active: boolean;
  city_id: number | null;
  color_primary: string | null;
  sort_order: number | null;
  league_id: string | null;
  card_count: number;
  account_count: number;
  pending_count: number;
}

export interface TeamAccountRow {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  accepted_at: string | null;
  last_seen_at: string | null;
  ad: string | null;
  email: string | null;
}

export interface TeamInviteRow {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  sent_count: number;
  expired: boolean;
}

export interface TeamCheckinRow {
  id: string;
  result: string;
  checked_at: string;
  kisi: string | null;
}

export interface TeamDetail {
  team: TeamCard;
  accounts: TeamAccountRow[];
  invitations: TeamInviteRow[];
  checkins: TeamCheckinRow[];
}

export interface Sonuc<T> {
  data: T;
  /** Dolu ise ekranda gösterilecek gerçek hata — sessiz boş liste yok */
  error: string | null;
}

/* ═══════════════════ LİSTE ═══════════════════ */

export async function getTeamCards(): Promise<Sonuc<TeamCard[]>> {
  noStore();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { data: [], error: null };

  const supabase = await createClient();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_path, is_active, city_id, color_primary, sort_order, league_id")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) return { data: [], error: error.message };

  const liste = (teams ?? []) as Omit<TeamCard, "card_count" | "account_count" | "pending_count">[];
  if (liste.length === 0) return { data: [], error: null };

  /* Sayımlar paralel ve `head: true` ile — gövde inmez, yalnızca
     Content-Range başlığındaki sayı gelir. Tüm satırları çekip
     tarayıcıda saymak, PostgREST'in satır sınırına takılıp YANLIŞ
     sayı üretirdi. */
  const sayimlar = await Promise.all(
    liste.map(async (t) => {
      const [kart, hesap, davet] = await Promise.all([
        supabase.from("cards").select("id", { count: "exact", head: true })
          .eq("team_id", t.id).neq("status", "cancelled"),
        supabase.from("team_accounts").select("id", { count: "exact", head: true })
          .eq("team_id", t.id).eq("is_active", true),
        supabase.from("team_invitations").select("id", { count: "exact", head: true })
          .eq("team_id", t.id).is("accepted_at", null).is("cancelled_at", null),
      ]);
      return {
        card_count: kart.count ?? 0,
        account_count: hesap.count ?? 0,
        pending_count: davet.count ?? 0,
      };
    }),
  );

  return {
    data: liste.map((t, i) => ({ ...t, ...sayimlar[i] })),
    error: null,
  };
}

/* ═══════════════════ DETAY ═══════════════════ */

export async function getTeamDetail(teamId: string): Promise<Sonuc<TeamDetail | null>> {
  noStore();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { data: null, error: null };

  const supabase = await createClient();

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_path, is_active, city_id, color_primary, sort_order, league_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamErr) return { data: null, error: teamErr.message };
  if (!team) return { data: null, error: null };   // gerçekten yok → 404

  /* Dört sorgu paralel: biri yavaşsa diğerleri beklemesin. */
  const [kartSay, hesapRes, davetRes, okutmaRes] = await Promise.all([
    supabase.from("cards").select("id", { count: "exact", head: true })
      .eq("team_id", teamId).neq("status", "cancelled"),

    /* ┌─ YABANCI ANAHTAR BELİRSİZLİĞİ ⚠️ ────────────────────────┐
       │ `team_accounts` tablosunun `profiles`'a İKİ yabancı        │
       │ anahtarı var: `user_id` (hesabın sahibi) ve `invited_by`   │
       │ (daveti gönderen). Sade `profiles(...)` yazınca PostgREST  │
       │ hangisini kastettiğimizi bilemiyor ve şu hatayı veriyor:   │
       │                                                            │
       │   Could not embed because more than one relationship was   │
       │   found for 'team_accounts' and 'profiles'                 │
       │                                                            │
       │ Çözüm: kısıt adıyla açıkça belirtmek.                      │
       └────────────────────────────────────────────────────────────┘ */
    supabase.from("team_accounts")
      .select(
        "id, user_id, role, is_active, accepted_at, last_seen_at, " +
        "profiles!team_accounts_user_id_fkey(first_name,last_name)",
      )
      .eq("team_id", teamId)
      .order("role", { ascending: true })
      .order("created_at", { ascending: true }),

    supabase.from("team_invitations")
      .select("id, email, role, expires_at, created_at, sent_count, accepted_at, accepted_by, cancelled_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),

    /* `card_checkins` → `profiles` tek anahtar (`checked_by`), yine de
       açık yazılıyor: ileride ikinci bir anahtar eklenirse sessizce
       kırılmasın. */
    supabase.from("card_checkins")
      .select(
        "id, result, checked_at, checked_by, " +
        "profiles!card_checkins_checked_by_fkey(first_name,last_name)",
      )
      .eq("team_id", teamId)
      .order("checked_at", { ascending: false })
      .limit(20),
  ]);

  if (hesapRes.error) return { data: null, error: hesapRes.error.message };

  type Profil = { first_name: string | null; last_name: string | null } | null;
  const adYaz = (p: Profil) =>
    p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null : null;

  const davetler = (davetRes.data ?? []) as {
    id: string; email: string; role: string; expires_at: string; created_at: string;
    sent_count: number; accepted_at: string | null; accepted_by: string | null;
    cancelled_at: string | null;
  }[];

  /* E-posta eşlemesi: hesabı yaratan kabul edilmiş davetten. */
  const epostalar = new Map<string, string>();
  for (const d of davetler) {
    if (d.accepted_by && d.accepted_at) epostalar.set(d.accepted_by, d.email);
  }

  const accounts: TeamAccountRow[] = ((hesapRes.data ?? []) as unknown as {
    id: string; user_id: string; role: string; is_active: boolean;
    accepted_at: string | null; last_seen_at: string | null; profiles: Profil;
  }[]).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    role: a.role,
    is_active: a.is_active,
    accepted_at: a.accepted_at,
    last_seen_at: a.last_seen_at,
    ad: adYaz(a.profiles),
    email: epostalar.get(a.user_id) ?? null,
  }));

  const simdi = Date.now();
  const invitations: TeamInviteRow[] = davetler
    .filter((d) => !d.accepted_at && !d.cancelled_at)
    .map((d) => ({
      id: d.id, email: d.email, role: d.role,
      expires_at: d.expires_at, created_at: d.created_at,
      sent_count: d.sent_count,
      expired: new Date(d.expires_at).getTime() < simdi,
    }));

  const checkins: TeamCheckinRow[] = ((okutmaRes.data ?? []) as unknown as {
    id: string; result: string; checked_at: string; profiles: Profil;
  }[]).map((k) => ({
    id: k.id, result: k.result, checked_at: k.checked_at, kisi: adYaz(k.profiles),
  }));

  return {
    data: {
      team: {
        ...(team as Omit<TeamCard, "card_count" | "account_count" | "pending_count">),
        card_count: kartSay.count ?? 0,
        account_count: accounts.filter((a) => a.is_active).length,
        pending_count: invitations.length,
      },
      accounts,
      invitations,
      checkins,
    },
    error: null,
  };
}

/* ═══════════════════ ÜYELER SAYFASI İŞARETLERİ ═══════════════════ */

export interface UserTeamBadge {
  role: string;
  team: string;
}

/**
 * Verilen kullanıcıların takım rolleri — kullanıcı kimliğine göre eşlenmiş.
 *
 * Üyeler listesinde ve kullanıcı detayında "takım yetkilisi / görevli"
 * rozeti göstermek için. Burada da veritabanı fonksiyonu yok: tek
 * tablo sorgusu, takım adı gömülü geliyor.
 */
export async function getUserTeamBadges(
  ids: string[],
): Promise<Record<string, UserTeamBadge[]>> {
  noStore();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || ids.length === 0) return {};

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("team_accounts")
      .select("user_id, role, teams!team_accounts_team_id_fkey(name)")
      .in("user_id", ids)
      .eq("is_active", true);

    if (error) throw new Error(error.message);

    const harita: Record<string, UserTeamBadge[]> = {};

    for (const r of (data ?? []) as unknown as {
      user_id: string; role: string; teams: { name: string } | null;
    }[]) {
      (harita[r.user_id] ??= []).push({
        role: r.role,
        team: r.teams?.name ?? "Takım",
      });
    }

    return harita;
  } catch (err) {
    /* Rozet ikincil bilgi: alınamazsa üyeler listesi yine çalışsın.
       Burada sessiz geçmek doğru — ana veri değil, süs. */
    console.error("[takim-rozet]", (err as Error).message);
    return {};
  }
}
