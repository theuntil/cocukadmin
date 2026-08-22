"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconLocation, IconPlus, IconEdit, IconTrash, IconClose } from "@/components/ui/icons";
import { saveAddress, deleteAddress } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { maskPhone } from "@/lib/utils";
import type { Address, City } from "@/lib/types";

export function AddressManager({ addresses, cities }: { addresses: Address[]; cities: City[] }) {
  const [editing, setEditing] = React.useState<Address | null>(null);
  const [creating, setCreating] = React.useState(addresses.length === 0);
  const cityMap = new Map(cities.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      {!creating && !editing && (
        <div className="flex justify-end">
          <Button variant="solid" size="lg" onClick={() => setCreating(true)}>
            <Icon icon={IconPlus} size={17} /> Adres ekle
          </Button>
        </div>
      )}

      {(creating || editing) && (
        <AddressForm address={editing} cities={cities} onClose={() => { setCreating(false); setEditing(null); }} />
      )}

      {addresses.length === 0 && !creating ? (
        <EmptyState
          icon={<Icon icon={IconLocation} size={26} />}
          title="Kayıtlı adresiniz yok"
          description="Kombine kartın gönderilebilmesi için bir teslimat adresi ekleyin."
          action={<Button variant="solid" onClick={() => setCreating(true)}>Adres ekle</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-[17px] font-semibold tracking-[-.01em]">{a.title}</span>
                {a.is_default && <Badge tone="green">Varsayılan</Badge>}
              </div>
              <div className="flex flex-col gap-1 text-[13.5px] leading-[1.6] text-ink2">
                <span className="font-semibold text-ink">{a.recipient_name}</span>
                <span>{a.full_address}</span>
                <span>{[a.neighborhood, cityMap.get(a.city_id)].filter(Boolean).join(" · ")}</span>
                <span className="text-muted">{maskPhone(a.phone)}</span>
              </div>
              <div className="flex justify-end gap-2 border-t border-line2 pt-3">
                <Button size="sm" variant="outline" onClick={() => { setEditing(a); setCreating(false); }}>
                  <Icon icon={IconEdit} size={14} /> Düzenle
                </Button>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button size="sm" variant="ghost" type="submit" className="!text-danger hover:!bg-danger-soft">
                    <Icon icon={IconTrash} size={14} />
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressForm({ address, cities, onClose }: { address: Address | null; cities: City[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveAddress, IDLE);
  useActionToast(state);
  React.useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Card className="ct-scale flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
          {address ? "Adresi düzenle" : "Yeni adres"}
        </span>
        <button type="button" onClick={onClose} aria-label="Kapat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-chip">
          <Icon icon={IconClose} size={17} />
        </button>
      </div>

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-4">
        {address && <input type="hidden" name="id" value={address.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adres başlığı" htmlFor="title" hint="Ev, İş…" error={state.fieldErrors?.title}>
            <Input id="title" name="title" required maxLength={60} defaultValue={address?.title} placeholder="Ev" />
          </Field>
          <Field label="Alıcı adı soyadı" htmlFor="recipientName" error={state.fieldErrors?.recipientName}>
            <Input id="recipientName" name="recipientName" required maxLength={120} defaultValue={address?.recipient_name} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" htmlFor="phone" hint="kargo için" error={state.fieldErrors?.phone}>
            <Input id="phone" name="phone" type="tel" required inputMode="tel" defaultValue={address?.phone} placeholder="0532 000 00 00" />
          </Field>
          <Field label="Şehir" htmlFor="cityId" error={state.fieldErrors?.cityId}>
            <Select id="cityId" name="cityId" required defaultValue={address?.city_id ?? ""}>
              <option value="" disabled>Seçiniz</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mahalle" htmlFor="neighborhood" hint="isteğe bağlı">
            <Input id="neighborhood" name="neighborhood" maxLength={120} defaultValue={address?.neighborhood ?? ""} />
          </Field>
          <Field label="Posta kodu" htmlFor="postalCode" hint="isteğe bağlı" error={state.fieldErrors?.postalCode}>
            <Input id="postalCode" name="postalCode" inputMode="numeric" maxLength={5} defaultValue={address?.postal_code ?? ""} />
          </Field>
        </div>

        <Field label="Açık adres" htmlFor="fullAddress" error={state.fieldErrors?.fullAddress}>
          <Textarea id="fullAddress" name="fullAddress" required minLength={10} maxLength={500}
            defaultValue={address?.full_address} placeholder="Sokak, bina no, daire no…" />
        </Field>

        <Checkbox id="isDefault" name="isDefault" defaultChecked={address?.is_default}
          label="Bu adresi varsayılan teslimat adresim yap" />

        <div className="flex gap-3 pt-1">
          <Button type="submit" variant="solid" size="lg" loading={pending}>
            {address ? "Değişiklikleri kaydet" : "Adresi kaydet"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>Vazgeç</Button>
        </div>
      </form>
    </Card>
  );
}
