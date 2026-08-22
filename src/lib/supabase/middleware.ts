import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Korumalı alanlar */
const PANEL_PREFIX = "/panel";
const SETUP_PREFIX = "/kurulum";
const ADMIN_PREFIX = "/yonetim";
const AUTH_ROUTES = ["/giris", "/kayit", "/sifremi-unuttum"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() token'ı sunucuda doğrular — getSession()'a GÜVENİLMEZ.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Girişsiz kullanıcı korumalı alana giremez
  if (!user && (path.startsWith(PANEL_PREFIX) || path.startsWith(ADMIN_PREFIX) || path.startsWith(SETUP_PREFIX))) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("devam", path);
    return NextResponse.redirect(url);
  }

  // Girişli kullanıcı giriş/kayıt sayfalarına gitmesin
  if (user && AUTH_ROUTES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = PANEL_PREFIX;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
