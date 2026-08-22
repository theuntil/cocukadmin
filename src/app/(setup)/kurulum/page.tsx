import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/panel/setup-form";
import { createClient } from "@/lib/supabase/server";
import { getCities, getTeams, ensureProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Kurulum", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * KURULUM — ZORUNLU VE TEK ADIM
 *
 * ┌─ ÇOK ADIMLI SİHİRBAZ KALDIRILDI ⚠️ ───────────────────────────┐
 * │ Kurulum dört sayfaydı: profil → e-posta → telefon → çocuk.     │
 * │ Her adım ayrı bir gönderim, ayrı bir yarım kalma noktası.      │
 * │ Kullanıcı ikinci adımda kayboluyor, ne panele girebiliyor ne   │
 * │ de kart alabiliyordu.                                           │
 * │                                                                  │
 * │ Bilgilerin hepsi kısa: veli adı, çocuk adı, doğum tarihi,      │
 * │ takım, şehir. Tek ekranda sorulup TEK İŞLEMDE yazılıyor —      │
 * │ ya hepsi kaydedilir ya hiçbiri.                                 │
 * └──────────────────────────────────────────────────────────────────┘
 */
export default async function Page() {
  /* Profil satırı yoksa oluştur — yoksa RLS her şeyi reddeder. */
  await ensureProfile();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/giris?devam=/kurulum");

  const { data: durum } = await supabase.rpc("my_setup_state");
  if ((durum as { complete?: boolean } | null)?.complete) redirect("/panel");

  const [cities, teams, profileRes] = await Promise.all([
    getCities(),
    getTeams(),
    supabase.from("profiles").select("first_name,last_name").eq("id", auth.user.id).maybeSingle(),
  ]);

  const p = profileRes.data as { first_name: string | null; last_name: string | null } | null;

  return (
    <div className="ct-rise flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[.14em] text-muted2">
          SON BİR ADIM
        </span>
        <h1 className="ct-h2">Hoş geldiniz.</h1>
        <p className="ct-lead">
          Çocuğunuzun kombine kartını oluşturabilmemiz için birkaç bilgiye
          ihtiyacımız var. Tek seferde alıyoruz — bir dakikadan kısa sürer.
        </p>
      </div>

      <SetupForm
        teams={teams}
        cities={cities}
        email={auth.user.email ?? ""}
        defaults={{ firstName: p?.first_name, lastName: p?.last_name }}
      />
    </div>
  );
}
