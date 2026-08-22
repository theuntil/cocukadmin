import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createClient as createTokenClient } from "@supabase/supabase-js";

/**
 * Profil fotoğrafı — oturum doğrulamalı.
 *
 * avatars kovası kapatıldığı için dosyalar doğrudan sunulamaz. Bu uç
 * oturumu doğrular ve dosyayı sunucu adına indirip akıtır.
 *
 * Profil fotoğrafları çocuk fotoğrafları kadar kısıtlı değildir: üye
 * listelerinde görünürler, bu yüzden giriş yapmış her kullanıcı görebilir.
 * Giriş yapmamış ziyaretçi göremez.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return new NextResponse("Geçersiz istek", { status: 400 });
  }

  /* Web çerezle, mobil uygulama Authorization başlığıyla doğrulanır. */
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
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return new NextResponse("Giriş gerekli", {
      status: 401,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const { data, error } = await supabase.rpc("avatar_ref", { p_user_id: userId });

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

  try {
    const service = createServiceClient();

    const { data: file, error: dlErr } = await service.storage
      .from(ref.bucket_id || "avatars")
      .download(ref.path);

    if (dlErr || !file) return new NextResponse("Bulunamadı", { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": file.type || "image/jpeg",
        "content-length": String(buffer.length),
        // Oturuma özel: paylaşılan ara belleklerde tutulmasın
        "cache-control": "private, max-age=300",
        "vary": "Cookie",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (err) {
    console.error("[avatar]", (err as Error).message);
    return new NextResponse("Sunucu hatası", { status: 500 });
  }
}
