import type { Metadata } from "next";
import { getBrandingSettings } from "@/lib/data";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Giriş", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function Page() {
  /* ┌─ LOGO SABİT YOLDAYDI ⚠️ ──────────────────────────────────┐
     │ `/cocuktribunu.png` yazılıydı; panelin public klasöründe    │
     │ o dosya yok ve Ayarlar'dan yüklenen logo hiç kullanılmıyordu.│
     │ Sonuç: giriş ekranında kırık görsel.                        │
     │                                                               │
     │ Artık marka ayarından geliyor — site, panel ve e-postalar    │
     │ aynı logoyu kullanıyor.                                       │
     └───────────────────────────────────────────────────────────────┘ */
  const marka = await getBrandingSettings();
  const acik = marka.logoLight || marka.logoDark;
  const koyu = marka.logoDark || marka.logoLight;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={acik} alt="Çocuk Tribünü" style={{ height: marka.logoSizePanel }}
            className="w-auto object-contain [html[data-theme=dark]_&]:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={koyu} alt="" aria-hidden style={{ height: marka.logoSizePanel }}
            className="hidden w-auto object-contain [html[data-theme=dark]_&]:block" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[26px] font-semibold tracking-[-.03em]">Yönetim paneli</h1>
            <p className="text-[14px] text-muted">Yalnızca yetkili personel girebilir.</p>
          </div>
        </div>

        <Suspense fallback={<div className="ct-skeleton h-[260px] rounded-[20px]" />}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
