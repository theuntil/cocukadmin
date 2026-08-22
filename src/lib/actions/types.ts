export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
};

export const IDLE: ActionState = { ok: false };

/** Supabase/Postgres hatalarını kullanıcıya gösterilebilir Türkçe mesaja çevirir. */
export function friendlyError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : (err as { message?: string })?.message ?? "Beklenmedik bir hata oluştu.";

  // RPC'lerimiz zaten Türkçe mesaj fırlatıyor; onları olduğu gibi geçir.
  if (/[çğıöşüÇĞİÖŞÜ]/.test(raw) || raw.includes("gerekli") || raw.includes("bulunamadı")) return raw;

  if (raw.includes("duplicate key") || raw.includes("unique")) return "Bu kayıt zaten mevcut.";
  // RLS reddi genellikle profil satırının eksik olmasından kaynaklanır.
  // Bu durum ensure_my_profile() ile otomatik onarılır; mesaj yine de anlaşılır olmalı.
  if (raw.includes("violates row-level security")) {
    return "Hesabınız bu işlem için henüz hazır değil. Sayfayı yenileyip tekrar deneyin; sorun sürerse çıkış yapıp yeniden giriş yapın.";
  }
  if (raw.includes("permission denied")) return "Bu işlem için yetkiniz yok.";
  if (raw.includes("Invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (raw.includes("Email not confirmed")) return "E-posta adresinizi doğrulamanız gerekiyor.";
  if (raw.includes("User already registered")) return "Bu e-posta ile zaten bir hesap var.";
  if (raw.includes("Password should be")) return "Şifre en az 8 karakter olmalı.";
  if (raw.includes("rate limit") || raw.includes("too many")) return "Çok fazla deneme yaptınız, lütfen biraz bekleyin.";
  if (raw.includes("check constraint")) return "Girdiğiniz bilgiler geçerli değil.";
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
