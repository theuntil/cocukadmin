import { NextResponse, type NextRequest } from "next/server";
import { storageDownload } from "@/lib/storage";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SERTİFİKA PDF'İNİ SUNAR
 *
 * ★ Kova KAPALI olduğu için dosyaya doğrudan erişilemiyor. Bu uç
 *   yetkiyi doğrulayıp içeriği kendisi aktarıyor — imzalı bağlantı
 *   üretip tarayıcıya vermek yerine, çünkü o bağlantı kopyalanıp
 *   paylaşılabilirdi.
 *
 * `?indir=1` eklenirse tarayıcı sekmede açmak yerine indirir.
 */
export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const indir = req.nextUrl.searchParams.get("indir") === "1";

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: cert, error } = await supabase
    .from("certificates").select("number, storage_path").eq("id", id).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cert) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const c = cert as { number: string; storage_path: string };

  const svc = createServiceClient();
  const _in = await storageDownload("certificates", c.storage_path);
    const data = _in.ok ? new Blob([_in.body as BlobPart], { type: _in.contentType }) : null;
    const dErr = _in.ok ? null : new Error(_in.error);

  if (dErr || !data) {
    return NextResponse.json(
      { error: dErr?.message ?? "Dosya bulunamadı" }, { status: 404 },
    );
  }

  const buf = new Uint8Array(await data.arrayBuffer());

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `${indir ? "attachment" : "inline"}; filename="${c.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
