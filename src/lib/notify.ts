import "server-only";
import { createHmac, createHash, randomBytes } from "node:crypto";

/**
 * Doğrulama servisi (ct-notify) istemcisi.
 *
 * Her istek paylaşılan sırla imzalanır: zaman damgası + tek kullanımlık nonce +
 * gövde özeti. Servis bunları doğrular, aynı nonce ikinci kez kabul edilmez.
 * Böylece servis internete açık olsa bile yalnızca bu uygulama kullanabilir.
 */

const BASE_URL = process.env.NOTIFY_SERVICE_URL ?? "";
const SECRET = process.env.NOTIFY_SERVICE_SECRET ?? "";
const TIMEOUT_MS = 12_000;

export const notifyConfigured = Boolean(BASE_URL && SECRET);

export type NotifyChannel = "sms" | "email";
export type NotifyPurpose =
  | "phone_verify" | "email_verify" | "password_reset" | "login" | "sensitive_action";

interface NotifyResponse {
  ok: boolean;
  code?: string;
  error?: string;
  requestId?: string;
  maskedTarget?: string;
  expiresAt?: string;
  resendAfterSec?: number;
  attemptsLeft?: number;
  verified?: boolean;
  purpose?: NotifyPurpose;
  messageId?: string;
}

function sign(method: string, path: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const payload = [
    timestamp, nonce, method.toUpperCase(), path,
    createHash("sha256").update(body).digest("hex"),
  ].join("\n");
  return {
    timestamp, nonce,
    signature: createHmac("sha256", SECRET).update(payload).digest("hex"),
  };
}

async function call(path: string, body: unknown): Promise<NotifyResponse> {
  if (!notifyConfigured) {
    return { ok: false, code: "not_configured", error: "Doğrulama servisi yapılandırılmamış." };
  }

  const bodyStr = JSON.stringify(body);
  const s = sign("POST", path, bodyStr);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-timestamp": s.timestamp,
        "x-nonce": s.nonce,
        "x-signature": s.signature,
      },
      body: bodyStr,
      signal: controller.signal,
      cache: "no-store",
    });

    return (await res.json()) as NotifyResponse;
  } catch (err) {
    const aborted = (err as Error).name === "AbortError";
    console.error("[notify]", aborted ? "zaman aşımı" : (err as Error).message);
    return {
      ok: false,
      code: aborted ? "timeout" : "network_error",
      error: "Doğrulama servisine ulaşılamadı. Lütfen tekrar deneyin.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Doğrulama kodu gönder */
export function sendOtp(params: {
  channel: NotifyChannel;
  purpose: NotifyPurpose;
  target: string;
  meta?: Record<string, unknown>;
  /** Kayıtlı olmayan hedefe gönderim yapılmaz; yanıt yine de aynı görünür */
  silent?: boolean;
}) {
  return call("/v1/otp/send", params);
}

/** Doğrulama kodunu kontrol et */
export function verifyOtp(params: { requestId: string; code: string; target: string }) {
  return call("/v1/otp/verify", params);
}

/** İşlemsel e-posta gönder */
export function sendTemplateEmail(params: {
  to: string;
  template:
    | "welcome" | "order_received" | "payment_approved" | "event_reminder" | "certificate"
    | "invoice_ready" | "order_cancelled"
    | "card_ready" | "card_expiring" | "card_expired" | "card_renewed";
  params?: Record<string, unknown>;
}) {
  return call("/v1/email/send", { to: params.to, template: params.template, params: params.params ?? {} });
}

/** Servis sağlığı — yönetim panelinde gösterilir */
export async function notifyHealth() {
  if (!notifyConfigured) return { ok: false, reason: "not_configured" as const };
  try {
    const res = await fetch(`${BASE_URL}/health/deep`, { cache: "no-store" });
    return (await res.json()) as { ok: boolean; database?: string; smtp?: string; twilio?: string };
  } catch {
    return { ok: false, reason: "unreachable" as const };
  }
}
