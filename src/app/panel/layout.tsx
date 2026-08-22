import { redirect } from "next/navigation";
import { PanelSidebar } from "@/components/panel/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, ensureProfile } from "@/lib/data";
import { getOnboardingState } from "@/lib/onboarding";
import { getBranding } from "@/lib/branding";
import { SetupBanner } from "@/components/panel/setup-banner";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?devam=/panel");

  // Profil satırı yoksa RLS tüm yazma işlemlerini reddeder ("yetkiniz yok" hatası).
  // Bu çağrı eksik profili sessizce oluşturur.
  await ensureProfile();

  /* KURULUM ARTIK ZORUNLU DEĞİL.
     Kullanıcı kayıt olur olmaz panele girer; eksik bilgi varsa kart
     başvurusu sırasında istenir. Zorunlu sihirbaz satın almanın önünde
     engel oluyor ve kullanıcıyı kilitliyordu. */
  // Google/Apple ile giriş yapan kullanıcı buraya düşer.
  /* ┌─ KURULUM ZORUNLU ⚠️ ──────────────────────────────────────┐
     │ Kurulum tamamlanmadan panelin hiçbir sayfası açılmaz.      │
     │ Kontrol burada çünkü kabuk her panel sayfasını sarıyor —   │
     │ tek yerde tutmak, sayfa eklendiğinde unutulmasını önlüyor. │
     │                                                             │
     │ Sunucu tarafında: istemci yönlendirmesi atlanabilir.        │
     └─────────────────────────────────────────────────────────────┘ */
  const supabaseKurulum = await createClient();
  const { data: kurulum } = await supabaseKurulum.rpc("my_setup_state");
  const k = kurulum as { signed_in?: boolean; complete?: boolean } | null;

  if (k?.signed_in && !k.complete) redirect("/kurulum");

  const onboarding = await getOnboardingState();


  const branding = await getBranding();

  let unread = 0;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  } catch { /* bildirim sayısı kritik değil */ }

  return (
    <div className="flex min-h-dvh flex-col bg-page lg:flex-row">
      <PanelSidebar unread={unread} logoLight={branding.logoLight}
        logoDark={branding.logoDark} logoSize={branding.sizePanel} />
      <main id="icerik" className="min-w-0 flex-1">
        {onboarding && onboarding.requiredDone && !onboarding.allDone && (
          <div className="px-5 pt-6 sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1080px]">
              <SetupBanner state={onboarding} />
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
