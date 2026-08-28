import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCard, IconArrowRight } from "@/components/ui/icons";
import { CardAdmin, RevokeCardButton } from "@/components/admin/card-admin";
import { createClient } from "@/lib/supabase/server";
import { formatDate, CARD_STATUS_TR, statusTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Kombine kartlar" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "expiring", label: "Süresi yaklaşan" },
  { key: "expired", label: "Süresi dolmuş" },
  { key: "pending", label: "Beklemede" },
  { key: "cancelled", label: "İptal" },
];

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ durum?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("cards")
    .select("*, children(first_name,last_name), teams(name), orders(id,order_number)")
    .order("created_at", { ascending: false })
    .limit(300);

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  if (sp.durum === "expiring") {
    query = query.eq("status", "active").gte("valid_until", today).lte("valid_until", in7);
  } else if (sp.durum === "expired") {
    query = query.lt("valid_until", today).neq("status", "cancelled");
  } else if (sp.durum) {
    query = query.eq("status", sp.durum);
  }

  const [{ data, error }, { data: children }, { data: teams }] = await Promise.all([
    query,
    supabase.from("children").select("id,first_name,last_name").order("first_name").limit(500),
    supabase.from("teams").select("id,name").eq("is_active", true).order("name"),
  ]);

  /* Hata yutulmuyor: boş liste ile erişim hatası ayrı şeyler. */
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Kartlar</h1>
        <Alert tone="danger" title="Kart listesi alınamadı">{error.message}</Alert>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as {
    id: string; card_number: string; status: string; valid_until: string | null;
    created_at: string;
    children: { first_name: string; last_name: string } | null;
    teams: { name: string } | null;
    orders: { id: string; order_number: string } | null;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Kombine kartlar</h1>
          <span className="text-[14px] text-muted">{rows.length} kart</span>
        </div>
        <CardAdmin
          children={(children ?? []) as { id: string; first_name: string; last_name: string }[]}
          teams={(teams ?? []) as { id: string; name: string }[]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (sp.durum ?? "") === f.key;
          return (
            <Link key={f.key} href={f.key ? `/kartlar?durum=${f.key}` : "/kartlar"}
              className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                active ? "bg-solid text-on-solid" : "border border-line bg-surface text-ink2 hover:border-ink/25"
              }`}>
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Icon icon={IconCard} size={26} />} title="Kart bulunamadı" />
      ) : (
        <Card className="overflow-hidden">
          <div className="ct-scrollbar overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line2 text-[11.5px] font-bold tracking-[.06em] text-muted2">
                  <th className="px-5 py-3">KART NO</th>
                  <th className="px-3 py-3">ÇOCUK</th>
                  <th className="px-3 py-3">TAKIM</th>
                  <th className="px-3 py-3">DURUM</th>
                  <th className="px-3 py-3">GEÇERLİLİK</th>
                  <th className="px-5 py-3 text-right">İŞLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line2 text-[13.5px]">
                {rows.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-chip">
                    <td className="px-5 py-3">
                      <Link href={`/kartlar/${c.id}`}
                        className="font-mono text-[12.5px] font-semibold hover:underline">
                        {c.card_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {[c.children?.first_name, c.children?.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-3 py-3 text-muted">{c.teams?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(c.status)}>{CARD_STATUS_TR[c.status] ?? c.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      {c.valid_until ? (() => {
                        const left = Math.ceil(
                          (new Date(c.valid_until).getTime() - Date.now()) / 864e5);
                        const tone = left < 0 ? "text-danger"
                          : left <= 7 ? "text-orange" : "text-muted";
                        return (
                          <span className="flex flex-col">
                            <span className="text-[12.5px]">{formatDate(c.valid_until)}</span>
                            <span className={`text-[11.5px] font-semibold ${tone}`}>
                              {left < 0 ? `${Math.abs(left)} gün önce doldu` : `${left} gün kaldı`}
                            </span>
                          </span>
                        );
                      })() : <span className="text-muted2">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* Yönet, kartın kendi detay sayfasına gider.
                            Siparişe oradan da ulaşılabilir. */}
                        <Link href={`/kartlar/${c.id}`}
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4">
                          Yönet <Icon icon={IconArrowRight} size={13} />
                        </Link>
                        {c.status !== "cancelled" && <RevokeCardButton cardId={c.id} cardNumber={c.card_number} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
