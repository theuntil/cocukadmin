import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getTeamMembers, type UyeDurum } from "@/lib/team-accounts/members";
import { getAdminUser, hasRole } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ÜYE LİSTESİNİ EXCEL OLARAK İNDİRİR
 *
 * ┌─ NEDEN GERÇEK XLSX, CSV DEĞİL ────────────────────────────────┐
 * │ CSV Excel'de açılıyor ama Türkçe karakterler bozuluyor,       │
 * │ telefon numaraları sayıya çevrilip baştaki sıfır uçuyor ve    │
 * │ tarihler bölgeye göre farklı yorumlanıyor.                     │
 * │                                                                 │
 * │ XLSX'te sütun tipleri korunuyor: telefon metin kalıyor,        │
 * │ sıfır kaybolmuyor.                                              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ★ Telefon ve e-posta İSTEĞE BAĞLI. Kişisel veri, gerekmedikçe
 *   dosyaya yazılmıyor — dışa aktarılan dosya elden ele dolaşıyor.
 */
export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const teamId = sp.get("takim") ?? "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
    return NextResponse.json({ error: "Takım seçilmedi" }, { status: 400 });
  }

  const durum = (sp.get("durum") ?? "hepsi") as UyeDurum;
  const from = sp.get("baslangic");
  const to = sp.get("bitis");
  const telefonVar = sp.get("telefon") === "1";
  const epostaVar = sp.get("eposta") === "1";

  const supabase = await createClient();
  const { data: takim } = await supabase
    .from("teams").select("name").eq("id", teamId).maybeSingle();

  const { rows, error } = await getTeamMembers({ teamId, durum, from, to });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const bugun = new Date().toISOString().slice(0, 10);

  const satirlar = rows.map((r) => {
    /* Sabit sütunlar her zaman var; telefon ve e-posta seçime bağlı.
       Sıra bilinçli: çocuk → kart → veli. */
    const s: Record<string, string | number> = {
      "Ad": r.child_ad,
      "Soyad": r.child_soyad,
      "Doğum tarihi": r.child_dogum,
      "Yaş": r.child_yas,
      "Şehir": r.child_sehir ?? "",
      "Kart no": r.card_number,
      "Kart durumu": r.card_status === "active"
        ? (!r.valid_until || r.valid_until >= bugun ? "Geçerli" : "Süresi dolmuş")
        : r.card_status,
      "Başlangıç": r.valid_from ?? "",
      "Bitiş": r.valid_until ?? "",
      "Veli": r.veli_ad ?? "",
    };
    if (telefonVar) s["Veli telefon"] = r.veli_telefon ?? "";
    if (epostaVar) s["Veli e-posta"] = r.veli_eposta ?? "";
    return s;
  });

  const ws = XLSX.utils.json_to_sheet(satirlar);

  /* Sütun genişlikleri: varsayılan dar, her açanın elle genişletmesi
     gerekiyordu. */
  ws["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 6 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ...(telefonVar ? [{ wch: 16 }] : []),
    ...(epostaVar ? [{ wch: 26 }] : []),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Üyeler");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const ad = (takim as { name?: string } | null)?.name ?? "takim";
  const temizAd = ad.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase();
  const dosya = `${temizAd}-uyeler-${bugun}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      /* `filename*` ile UTF-8: Türkçe karakterli takım adlarında
         dosya adı bozulmasın. */
      "Content-Disposition":
        `attachment; filename="uyeler.xlsx"; filename*=UTF-8''${encodeURIComponent(dosya)}`,
      "Cache-Control": "no-store",
    },
  });
}
