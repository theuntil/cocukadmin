import type { Metadata } from "next";
import { ActivityEditor } from "@/components/admin/activity-editor";

export const metadata: Metadata = { title: "Yeni içerik" };

export default function Page() {
  return <ActivityEditor item={null} />;
}
