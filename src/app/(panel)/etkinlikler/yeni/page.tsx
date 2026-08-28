import type { Metadata } from "next";
import { EventForm } from "@/components/admin/event-form";
import { getCities } from "@/lib/data";

export const metadata: Metadata = { title: "Yeni etkinlik" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const cities = await getCities();
  return <EventForm event={null} cities={cities} />;
}
