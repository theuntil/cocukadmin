import { NextResponse } from "next/server";
import { syncInbox } from "@/lib/mail/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GELEN POSTA EŞİTLEME UCU
 *
 * Zamanlanmış görev bunu çağırır; mail sunucusundaki yeni iletileri çeker.
 *
 *   curl -X POST https://admin.../api/mail/sync \
 *        -H "authorization: Bearer $MAIL_CRON_SECRET"
 *
 * ★ Sır tanımlı DEĞİLSE uç kapalıdır. "Sır yoksa herkese açık" davranışı
 *   sessiz bir güvenlik açığı olurdu.
 *
 * ★ Zamanlama kurulmasa da sistem çalışır: panelde "Gelen postaları al"
 *   düğmesi aynı işi yapar. Cron yalnızca kendiliğinden güncel kalması
 *   için (5–10 dakikada bir yeterli).
 */
function authorized(req: Request): boolean {
  const secret = process.env.MAIL_CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const key = new URL(req.url).searchParams.get("key") ?? "";

  return bearer === secret || key === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Yetkisiz. MAIL_CRON_SECRET tanımlı ve doğru olmalı." },
      { status: 401 },
    );
  }

  const raw = Number(new URL(req.url).searchParams.get("limit") ?? 40);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 200) : 40;

  const res = await syncInbox(limit);

  return NextResponse.json(res, { headers: { "cache-control": "no-store" } });
}

/** GET aynı işi yapar — bazı zamanlayıcılar yalnızca GET destekliyor */
export async function GET(req: Request) {
  return POST(req);
}
