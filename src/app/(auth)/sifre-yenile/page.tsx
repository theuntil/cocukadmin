import { redirect } from "next/navigation";

/**
 * Supabase'in bağlantı tabanlı sıfırlama akışı kaldırıldı.
 * Şifre sıfırlama artık /sifremi-unuttum üzerinden kod ile yapılıyor.
 */
export default function Page() {
  redirect("/sifremi-unuttum");
}
