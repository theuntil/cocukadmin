"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { updateCardStatus } from "@/lib/actions/admin";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/** İzinli geçişler — veritabanındaki validate_card_transition() ile aynı harita */
const NEXT: Record<string, string[]> = {
  processing: ["ready", "cancelled", "lost"],
  ready: ["shipped", "cancelled", "lost"],
  shipped: ["delivered", "lost", "cancelled"],
  delivered: ["active", "lost", "suspended"],
};

const LABEL: Record<string, string> = {
  ready: "Basıma hazır", shipped: "Kargoya verildi", delivered: "Teslim edildi",
  active: "Aktifleştir", cancelled: "İptal et", lost: "Kayıp", suspended: "Askıya al",
};

export function CardStatusForm({
  cardId, status, carrier, tracking,
}: { cardId: string; status: string; carrier: string | null; tracking: string | null }) {
  const [state, action, pending] = useActionState(updateCardStatus, IDLE);
  useActionToast(state);
  const options = NEXT[status] ?? [];

  if (state.ok) return <Alert tone="green">{state.message}</Alert>;
  if (options.length === 0) return null;

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-line2 pt-4">
      <input type="hidden" name="cardId" value={cardId} />
      {state.message && <Alert tone="danger">{state.message}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Yeni durum" htmlFor={`st-${cardId}`}>
          <Select id={`st-${cardId}`} name="status" defaultValue={options[0]}>
            {options.map((o) => <option key={o} value={o}>{LABEL[o] ?? o}</option>)}
          </Select>
        </Field>
        <Field label="Kargo firması" htmlFor={`ca-${cardId}`} hint="isteğe bağlı">
          <Input id={`ca-${cardId}`} name="carrier" defaultValue={carrier ?? ""} placeholder="Aras Kargo" />
        </Field>
        <Field label="Takip numarası" htmlFor={`tr-${cardId}`} hint="isteğe bağlı">
          <Input id={`tr-${cardId}`} name="tracking" defaultValue={tracking ?? ""} />
        </Field>
      </div>

      <Button type="submit" variant="solid" size="sm" loading={pending} className="self-start">
        Durumu güncelle
      </Button>
    </form>
  );
}
