import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { getCurrentUser, ensureProfile } from "@/lib/data";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) await ensureProfile();
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <SiteNav isLoggedIn={Boolean(user)} />
      <main id="icerik" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
