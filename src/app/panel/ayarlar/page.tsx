import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { PanelBody, PanelHeader } from "@/components/panel/shell";
import { SettingsTabs } from "@/components/panel/settings-tabs";
import { ProfileForm, DangerZone } from "@/components/panel/settings-forms";
import { EmailCard, PhoneCard } from "@/components/panel/contact-change";
import { ChangePassword } from "@/components/panel/change-password";
import { Icon } from "@/components/ui/icon";
import { IconUser, IconSecurity, IconMail, IconShield } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Hesap Ayarları", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const [{ data: phoneStatus }, { data: emailStatus }, { data: pendingChange }] =
    await Promise.all([
      supabase.rpc("my_phone_status"),
      supabase.rpc("my_email_status"),
      supabase.rpc("my_pending_email_change"),
    ]);

  const phone = (phoneStatus ?? {}) as { verified?: boolean; verified_at?: string | null; last4?: string | null };
  const emailV = (emailStatus ?? {}) as { verified?: boolean; verified_at?: string | null };
  const pending = (pendingChange ?? null) as { new_email: string; expires_at: string } | null;

  const [{ data: profile }, cities] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user!.id).maybeSingle(),
    getCities(),
  ]);

  const p = (profile ?? {}) as unknown as {
    first_name: string | null; last_name: string | null; username: string | null;
    city_id: number | null; consent_marketing: boolean; created_at: string;
    avatar_path: string | null;
    purge_after: string | null; deletion_requested_at: string | null;
  };

  const email = auth.user?.email ?? "";

  return (
    <PanelBody>
      <PanelHeader
        title="Hesap ayarları"
        subtitle={p.created_at ? `Üyelik başlangıcı: ${formatDate(p.created_at)}` : undefined}
      />

      <SettingsTabs
        sections={[
          {
            id: "profil",
            label: "Profil",
            icon: IconUser,
            short: "Ad, şehir, fotoğraf",
            description: "Adınız, kullanıcı adınız, şehriniz ve profil fotoğrafınız. Bu bilgiler kombine kart başvurusunda kullanılır.",
            content: <ProfileForm profile={p} cities={cities} email={email} />,
          },
          {
            id: "iletisim",
            label: "İletişim",
            icon: IconMail,
            short: "E-posta, telefon",
            description: "E-posta adresinizi ve telefon numaranızı buradan değiştirebilirsiniz. Her iki değişiklik de doğrulama ile tamamlanır.",
            content: (
              <div className="flex flex-col gap-5">
                <EmailCard
                  currentEmail={email}
                  verified={Boolean(emailV.verified)}
                  pending={pending}
                />
                <PhoneCard
                  verified={Boolean(phone.verified)}
                  last4={phone.last4 ?? null}
                />
              </div>
            ),
          },
          {
            id: "guvenlik",
            label: "Güvenlik",
            icon: IconSecurity,
            short: "Şifre",
            description: "Şifrenizi değiştirin. Başka bir sitede kullandığınız şifreyi tekrar kullanmayın.",
            content: <ChangePassword />,
          },
          {
            id: "veriler",
            label: "Verilerim",
            icon: IconShield,
            short: "KVKK, hesap silme",
            description: "Verilerinizin nasıl işlendiği ve hesabınızı kapatma seçenekleri.",
            content: (
              <div className="flex flex-col gap-5">
                <Card className="flex flex-col gap-4 p-6 sm:p-7">
                  <span className="font-display text-[18px] font-semibold tracking-[-.02em]">
                    Verileriniz
                  </span>
                  <p className="text-[14px] leading-[1.65] text-ink2">
                    Çocuklara ait bilgileri asgari düzeyde işliyoruz. Kimlik numarası
                    zorunlu değildir; girilirse ham hâliyle saklanmaz.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/kvkk"
                      className="text-[14px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
                      KVKK metni
                    </Link>
                    <Link href="/cocuk-verileri-politikasi"
                      className="text-[14px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
                      Çocuk verileri politikası
                    </Link>
                  </div>
                </Card>

                <DangerZone purgeAfter={p.purge_after} requestedAt={p.deletion_requested_at} />
              </div>
            ),
          },
        ]}
      />
    </PanelBody>
  );
}
