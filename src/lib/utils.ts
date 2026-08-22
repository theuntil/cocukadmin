export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number | string | null | undefined, currency = "TRY") {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (currency === "TRY") return TRY.format(n);
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n);
}

export function formatNumber(n: number | string | null | undefined) {
  return new Intl.NumberFormat("tr-TR").format(Number(n ?? 0));
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function formatDateLong(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", weekday: "long",
  }).format(d);
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536e6], ["month", 2592e6], ["day", 864e5],
    ["hour", 36e5], ["minute", 6e4], ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") return rtf.format(Math.round(diff / ms), unit);
  }
  return "—";
}

export function calcAge(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function initials(first?: string | null, last?: string | null) {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "?";
}

/** Türkçe karakter güvenli slug — DB'deki public.slugify() ile aynı davranış */
export function slugify(text: string) {
  const map: Record<string, string> = {
    ı: "i", İ: "i", ğ: "g", Ğ: "g", ü: "u", Ü: "u",
    ş: "s", Ş: "s", ö: "o", Ö: "o", ç: "c", Ç: "c",
  };
  return text
    .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return `+${digits}`;
  return `+${digits}`;
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  return phone.replace(/(\+90)(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 *** ** $5");
}

/** Storage yolundan public URL üretir */
export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;

  // Dış kaynaklı görseller (örn. haber sitelerinin kendi logoları) tam URL
  // olarak saklanır; bunları depolama yoluna çevirmeye çalışmayız.
  if (/^https?:\/\//i.test(path)) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Sipariş durumları — kullanıcıya YALNIZCA iki aşama gösterilir.
 *
 * Kart sanal olduğu için ara aşama yok: ödeme alınana kadar "Ödeme bekleniyor",
 * alındıktan sonra "Tamamlandı". Veritabanındaki diğer durumlar (paid,
 * processing, shipped...) kullanıcı arayüzünde bu ikisine indirgenir.
 */
export const ORDER_STATUS_TR: Record<string, string> = {
  pending: "Ödeme bekleniyor",
  payment_pending: "Ödeme bekleniyor",
  paid: "Tamamlandı",
  processing: "Tamamlandı",
  shipped: "Tamamlandı",
  delivered: "Tamamlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
  refunded: "İade edildi",
};

/** Kullanıcı arayüzünde sipariş yalnızca "ödeme" ya da "tamamlandı" olabilir */
export function orderStage(status: string): "payment" | "done" | "cancelled" {
  if (status === "cancelled" || status === "refunded") return "cancelled";
  if (status === "pending" || status === "payment_pending") return "payment";
  return "done";
}

export const PAYMENT_STATUS_TR: Record<string, string> = {
  pending: "Ödeme bekleniyor", awaiting_review: "İnceleniyor", paid: "Onaylandı",
  rejected: "Reddedildi", failed: "Başarısız", cancelled: "İptal edildi", refunded: "İade edildi",
};

export const CARD_STATUS_TR: Record<string, string> = {
  pending: "Bekliyor",
  active: "Aktif",
  suspended: "Askıda",
  expired: "Süresi doldu",
  cancelled: "İptal edildi",
  // Eski kayıtlar: kart sanal olduğundan bu aşamalar artık kullanılmaz
  processing: "Aktif",
  ready: "Aktif",
  shipped: "Aktif",
  delivered: "Aktif",
  lost: "İptal edildi",
};

export const SUBSCRIPTION_STATUS_TR: Record<string, string> = {
  pending: "Bekliyor", scheduled: "Planlandı", active: "Aktif",
  expired: "Süresi doldu", cancelled: "İptal", refunded: "İade",
};

export const REGISTRATION_STATUS_TR: Record<string, string> = {
  pending: "Bekliyor", confirmed: "Onaylandı", waitlisted: "Bekleme listesi",
  cancelled: "İptal", attended: "Katıldı", no_show: "Gelmedi",
};

export const EVENT_TYPE_TR: Record<string, string> = {
  match: "Maç", tournament: "Turnuva", workshop: "Atölye", meeting: "Buluşma",
  campaign: "Kampanya", children_event: "Çocuk etkinliği", social_event: "Sosyal etkinlik", other: "Diğer",
};

export const DONATION_STATUS_TR: Record<string, string> = {
  pending: "Ödeme bekleniyor", awaiting_review: "İnceleniyor", paid: "Onaylandı",
  rejected: "Reddedildi", failed: "Başarısız", cancelled: "İptal", refunded: "İade edildi",
};

export type ToneName = "green" | "orange" | "muted" | "danger" | "lime";

export function statusTone(status: string): ToneName {
  if (["paid", "completed", "active", "delivered", "confirmed", "attended"].includes(status)) return "green";
  if (["pending", "payment_pending", "awaiting_review", "processing", "ready", "shipped", "scheduled", "waitlisted"].includes(status)) return "orange";
  if (["rejected", "cancelled", "failed", "refunded", "expired", "lost", "no_show", "suspended"].includes(status)) return "danger";
  return "muted";
}
