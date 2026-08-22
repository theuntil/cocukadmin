"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { cancelEventRegistration } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

export function CancelRegistration({ registrationId, eventTitle }: { registrationId: string; eventTitle: string }) {
  const [state, action, pending] = useActionState(cancelEventRegistration, IDLE);
  useActionToast(state);
  const [confirming, setConfirming] = React.useState(false);

  if (state.ok) return <Alert tone="muted">Kaydınız iptal edildi.</Alert>;

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="!text-danger hover:!bg-danger-soft">
        Kaydı iptal et
      </Button>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input type="hidden" name="registrationId" value={registrationId} />
      <p className="text-[13.5px] leading-[1.55] text-ink2">
        <strong>{eventTitle}</strong> etkinliğindeki kaydınızı iptal etmek üzeresiniz. Yeriniz bekleme
        listesindeki ilk kişiye devredilecek.
      </p>
      <Input name="reason" placeholder="İptal nedeni (isteğe bağlı)" maxLength={200} />
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" loading={pending}>Evet, iptal et</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>Vazgeç</Button>
      </div>
    </form>
  );
}
