import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/utils";
import type {
  CampaignProgress, City, EventPublicView,
  NewsRow, Team, TeamLeaderboardRow, SubscriptionPlan, Announcement, SignatureCampaign,
} from "@/lib/types";

/**
 * Supabase henüz bağlı değilken (build sırasında, .env yokken) sayfaların
 * çökmemesi için tüm okumalar bu sarmalayıcıdan geçer.
 */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fallback;
  }
  try {
    return await fn();
  } catch (err) {
    console.error("[data]", err);
    return fallback;
  }
}

/**
 * Profil satırının varlığını garantiler. Profil yoksa RLS politikaları
 * (app.is_account_active) yazma işlemlerini reddeder ve kullanıcı
 * "yetkiniz yok" hatası alır. Bu çağrı o durumu kendiliğinden onarır.
 */
export async function ensureProfile() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("ensure_my_profile");
    return data as { ok: boolean; created: boolean; account_status: string } | null;
  }, null);
}

export async function getCurrentUser() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  }, null);
}

export async function getMyProfile() {
  return safe(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("*, cities(name)")
      .eq("id", auth.user.id)
      .maybeSingle();
    return data as (Record<string, unknown> & { id: string }) | null;
  }, null);
}

export interface ProfileCompletion {
  complete: boolean;
  missing: string[];
  first_name: string | null;
  last_name: string | null;
  city_id: number | null;
  favorite_team_id: string | null;
  username: string | null;
  /** Sunucunun ürettiği kullanıcı adı önerisi (e-postanın @ öncesi) */
  username_suggestion: string | null;
}

/** Profil tamamlanmış mı? Eksikse hangi alanlar eksik? */
export async function getProfileCompletion(): Promise<ProfileCompletion | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { data } = await supabase.rpc("my_profile_completion");
    if (!data) return null;

    const base = data as ProfileCompletion;

    // Kullanıcı adı henüz yoksa e-postadan öneri üret.
    // Tarayıcının otomatik doldurmasına bırakılırsa alana e-postanın
    // TAMAMI yazılıyordu; öneri sunucuda üretilir ve benzersizdir.
    if (!base.username && auth.user?.email) {
      const { data: suggestion } = await supabase.rpc("suggest_username", {
        p_email: auth.user.email,
      });
      return { ...base, username_suggestion: (suggestion as string) ?? null };
    }

    return { ...base, username_suggestion: null };
  }, null);
}

export async function getMyRoles(): Promise<string[]> {
  return safe(async () => {
    const supabase = await createClient();
    // RPC kullanıyoruz: user_roles tablosuna doğrudan erişim gerekmez
    const { data } = await supabase.rpc("my_roles");
    return (data ?? []) as string[];
  }, []);
}

export async function getCities(): Promise<City[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("cities").select("id,name,slug,region").order("name");
    return (data ?? []) as unknown as City[];
  }, []);
}

export async function getTeams(): Promise<Team[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("teams").select("*").eq("is_active", true)
      .order("sort_order").order("name");
    return (data ?? []) as unknown as Team[];
  }, []);
}

export async function getTeam(slug: string): Promise<Team | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("teams").select("*").eq("slug", slug).maybeSingle();
    return (data ?? null) as unknown as Team | null;
  }, null);
}

export async function getActivePlan(): Promise<SubscriptionPlan | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("subscription_plans").select("*")
      .eq("slug", "yillik-kombine").eq("is_active", true).maybeSingle();
    return (data ?? null) as unknown as SubscriptionPlan | null;
  }, null);
}

export async function getMainCampaign(): Promise<CampaignProgress | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_campaign_progress").select("*")
      .eq("status", "active").order("signature_count", { ascending: false }).limit(1).maybeSingle();
    return (data ?? null) as unknown as CampaignProgress | null;
  }, null);
}

export async function getCampaignBySlug(slug: string): Promise<SignatureCampaign | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("signature_campaigns").select("*").eq("slug", slug).maybeSingle();
    return (data ?? null) as unknown as SignatureCampaign | null;
  }, null);
}

export async function getCampaignProgress(slug: string): Promise<CampaignProgress | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("v_campaign_progress").select("*").eq("slug", slug).maybeSingle();
    return (data ?? null) as unknown as CampaignProgress | null;
  }, null);
}

export async function getCampaignLeaderboard(campaignId: string): Promise<TeamLeaderboardRow[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_campaign_team_leaderboard").select("*")
      .eq("campaign_id", campaignId).order("rank").limit(24);
    return (data ?? []) as unknown as TeamLeaderboardRow[];
  }, []);
}

export async function getNews(limit = 12, offset = 0, categorySlug?: string) {
  return safe(async () => {
    const supabase = await createClient();
    let q = supabase
      .from("v_published_news").select("*", { count: "exact" })
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (categorySlug) q = q.eq("category_slug", categorySlug);
    const { data, count } = await q;
    return { rows: (data ?? []) as unknown as (NewsRow & { category_name: string | null; category_slug: string | null; image_path: string | null; image_bucket: string | null })[], count: count ?? 0 };
  }, { rows: [], count: 0 });
}

export async function getNewsBySlug(slug: string) {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("news").select("*, news_categories(name,slug), profiles(first_name,last_name)")
      .eq("slug", slug).eq("status", "published").maybeSingle();
    return data as (NewsRow & Record<string, unknown>) | null;
  }, null);
}

export async function getNewsCategories() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("news_categories").select("id,name,slug").eq("is_active", true).order("sort_order");
    return (data ?? []) as unknown as { id: string; name: string; slug: string }[];
  }, []);
}

/**
 * Etkinlikler.
 *
 * `past: true` geçmiş etkinlikleri döndürür. Varsayılan yalnızca yaklaşanlardır;
 * tarihi geçmiş etkinlikler listeden düşer ama ayrı bir bölümde gösterilebilir.
 *
 * Sorgu hatası sessizce yutulmaz: sunucu günlüğüne sebebiyle birlikte yazılır,
 * böylece "hiç etkinlik görünmüyor" durumunda kaynak tespit edilebilir.
 */
export async function getEvents(opts: {
  limit?: number; citySlug?: string; type?: string; onlyCard?: boolean; past?: boolean;
} = {}) {
  const { limit = 24, citySlug, type, onlyCard, past = false } = opts;

  return safe(async () => {
    const supabase = await createClient();

    /*
     * Aktiflik BİTİŞ tarihine göre belirlenir (is_over alanı görünümde
     * hesaplanır). Başlamış ama bitmemiş etkinlik hâlâ listelenir;
     * yalnızca başlangıca bakılsaydı devam eden etkinlik "geçmiş" sayılırdı.
     */
    let q = supabase
      .from("v_events_public").select("*")
      .in("status", ["published", "ongoing", "completed"])
      .eq("is_over", past)
      .limit(limit);

    q = past
      ? q.order("starts_at", { ascending: false })
      : q.order("starts_at");

    if (citySlug) q = q.eq("city_slug", citySlug);
    if (type) q = q.eq("event_type", type);
    if (onlyCard) q = q.eq("requires_card", true);

    const { data, error } = await q;

    if (error) {
      console.error("[getEvents]", error.message, error.details ?? "", error.hint ?? "");
      return [] as EventPublicView[];
    }

    return (data ?? []) as unknown as EventPublicView[];
  }, []);
}

export async function getEventBySlug(slug: string): Promise<EventPublicView | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("v_events_public").select("*").eq("slug", slug).maybeSingle();
    return (data ?? null) as unknown as EventPublicView | null;
  }, null);
}

export async function getAnnouncements(limit = 20): Promise<Announcement[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("announcements").select("*").eq("status", "published")
      .order("starts_at", { ascending: false }).limit(limit);
    return (data ?? []) as unknown as Announcement[];
  }, []);
}




/* ── Migration 004 ile gelen içerik kaynakları ────────────────────── */

export async function getLegalDocument(slug: string) {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("legal_documents").select("*")
      .eq("slug", slug).eq("is_published", true).maybeSingle();
    return data as {
      slug: string; title: string; summary: string | null; body: string;
      version: string; effective_from: string; updated_at: string;
    } | null;
  }, null);
}

export async function getLegalDocuments() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("legal_documents").select("slug,title,summary,sort_order")
      .eq("is_published", true).order("sort_order");
    return (data ?? []) as unknown as { slug: string; title: string; summary: string | null }[];
  }, []);
}

export interface PressItem {
  id: string; source_name: string; source_logo_path: string | null;
  source_url: string | null; article_url: string | null;
  title: string; slug: string | null; excerpt: string | null;
  body: string | null; cover_path: string | null;
  published_at: string; is_featured: boolean;
}

export async function getPressCoverage(limit = 12, onlyFeatured = false) {
  return safe(async () => {
    const supabase = await createClient();
    let q = supabase.from("press_coverage").select("*")
      .eq("is_published", true).order("sort_order").order("published_at", { ascending: false }).limit(limit);
    if (onlyFeatured) q = q.eq("is_featured", true);
    const { data } = await q;
    return (data ?? []) as unknown as PressItem[];
  }, []);
}

export interface TeamMember {
  id: string; full_name: string; role_title: string; bio: string | null;
  photo_path: string | null; is_leader: boolean; links: Record<string, string>;
}

export async function getTeamMembers() {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("team_members").select("*")
      .eq("is_published", true).order("sort_order");
    return (data ?? []) as unknown as TeamMember[];
  }, []);
}

export interface SiteBlock {
  key: string; title: string | null; subtitle: string | null; body: string | null;
  image_path: string | null; image_bucket: string; cta_label: string | null;
  cta_href: string | null; data: Record<string, unknown>;
}

export async function getSiteContent(keys: string[]) {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.from("site_content").select("*")
      .in("key", keys).eq("is_published", true);
    const map = new Map<string, SiteBlock>();
    for (const row of (data ?? []) as unknown as SiteBlock[]) map.set(row.key, row);
    return map;
  }, new Map<string, SiteBlock>());
}





/* ═══════════════════════════════════════════════════════════════════════
   DERLEME ZAMANI OKUMALARI

   generateStaticParams ve sitemap istek bağlamı dışında çalışır; orada
   cookies() çağrılamaz. Bu fonksiyonlar çerezsiz istemci kullanır.
   ═══════════════════════════════════════════════════════════════════════ */

async function safeStatic<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fallback;
  }
  try {
    return await fn();
  } catch (err) {
    // Derleme, veritabanına ulaşamasa bile devam etmeli; sayfalar istek anında üretilir.
    console.warn("[static-params]", (err as Error).message);
    return fallback;
  }
}

export async function getNewsSlugs(limit = 100): Promise<string[]> {
  return safeStatic(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("v_published_news").select("slug")
      .order("published_at", { ascending: false }).limit(limit);
    return (data ?? []).map((r) => (r as { slug: string }).slug);
  }, []);
}

export async function getEventSlugs(limit = 100): Promise<string[]> {
  return safeStatic(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("v_events_public").select("slug")
      .in("status", ["published", "ongoing"]).limit(limit);
    return (data ?? []).map((r) => (r as { slug: string }).slug);
  }, []);
}

export async function getTeamSlugs(): Promise<string[]> {
  return safeStatic(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("teams").select("slug").eq("is_active", true);
    return (data ?? []).map((r) => (r as { slug: string }).slug);
  }, []);
}



/* ═══════════════ SİTE AYARLARI (migration 007) ═══════════════ */

export interface PaymentOptions {
  card_enabled: boolean;
  iban_enabled: boolean;
  default_method: "credit_card" | "bank_transfer";
  any_enabled: boolean;
}

export async function getPaymentOptions(): Promise<PaymentOptions> {
  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("payment_options");
    return (data ?? null) as PaymentOptions ?? {
      card_enabled: false, iban_enabled: true, default_method: "bank_transfer", any_enabled: true,
    };
  }, { card_enabled: true, iban_enabled: true, default_method: "credit_card", any_enabled: true });
}

export type SiteSettings = Record<string, unknown>;

export async function getSiteSettings(): Promise<SiteSettings> {
  // Bakım modu gibi ayarlar ANINDA etki etmeli; bu yüzden hiç önbelleğe alınmaz.
  noStore();

  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("public_settings");
    return (data ?? {}) as SiteSettings;
  }, {});
}

export function settingBool(s: SiteSettings, key: string, fallback = true): boolean {
  const v = s[key];
  return typeof v === "boolean" ? v : fallback;
}

export function settingText(s: SiteSettings, key: string, fallback = ""): string {
  const v = s[key];
  return typeof v === "string" ? v : fallback;
}


/* ═══════════════ DESTEKÇİLER ═══════════════ */

export interface Supporter {
  id: string; name: string; slug: string; logo_path: string | null;
  description: string | null; website_url: string | null;
  document_path: string | null; document_type: string | null;
  sort_order: number;
}

export async function getSupporters(): Promise<Supporter[]> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("supporters").select("*").eq("is_active", true)
      .order("sort_order").order("name");
    return (data ?? []) as Supporter[];
  }, []);
}

export async function getSupporter(slug: string): Promise<Supporter | null> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("supporters").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
    return data as Supporter | null;
  }, null);
}

/* ═══════════════ YAPTIKLARIMIZ ═══════════════ */

export interface Activity {
  id: string; title: string; slug: string; summary: string | null; body: string;
  cover_path: string | null; published_at: string | null; view_count: number;
}

export async function getActivities(limit = 50): Promise<Activity[]> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("activities").select("*").eq("status", "published")
      .order("published_at", { ascending: false }).limit(limit);
    return (data ?? []) as Activity[];
  }, []);
}

export async function getActivity(slug: string): Promise<Activity | null> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("activities").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    return data as Activity | null;
  }, null);
}

export async function getActivitySlugs(): Promise<string[]> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("activities").select("slug").eq("status", "published");
    return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
  }, []);
}

/* ═══════════════ İÇERİK MEDYASI ═══════════════ */

export interface ContentMedia {
  id: string; media_type: string; bucket_id: string; path: string;
  caption: string | null; sort_order: number;
}

export async function getContentMedia(
  entityType: string, entityId: string,
): Promise<ContentMedia[]> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("content_media").select("*")
      .eq("entity_type", entityType).eq("entity_id", entityId)
      .order("sort_order");
    return (data ?? []) as ContentMedia[];
  }, []);
}

/* ═══════════════ BASINDA BİZ (detay) ═══════════════ */

export async function getPressItem(slug: string): Promise<PressItem | null> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("press_coverage").select("*").eq("slug", slug).maybeSingle();
    return data as PressItem | null;
  }, null);
}

export async function getPressSlugs(): Promise<string[]> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("press_coverage").select("slug").not("slug", "is", null);
    return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
  }, []);
}

export interface BankInfo {
  name: string; holder: string; iban: string;
  branch: string; swift: string; note: string;
}

/**
 * Havale bilgileri.
 *
 * Yönetim panelinden düzenlenir; ortam değişkeni kullanılmaz, böylece
 * IBAN değişince yeniden dağıtım gerekmez.
 */
export async function getBankInfo(): Promise<BankInfo> {
  /*
   * Ayar boşsa bu değerler kullanılır. Havale bilgisinin hiç görünmemesi,
   * yanlış görünmesinden daha büyük sorun: kullanıcı ödeme yapamaz.
   * Panelden düzenlenen değer her zaman önceliklidir.
   */
  const fallback: BankInfo = {
    name: "Ziraat Bankası",
    holder: "KUZEYBATI İNTERNATİONAL MEDYA SANAYİ LİMİTED ŞİRKETİ",
    iban: "TR57 0001 0024 4298 4022 3150 01",
    branch: "", swift: "", note: "",
  };

  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings").select("key,value")
      .in("key", ["bank.name", "bank.holder", "bank.iban",
                  "bank.branch", "bank.swift", "bank.note"]);

    const map = new Map(
      (data ?? []).map((r) => {
        const row = r as { key: string; value: unknown };
        return [row.key, typeof row.value === "string" ? row.value : ""];
      }),
    );

    return {
      name: map.get("bank.name") || fallback.name,
      holder: map.get("bank.holder") || fallback.holder,
      iban: map.get("bank.iban") || fallback.iban,
      branch: map.get("bank.branch") ?? "",
      swift: map.get("bank.swift") ?? "",
      note: map.get("bank.note") ?? "",
    };
  }, fallback);
}

export interface HeroSettings {
  enabled: boolean;
  videoUrl: string;
  poster: string;
  title: string;
  description: string;
  buttonLabel: string;
  overlay: number;
  featuredSupporter: string;
  featuredDocLabel: string;
}

/**
 * Ana sayfa hero ayarları.
 *
 * Video, metinler ve öne çıkan destekçi yönetim panelinden düzenlenir.
 */
export async function getHeroSettings(): Promise<HeroSettings> {
  const fallback: HeroSettings = {
    enabled: false, videoUrl: "", poster: "", title: "", description: "",
    buttonLabel: "Tanıtım videosunu izle", overlay: 55,
    featuredSupporter: "", featuredDocLabel: "Destek belgesi",
  };

  return safe(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings").select("key,value")
      .in("category", ["hero"]);

    const map = new Map(
      (data ?? []).map((r) => {
        const row = r as { key: string; value: unknown };
        return [row.key, row.value];
      }),
    );

    const str = (k: string, d = "") => {
      const v = map.get(k);
      return typeof v === "string" ? v : d;
    };

    /* Ayarlarda DEPOLAMA YOLU tutulur ("hero/123.mp4"). Video etiketine
       ham yol verilirse tarayıcı onu site adresine göre çözer ve dosyayı
       bulamaz; oynatma hiç başlamaz. Burada tam adrese çevrilir. */
    const toUrl = (v: string, bucket: string) => {
      if (!v) return "";
      if (v.startsWith("http")) return v;
      return publicStorageUrl(bucket, v) ?? "";
    };

    return {
      enabled: map.get("hero.video_enabled") === true,
      videoUrl: toUrl(str("hero.video_url"), "site-video"),
      poster: toUrl(str("hero.video_poster"), "site-media"),
      title: str("hero.video_title"),
      description: str("hero.video_description"),
      buttonLabel: str("hero.video_button", "Tanıtım videosunu izle"),
      overlay: Number(map.get("hero.overlay_opacity") ?? 55),
      featuredSupporter: str("home.featured_supporter"),
      featuredDocLabel: str("home.featured_doc_label", "Destek belgesi"),
    };
  }, fallback);
}

/** Aktif çocuk kaydı sayısı — ana sayfa sayacı için */
export async function getChildrenCount(): Promise<number> {
  return safe(async () => {
    const supabase = createPublicClient();
    const { count } = await supabase
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    return count ?? 0;
  }, 0);
}
