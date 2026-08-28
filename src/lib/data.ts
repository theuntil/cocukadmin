import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/utils";

/** Hata durumunda uygulamayı çökertmeden yedek değer döner */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error("[admin-data]", (err as Error).message);
    return fallback;
  }
}

export const STAFF_ROLES = ["super_admin", "admin", "editor", "finance", "support", "moderator"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: StaffRole[];
}

/** Oturumdaki personeli döndürür; personel değilse null */
export async function getAdminUser(): Promise<AdminUser | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const [{ data: roles }, { data: profile }] = await Promise.all([
      // RPC kullanıyoruz: tablo politikası değişse bile panel çalışmaya devam eder
      supabase.rpc("my_roles"),
      supabase.from("profiles").select("first_name,last_name").eq("id", auth.user.id).maybeSingle(),
    ]);

    const list = ((roles ?? []) as string[])
      .filter((r): r is StaffRole => (STAFF_ROLES as readonly string[]).includes(r));

    if (list.length === 0) return null;

    const p = profile as { first_name: string | null; last_name: string | null } | null;
    return {
      id: auth.user.id,
      email: auth.user.email ?? "",
      firstName: p?.first_name ?? null,
      lastName: p?.last_name ?? null,
      roles: list,
    };
  }, null);
}

export function hasRole(user: AdminUser | null, ...roles: StaffRole[]): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  return roles.some((r) => user.roles.includes(r));
}

/* ══════════════ GÖSTERGE PANELİ ══════════════ */

export interface DashboardStats {
  pending_payments: number; open_orders: number; orders_no_invoice: number;
  active_cards: number; expiring_cards: number; expired_cards: number;
  total_users: number; new_users_7d: number; signatures: number;
  revenue_30d: number; upcoming_events: number; newsletter_subs: number;
}

const EMPTY_STATS: DashboardStats = {
  pending_payments: 0, open_orders: 0, orders_no_invoice: 0,
  active_cards: 0, expiring_cards: 0, expired_cards: 0,
  total_users: 0, new_users_7d: 0, signatures: 0,
  revenue_30d: 0, upcoming_events: 0, newsletter_subs: 0,
};

export async function getDashboard(): Promise<DashboardStats> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("admin_dashboard");
    return { ...EMPTY_STATS, ...(data as Partial<DashboardStats> ?? {}) };
  }, EMPTY_STATS);
}

export interface ActivityRow {
  kind: string; title: string; subtitle: string; at: string; ref: string;
}

export async function getRecentActivity(limit = 20): Promise<ActivityRow[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("admin_recent_activity", { p_limit: limit });
    return (data ?? []) as ActivityRow[];
  }, []);
}

/* ══════════════ ANALİTİK ══════════════ */

export interface AnalyticsSummary {
  range_days: number; total_views: number; unique_views: number;
  today_views: number; bot_views: number; mobile_share: number; pages_tracked: number;
}

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("analytics_summary", { p_days: days });
    return (data ?? {}) as AnalyticsSummary;
  }, { range_days: days, total_views: 0, unique_views: 0, today_views: 0, bot_views: 0, mobile_share: 0, pages_tracked: 0 });
}

export interface TopPage { path: string; page_type: string; views: number; unique_views: number; share: number }

export async function getTopPages(days = 30, limit = 50): Promise<TopPage[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("analytics_top_pages", { p_days: days, p_limit: limit });
    return (data ?? []) as TopPage[];
  }, []);
}

export interface SeriesPoint { day: string; views: number; unique_views: number }

export async function getTimeseries(days = 30): Promise<SeriesPoint[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("analytics_timeseries", { p_days: days });
    return (data ?? []) as SeriesPoint[];
  }, []);
}

export interface ReferrerRow { referrer_host: string; views: number }

export async function getReferrers(days = 30, limit = 20): Promise<ReferrerRow[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("analytics_referrers", { p_days: days, p_limit: limit });
    return (data ?? []) as ReferrerRow[];
  }, []);
}

/* ══════════════ ORTAK LİSTELER ══════════════ */

export async function getCities() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("cities").select("*").order("name");
    return (data ?? []) as { id: number; name: string }[];
  }, []);
}

export async function getTeams() {
  return safe(async () => {
    const supabase = await createClient();
    /* ┌─ LİG BİLGİSİ ŞART ⚠️ ────────────────────────────────────┐
       │ Takım seçici takımları lige göre gruplar. Lig gelmezse    │
       │ HEPSİ "Diğer" başlığı altında toplanır — gruplama işe      │
       │ yaramaz hâle gelir. Sitedeki liste bunu getiriyordu,       │
       │ paneldeki getirmiyordu.                                     │
       └─────────────────────────────────────────────────────────────┘ */
    const { data } = await supabase
      .from("teams")
      .select("*, leagues(id,name,sort_order)")
      .eq("is_active", true)
      .order("name");

    type Ham = {
      id: string; name: string; slug: string;
      short_name: string | null; logo_path: string | null; city_id: number | null;
      league_id: string | null;
      leagues: { id: string; name: string; sort_order: number } | null;
    };

    return ((data ?? []) as unknown as Ham[]).map((t) => ({
      id: t.id, name: t.name, slug: t.slug,
      short_name: t.short_name, logo_path: t.logo_path, city_id: t.city_id,
      league_id: t.league_id,
      league_name: t.leagues?.name ?? null,
      league_order: t.leagues?.sort_order ?? null,
    })) as unknown as {
      id: string; name: string; slug: string;
      short_name: string | null; logo_path: string | null; city_id: number | null;
    }[];
  }, []);
}

export async function getSettings() {
  // Ayarlar her zaman taze okunur; panelde eski değer görünmemeli
  noStore();

  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("*").order("category").order("key");
    return (data ?? []) as {
      key: string; value: unknown; label: string;
      description: string | null; category: string;
    }[];
  }, []);
}

export async function getActivePlan() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("subscription_plans").select("*").eq("is_active", true).maybeSingle();
    return data as { slug: string; price: number; currency: string } | null;
  }, null);
}

/** Sipariş sahibinin e-posta adresi — bildirim göndermek için (service_role) */
export async function getUserEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  return safe(async () => {
    const admin = createServiceClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  }, null);
}

/* ═══════════════ MARKA AYARLARI ═══════════════ */

/**
 * Panelin kendi logosu da Ayarlar > Marka'dan gelir.
 * Böylece logo tek yerden değiştirilir; site, panel ve e-postalar aynı anda güncellenir.
 */
export async function getBrandingSettings(): Promise<{
  logoLight: string; logoDark: string; favicon: string; paymentLogos: string;
  logoSizePanel: number;
}> {
  const fallback = {
    logoLight: "", logoDark: "", favicon: "", paymentLogos: "", logoSizePanel: 56,
  };

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings").select("key,value")
      .in("key", ["brand.logo_light", "brand.logo_dark", "brand.favicon",
                  "brand.payment_logos", "brand.logo_size_panel"]);

    if (!data) return fallback;

    const map = new Map(
      (data as { key: string; value: unknown }[]).map((r) => [
        r.key,
        typeof r.value === "string" ? r.value : String(r.value ?? "").replace(/^"|"$/g, ""),
      ]),
    );

    const url = (path: string) =>
      path ? publicStorageUrl("site-media", path) ?? "" : "";

    return {
      logoLight: url(map.get("brand.logo_light") ?? ""),
      logoDark: url(map.get("brand.logo_dark") ?? ""),
      favicon: url(map.get("brand.favicon") ?? ""),
      paymentLogos: url(map.get("brand.payment_logos") ?? ""),
      logoSizePanel: (() => {
        const raw = Number(map.get("brand.logo_size_panel"));
        if (!Number.isFinite(raw)) return 56;
        return Math.min(160, Math.max(32, Math.round(raw)));
      })(),
    };
  } catch {
    return fallback;
  }
}


/** Lig listesi — takım formundaki seçici için, sıralı */
export async function getLeagues() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leagues").select("id,name,sort_order")
      .eq("is_active", true).order("sort_order");
    return (data ?? []) as { id: string; name: string; sort_order: number }[];
  }, []);
}
