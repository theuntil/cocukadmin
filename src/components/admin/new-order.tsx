"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { createManualOrder } from "@/lib/actions/orders";
import { IDLE } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/client";

interface UserRow { id: string; first_name: string | null; last_name: string | null; username: string | null }
interface ChildRow { id: string; first_name: string; last_name: string; birth_date: string }
interface AddressRow { id: string; title: string; recipient_name: string; full_address: string }

/**
 * Yönetici tarafından manuel sipariş oluşturma.
 * Kullanıcı aranır, sonra o kullanıcının çocuk ve adresleri yüklenir.
 */
export function NewOrderButton() {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(createManualOrder, IDLE);

  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [selected, setSelected] = React.useState<UserRow | null>(null);
  const [children, setChildren] = React.useState<ChildRow[]>([]);
  const [addresses, setAddresses] = React.useState<AddressRow[]>([]);
  const [teams, setTeams] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { if (state.ok) { setOpen(false); reset(); } }, [state.ok]);

  const reset = () => {
    setSelected(null); setChildren([]); setAddresses([]); setQuery(""); setUsers([]);
  };

  // Takımları bir kez yükle
  React.useEffect(() => {
    if (!open || teams.length > 0) return;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("teams").select("id,name").eq("is_active", true).order("name");
      setTeams((data ?? []) as { id: string; name: string }[]);
    })();
  }, [open, teams.length]);

  // Kullanıcı arama (yazmayı bırakınca)
  React.useEffect(() => {
    if (query.trim().length < 2) { setUsers([]); return; }

    const id = setTimeout(() => {
      void (async () => {
        const supabase = createClient();
        const term = `%${query.trim()}%`;
        const { data } = await supabase
          .from("profiles").select("id,first_name,last_name,username")
          .or(`first_name.ilike.${term},last_name.ilike.${term},username.ilike.${term}`)
          .limit(10);
        setUsers((data ?? []) as UserRow[]);
      })();
    }, 350);

    return () => clearTimeout(id);
  }, [query]);

  const pickUser = async (u: UserRow) => {
    setSelected(u);
    setUsers([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/user-detail?userId=${u.id}`);
      const json = await res.json() as { children: ChildRow[]; addresses: AddressRow[] };
      setChildren(json.children ?? []);
      setAddresses(json.addresses ?? []);
    } finally {
      setLoading(false);
    }
  };

  const name = (u: UserRow) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "İsimsiz";

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Icon icon={IconPlus} size={17} /> Yeni sipariş
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }}
        title="Manuel sipariş oluştur"
        description="Telefonla veya elden gelen başvurular için. Kullanıcıyı seçip bilgileri doldurun."
        size="lg">
        <div className="flex flex-col gap-5">
          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

          {/* Kullanıcı seçimi */}
          {!selected ? (
            <div className="flex flex-col gap-3">
              <Field label="Kullanıcı ara" htmlFor="uq" hint="ad, soyad veya kullanıcı adı">
                <div className="relative">
                  <Icon icon={IconSearch} size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <Input id="uq" value={query} onChange={(e) => setQuery(e.target.value)}
                    className="pl-10" placeholder="En az 2 harf yazın" autoFocus />
                </div>
              </Field>

              {users.length > 0 && (
                <div className="flex flex-col divide-y divide-line2 rounded-[14px] border border-line">
                  {users.map((u) => (
                    <button key={u.id} type="button" onClick={() => void pickUser(u)}
                      className="flex flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-chip">
                      <span className="text-[14px] font-semibold">{name(u)}</span>
                      {u.username && <span className="text-[12px] text-muted">@{u.username}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form action={action} className="flex flex-col gap-4">
              <input type="hidden" name="userId" value={selected.id} />

              <div className="flex items-center justify-between gap-3 rounded-[12px] bg-chip px-4 py-3">
                <span className="text-[14px] font-semibold">{name(selected)}</span>
                <button type="button" onClick={reset}
                  className="text-[12.5px] font-semibold text-muted hover:text-ink">
                  Değiştir
                </button>
              </div>

              {loading ? (
                <div className="ct-skeleton h-32 rounded-[14px]" />
              ) : children.length === 0 || addresses.length === 0 ? (
                <Alert tone="orange">
                  Bu kullanıcının {children.length === 0 ? "çocuk kaydı" : "adresi"} yok.
                  Sipariş oluşturmadan önce eklenmeli.
                </Alert>
              ) : (
                <>
                  <Field label="Çocuk" htmlFor="moChild" error={state.fieldErrors?.childId}>
                    <Select id="moChild" name="childId" required defaultValue="">
                      <option value="" disabled>Seçiniz</option>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Takım" htmlFor="moTeam" error={state.fieldErrors?.teamId}>
                    <Select id="moTeam" name="teamId" required defaultValue="">
                      <option value="" disabled>Seçiniz</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </Field>

                  <Field label="Teslimat adresi" htmlFor="moAddr" error={state.fieldErrors?.addressId}>
                    <Select id="moAddr" name="addressId" required defaultValue="">
                      <option value="" disabled>Seçiniz</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>{a.title} — {a.recipient_name}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Ödeme yöntemi" htmlFor="moMethod">
                    <Select id="moMethod" name="paymentMethod" defaultValue="bank_transfer">
                      <option value="bank_transfer">Havale / EFT</option>
                      <option value="credit_card">Kredi / banka kartı</option>
                    </Select>
                  </Field>

                  <Field label="Not" htmlFor="moNote" hint="yalnızca yöneticiler görür">
                    <Textarea id="moNote" name="note" rows={2} maxLength={500}
                      placeholder="Örn. telefonla alınan başvuru" />
                  </Field>

                  <Checkbox id="moPaid" name="markPaid"
                    label="Ödeme alındı — hemen tamamlandı işaretle (kart oluşturulur)" />

                  <Button type="submit" size="lg" loading={pending}>Siparişi oluştur</Button>
                </>
              )}
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
