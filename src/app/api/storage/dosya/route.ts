import { NextResponse, type NextRequest } from "next/server";
import { storageDownload } from "@/lib/storage";
import { isPrivateBucket } from "@/lib/storage/config";
import { getAdminUser, hasRole } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GİZLİ DOSYAYI SUNAR (panel)
 *
 * ┌─ İMZALI ADRESİN YERİNE ⚠️ ────────────────────────────────────┐
 * │ Dekont, fatura ve benzeri gizli dosyalar Supabase'in           │
 * │ `createSignedUrl` yöntemiyle gösteriliyordu. O yöntem R2'de     │
 * │ YOK — çağrı sessizce boş dönüyor, önizleme açılmıyordu.        │
 * │                                                                   │
 * │ Bu uç yetkiyi doğrulayıp içeriği kendisi aktarıyor. İmzalı      │
 * │ adres üretmekten daha güvenli: o adres kopyalanıp               │
 * │ paylaşılabiliyordu, bu uç her istekte yetkiyi yeniden bakıyor.  │
 * └───────────────────────────────────────────────────────────────────┘
 */
export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get("kova") ?? "";
  const path = sp.get("yol") ?? "";
  const indir = sp.get("indir") === "1";

  if (!bucket || !path || path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const res = await storageDownload(bucket, path);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 });

  const ad = path.split("/").pop() ?? "dosya";

  return new NextResponse(new Uint8Array(res.body), {
    headers: {
      "Content-Type": res.contentType || "application/octet-stream",
      "Content-Disposition":
        `${indir ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(ad)}`,
      "Cache-Control": "private, no-store",
      /* Gizli kovalarda önizleme çerçeve içinde açılıyor; genel
         `DENY` kuralı burada `SAMEORIGIN`e düşüyor. */
      ...(isPrivateBucket(bucket)
        ? { "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" }
        : {}),
    },
  });
}
