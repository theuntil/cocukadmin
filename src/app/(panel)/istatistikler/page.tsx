import { redirect } from "next/navigation";

/**
 * Takım istatistikleri artık AYRI SAYFA DEĞİL.
 *
 * Her takımın istatistiği kendi detay sayfasında; ayrı menü maddesi
 * aynı veriyi iki yerden aramak demekti. Eski bağlantılar bozulmasın
 * diye bu yol takım listesine yönlendiriliyor.
 */
export default function Page() {
  redirect("/takimlar");
}
