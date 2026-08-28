import type { Metadata } from "next";
import { MediaLibrary } from "@/components/admin/media-library";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Medya" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ klasor?: string }> }) {
  const sp = await searchParams;

  const supabase = await createClient();
  let query = supabase.from("media_library").select("*").order("created_at", { ascending: false }).limit(300);
  if (sp.klasor) query = query.eq("folder", sp.klasor);

  const [{ data }, { data: folders }] = await Promise.all([
    query,
    supabase.from("media_library").select("folder"),
  ]);

  const uniqueFolders = Array.from(
    new Set(((folders ?? []) as { folder: string }[]).map((f) => f.folder)),
  ).sort();

  return (
    <MediaLibrary
      items={(data ?? []) as never}
      folders={uniqueFolders}
      activeFolder={sp.klasor ?? ""}
    />
  );
}
