/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ÇOCUK TRİBÜNÜ — VARSAYILAN E-POSTA ŞABLONU
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  TASARIM
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  ███████ TAM GENİŞLİK GÖRSEL ███████                             │
 *  │            [ LOGO ]  ×  [ KARŞI LOGO ]                           │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │  Başlık                                                          │
 *  │  İçerik…                                                         │
 *  │  [ Düğme ]                                                       │
 *  │  ── imza ──                                                      │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │  Kurum bilgisi · site · abonelikten çık                          │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  Sade ve modern ama resmî: tek sütun, bol boşluk, ölçülü tipografi,
 *  vurgu rengi yalnızca düğmede.
 *
 *  KARŞI LOGO
 *  Gönderim ekranından yüklenir. Verilmişse bizim logomuzun yanına
 *  "×" ayracıyla eklenir (ortak etkinlik, iş birliği, protokol maili).
 *  Verilmemişse ayraç da karşı logo da HİÇ basılmaz — boş kutu kalmaz.
 *
 *  ─────────────────────────────────────────────────────────────────────
 *  SABİT SAYFA ARKA PLANI YOKTUR
 *
 *  Gövdeye bej bir zemin (#F4F1EA) veriliyordu. Mail istemcisinin kendi
 *  zemininin üstünde dikdörtgen bir leke olarak duruyor, karanlık temalı
 *  istemcilerde iyice sırıtıyordu. Zemin istemciye bırakıldı: kart kendi
 *  rengini taşıyor, çevresi neyse ona uyum sağlıyor.
 *
 *  ─────────────────────────────────────────────────────────────────────
 *  MAİL HTML'İ NEDEN BÖYLE YAZILIYOR
 *
 *   · Düzen `<table>` ile — Outlook flex/grid desteklemiyor
 *   · Stiller satır içi — Gmail `<style>` bloğunu atabiliyor
 *   · `<style>` yine de var: medya sorgusu SADECE orada yazılabiliyor
 *     (karanlık mod ve mobil için şart)
 *   · Genişlik 600px — bütün istemcilerde güvenli
 *   · Arka plan görseli VML yedeğiyle — Outlook `background-image`
 *     bilmiyor, `<v:rect>` biliyor
 *   · Görseller MUTLAKA mutlak adres (https://) olmalı; göreli yol mail
 *     istemcisinde çözülmez
 *  ─────────────────────────────────────────────────────────────────────
 */

export interface MailBrand {
  /** Kurum adı — alt bilgide ve alt metinlerde geçer */
  brandName: string;
  /** Bizim logomuz (mail ayarlarından). Banner üstünde görünür. */
  logoUrl: string;
  /** Tam genişlik üst görsel. Boşsa düz koyu zemin kullanılır. */
  bannerUrl: string;
  /** Görselin üstündeki karartma (0–90). Logo okunabilsin diye. */
  bannerOverlay: number;
  /** Banner yüksekliği (px) — 120–320 arası mantıklı */
  bannerHeight: number;
  siteUrl: string;
  /** Alt bilgide görünen kurum adresi / künye (isteğe bağlı) */
  footerNote: string;
  /** İmza bloğu (HTML) */
  signatureHtml: string;
}

export interface MailContent {
  subject: string;
  /** Gövde HTML'i — editörden gelen içerik */
  bodyHtml: string;
  /** Gövdenin üstünde büyük başlık (isteğe bağlı) */
  heading?: string | null;
  /** Karşı logo — yalnızca bu gönderime özel */
  partnerLogoUrl?: string | null;
  /** Gelen kutusunda konunun yanında görünen ön izleme metni */
  preheader?: string | null;
  /** Abonelikten çıkma bağlantısı (toplu gönderimde) */
  unsubscribeUrl?: string | null;
}

export const DEFAULT_BRAND: MailBrand = {
  brandName: "Çocuk Tribünü",
  logoUrl: "",
  bannerUrl: "",
  bannerOverlay: 45,
  bannerHeight: 190,
  siteUrl: "https://cocuktribunu.org",
  footerNote: "",
  signatureHtml: "",
};

/* ── Yazı tipi yığını: tek yerde, her blokta aynı ── */
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Koyu marka rengi — banner görseli yoksa zemin, ayrıca metin rengi */
const DEEP = "#0f2a22";
const INK = "#14201b";
const MUTED = "#6c7b73";
const LINE = "#e6e2d8";

/**
 * HTML kaçışı.
 *
 * Kullanıcıdan gelen HER metin (konu, başlık, marka adı, alt not) bu
 * fonksiyondan geçer. Aksi hâlde tırnak veya `<` içeren bir konu satırı
 * HTML'i bozar — hatta enjeksiyona açık hâle getirir.
 *
 * NOT: `bodyHtml` bilerek kaçırılmaz; o zaten HTML olarak yazılıyor.
 * Gövde ayrıca `sanitizeBody()` ile temizlenir.
 */
export function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gövde HTML'ini temizler.
 *
 * Mail istemcileri script çalıştırmaz ama gövde panelde ÖNİZLENİYOR;
 * temizlenmemiş içerik yönetim panelinde çalışabilir. Ayrıca bazı
 * istemciler `<script>` gördüğünde maili tamamen spam'e atıyor.
 */
export function sanitizeBody(html: string): string {
  return String(html ?? "")
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|link|meta)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

/** Yalnızca http(s) adreslerine izin verilir — `javascript:` engellenir */
function safeUrl(url: string | null | undefined): string {
  const v = String(url ?? "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) return "";
  return esc(v);
}

/* ═══════════════════════ LOGO KİLİDİ ═══════════════════════ */

/**
 * Banner üzerindeki logo bloğu.
 *
 * Tek logo → ortada tek görsel.
 * İki logo → `logo × karşı logo`, aralarında ince ayraç.
 *
 * Yükseklik SABİT, genişlik oranı korur (`width:auto`). Eskiden iki
 * ölçü birden verilince farklı en-boy oranındaki logolar eziliyordu.
 */
function logoLockup(brand: MailBrand, partnerLogo: string): string {
  const ours = safeUrl(brand.logoUrl);
  const theirs = safeUrl(partnerLogo);
  const alt = esc(brand.brandName);

  /* Hiç logo yoksa kurum adı yazıyla basılır: banner boş kalmasın. */
  if (!ours && !theirs) {
    return `
<div style="font-family:${FONT};font-size:26px;line-height:32px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;text-shadow:0 2px 12px rgba(0,0,0,.45);">
  ${alt}
</div>`.trim();
  }

  const oursImg = ours
    ? `<img src="${ours}" alt="${alt}" height="54"
           style="display:block;height:54px;width:auto;max-width:200px;border:0;outline:none;">`
    : "";

  /* Karşı logo YOKSA ayraç da basılmaz — "× " tek başına kalmaz. */
  if (!theirs) {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr><td style="vertical-align:middle;">${oursImg}</td></tr>
</table>`.trim();
  }

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td style="vertical-align:middle;padding-right:18px;">${oursImg}</td>
    <td style="vertical-align:middle;padding:0 14px;">
      <span style="font-family:${FONT};font-size:20px;line-height:20px;color:rgba(255,255,255,.7);font-weight:400;">&#215;</span>
    </td>
    <td style="vertical-align:middle;padding-left:18px;">
      <img src="${theirs}" alt="" height="54"
           style="display:block;height:54px;width:auto;max-width:200px;border:0;outline:none;">
    </td>
  </tr>
</table>`.trim();
}

/* ═══════════════════════ BANNER ═══════════════════════ */

/**
 * Tam genişlik üst görsel + üzerinde logo kilidi.
 *
 * ÇİFT KATMAN:
 *   1. `<td background="…">` + satır içi `background-image` → modern istemciler
 *   2. `<v:rect>` VML → Outlook 2007–2019 (Word motoru, CSS arka planı
 *      bilmiyor; VML olmadan görsel HİÇ çıkmaz)
 *
 * Görsel yoksa düz koyu marka zemini kullanılır — kırık görsel yerine
 * temiz bir başlık alanı.
 */
function bannerBlock(brand: MailBrand, partnerLogo: string): string {
  const bg = safeUrl(brand.bannerUrl);
  const h = Math.min(Math.max(Math.round(brand.bannerHeight || 190), 110), 340);
  const dim = Math.min(Math.max(brand.bannerOverlay ?? 45, 0), 90) / 100;
  const lockup = logoLockup(brand, partnerLogo);

  /* Görsel yok: düz zemin, VML gerekmez */
  if (!bg) {
    return `
<tr>
  <td class="ct-banner" align="center" bgcolor="${DEEP}"
      style="background:${DEEP};height:${h}px;padding:34px 24px;border-radius:22px 22px 0 0;">
    ${lockup}
  </td>
</tr>`.trim();
  }

  return `
<tr>
  <td align="center" background="${bg}" bgcolor="${DEEP}" height="${h}"
      style="background-color:${DEEP};background-image:url('${bg}');background-position:center center;background-size:cover;background-repeat:no-repeat;height:${h}px;border-radius:22px 22px 0 0;">

    <!--[if gte mso 9]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
            style="width:600px;height:${h}px;">
      <v:fill type="frame" src="${bg}" color="${DEEP}" />
      <v:textbox inset="0,0,0,0"><![endif]-->

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="height:${h}px;">
      <tr>
        <td align="center" valign="middle"
            style="height:${h}px;padding:30px 24px;background:rgba(6,16,12,${dim});">
          ${lockup}
        </td>
      </tr>
    </table>

    <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
  </td>
</tr>`.trim();
}

/* ═══════════════════════ ANA ÜRETİCİ ═══════════════════════ */

/**
 * Tam e-posta HTML'ini üretir.
 *
 * TEK ÜRETİCİ: tekil gönderim, toplu gönderim, kuyruk işçisi ve önizleme
 * hepsi burayı çağırır. Kaysad projesinde şablon dört ayrı yerde
 * üretiliyordu ve biri güncellenmeyi unutulunca kuyruktan giden mailler
 * eski tasarımla çıkıyordu. Aynı hataya düşmemek için tek giriş noktası.
 */
export function renderMail(brand: MailBrand, content: MailContent): string {
  const b: MailBrand = { ...DEFAULT_BRAND, ...brand };

  const subject = esc(content.subject);
  const preheader = esc(content.preheader || content.subject);
  const body = sanitizeBody(content.bodyHtml || "");
  const heading = content.heading?.trim() ? esc(content.heading.trim()) : "";
  const site = safeUrl(b.siteUrl) || "https://cocuktribunu.org";
  const unsub = safeUrl(content.unsubscribeUrl);
  const brandName = esc(b.brandName);

  const signature = b.signatureHtml?.trim()
    ? `
<tr>
  <td class="ct-pad" style="padding:0 40px 34px;">
    <div class="ct-line" style="border-top:1px solid ${LINE};padding-top:22px;">
      <div class="ct-muted" style="font-family:${FONT};font-size:13px;line-height:1.65;color:${MUTED};">
        ${sanitizeBody(b.signatureHtml)}
      </div>
    </div>
  </td>
</tr>`.trim()
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${subject}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style type="text/css">
  /* Medya sorgusu SADECE style bloğunda yazılabiliyor. Gmail bu bloğu
     atsa bile satır içi stiller ayakta kalır; yalnızca aydınlık tema
     görünür — bozulma olmaz. */
  @media (prefers-color-scheme: dark) {
    .ct-card   { background:#141816 !important; border-color:#242926 !important; }
    .ct-text   { color:#eef2ef !important; }
    .ct-muted  { color:#98a49d !important; }
    .ct-line   { border-color:#242926 !important; }
    .ct-foot   { color:#7d8781 !important; }
    .ct-quote  { background:#1b201d !important; border-color:#2b312d !important; }
    .ct-img    { -webkit-filter:none !important; filter:none !important; }
  }

  @media only screen and (max-width:620px) {
    .ct-wrap   { width:100% !important; }
    .ct-pad    { padding-left:24px !important; padding-right:24px !important; }
    .ct-h1     { font-size:23px !important; line-height:29px !important; }
  }

  /* Bazı istemcilerin otomatik bağlantıya çevirdiği telefon/tarih
     metinleri mavi ve altı çizili çıkıyor; marka rengine sabitlenir. */
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }

  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse !important; }
  img { -ms-interpolation-mode:bicubic; }
</style>
</head>

<body style="margin:0;padding:0;width:100%;-webkit-font-smoothing:antialiased;">

<!-- Ön izleme metni: gelen kutusunda konunun yanında görünür.
     Arkasındaki boşluk dizisi, istemcinin gövdeden metin çekip
     buraya eklemesini engelliyor. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
  ${preheader}
  &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
  <td align="center" style="padding:30px 12px 40px;">

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="ct-wrap"
           style="width:600px;max-width:600px;">

      <!-- ══ KART ══ -->
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="ct-card"
               style="background:#ffffff;border:1px solid ${LINE};border-radius:22px;overflow:hidden;">

          ${bannerBlock(b, content.partnerLogoUrl ?? "")}

          <!-- ══ GÖVDE ══ -->
          <tr>
            <td class="ct-pad" style="padding:36px 40px 8px;">
              ${heading ? `
              <h1 class="ct-h1 ct-text" style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.4px;color:${INK};">
                ${heading}
              </h1>` : ""}

              <div class="ct-text" style="font-family:${FONT};font-size:15.5px;line-height:1.7;color:${INK};">
                ${body}
              </div>
            </td>
          </tr>

          <tr><td style="height:26px;line-height:26px;font-size:0;">&nbsp;</td></tr>

          ${signature}

        </table>
      </td></tr>

      <!-- ══ ALT BİLGİ ══ -->
      <tr>
        <td align="center" style="padding:24px 26px 0;">
          <div class="ct-foot" style="font-family:${FONT};font-size:11.5px;line-height:1.7;color:#93a09a;">
            ${b.footerNote?.trim() ? `${esc(b.footerNote)}<br />` : ""}
            Bu e-posta <a href="${site}" target="_blank" rel="noopener" style="color:#93a09a;text-decoration:underline;">${brandName}</a> tarafından gönderildi.
            ${unsub ? `<br /><a href="${unsub}" target="_blank" rel="noopener" style="color:#93a09a;text-decoration:underline;">E-posta listesinden çık</a>` : ""}
          </div>
        </td>
      </tr>

    </table>

  </td>
</tr>
</table>
</body>
</html>`;
}

/* ═══════════════════════ DÜZ METİN → HTML ═══════════════════════ */

/**
 * Kullanıcının yazdığı DÜZ METNİ mail HTML'ine çevirir.
 *
 * Yazma ekranının varsayılan kipi düz metin: kimse mail yazarken
 * `<p>` etiketi düşünmek zorunda kalmasın. Bu fonksiyon aradaki
 * çeviriyi yapar.
 *
 * Kurallar:
 *   · Metin ÖNCE kaçırılır — `<` yazan biri HTML bozamaz
 *   · Boş satır  → yeni paragraf
 *   · Tek satır sonu → `<br>`  (alt satıra geçme korunur)
 *   · `>` ile başlayan satırlar → alıntı bloğu (yanıtlarda özgün ileti)
 *   · Çıplak https:// adresleri tıklanabilir bağlantıya çevrilir
 */
export function textToHtml(text: string): string {
  const raw = String(text ?? "").replace(/\r\n?/g, "\n").trim();
  if (!raw) return "";

  const linkify = (t: string) =>
    t.replace(/(https?:\/\/[^\s<>"']+)/g, (url) => {
      // Cümle sonundaki noktalama bağlantıya dahil edilmemeli
      const kesik = url.replace(/[.,;:!?)\]]+$/, "");
      const kalan = url.slice(kesik.length);
      return `<a href="${kesik}" target="_blank" rel="noopener noreferrer" style="color:#0e7a57;">${kesik}</a>${kalan}`;
    });

  const parcalar: string[] = [];

  for (const blok of raw.split(/\n{2,}/)) {
    /* Bir blok içinde alıntı ve normal satır KARIŞIK olabilir:
         16 Ağustos tarihinde Ali yazdı:
         > özgün satır
       Bu yüzden blok tek parça sayılmaz; ardışık alıntı satırları
       kendi bloğuna toplanır. Eskiden "bloğun TÜM satırları > ile
       başlamalı" aranıyordu ve yukarıdaki en sık durum kaçıyordu. */
    let tampon: string[] = [];
    let alintiMi = false;

    const bosalt = () => {
      if (tampon.length === 0) return;
      if (alintiMi) {
        const govde = tampon
          .map((l) => linkify(esc(l.replace(/^\s*>\s?/, ""))))
          .join("<br>");
        parcalar.push(
          `<blockquote style="margin:14px 0;padding:2px 0 2px 14px;border-left:3px solid #d8d2c4;color:#6c7b73;">${govde}</blockquote>`,
        );
      } else {
        const govde = tampon.map((l) => linkify(esc(l))).join("<br>");
        parcalar.push(`<p style="margin:0 0 14px;">${govde}</p>`);
      }
      tampon = [];
    };

    for (const satir of blok.split("\n")) {
      const bu = satir.trimStart().startsWith(">");
      if (tampon.length > 0 && bu !== alintiMi) bosalt();
      alintiMi = bu;
      tampon.push(satir);
    }
    bosalt();
  }

  return parcalar.join("\n");
}

/* ═══════════════════════ DÜZ METİN ═══════════════════════ */

/**
 * HTML'den okunabilir DÜZ METİN üretir.
 *
 * ┌─ NEDEN BU KADAR TEMİZLİK ⚠️ ──────────────────────────────────┐
 * │ Bir maili ilettiğinde alıntının içine şunlar doluyordu:        │
 * │                                                                │
 * │   &#847;&zwnj; &#847;&zwnj; &#847;&zwnj; …                     │
 * │   (ardından onlarca boş satır)                                 │
 * │                                                                │
 * │ Sebep: mailin kendi HTML'i alıntılanıyordu. İçinde             │
 * │   · gelen kutusu ön izleme dolgusu (görünmez karakterler)      │
 * │   · tablo düzeninden gelen düzinelerce boş hücre               │
 * │   · <head>, <style>, VML blokları                              │
 * │   · alt bilgi ("Bu e-posta … tarafından gönderildi")           │
 * │ vardı ve hepsi metne dönüşüyordu.                              │
 * │                                                                │
 * │ Artık: gizli bloklar ve görünmez karakterler atılıyor, ardışık │
 * │ boş satırlar teke iniyor. Ayrıca alıntılarken mümkünse mailin  │
 * │ HTML'i değil KULLANICININ YAZDIĞI kaynak metin kullanılıyor    │
 * │ (bkz. quotableText).                                           │
 * └────────────────────────────────────────────────────────────────┘
 */
export function htmlToText(html: string): string {
  return String(html ?? "")
    // Görünmeyen bölümler
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Gelen kutusu ön izleme bloğu: display:none ya da mso-hide
    .replace(/<div[^>]*(?:display\s*:\s*none|mso-hide)[^>]*>[\s\S]*?<\/div>/gi, "")
    // Ön izleme dolgusu olarak kullanılan görünmez varlıklar
    .replace(/&#847;|&#8203;|&zwnj;|&zwj;|&#65279;/gi, "")

    // Yapı → satır sonu
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|tr|li|blockquote|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\u00b7 ")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")

    // Varlıklar
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#215;/gi, "x")

    // Görünmez karakterler (sıfır genişlikli boşluklar, birleştiriciler)
    .replace(/[\u200B-\u200D\u2060\uFEFF\u034F\u00AD]/g, "")

    // Boşluk düzeni
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Bir iletiden ALINTILANABİLİR temiz metni çıkarır.
 *
 * Öncelik sırası önemli:
 *   1. `body_source` — kullanıcının yazdığı içerik. Bizim gönderdiğimiz
 *      maillerde bu var ve şablon süslerini (üst görsel, alt bilgi,
 *      ön izleme dolgusu) İÇERMEZ. En temiz kaynak budur.
 *   2. `body_text`  — gelen maillerde sunucunun verdiği düz metin.
 *   3. `body_html`  — son çare; yukarıdaki temizlikten geçirilir.
 *
 * Sonda kalan boş alıntı satırları da kırpılır: eskiden alıntının
 * altında bir sürü "> " kalıyordu.
 */
export function quotableText(m: {
  body_source?: string | null;
  body_text?: string | null;
  body_html?: string | null;
}): string {
  const kaynak =
    (m.body_source && m.body_source.trim() && htmlToText(m.body_source)) ||
    (m.body_text && m.body_text.trim()) ||
    (m.body_html && htmlToText(m.body_html)) ||
    "";

  return String(kaynak)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Gönderilecek HTML'i üretir.
 *
 * TEK ŞABLON. Seçenek yok, özel HTML yok — panelde şablon listesi
 * gezmek yerine mail yazılır. Görünüm ayarları (üst görsel, logo,
 * imza, künye) Mail → Ayarlar'dan gelir.
 */
export function buildMailHtml(brand: MailBrand, content: MailContent): string {
  return renderMail(brand, content);
}
