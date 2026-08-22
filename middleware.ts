import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Statik dosyalar ve görseller hariç her istek.
     * Oturum tazeleme yalnızca gerçek sayfa isteklerinde çalışır.
     *
     * `/q/` DIŞARIDA: QR yönlendirmesi oturum gerektirmiyor. Her QR
     * okutmasında boşuna bir Supabase çağrısı yapmak, afişteki kod
     * yoğun okutulduğunda gereksiz yük demek.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|q/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
