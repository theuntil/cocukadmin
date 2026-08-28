import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * TAKIMIN KOMBİNE KART SAHİBİ ÜYELERİ
 *
 * ★ Ölçüt `cards.team_id` — çocuğun tuttuğu takım değil, KARTIN ait
 *   olduğu takım. Bu kural tüm takım modülünde aynı.
 *
 * Veritabanı fonksiyonu kullanılmıyor: şema önbelleğine takılmasın.
 */

export type UyeDurum = "hepsi" | "aktif" | "gecmis";

export interface UyeRow {
  card_id: string;
  card_number: string;
  card_status: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  child_ad: string;
  child_soyad: string;
  child_dogum: string;
  child_yas: number;
  child_sehir: string | null;
  veli_ad: string | null;
  veli_telefon: string | null;
  veli_eposta: string | null;
}

export interface UyeSonuc {
  rows: UyeRow[];
  error: string | null;
}

/**
 * @param from  Bu tarihten sonra oluşturulan kartlar (ISO)
 * @param to    Bu tarihe kadar (ISO)
 */
export async function getTeamMembers(opts: {
  teamId: string;
  durum?: UyeDurum;
  from?: string | null;
  to?: string | null;
  limit?: number;
}): Promise<UyeSonuc> {
  noStore();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { rows: [], error: null };

  const supabase = await createClient();
  const bugun = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("cards")
    .select(
      "id, card_number, status, valid_from, valid_until, created_at, " +
      "children(first_name, last_name, birth_date, user_id, cities(name))",
    )
    .eq("team_id", opts.teamId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 2000);

  if (opts.durum === "aktif") {
    q = q.eq("status", "active").or(`valid_until.is.null,valid_until.gte.${bugun}`);
  } else if (opts.durum === "gecmis") {
    q = q.lt("valid_until", bugun);
  }

  if (opts.from) q = q.gte("created_at", opts.from);
  if (opts.to) q = q.lte("created_at", opts.to);

  const { data, error } = await q;
  if (error) return { rows: [], error: error.message };

  type Ham = {
    id: string; card_number: string; status: string;
    valid_from: string | null; valid_until: string | null; created_at: string;
    children: {
      first_name: string; last_name: string; birth_date: string;
      user_id: string | null; cities: { name: string } | null;
    } | null;
  };

  const ham = (data ?? []) as unknown as Ham[];

  /* Veli bilgisi ayrı sorguyla: `cards → children → profiles` zinciri
     PostgREST'te iki adım ve `profiles` gömmesi belirsizlik yaratıyor.
     Kimlikleri toplayıp tek sorguda çekmek hem net hem hızlı. */
  const veliIds = [...new Set(ham.map((r) => r.children?.user_id).filter(Boolean))] as string[];

  const veliler = new Map<string, { ad: string | null; tel: string | null; mail: string | null }>();

  if (veliIds.length > 0) {
    /* ┌─ İLETİŞİM NEDEN FONKSİYONDAN ⚠️ ──────────────────────────┐
       │ Önce yalnızca `parent_contacts` okunuyordu ve dışa aktarım │
       │ boş çıkıyordu:                                              │
       │   · o tablo YALNIZCA yeni başvuru akışından doluyor —       │
       │     eski velilerde kayıt yok                                │
       │   · e-posta zaten orada değil, `auth.users` içinde ve       │
       │     PostgREST o şemayı dışarı açmıyor                       │
       │                                                              │
       │ `admin_user_contacts` iki kaynağı birleştiriyor; e-posta    │
       │ her koşulda geliyor.                                         │
       └──────────────────────────────────────────────────────────────┘ */
    const [profRes, iletisimRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name").in("id", veliIds),
      supabase.rpc("admin_user_contacts", { p_ids: veliIds }),
    ]);

    for (const p of (profRes.data ?? []) as { id: string; first_name: string | null; last_name: string | null }[]) {
      veliler.set(p.id, {
        ad: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null,
        tel: null, mail: null,
      });
    }

    for (const c of ((iletisimRes.data ?? []) as unknown as {
      user_id: string; phone: string | null; email: string | null;
    }[])) {
      const v = veliler.get(c.user_id) ?? { ad: null, tel: null, mail: null };
      veliler.set(c.user_id, { ...v, tel: c.phone, mail: c.email });
    }
  }

  const yas = (d: string) => {
    const b = new Date(d), n = new Date();
    let y = n.getFullYear() - b.getFullYear();
    const a = n.getMonth() - b.getMonth();
    if (a < 0 || (a === 0 && n.getDate() < b.getDate())) y--;
    return y;
  };

  const rows: UyeRow[] = ham
    .filter((r) => r.children)
    .map((r) => {
      const v = r.children?.user_id ? veliler.get(r.children.user_id) : undefined;
      return {
        card_id: r.id,
        card_number: r.card_number,
        card_status: r.status,
        valid_from: r.valid_from,
        valid_until: r.valid_until,
        created_at: r.created_at,
        child_ad: r.children!.first_name,
        child_soyad: r.children!.last_name,
        child_dogum: r.children!.birth_date,
        child_yas: yas(r.children!.birth_date),
        child_sehir: r.children!.cities?.name ?? null,
        veli_ad: v?.ad ?? null,
        veli_telefon: v?.tel ?? null,
        veli_eposta: v?.mail ?? null,
      };
    });

  return { rows, error: null };
}
