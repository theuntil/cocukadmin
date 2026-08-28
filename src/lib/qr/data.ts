import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QrList } from "@/lib/qr/types";

const BOS: QrList = { rows: [], total: 0, total_scans: 0, active: 0 };

export async function getQrCodes(search?: string | null): Promise<QrList> {
  noStore();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return BOS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_qr", {
      p_search: search || null,
      p_limit: 200,
    });
    if (error) throw new Error(error.message);
    return { ...BOS, ...(data as unknown as QrList) };
  } catch (err) {
    console.error("[qr-data]", (err as Error).message);
    return BOS;
  }
}

/**
 * QR'ın gösterdiği adres.
 *
 * Hedef adres DEĞİL, kendi sitemizdeki kısa adres. Hedefi panelden
 * değiştirince basılı QR çalışmaya devam etsin diye.
 */
export function qrPublicUrl(code: string): string {
  const taban = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";
  return `${taban.replace(/\/$/, "")}/q/${code}`;
}
