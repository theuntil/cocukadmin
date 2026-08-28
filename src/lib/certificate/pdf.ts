import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  BİLİNÇLİ EBEVEYN SERTİFİKASI — PDF ÜRETİMİ
 * ═══════════════════════════════════════════════════════════════════
 *
 *  ┌─ NEDEN TARAYICI KULLANILMIYOR ⚠️ ────────────────────────────┐
 *  │ Tasarım HTML olarak geldi ve en kolay yol onu bir tarayıcıya  │
 *  │ (Puppeteer) çizdirip PDF almak olurdu. Seçmedim:               │
 *  │                                                                 │
 *  │ · Chromium ~170 MB; Docker imajını üçe katlıyor                │
 *  │ · Her üretimde tarayıcı açılıyor, saniyeler sürüyor           │
 *  │ · Sunucuda font eksikse çıktı sessizce bozuluyor               │
 *  │                                                                 │
 *  │ `pdf-lib` ile doğrudan çiziyoruz: bağımlılık birkaç yüz KB,    │
 *  │ üretim milisaniyeler, fontlar pakete gömülü — çıktı her        │
 *  │ ortamda birebir aynı.                                           │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 *  ★ TÜRKÇE KARAKTER
 *    PDF'in gömülü standart fontları (Helvetica) WinAnsi kodlaması
 *    kullanıyor ve ş, ğ, İ, ı harflerini İÇERMİYOR. Bu yüzden gerçek
 *    TTF gömülüyor; yoksa "Bilinçli" kelimesi "Bilin?li" çıkardı.
 */

/* Yatay A4, punto cinsinden (72 punto = 1 inç) */
const EN = 841.89;
const BOY = 595.28;

const MAVI: RGB = rgb(0.039, 0.361, 0.847);   // #0a5cd8
const ALTIN: RGB = rgb(0.788, 0.635, 0.153);  // #c9a227
const ALTIN2: RGB = rgb(0.847, 0.714, 0.290); // #d8b64a
const KOYU: RGB = rgb(0.075, 0.102, 0.169);   // #131a2b
const GOVDE: RGB = rgb(0.227, 0.255, 0.314);  // #3a4150
const GRI: RGB = rgb(0.420, 0.447, 0.502);    // #6b7280
const CIZGI: RGB = rgb(0.812, 0.820, 0.847);  // #cfd2d8
const ZEMIN: RGB = rgb(0.984, 0.984, 0.988);  // #fbfbfc

export interface CertificateData {
  parentName: string;
  childName: string;
  teamName?: string | null;
  number: string;
  issuedAt: Date;
  /** Logo görseli (PNG) — yoksa çizilmez */
  logo?: Uint8Array | null;
  /** İmza görseli (PNG) — yoksa çizilmez */
  signature?: Uint8Array | null;
  signerTitle?: string;
}

/**
 * Sertifika fontunu okur.
 *
 * ┌─ NEDEN `public/` ALTINDA ⚠️ ──────────────────────────────────┐
 * │ Fontlar önce `node_modules/@expo-google-fonts/...` yolundan    │
 * │ okunuyordu. GELİŞTİRMEDE ÇALIŞIYOR, ÜRETİMDE ÇÖKÜYORDU.        │
 * │                                                                  │
 * │ Sebep: Next.js `standalone` çıktısı yalnızca İZLEYEBİLDİĞİ      │
 * │ bağımlılıkları kopyalıyor. Dosya çalışma anında `fs.readFile`   │
 * │ ile okunduğu için izleyici onu göremiyor — font paketi Docker   │
 * │ imajına hiç girmiyordu.                                          │
 * │                                                                  │
 * │ Sonuç sessiz bir çöküştü: `readFile` hata veriyor, üst          │
 * │ katmandaki `try/catch` yutuyor, sertifika hiç üretilmiyordu.    │
 * │                                                                  │
 * │ `public/` klasörü Dockerfile tarafından açıkça kopyalanıyor,    │
 * │ bu yüzden fontlar oraya taşındı.                                 │
 * └──────────────────────────────────────────────────────────────────┘
 */
async function fontOku(dosya: string): Promise<Uint8Array> {
  const p = path.join(process.cwd(), "public", "certificate-fonts", dosya);

  try {
    return new Uint8Array(await fs.readFile(p));
  } catch (err) {
    /* Hata YUTULMUYOR: font yoksa sertifika üretilemez ve bunun
       sebebi görünmeli. Sessiz kalırsa aynı tuzağa düşeriz. */
    throw new Error(
      `Sertifika fontu bulunamadı (${dosya}). Beklenen konum: public/certificate-fonts/. ` +
      `Ayrıntı: ${(err as Error).message}`,
    );
  }
}

/** Metni verilen genişliğe sığacak satırlara böler */
function satirla(metin: string, font: PDFFont, punto: number, enSinir: number): string[] {
  const kelimeler = metin.split(/\s+/);
  const satirlar: string[] = [];
  let aktif = "";

  for (const k of kelimeler) {
    const deneme = aktif ? `${aktif} ${k}` : k;
    if (font.widthOfTextAtSize(deneme, punto) <= enSinir) {
      aktif = deneme;
    } else {
      if (aktif) satirlar.push(aktif);
      aktif = k;
    }
  }
  if (aktif) satirlar.push(aktif);
  return satirlar;
}

function ortala(
  page: PDFPage, metin: string, font: PDFFont, punto: number, y: number, renk: RGB,
) {
  const g = font.widthOfTextAtSize(metin, punto);
  page.drawText(metin, { x: (EN - g) / 2, y, size: punto, font, color: renk });
}

export async function buildCertificatePdf(d: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const [interR, interSB, serifSB, serifI] = await Promise.all([
    fontOku("inter-400.ttf"),
    fontOku("inter-600.ttf"),
    fontOku("serif-600.ttf"),
    fontOku("serif-400i.ttf"),
  ]);

  const fInter = await pdf.embedFont(interR, { subset: false });
  const fInterSB = await pdf.embedFont(interSB, { subset: false });
  const fSerif = await pdf.embedFont(serifSB, { subset: true });
  const fSerifI = await pdf.embedFont(serifI, { subset: true });

  const page = pdf.addPage([EN, BOY]);

  page.drawRectangle({ x: 0, y: 0, width: EN, height: BOY, color: ZEMIN });

  /* ── Çerçeveler ──
     Tasarımda mavi kenarlık ve 8px dışında altın bir hat var.
     `outline-offset` PDF'te yok; iki dikdörtgen çiziliyor. */
  const M = 34;                       // dış boşluk
  const iEn = EN - M * 2;
  const iBoy = BOY - M * 2;

  page.drawRectangle({
    x: M - 8, y: M - 8, width: iEn + 16, height: iBoy + 16,
    borderColor: ALTIN, borderWidth: 2,
  });
  page.drawRectangle({
    x: M, y: M, width: iEn, height: iBoy,
    borderColor: MAVI, borderWidth: 1.6,
  });

  /* Köşe süsleri — L biçiminde altın çizgiler */
  const K = 26, KK = 2.4;
  const koseler: [number, number, number, number][] = [
    [M, M + iBoy - KK, K, KK], [M, M + iBoy - K, KK, K],                    // sol üst
    [M + iEn - K, M + iBoy - KK, K, KK], [M + iEn - KK, M + iBoy - K, KK, K], // sağ üst
    [M, M, K, KK], [M, M, KK, K],                                            // sol alt
    [M + iEn - K, M, K, KK], [M + iEn - KK, M, KK, K],                       // sağ alt
  ];
  for (const [x, y, w, h] of koseler) {
    page.drawRectangle({ x, y, width: w, height: h, color: ALTIN2 });
  }

  let y = BOY - 92;

  /* ── Üst etiket ── */
  const etiket = "RESMÎ TEŞEKKÜR BELGESİ";
  const harfArasi = 2.6;
  const etPunto = 8.5;
  const etGenislik =
    fInterSB.widthOfTextAtSize(etiket, etPunto) + harfArasi * (etiket.length - 1);
  let ex = (EN - etGenislik) / 2;
  for (const ch of etiket) {
    page.drawText(ch, { x: ex, y, size: etPunto, font: fInterSB, color: MAVI });
    ex += fInterSB.widthOfTextAtSize(ch, etPunto) + harfArasi;
  }

  /* ── Başlık ── */
  y -= 42;
  ortala(page, "Bilinçli Ebeveyn Sertifikası", fSerif, 33, y, KOYU);

  /* ── Ayraç ── */
  y -= 26;
  page.drawRectangle({ x: EN / 2 - 52, y: y + 3, width: 40, height: 0.8, color: CIZGI });
  page.drawRectangle({ x: EN / 2 - 3, y, width: 6, height: 6, color: MAVI, rotate: degrees(45) });
  page.drawRectangle({ x: EN / 2 + 12, y: y + 3, width: 40, height: 0.8, color: CIZGI });

  /* ── Takdim cümlesi ── */
  y -= 30;
  ortala(page, "Bu sertifika takdir ve teşekkürlerimizle takdim edilmektedir:", fSerifI, 13, y, GRI);

  /* ── Veli adı ── */
  y -= 34;
  const adMetni = `Sayın ${d.parentName}`;
  ortala(page, adMetni, fSerif, 23, y, KOYU);

  const adGen = fSerif.widthOfTextAtSize(adMetni, 23);
  page.drawRectangle({
    x: (EN - adGen) / 2 - 14, y: y - 9,
    width: adGen + 28, height: 0.8, color: rgb(0.847, 0.859, 0.882),
  });

  /* ── Gövde ──
     Çocuk adı kalın; satır bölme elle yapılıyor çünkü PDF'te otomatik
     kaydırma yok. */
  y -= 40;
  const govdeEn = 560;
  const p1a = "";
  const p1b = ` ile birlikte, centilmenlik ve saygı odaklı bir spor kültürünü yaygınlaştırma yolunda ailemize katıldığınız için onur duyuyoruz.`;

  /* İlk satır çocuk adıyla başlıyor: adı kalın yazıp devamını normal
     sürdürmek için ilk satır ayrı işleniyor. */
  const adPunto = 11.5;
  const adGenislik = fInterSB.widthOfTextAtSize(d.childName, adPunto);
  const kalanIlk = govdeEn - adGenislik;

  const devamKelimeler = (p1a + p1b).trim().split(/\s+/);
  let ilkSatir = "";
  let i = 0;
  while (i < devamKelimeler.length) {
    const deneme = ilkSatir ? `${ilkSatir} ${devamKelimeler[i]}` : devamKelimeler[i];
    if (fInter.widthOfTextAtSize(` ${deneme}`, adPunto) > kalanIlk) break;
    ilkSatir = deneme;
    i += 1;
  }

  const kalanMetin = devamKelimeler.slice(i).join(" ");
  const kalanSatirlar = satirla(kalanMetin, fInter, adPunto, govdeEn);

  const ilkToplam = adGenislik + fInter.widthOfTextAtSize(` ${ilkSatir}`, adPunto);
  let bx = (EN - ilkToplam) / 2;
  page.drawText(d.childName, { x: bx, y, size: adPunto, font: fInterSB, color: KOYU });
  bx += adGenislik;
  page.drawText(` ${ilkSatir}`, { x: bx, y, size: adPunto, font: fInter, color: GOVDE });

  y -= 17;
  for (const s of kalanSatirlar) {
    ortala(page, s, fInter, adPunto, y, GOVDE);
    y -= 17;
  }

  /* ── İkinci paragraf ── */
  y -= 8;
  const p2 =
    "Çocuğunuza güvenli, sağlıklı ve ilham verici bir ortamda spor sevgisi aşıladığınız; " +
    "tribünlerde el ele vererek geleceğin bilinçli ve dostane spor neslinin yetişmesine " +
    "sunduğunuz değerli katkılar için teşekkür ederiz.";

  for (const s of satirla(p2, fInter, adPunto, govdeEn)) {
    ortala(page, s, fInter, adPunto, y, GOVDE);
    y -= 17;
  }

  /* ── Alt bölüm: tarih (sol) ve imza (sağ) ── */
  const altY = M + 96;
  const sutunEn = 150;
  const solX = M + 62;
  const sagX = EN - M - 62 - sutunEn;

  page.drawRectangle({ x: solX, y: altY + 20, width: sutunEn, height: 0.8, color: CIZGI });
  page.drawText("Belge Tarihi", { x: solX, y: altY + 6, size: 9.5, font: fInterSB, color: KOYU });
  page.drawText(
    d.issuedAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    { x: solX, y: altY - 8, size: 8.5, font: fInter, color: GRI },
  );

  page.drawRectangle({ x: sagX, y: altY + 20, width: sutunEn, height: 0.8, color: CIZGI });
  const unvan = d.signerTitle || "Çocuk Tribünü";
  const unvanGen = fInterSB.widthOfTextAtSize(unvan, 9.5);
  page.drawText(unvan, {
    x: sagX + sutunEn - unvanGen, y: altY + 6, size: 9.5, font: fInterSB, color: KOYU,
  });

  /* İmza — sağ sütunun altında, çizginin üstüne oturur */
  if (d.signature) {
    try {
      const img = await pdf.embedPng(d.signature);
      const h = 34;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: sagX + sutunEn - w, y: altY + 26, width: w, height: h });
    } catch {
      /* Bozuk görsel belgeyi çökertmesin: imza olmadan üretilir. */
    }
  }

  /* ── Logo ── */
  if (d.logo) {
    try {
      const img = await pdf.embedPng(d.logo);
      const h = 44;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: (EN - w) / 2, y: M + 26, width: w, height: h, opacity: 0.95 });
    } catch {
      /* aynı gerekçe */
    }
  }

  /* ── Belge numarası ──
     Küçük ve köşede: belgeyi doğrulamak için gerekli ama tasarımın
     önüne geçmemeli. */
  page.drawText(d.number, {
    x: M + 12, y: M + 10, size: 7, font: fInter, color: rgb(0.65, 0.66, 0.69),
  });

  pdf.setTitle(`Bilinçli Ebeveyn Sertifikası — ${d.parentName}`);
  pdf.setAuthor("Çocuk Tribünü");
  pdf.setSubject(d.number);
  pdf.setCreationDate(d.issuedAt);

  return pdf.save();
}
