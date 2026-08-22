import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowRight } from "@/components/ui/icons";

/** Başvurudan gelindiğinde gösterilen "geri dön" şeridi */
export function BackToApplication() {
  return (
    <Link href="/panel/kombine-kart"
      className="ct-fade flex items-center justify-between gap-4 rounded-[16px] border border-accent-line bg-accent-soft px-5 py-3.5 transition-colors hover:bg-accent/25">
      <span className="text-[14px] font-semibold text-ink">
        Ekledikten sonra başvurunuza kaldığınız yerden devam edin
      </span>
      <span className="inline-flex shrink-0 items-center gap-2 text-[13.5px] font-bold text-ink">
        Başvuruya dön <Icon icon={IconArrowRight} size={15} />
      </span>
    </Link>
  );
}

export function PanelHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: { href: string; label: string } }) {
  return (
    <div className="ct-rise flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[32px]">{title}</h1>
        {subtitle && <span className="text-[14px] text-muted">{subtitle}</span>}
      </div>
      {action && <ButtonLink href={action.href} variant="solid" size="lg">{action.label}</ButtonLink>}
    </div>
  );
}

export function PanelBody({ children }: { children: React.ReactNode }) {
  return (
    <Container className="!max-w-[1080px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-7">{children}</div>
    </Container>
  );
}
