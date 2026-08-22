"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconClose } from "@/components/ui/icons";
import { approvePayment, rejectPayment } from "@/lib/actions/admin";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

function ReviewControls({
  idName, id, approveAction, rejectAction,
}: {
  idName: string; id: string;
  approveAction: typeof approvePayment; rejectAction: typeof rejectPayment;
}) {
  const [approveState, doApprove, approving] = useActionState(approveAction, IDLE);
  useActionToast(approveState);
  const [rejectState, doReject, rejecting] = useActionState(rejectAction, IDLE);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const done = approveState.ok || rejectState.ok;
  if (done) {
    return <Alert tone={approveState.ok ? "green" : "muted"}>{approveState.message ?? rejectState.message}</Alert>;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line2 pt-4">
      {(approveState.message || rejectState.message) && (
        <Alert tone="danger">{approveState.message ?? rejectState.message}</Alert>
      )}

      {rejectOpen ? (
        <form action={doReject} className="flex flex-col gap-3">
          <input type="hidden" name={idName} value={id} />
          <Input name="reason" required minLength={3} maxLength={300}
            placeholder="Red gerekçesi (kullanıcıya gösterilir)" />
          {rejectState.fieldErrors?.reason && (
            <span className="text-[12.5px] font-medium text-danger">{rejectState.fieldErrors.reason}</span>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" loading={rejecting}>Reddet</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Vazgeç</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <form action={doApprove}>
            <input type="hidden" name={idName} value={id} />
            <Button type="submit" variant="solid" size="sm" loading={approving}>
              <Icon icon={IconCheck} size={15} /> Onayla
            </Button>
          </form>
          <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}
            className="!border-danger !text-danger hover:!bg-danger-soft">
            <Icon icon={IconClose} size={15} /> Reddet
          </Button>
        </div>
      )}
    </div>
  );
}

export function PaymentReviewRow({ paymentId }: { paymentId: string }) {
  return <ReviewControls idName="paymentId" id={paymentId} approveAction={approvePayment} rejectAction={rejectPayment} />;
}

