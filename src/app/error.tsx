"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page px-6 text-center">
      <span className="font-display text-[72px] leading-none font-semibold tracking-[-.04em] text-orange">Hay aksi</span>
      <div className="flex max-w-[460px] flex-col gap-2">
        <h1 className="font-display text-[24px] font-semibold tracking-[-.02em]">Beklenmedik bir hata oluştu</h1>
        <p className="text-[15px] leading-[1.6] text-ink2">
          Sorunu kaydettik. Sayfayı yenilemeyi deneyebilir veya birazdan tekrar gelebilirsiniz.
        </p>
        {error.digest && <code className="mt-1 text-[12px] text-muted2">Hata kodu: {error.digest}</code>}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={reset} className={buttonClass("solid", "lg")}>Tekrar dene</button>
        <Link href="/" className={buttonClass("outline", "lg")}>Anasayfa</Link>
      </div>
    </div>
  );
}
