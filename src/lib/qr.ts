import "server-only";
import QRCode from "qrcode";

/**
 * Kart QR kodu üretimi.
 *
 * QR içinde kart numarası DEĞİL, tahmin edilemez qr_token taşınır.
 * Kart numarası sıralı/okunabilir olduğu için QR'a konsaydı sahte kart
 * üretmek kolaylaşırdı. Token 24 rastgele bayttan üretilir.
 */
export async function cardQrDataUrl(token: string | null): Promise<string | null> {
  if (!token) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";

  try {
    return await QRCode.toDataURL(`${siteUrl}/k/${token}`, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 480,
      color: { dark: "#0f1f1a", light: "#ffffff" },
    });
  } catch (err) {
    console.error("[qr]", (err as Error).message);
    return null;
  }
}
