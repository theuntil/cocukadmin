import { NextResponse } from "next/server";
import { storageDownload } from "@/lib/storage";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createClient as createTokenClient } from "@supabase/supabase-js";

/**
 * Çocuk fotoğrafı — oturum doğrulamalı.
 *
 * Fotoğraf DOĞRUDAN depolamadan sunulmaz. İmzalı bağlantı kullanılsaydı
 * adres kopyalanan herkes süresi dolana kadar açabilirdi; oysa çocuk
 * fotoğrafına yalnızca VELİSİ ve yetkili personel erişmelidir.
 *
 * Burada her istekte oturum doğrulanır: bağlantı paylaşılsa bile giriş
 * yapmamış ya da yetkisiz biri 403 alır. Yanıt önbelleğe alınmaz.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  const { childId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(childId)) {
    return new NextResponse("Geçersiz istek", { status: 400 });
  }

  /*
   * Oturum İKİ yoldan da kabul edilir:
   *   · Çerez  — web tarayıcısı
   *   · Authorization: Bearer <token> — mobil uygulama (React Native)
   *
   * Mobilde çerez yoktur; Supabase istemcisi oturumu cihazda saklar ve
   * başlıkla gönderir. Yalnızca çerez desteklenseydi uygulama fotoğrafları
   * hiç gösteremezdi.
   */
  const bearer = req.headers.get("authorization");

  const supabase = bearer?.startsWith("Bearer ")
    ? createTokenClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: bearer } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      )
    : await createClient();

  /* 1) Oturum ZORUNLU. Giriş yapmamış istek burada durur; veritabanına
        hiç gidilmez. */
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return new NextResponse("Giriş gerekli", {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }

  /* 2) Yetki denetimi veritabanında: veli mi, personel mi?
        Yetkisiz erişim ile "fotoğraf yok" ayırt edilmez; bilgi sızmasın. */
  const { data, error } = await supabase.rpc("child_photo_ref", {
    p_child_id: childId,
  });

  if (error) {
    return new NextResponse("Erişim yok", {
      status: 403,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const ref = data as { bucket_id: string; path: string } | null;

  if (!ref?.path) {
    return new NextResponse("Fotoğraf yok", {
      status: 404,
      headers: { "cache-control": "private, no-store" },
    });
  }

  // Dosyayı sunucu adına indir; istemci depolamaya hiç bağlanmaz
  try {
    const service = createServiceClient();

    const _in = await storageDownload(ref.bucket_id || "child-photos", ref.path);
    const file = _in.ok ? new Blob([_in.body as BlobPart], { type: _in.contentType }) : null;
    const dlErr = _in.ok ? null : new Error(_in.error);

    if (dlErr || !file) return new NextResponse("Bulunamadı", { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": file.type || "image/jpeg",
        "content-length": String(buffer.length),
        /* Hiçbir ara bellekte tutulmasın: CDN, vekil sunucu ve tarayıcı
           kopyası paylaşılan bir cihazda başkasına görünebilirdi. */
        "cache-control": "private, no-store, no-cache, must-revalidate, max-age=0",
        "pragma": "no-cache",
        "vary": "Cookie",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (err) {
    console.error("[child-photo]", (err as Error).message);
    return new NextResponse("Sunucu hatası", { status: 500 });
  }
}
