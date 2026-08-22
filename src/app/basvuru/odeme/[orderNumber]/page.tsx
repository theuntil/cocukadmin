import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  redirect(`/panel/siparislerim/${orderNumber}`);
}
