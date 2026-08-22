import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Giriş", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="ct-skeleton h-[420px] rounded-[20px]" />}>
      <SignInForm />
    </Suspense>
  );
}
