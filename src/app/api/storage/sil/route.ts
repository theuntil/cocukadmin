import { NextResponse, type NextRequest } from "next/server";
import { storageRemove } from "@/lib/storage";
import { getAdminUser, hasRole } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DOSYA SİLER
 *
 * ★ Silme SUNUCUDAN yapılıyor: tarayıcıya silme yetkisi vermek, ön
 *   imzalı bir silme adresi üretmek demekti — o adres sızarsa
 *   başkasının dosyası silinebilirdi. Dosya sayısı düşük olduğu için
 *   sunucudan geçmenin maliyeti yok.
 */
export async function POST(req: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  let govde: { bucket?: string; paths?: string[] };
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const bucket = String(govde.bucket ?? "");
  const paths = Array.isArray(govde.paths) ? govde.paths.map(String) : [];

  if (!bucket || paths.length === 0) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  if (paths.some((p) => !p || p.includes("..") || p.startsWith("/"))) {
    return NextResponse.json({ error: "Geçersiz dosya yolu" }, { status: 400 });
  }

  const res = await storageRemove(bucket, paths);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  return NextResponse.json({ ok: true });
}
