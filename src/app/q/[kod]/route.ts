import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QR YÖNLENDİRME UCU
 *
 * Basılı QR kodları bu adresi gösterir:  https://cocuktribunu.org/q/<kod>
 *
 * ┌─ NEDEN ARAYA BİR ADRES GİRİYOR ───────────────────────────────┐
 * │ QR bir kez basılır: afişe, bilete, pankarta. Hedef adres        │
 * │ doğrudan koda gömülseydi adres değiştiğinde basılmış her şey    │
 * │ çöp olurdu.                                                     │
 * │                                                                 │
 * │ Bu uç hedefi veritabanından okur; hedefi panelden değiştirmek   │
 * │ yeterlidir, basılı QR çalışmaya devam eder. Ayrıca kaç kez      │
 * │ okutulduğu sayılır.                                             │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ★ Yönlendirme 307 (geçici) ile yapılır. Kalıcı (301) olsaydı
 *   tarayıcı adresi önbelleğe alır, hedef değiştiğinde kullanıcı hâlâ
 *   eski yere giderdi.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;

  /* Biçim kontrolü: veritabanına saçma değer göndermeden elenir. */
  if (!kod || kod.length > 64 || !/^[a-zA-Z0-9-]+$/.test(kod)) {
    return NextResponse.redirect(new URL("/", siteUrl()), 307);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("qr_resolve", { p_code: kod });

    const sonuc = data as { found?: boolean; url?: string } | null;

    if (error || !sonuc?.found || !sonuc.url) {
      /* Bulunamayan ya da pasif QR: 404 yerine ana sayfaya götürülür.
         Elinde basılı kart olan kişiye hata sayfası göstermek yerine
         siteye almak daha iyi. */
      return NextResponse.redirect(new URL("/?qr=bulunamadi", siteUrl()), 307);
    }

    return NextResponse.redirect(sonuc.url, 307);
  } catch {
    return NextResponse.redirect(new URL("/", siteUrl()), 307);
  }
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";
}
