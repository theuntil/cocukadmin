import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconTicket, IconShield } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Kart doğrulama", robots: { index: false } };

/**
 * QR kodu okutulduğunda açılan sayfa.
 *
 * Kart bilgisi BURADA GÖSTERİLMEZ. Kartın geçerliliğini yalnızca yetkili
 * görevliler yönetim panelindeki tarayıcıdan sorgulayabilir. Aksi hâlde
 * kartı eline geçiren herkes çocuğun adını ve üyelik bilgisini görebilirdi.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const masked = token.slice(0, 6);

  return (
    <Container className="!max-w-[520px] px-5 py-20">
      <Card className="flex flex-col items-center gap-6 p-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-accent text-accent-ink">
          <Icon icon={IconTicket} size={28} />
        </span>

        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[24px] font-semibold tracking-[-.02em]">
            Çocuk Tribünü kombine kartı
          </h1>
          <p className="text-[14.5px] leading-[1.6] text-ink2">
            Bu kartın geçerliliği yalnızca etkinlik görevlileri tarafından
            doğrulanabilir. Görevliye bu ekranı gösterin.
          </p>
        </div>

        <div className="w-full rounded-[14px] bg-chip px-4 py-3">
          <span className="font-mono text-[13px] tracking-[.1em] text-muted">
            {masked}••••••
          </span>
        </div>

        <div className="flex items-start gap-2.5 text-left">
          <Icon icon={IconShield} size={16} className="mt-[2px] shrink-0 text-muted" />
          <span className="text-[12.5px] leading-[1.55] text-muted">
            Çocuk güvenliği için kart sahibinin bilgileri bu sayfada gösterilmez.
          </span>
        </div>

        <Link href="/" className="text-[13.5px] font-semibold underline decoration-accent-line decoration-2 underline-offset-4">
          Çocuk Tribünü&apos;ne git
        </Link>
      </Card>
    </Container>
  );
}
