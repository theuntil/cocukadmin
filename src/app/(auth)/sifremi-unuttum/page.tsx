import { Suspense } from "react";
import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/site/password-reset";

export const metadata: Metadata = { title: "Şifremi Unuttum", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="ct-skeleton h-[420px] rounded-[20px]" />}>
      <PasswordResetForm />
    </Suspense>
  );
}
