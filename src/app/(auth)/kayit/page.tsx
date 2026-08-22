import { Suspense } from "react";
import type { Metadata } from "next";
import { SignUpForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Kayıt", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="ct-skeleton h-[420px] rounded-[20px]" />}>
      <SignUpForm />
    </Suspense>
  );
}
