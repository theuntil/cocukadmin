import { Container, Eyebrow, H1, Lead } from "@/components/ui";

export function PageHeader({
  eyebrow, title, description, children,
}: {
  eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line2 bg-[radial-gradient(120%_90%_at_8%_0%,var(--surface)_0%,var(--page)_46%,var(--page)_100%)]">
      <Container className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="ct-rise flex max-w-[760px] flex-col gap-4">
          {eyebrow && <Eyebrow className="text-accent-ink">{eyebrow}</Eyebrow>}
          <H1 className="text-[34px] sm:text-[44px] lg:text-[54px]">{title}</H1>
          {description && <Lead className="max-w-[620px]">{description}</Lead>}
          {children}
        </div>
      </Container>
    </div>
  );
}
