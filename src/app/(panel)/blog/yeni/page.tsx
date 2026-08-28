import type { Metadata } from "next";
import { NewsForm } from "@/components/admin/news-form";

export const metadata: Metadata = { title: "Yeni yazı" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <NewsForm news={null} />;
}
