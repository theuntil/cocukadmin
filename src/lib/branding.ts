import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/utils";

/**
 * Site markası — logolar merkezi ayardan gelir.
 *
 * Admin panelinden logo değiştirildiğinde site ve e-postalar aynı anda güncellenir.
 * Ayar boşsa public/ klasöründeki varsayılana düşülür; böylece hiçbir durumda
 * kırık görsel çıkmaz.
 */
export interface Branding {
  logoLight: string;
  logoDark: string;
  favicon: string;
  ogImage: string | null;
  paymentLogos: string | null;
  /** Logo yükseklikleri (px) — yönetim panelinden ayarlanır */
  sizeHeader: number;
  sizeFooter: number;
  sizePanel: number;
}

/*
 * Yedek değerler BOŞ bırakılır.
 *
 * Önceden public/ altındaki sabit dosyalara düşülüyordu; o dosyalar projede
 * bulunmadığı için ayar boş olduğunda kırık görsel çıkıyordu. Boş değerde
 * Logo bileşeni görsel yerine yazı gösterir.
 */
const FALLBACK: Branding = {
  logoLight: "",
  logoDark: "",
  favicon: "/favicon.ico",
  ogImage: null,
  paymentLogos: null,
  sizeHeader: 64,
  sizeFooter: 80,
  sizePanel: 60,
};

export async function getBranding(): Promise<Branding> {
  // Logo değişikliği anında yansımalı
  noStore();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return FALLBACK;

  try {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("site_branding");
    const b = (data ?? {}) as Record<string, unknown>;

    const pick = (key: string, fallback: string) => {
      const path = typeof b[key] === "string" ? (b[key] as string) : "";
      return publicStorageUrl("site-media", path) ?? fallback;
    };

    /** Sayı ayarı — sınır dışı değer responsive yapıyı bozmasın diye kırpılır */
    const num = (key: string, fallback: number) => {
      const raw = Number(b[key]);
      if (!Number.isFinite(raw)) return fallback;
      return Math.min(160, Math.max(32, Math.round(raw)));
    };

    return {
      logoLight: pick("brand.logo_light", FALLBACK.logoLight),
      logoDark: pick("brand.logo_dark", FALLBACK.logoDark),
      favicon: pick("brand.favicon", FALLBACK.favicon),
      ogImage: pick("brand.og_image", "") || null,
      paymentLogos: pick("brand.payment_logos", "") || null,
      sizeHeader: num("brand.logo_size_header", 64),
      sizeFooter: num("brand.logo_size_footer", 80),
      sizePanel: num("brand.logo_size_panel", 60),
    };
  } catch (err) {
    console.error("[branding]", (err as Error).message);
    return FALLBACK;
  }
}

/**
 * GİRİŞ EKRANI İÇERİĞİ
 *
 * Sağ paneldeki alıntı, açıklama, arka plan görseli ve sayaçlar
 * yönetim panelinden ayarlanır.
 *
 * ★ Hepsi boş bırakılabilir: alıntı boşsa yazı hiç basılmaz, görsel
 *   boşsa düz zemin kalır. Yarım dolu bir ekran çıkmaz.
 */
export interface AuthScreen {
  quote: string;
  quoteNote: string;
  image: string;
  showStats: boolean;
}

export async function getAuthScreen(): Promise<AuthScreen> {
  noStore();

  const bos: AuthScreen = { quote: "", quoteNote: "", image: "", showStats: true };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return bos;

  try {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("auth_screen");
    const a = (data ?? {}) as Record<string, unknown>;

    return {
      quote: typeof a.quote === "string" ? a.quote : "",
      quoteNote: typeof a.quote_note === "string" ? a.quote_note : "",
      image: publicStorageUrl("site-media", typeof a.image === "string" ? a.image : "") ?? "",
      showStats: a.show_stats !== false,
    };
  } catch (err) {
    console.error("[auth-screen]", (err as Error).message);
    return bos;
  }
}

/**
 * TESCİL BELGELERİ
 *
 * Üç kurum sabittir: TÜRKPATENT, EUIPO, USPTO. Belge yüklenmemiş kurum
 * da listede kalır (`image` boş) — arayüz onu bayrağıyla gösterir.
 * "Belge yok" gibi bir durum kullanıcıya yansıtılmaz.
 */
export interface Trademark {
  code: "tr" | "eu" | "us";
  office: string;
  short: string;
  country: string;
  /** Belgenin tam adresi; yüklenmemişse boş */
  image: string;
  no: string;
  year: string;
}

export async function getTrademarks(): Promise<Trademark[]> {
  noStore();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  try {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("public_trademarks");
    const rows = (data ?? []) as Record<string, string>[];

    return rows.map((r) => ({
      code: r.code as Trademark["code"],
      office: r.office ?? "",
      short: r.short ?? "",
      country: r.country ?? "",
      image: publicStorageUrl("site-media", r.path ?? "") ?? "",
      no: r.no ?? "",
      year: r.year ?? "",
    }));
  } catch (err) {
    console.error("[trademarks]", (err as Error).message);
    return [];
  }
}
