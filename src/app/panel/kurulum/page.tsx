import { redirect } from "next/navigation";

/**
 * Kurulumun tek adresi `/kurulum`.
 *
 * Bir işlem için iki adres olması, hangisinin doğru olduğunu
 * belirsizleştiriyordu. Eski bağlantılar kırılmasın diye bu yol
 * yönlendiriyor.
 */
export default function Page() {
  redirect("/kurulum");
}
