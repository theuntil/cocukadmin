import type { Metadata } from "next";
import { CheckInScanner } from "@/components/panel/check-in";

export const metadata: Metadata = { title: "Etkinlik Girişi", robots: { index: false } };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Etkinlik girişi</h1>
        <span className="text-[14px] text-muted">Katılımcının 8 haneli giriş kodunu girin.</span>
      </div>
      <CheckInScanner />
    </div>
  );
}
