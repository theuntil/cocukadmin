import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QrManager } from "@/components/admin/qr-manager";
import { getQrCodes } from "@/lib/qr/data";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "QR kodları" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string }>;
}) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor")) redirect("/");

  const sp = await searchParams;
  const search = sp.ara?.trim() || null;
  const data = await getQrCodes(search);

  /* QR'ın göstereceği adresin kökü. Sunucudan geçirilir ki istemci
     `window.location`'a bakmak zorunda kalmasın — panel adresi ile
     sitenin adresi farklı. */
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";

  return <QrManager data={data} search={search} baseUrl={baseUrl} />;
}
