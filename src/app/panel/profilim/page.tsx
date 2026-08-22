import { redirect } from "next/navigation";

/** Sayfa birleştirildi; eski bağlantılar kırılmasın diye yönlendiriyoruz. */
export default function Page() {
  redirect("/kurulum");
}
