import "server-only";

/**
 * SERTİFİKA E-POSTASI
 *
 * ┌─ ÖNİZLEME NEDEN GÖRSEL DEĞİL ⚠️ ──────────────────────────────┐
 * │ Sertifikanın küçük bir görselini gövdeye gömmek düşünülebilir. │
 * │ İki sorunu var:                                                 │
 * │                                                                  │
 * │ · PDF'i görsele çevirmek ayrı bir kütüphane (ve genelde bir    │
 * │   tarayıcı) gerektiriyor — Docker imajını şişirir               │
 * │ · Çoğu posta istemcisi gömülü görselleri VARSAYILAN OLARAK      │
 * │   engelliyor; kullanıcı boş bir kutu görürdü                    │
 * │                                                                  │
 * │ Onun yerine PDF EK olarak gidiyor: posta istemcileri PDF        │
 * │ eklerini kendileri önizliyor (Gmail, Outlook, Apple Mail        │
 * │ hepsi). Kullanıcı tıkladığı an belgeyi tam boyutta görüyor.    │
 * └──────────────────────────────────────────────────────────────────┘
 */
export function certificateEmailHtml(p: {
  firstName?: string | null;
  childName: string;
  number: string;
  siteUrl?: string;
}): string {
  const site = p.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://cocuktribunu.org";
  const ad = p.firstName ? ` ${kacir(p.firstName)}` : "";

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bilinçli Ebeveyn Sertifikanız</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

        <tr><td style="padding:36px 32px 8px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;
                      color:#0a5cd8;text-transform:uppercase;">
            Resmî teşekkür belgesi
          </div>
        </td></tr>

        <tr><td style="padding:8px 32px 0;">
          <h1 style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-.5px;color:#0a0a0a;">
            Teşekkürler${ad}
          </h1>
        </td></tr>

        <tr><td style="padding:18px 32px 0;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3d3d3d;">
            <strong style="color:#0a0a0a;">${kacir(p.childName)}</strong> için kombine kartınız
            oluştu ve <strong style="color:#0a0a0a;">Bilinçli Ebeveyn Sertifikanız</strong>
            hazırlandı.
          </p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3d3d3d;">
            Centilmenlik ve saygı odaklı bir spor kültürünü yaygınlaştırma yolunda
            ailemize katıldığınız için onur duyuyoruz.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.65;color:#3d3d3d;">
            Sertifikanız bu e-postanın ekinde. Panelinizden de görüntüleyebilir ve
            istediğiniz zaman indirebilirsiniz.
          </p>
        </td></tr>

        <tr><td style="padding:22px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"
            style="background:#f7f7f7;border-radius:14px;width:100%;">
            <tr><td style="padding:14px 18px;">
              <div style="font-size:11px;letter-spacing:1px;color:#909090;
                          text-transform:uppercase;margin-bottom:4px;">Belge numarası</div>
              <div style="font-size:15px;font-weight:600;color:#0a0a0a;
                          font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
                ${kacir(p.number)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:26px 32px 36px;">
          <a href="${site}/panel/kombine-kart"
            style="display:inline-block;background:#9fe870;color:#0a0a0a;
                   text-decoration:none;font-size:15px;font-weight:600;
                   padding:14px 26px;border-radius:999px;">
            Sertifikamı görüntüle
          </a>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid #ececec;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#909090;">
            Çocuk Tribünü · Çocukların tribünde güvende olduğu bir futbol kültürü için.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** HTML'e gömülen kullanıcı verisi kaçırılır — enjeksiyon olmasın */
function kacir(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
