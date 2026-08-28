import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dualWrite } from "@/lib/storage";
import { getAdminUser, hasRole } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GEÇİŞ DÖNEMİ İKİNCİ KOPYA
 *
 * Tarayıcı dosyayı R2'ye yükledikten sonra buraya da gönderiyor;
 * burası Supabase'e yazıyor.
 *
 * ┌─ NEDEN GEREKLİ ⚠️ ────────────────────────────────────────────┐
 * │ Ön imzalı yükleme doğrudan R2'ye gidiyor ve sunucudan geçmiyor.│
 * │ Bu yüzden sunucu taraflı çift yazma tarayıcı yüklemelerini      │
 * │ kapsamıyordu.                                                     │
 * │                                                                    │
 * │ Okuma hâlâ Supabase'den yapılırken yüklenen dosya orada          │
 * │ olmadığı için 404 veriyordu — yükleme başarılı görünüp görsel    │
 * │ çıkmıyordu.                                                        │
 * │                                                                    │
 * │ ★ GEÇİCİDİR. `STORAGE_DUAL_WRITE=false` yapıldığında istemci    │
 * │   burayı hiç çağırmıyor ve bu uç işlevsiz kalıyor.               │
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function POST(req: NextRequest) {
  /* Çift yazma kapalıysa bu uç çalışmamalı: gereksiz yere Supabase'e
     dosya yazılmasın. */
  if (!dualWrite()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const bucket = String(form.get("bucket") ?? "");
  const path = String(form.get("path") ?? "");
  const file = form.get("file");

  if (!bucket || !path || !(file instanceof File)) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  try {
    const svc = createServiceClient();
    const { error } = await svc.storage
      .from(bucket)
      .upload(path, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type || undefined,
        upsert: true,
      });

    if (error) {
      console.warn("[ikinci-kopya]", error.message);
      return NextResponse.json({ ok: false, error: error.message });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[ikinci-kopya]", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
