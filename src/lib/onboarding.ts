import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Kurulum sihirbazının durumu.
 *
 * Zorunlu adımlar tamamlanmadan panel kullanılamaz. İsteğe bağlı adımlar
 * (çocuk, adres) atlanabilir ve sonra tamamlanabilir.
 */
export type StepKey = "profile" | "email" | "phone" | "child";

export interface OnboardingState {
  profileComplete: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasChild: boolean;
  hasAddress: boolean;
  email: string;
  missing: string[];
  /** Zorunlu adımların tamamı bitti mi? */
  requiredDone: boolean;
  /** Kullanıcının şu an bulunması gereken adım */
  currentStep: StepKey;
  /** Tüm adımlar (isteğe bağlılar dahil) bitti mi? */
  allDone: boolean;
}

export async function getOnboardingState(): Promise<OnboardingState | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const [completion, emailStatus, phoneStatus, children] = await Promise.all([
      supabase.rpc("my_profile_completion"),
      supabase.rpc("my_email_status"),
      supabase.rpc("my_phone_status"),
      /*
       * head:true + count:exact bazı durumlarda sayı döndürmüyor ve çocuğu
       * olan kullanıcıya "çocuk ekle" uyarısı çıkıyordu. Satırı doğrudan
       * çekmek daha güvenilir; tek kayıt yeterli olduğu için maliyeti yok.
       */
      supabase.from("children").select("id").eq("status", "active").limit(1),
    ]);

    const c = (completion.data ?? {}) as { complete?: boolean; missing?: string[] };
    const e = (emailStatus.data ?? {}) as { verified?: boolean };
    const p = (phoneStatus.data ?? {}) as { verified?: boolean };

    const profileComplete = Boolean(c.complete);
    const emailVerified = Boolean(e.verified);
    const phoneVerified = Boolean(p.verified);
    const hasChild = (children.data ?? []).length > 0;

    // Kart sanaldır: teslimat adresi hiçbir aşamada gerekmez.
    // Adres kaydı artık kurulumun parçası değildir.
    const hasAddress = true;

    const requiredDone = profileComplete && emailVerified && phoneVerified;

    const currentStep: StepKey =
      !profileComplete ? "profile"
      : !emailVerified ? "email"
      : !phoneVerified ? "phone"
      : "child";

    return {
      profileComplete, emailVerified, phoneVerified, hasChild, hasAddress,
      email: auth.user.email ?? "",
      missing: c.missing ?? [],
      requiredDone,
      currentStep,
      allDone: requiredDone && hasChild,
    };
  } catch (err) {
    console.error("[onboarding]", (err as Error).message);
    return null;
  }
}
