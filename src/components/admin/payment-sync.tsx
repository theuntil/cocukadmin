"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconRefresh, IconAlert } from "@/components/ui/icons";
import { syncOrderPayment } from "@/lib/actions/payment-fix";
import { IDLE } from "@/lib/actions/types";

/**
 * Ödeme eşitleme.
 *
 * Kart ile ödenmiş ama tamamlanmamış siparişlerde görünür. Stripe'a sorup
 * parayı doğrular ve kartı üretir. Ödeme yoksa hiçbir şey değişmez.
 */
export function PaymentSync({
  orderId, orderNumber,
}: { orderId: string; orderNumber: string }) {
  const [state, action, pending] = useActionState(syncOrderPayment, IDLE);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconAlert} size={18} className="text-orange-ink" />
        <H3 className="text-[18px]">Ödeme eşitleme</H3>
      </div>

      {state.message && (
        <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>
      )}

      <p className="text-[13.5px] leading-[1.6] text-ink2">
        Müşteri kartla ödediğini söylüyor ama sipariş tamamlanmadıysa bu
        düğmeyi kullanın. Stripe&apos;a sorulur; para gerçekten alınmışsa
        sipariş tamamlanır ve kart oluşturulur.
      </p>

      <form action={action}>
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <Button type="submit" variant="outline" loading={pending}>
          <Icon icon={IconRefresh} size={15} /> Stripe ile eşitle
        </Button>
      </form>
    </Card>
  );
}
