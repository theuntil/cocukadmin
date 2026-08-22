import type { Metadata } from "next";
import { PanelBody, PanelHeader, BackToApplication } from "@/components/panel/shell";
import { ChildManager } from "@/components/panel/child-manager";
import { createClient } from "@/lib/supabase/server";
import { getTeams, getCities } from "@/lib/data";
import type { Child } from "@/lib/types";

export const metadata: Metadata = { title: "Çocuklarım", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ donus?: string }> }) {
  const sp = await searchParams;
  const back = sp.donus === "/panel/kombine-kart" ? "/panel/kombine-kart" : null;
  const supabase = await createClient();
  const [{ data }, teams, cities] = await Promise.all([
    supabase.from("children").select("*").eq("status", "active").order("birth_date"),
    getTeams(),
    getCities(),
  ]);
  const children = (data ?? []) as unknown as Child[];

  return (
    <PanelBody>
      {back && <BackToApplication />}
      <PanelHeader title="Çocuklarım" subtitle={`${children.length} kayıt · kart çocuğun adına düzenlenir`} />
      <ChildManager children={children} teams={teams} cities={cities} />
    </PanelBody>
  );
}
