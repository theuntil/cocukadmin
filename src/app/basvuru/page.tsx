import { redirect } from "next/navigation";

/** Başvuru akışı panele taşındı; eski bağlantılar kırılmasın diye yönlendiriyoruz. */
export default function Page() {
  redirect("/panel/kombine-kart");
}
