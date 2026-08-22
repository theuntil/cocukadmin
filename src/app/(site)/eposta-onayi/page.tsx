import type { Metadata } from "next";
import { ButtonLink, Card, Container } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconAlert } from "@/components/ui/icons";
import { confirmEmailChange } from "@/lib/actions/profile";

export const metadata: Metadata = {
  title: "E-posta onayı",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ anahtar?: string }> }) {
  const { anahtar } = await searchParams;

  const result = anahtar
    ? await confirmEmailChange(anahtar)
    : { ok: false as const, message: "Onay anahtarı eksik." };

  return (
    <Container className="!max-w-[560px] px-5 py-16 sm:py-24">
      <Card className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full ${
          result.ok ? "bg-green-soft text-green" : "bg-danger-soft text-danger"}`}>
          <Icon icon={result.ok ? IconCheck : IconAlert} size={28} />
        </span>

        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em]">
          {result.ok ? "E-posta adresiniz güncellendi" : "Onaylanamadı"}
        </h1>

        <p className="text-[15px] leading-[1.65] text-ink2">
          {result.ok
            ? `Hesabınız artık ${result.email} adresiyle ilişkili. Bir sonraki girişinizde bu adresi kullanın.`
            : result.message}
        </p>

        <ButtonLink href={result.ok ? "/panel/ayarlar" : "/panel/ayarlar"} size="lg">
          {result.ok ? "Ayarlara dön" : "Tekrar dene"}
        </ButtonLink>
      </Card>
    </Container>
  );
}
