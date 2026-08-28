"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { createCard, revokeCard } from "@/lib/actions/orders";
import { IDLE } from "@/lib/actions/types";

/** Sağ üstteki "+" ile manuel kart oluşturma */
export function CardAdmin({
  children, teams,
}: {
  children: { id: string; first_name: string; last_name: string }[];
  teams: { id: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(createCard, IDLE);

  React.useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  const nextYear = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Icon icon={IconPlus} size={17} /> Yeni kart
      </Button>

      {state.ok && state.message && (
        <div className="w-full"><Alert tone="green">{state.message}</Alert></div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni kart oluştur"
        description="Siparişten bağımsız, elle kart üretir. Kart numarası ve QR kodu otomatik oluşur."
        size="md">
        <form action={action} className="flex flex-col gap-4">
          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

          <Field label="Çocuk" htmlFor="ccChild">
            <Select id="ccChild" name="childId" required defaultValue="">
              <option value="" disabled>Seçiniz</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Takım" htmlFor="ccTeam">
            <Select id="ccTeam" name="teamId" required defaultValue="">
              <option value="" disabled>Seçiniz</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>

          <Field label="Geçerlilik bitişi" htmlFor="ccValid" hint="boşsa 1 yıl">
            <Input id="ccValid" name="validUntil" type="date" defaultValue={nextYear} />
          </Field>

          <Button type="submit" size="lg" loading={pending}>Kartı oluştur</Button>
        </form>
      </Modal>
    </>
  );
}

/** Kart iptali — silme yok, iptal var (mali kayıt korunur) */
export function RevokeCardButton({ cardId, cardNumber }: { cardId: string; cardNumber: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(revokeCard, IDLE);

  React.useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Kartı iptal et"
        className="text-muted transition-colors hover:text-danger">
        <Icon icon={IconTrash} size={14} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Kartı iptal et"
        description={`${cardNumber} numaralı kart iptal edilecek ve QR kodu geçersiz kılınacak. Kayıt silinmez.`}
        size="sm">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="cardId" value={cardId} />

          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

          <Field label="İptal gerekçesi" htmlFor={`rc-${cardId}`} error={state.fieldErrors?.reason}>
            <Textarea id={`rc-${cardId}`} name="reason" required minLength={5} maxLength={500} rows={2} />
          </Field>

          <div className="flex gap-2.5">
            <Button type="submit" size="lg" loading={pending}
              className="flex-1 !bg-danger !text-white">Kartı iptal et</Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
