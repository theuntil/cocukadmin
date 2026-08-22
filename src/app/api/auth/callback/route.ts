import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth ve e-posta doğrulama dönüş noktası.
 *
 * Not: GoTrue, redirect_to adresini GOTRUE_URI_ALLOW_LIST içinde bulamazsa
 * sessizce SITE_URL'e düşer ve kodu kök dizine bırakır. O durumu yakalamak için
 * `src/app/(site)/page.tsx` üzerinde de bir emniyet kemeri var.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");
  const rawNext = searchParams.get("next") ?? "/panel";

  // Açık yönlendirme koruması: yalnızca site içi yollara izin ver
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/panel";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production" && forwardedHost ? `https://${forwardedHost}` : origin);

  if (errorDescription) {
    return NextResponse.redirect(`${base}/giris?hata=${encodeURIComponent(errorDescription)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${base}/giris?hata=${encodeURIComponent("Doğrulama bağlantısı geçersiz.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${base}/giris?hata=${encodeURIComponent("Bağlantının süresi dolmuş olabilir. Tekrar deneyin.")}`,
    );
  }

  return NextResponse.redirect(`${base}${next}`);
}
