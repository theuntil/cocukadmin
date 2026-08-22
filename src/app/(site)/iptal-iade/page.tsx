import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";

const SLUG = "iptal-iade";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata(SLUG);
}

export default function Page() {
  return <LegalPage slug={SLUG} />;
}
