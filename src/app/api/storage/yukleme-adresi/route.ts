import { NextResponse, type NextRequest } from "next/server";
import { storageSignedUpload, dualWrite } from "@/lib/storage";
import { isPrivateBucket } from "@/lib/storage/config";
import { getAdminUser, hasRole } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YÜKLEME ADRESİ ÜRETİR
 *
 * ┌─ YETKİ BURADA KONTROL EDİLİYOR ⚠️ ────────────────────────────┐
 * │ Supabase'de yükleme yetkisini RLS politikaları denetliyordu.    │
 * │ R2'de RLS yok — kimin neye yazabileceğine BU UÇ karar veriyor. │
 * │                                                                  │
 * │ Kontrol atlanırsa herkes her kovaya dosya yazabilir. Bu yüzden  │
 * │ üç katman var: personel mi, kova listede mi, yol güvenli mi.    │
 * └──────────────────────────────────────────────────────────────────┘
 */

/* Panelden yazılabilecek kovalar. Listede olmayan reddediliyor —
   yeni bir kova eklenince buraya da yazmak gerekiyor ve bu bilinçli:
   sessizce yeni kovaya yazılmasındansa hata alınması iyi. */
const IZINLI = new Set([
  "site-media", "galeri", "event-media", "news-media", "announcement-media",
  "campaign-media", "mail-media", "press-logos", "team-logos", "site-video",
  "avatars", "child-photos", "invoices", "payment-receipts",
  "donation-receipts", "mail-attachments", "card-documents",
]);

export async function POST(req: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  let govde: { bucket?: string; path?: string; contentType?: string };
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const bucket = String(govde.bucket ?? "");
  const path = String(govde.path ?? "");

  if (!IZINLI.has(bucket)) {
    return NextResponse.json({ error: "Bu kovaya yükleme yapılamaz." }, { status: 400 });
  }

  /* ┌─ YOL DENETİMİ ⚠️ ────────────────────────────────────────────┐
     │ `..` içeren bir yol, kova sınırının dışına yazmayı deneyebilir│
     │ (`galeri/../certificates/x.pdf`). Baştaki eğik çizgi de kök   │
     │ anlamına gelir. İkisi de reddediliyor.                         │
     └───────────────────────────────────────────────────────────────┘ */
  if (!path || path.includes("..") || path.startsWith("/") || path.length > 300) {
    return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
  }

  const res = await storageSignedUpload({
    bucket, path,
    contentType: govde.contentType ? String(govde.contentType) : undefined,
  });

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  return NextResponse.json({
    url: res.url,
    provider: res.provider,
    /* Geçiş dönemindeyse istemci ikinci kopyayı da gönderiyor. */
    dualWrite: dualWrite() && res.provider === "r2",
    /* Gizli kovalar tarayıcıdan okunamaz; çağıran taraf bunu bilerek
       önizleme göstermesin. */
    private: isPrivateBucket(bucket),
  });
}
