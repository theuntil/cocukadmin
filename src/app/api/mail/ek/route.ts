import { NextResponse, type NextRequest } from "next/server";
import { fetchAttachment } from "@/lib/mail/imap";

import { getAdminUser, hasRole } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MAİL EKİNİ İNDİRİR
 *
 * Ek içeriği veritabanında tutulmuyor (üstveri var, dosya yok), bu
 * yüzden istek anında IMAP'ten çekiliyor.
 *
 * ★ Yetki kontrolü şart: mail kutusunda kişisel veri olabilir.
 *   Bağlantıyı ele geçiren biri doğrudan bu uca istek atabilir.
 */
export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const mailId = sp.get("mail") ?? "";
  const index = Number(sp.get("i") ?? "0");

  if (!/^[0-9a-f-]{36}$/i.test(mailId) || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  /* ┌─ SERVİS ANAHTARIYLA OKUNUYOR ⚠️ ──────────────────────────┐
     │ `mail_messages` tablosunda RLS açık ama POLİTİKA YOK: erişim │
     │ yalnızca SECURITY DEFINER fonksiyonlardan tasarlanmış.        │
     │                                                                │
     │ Normal istemciyle sorgulasaydık satır asla dönmez, uç         │
     │ "İleti bulunamadı" derdi — ekler hiç inmezdi ve sebebi        │
     │ görünmezdi.                                                    │
     │                                                                │
     │ Yetki kontrolü zaten yukarıda yapıldı (yalnızca personel);    │
     │ burada servis anahtarı kullanmak güvenli.                      │
     └────────────────────────────────────────────────────────────────┘ */
  const svc = createServiceClient();
  const { data: mail, error } = await svc
    .from("mail_messages")
    .select("uid, folder")
    .eq("id", mailId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!mail) return NextResponse.json({ error: "İleti bulunamadı" }, { status: 404 });

  const m = mail as { uid: number | null; folder: string | null };
  if (m.uid == null) {
    return NextResponse.json(
      { error: "Bu ileti sunucuda bulunamıyor; ek indirilemez." },
      { status: 404 },
    );
  }

  /* IMAP parolası: `mail_settings_internal` yalnızca sunucu bağlamına
     açık, tarayıcıya asla gitmiyor. */
  const { data: ayar } = await svc.rpc("mail_settings_internal");

  const i = ayar as unknown as {
    imap_host: string | null; imap_port: number | null; imap_secure: boolean | null;
    imap_user: string | null; imap_pass: string | null; imap_folder: string | null;
  } | null;

  if (!i?.imap_host || !i.imap_user || !i.imap_pass) {
    return NextResponse.json(
      { error: "IMAP ayarları eksik. Mail ayarlarını tamamlayın." },
      { status: 400 },
    );
  }

  const res = await fetchAttachment(
    {
      host: i.imap_host,
      port: Number(i.imap_port ?? 993),
      secure: i.imap_secure ?? true,
      user: i.imap_user,
      pass: i.imap_pass,
      folder: m.folder || i.imap_folder || "INBOX",
    },
    m.uid,
    index,
  );

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  return new NextResponse(new Uint8Array(res.content), {
    headers: {
      "Content-Type": res.contentType,
      /* `filename*` ile UTF-8: Türkçe karakterli dosya adları
         bozulmasın. Tarayıcı desteklemezse sade `filename`e düşer. */
      "Content-Disposition":
        `attachment; filename="ek"; filename*=UTF-8''${encodeURIComponent(res.filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
