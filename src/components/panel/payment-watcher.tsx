"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconClock, IconRefresh, IconAlert } from "@/components/ui/icons";
import { verifyAndFinalizePayment } from "@/lib/actions/payment";

/**
 * Kart bekleyici.
 *
 * Ödeme alındı ama kart henüz oluşmadıysa çalışır: birkaç saniyede bir
 * durumu kontrol eder ve kart hazır olunca sayfayı tazeler.
 *
 * Başarısız olursa GERÇEK HATA gösterilir. Hatayı gizlemek sorunun
 * bulunmasını engelliyordu; kullanıcı "hazırlanıyor" görüp bekliyor,
 * arkada ne olduğu anlaşılmıyordu.
 */
export function PaymentWatcher({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [tries, setTries] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState(false);

  const attempt = React.useCallback(async () => {
    const res = await verifyAndFinalizePayment(orderId);

    setLastStatus(res.status);
    setLastError(res.message ?? null);

    if (res.ok || res.paid) router.refresh();

    return res.ok;
  }, [orderId, router]);

  React.useEffect(() => {
    if (tries >= 6) return;

    const timer = setTimeout(() => {
      void (async () => {
        await attempt();
        setTries((n) => n + 1);
      })();
    }, tries === 0 ? 1200 : 2500);

    return () => clearTimeout(timer);
  }, [tries, attempt]);

  const retry = async () => {
    setManual(true);
    await attempt();
    setManual(false);
    setTries(0);
  };

  if (tries >= 6) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-[14px] border border-orange-line bg-orange-bg px-5 py-4 text-left">
        <span className="flex items-start gap-2.5">
          <Icon icon={IconAlert} size={17} className="mt-[2px] shrink-0 text-orange-ink" />
          <span className="text-[13px] leading-[1.55] text-ink2">
            Ödemeniz alındı. Kart oluşturma adımı tamamlanamadı; aşağıdaki
            düğmeyle tekrar deneyebilirsiniz.
          </span>
        </span>

        {/* Gerçek hata: destek istendiğinde bu satır paylaşılmalı */}
        {(lastError || lastStatus) && (
          <span className="rounded-[10px] bg-surface px-3 py-2 font-mono text-[11.5px] leading-[1.5] text-muted">
            {lastStatus && <>durum: {lastStatus}<br /></>}
            {lastError}
          </span>
        )}

        <Button size="sm" variant="outline" loading={manual}
          onClick={() => void retry()}>
          <Icon icon={IconRefresh} size={14} /> Tekrar dene
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-[14px] bg-chip px-5 py-4">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line2 border-t-accent" />
      <span className="text-[13px] text-ink2">Kartınız hazırlanıyor…</span>
    </div>
  );
}
