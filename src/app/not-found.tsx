import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page px-6 text-center">
      <span className="font-display text-[92px] leading-none font-semibold tracking-[-.04em] text-accent-ink">404</span>
      <div className="flex max-w-[420px] flex-col gap-2">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.02em]">Bu sayfa tribünde değil</h1>
        <p className="text-[15px] leading-[1.6] text-ink2">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass("solid", "lg")}>Anasayfaya dön</Link>
        <Link href="/iletisim" className={buttonClass("outline", "lg")}>Bize bildir</Link>
      </div>
    </div>
  );
}
