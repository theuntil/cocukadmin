import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * İmza raporlarının okuma katmanı.
 *
 * ⚠️  GİZLİLİK: Kimlik ve iletişim bilgileri veritabanında zaten HASH'li
 * tutuluyor; ham telefon ya da e-posta hiçbir yerde yok. Bu fonksiyonlar
 * yalnızca ad-soyad, takım, şehir ve tarih döndürür.
 */

export interface SignatureOverview {
  total: number;
  today: number;
  week: number;
  campaigns: number;
  target: number;
  with_team: number;
  cities: number;
}

export interface TeamRow {
  id: string;
  name: string;
  logo_path: string | null;
  color_primary: string | null;
  imza: number;
}

export interface CityRow { id: number; name: string; imza: number }
export interface DailyRow { gun: string; imza: number }

export interface SignatureRow {
  id: string;
  first_name: string;
  last_name: string;
  team_name: string | null;
  team_logo_path: string | null;
  city_name: string | null;
  campaign_title: string | null;
  verification: string;
  consent_contact: boolean;
  is_anonymized: boolean;
  created_at: string;
}

export interface CampaignRow {
  id: string;
  title: string;
  status: string;
  target: number | null;
  imza: number;
}

const BOS_OZET: SignatureOverview = {
  total: 0, today: 0, week: 0, campaigns: 0, target: 0, with_team: 0, cities: 0,
};

async function guvenli<T>(fn: () => Promise<T>, yedek: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return yedek;
  try {
    return await fn();
  } catch (err) {
    console.error("[imza-veri]", (err as Error).message);
    return yedek;
  }
}

export async function getSignatureOverview(): Promise<SignatureOverview> {
  noStore();
  return guvenli(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_signature_overview");
    if (error) throw new Error(error.message);
    return { ...BOS_OZET, ...(data as unknown as SignatureOverview) };
  }, BOS_OZET);
}

export async function getSignaturesByTeam(): Promise<TeamRow[]> {
  noStore();
  return guvenli(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_signatures_by_team");
    if (error) throw new Error(error.message);
    return (data as unknown as TeamRow[]) ?? [];
  }, []);
}

export async function getSignaturesByCity(): Promise<CityRow[]> {
  noStore();
  return guvenli(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_signatures_by_city");
    if (error) throw new Error(error.message);
    return (data as unknown as CityRow[]) ?? [];
  }, []);
}

export async function getSignatureDaily(days = 30): Promise<DailyRow[]> {
  noStore();
  return guvenli(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_signature_daily", { p_days: days });
    if (error) throw new Error(error.message);
    return (data as unknown as DailyRow[]) ?? [];
  }, []);
}

export async function getSignatureCampaigns(): Promise<CampaignRow[]> {
  noStore();
  return guvenli(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_signature_campaigns");
    if (error) throw new Error(error.message);
    return (data as unknown as CampaignRow[]) ?? [];
  }, []);
}

export async function listSignatures(opts: {
  search?: string | null;
  teamId?: string | null;
  campaignId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: SignatureRow[]; total: number }> {
  noStore();
  return guvenli(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_signatures", {
      p_search: opts.search || null,
      p_team_id: opts.teamId || null,
      p_campaign: opts.campaignId || null,
      p_limit: opts.limit ?? 50,
      p_offset: opts.offset ?? 0,
    });
    if (error) throw new Error(error.message);
    const d = data as unknown as { rows: SignatureRow[]; total: number };
    return { rows: d.rows ?? [], total: Number(d.total ?? 0) };
  }, { rows: [], total: 0 });
}
