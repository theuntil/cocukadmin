import type { Metadata } from "next";
import Link from "next/link";
import { Card, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMoney, IconHeart, IconPackage, IconQr, IconArrowRight } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Yönetim", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();

  const [pendingPayments, cardsToPrint] = await Promise.all([
    supabase.from("payments").select("amount", { count: "exact" }).in("status", ["pending", "awaiting_review"]),
    supabase.from("cards").select("id", { count: "exact", head: true }).in("status", ["processing", "ready"]),
  ]);

  const paySum = (pendingPayments.data ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const TILES = [
    { href: "/yonetim/odemeler", icon: IconMoney, label: "Bekleyen ödeme", count: pendingPayments.count ?? 0, extra: formatMoney(paySum) },
    { href: "/yonetim/siparisler", icon: IconPackage, label: "Basılacak kart", count: cardsToPrint.count ?? 0, extra: "üretim kuyruğu" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="ct-rise flex flex-col gap-1.5">
        <h1 className="font-display text-[30px] font-semibold tracking-[-.03em]">Yönetim paneli</h1>
        <span className="text-[14px] text-muted">Bekleyen işlerin özeti</span>
      </div>

      <div className="ct-stagger grid gap-4 sm:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="flex flex-col gap-3 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-orange">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-orange-soft text-orange">
                <Icon icon={t.icon} size={19} />
              </span>
              <span className="font-display text-[34px] leading-none font-semibold tracking-[-.03em]">{t.count}</span>
              <span className="text-[13.5px] text-muted">{t.label} · {t.extra}</span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <H3>Etkinlik girişi</H3>
          <p className="text-[14px] text-ink2">Katılımcıların giriş kodlarını okutmak için hızlı ekran.</p>
        </div>
        <Link href="/yonetim/check-in"
          className="inline-flex items-center gap-2 rounded-full bg-solid px-5 py-3 text-[14px] font-semibold text-on-solid">
          <Icon icon={IconQr} size={16} /> Giriş ekranını aç <Icon icon={IconArrowRight} size={15} />
        </Link>
      </Card>
    </div>
  );
}
