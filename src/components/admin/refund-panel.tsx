"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, H3, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCash, IconAlert } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { refundOrder } from "@/lib/actions/refund";
import { IDLE } from "@/lib/actions/types";
import { formatDate, formatMoney } from "@/lib/utils";

interface Refund {
  id: string; amount: number; currency: string; reason: string;
  status: string; provider_refund_id: string | null;
  completed_at: string | null; error: string | null; created_at: string;
}

/**
 * İade paneli.
 *
 * İade yalnızca ödemesi tamamlanmış siparişlerde açılır. İşlem geri
 * alınamaz: para müşteriye döner ve kart iptal edilir.
 */
export function RefundPanel({
  orderId, amount, currency, orderStatus, paymentStatus, refunds,
}: {
  orderId: string;
  amount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string | null;
  refunds: Refund[];
}) {
  const [state, action, pending] = useActionState(refundOrder, IDLE);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  const alreadyRefunded = orderStatus === "refunded"
    || refunds.some((r) => r.status === "completed");
  const canRefund = paymentStatus === "paid" && !alreadyRefunded;

  if (!canRefund && refunds.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconCash} size={18} className="text-muted" />
          <H3 className="text-[18px]">İade</H3>
        </div>
        {alreadyRefunded && <Badge tone="muted">İade edildi</Badge>}
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      {/* Geçmiş iadeler */}
      {refunds.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {refunds.map((r) => (
            <div key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line2 px-4 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] font-semibold">
                  {formatMoney(r.amount, r.currency)}
                </span>
                <span className="truncate text-[12.5px] text-muted">
                  {r.reason} · {formatDate(r.completed_at ?? r.created_at, true)}
                </span>
                {r.error && (
                  <span className="text-[12px] text-danger">Hata: {r.error}</span>
                )}
              </div>
              <Badge tone={r.status === "completed" ? "green"
                : r.status === "failed" ? "danger" : "orange"}>
                {r.status === "completed" ? "Tamamlandı"
                  : r.status === "failed" ? "Başarısız" : "Bekliyor"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {canRefund && (
        <>
          <p className="text-[13.5px] leading-[1.6] text-ink2">
            Para müşterinin kartına iade edilir ve kombine kart iptal edilir.
            Bu işlem geri alınamaz.
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}
            className="!border-danger !text-danger hover:!bg-danger-soft">
            İade et
          </Button>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Ödemeyi iade et" size="sm">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={orderId} />

          <div className="flex items-start gap-2.5 rounded-[12px] border border-danger bg-danger-soft px-4 py-3">
            <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0 text-danger" />
            <span className="text-[13px] leading-[1.55] text-ink2">
              <strong>{formatMoney(amount, currency)}</strong> müşteriye iade
              edilecek ve kombine kart iptal edilecek. Geri alınamaz.
            </span>
          </div>

          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

          <Field label="İade tutarı" htmlFor="refAmount"
            hint="boş bırakılırsa tamamı iade edilir"
            error={state.fieldErrors?.amount}>
            <Input id="refAmount" name="amount" type="number" step="0.01"
              min="0.01" max={amount} placeholder={String(amount)} />
          </Field>

          <Field label="Gerekçe" htmlFor="refReason" error={state.fieldErrors?.reason}>
            <Textarea id="refReason" name="reason" rows={2} required
              minLength={3} maxLength={500}
              placeholder="Örn. kullanıcı talebi" />
          </Field>

          <Field label="Onay" htmlFor="refConfirm" hint="onaylamak için IADE yazın"
            error={state.fieldErrors?.confirm}>
            <Input id="refConfirm" name="confirm" required placeholder="IADE"
              autoComplete="off" />
          </Field>

          <Button type="submit" size="lg" variant="outline" loading={pending}
            className="!border-danger !text-danger hover:!bg-danger-soft">
            İadeyi onayla
          </Button>
        </form>
      </Modal>
    </Card>
  );
}
