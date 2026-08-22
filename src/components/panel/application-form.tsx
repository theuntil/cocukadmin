"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Checkbox, Divider, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconChild, IconFootball, IconTicket, IconCard, IconBank, IconPhone, IconShield } from "@/components/ui/icons";
import { createCardOrder } from "@/lib/actions/app";
import type { PaymentOptions } from "@/lib/data";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { calcAge, publicStorageUrl } from "@/lib/utils";
import type { Address, Child, City, Team } from "@/lib/types";
import { TeamPicker } from "@/components/ui/team-picker";
import type { BankInfoProps } from "@/components/site/bank-details";

/**
 * KOMBİNE KART BAŞVURU FORMU.
 *
 * Akış TEK ÇİZGİDİR ve burada biter:
 *   form gönderilir → sunucu siparişi açar → onay sayfasına yönlendirilir
 *
 * Ödeme onay sayfasında yapılır, burada DEĞİL. Eskiden sipariş oluşunca
 * ödeme alanları aynı ekranda açılıyordu; sayfa yenilenince bu durum
 * kayboluyor, kullanıcı başvuru ekranına dönünce "bu çocuk için başvuru
 * yapılmış" uyarısıyla kilitleniyordu. Tek kalıcı adres bu sorunu kökten
 * ortadan kaldırır.
 *
 * `addresses` ve `cities` alanları KULLANILMAZ; kart dijitaldir, teslimat
 * adresi istenmez. İmza geriye dönük uyumluluk için korunur.
 */
export function ApplicationForm({
  children, teams, price, payment, bank, contact = null,
}: {
  children: Child[];
  addresses?: Address[];
  teams: Team[];
  cities?: City[];
  price: string;
  payment: PaymentOptions;
  /** Velinin kayıtlı iletişim bilgisi — formu ön doldurmak için */
  contact?: { phone: string | null; address_line: string | null } | null;
  /** Havale bilgileri — yönetim panelindeki ayarlardan gelir */
  bank: BankInfoProps;
}) {
  const [state, action, pending] = useActionState(createCardOrder, IDLE);
  useActionToast(state);
  const [childId, setChildId] = React.useState(children[0]?.id ?? "");
  const [teamId, setTeamId] = React.useState(children[0]?.favorite_team_id ?? teams[0]?.id ?? "");

  // Varsayılan ödeme yöntemi ayarlardan gelir; kapalı olan yöntem seçilemez
  const initialMethod =
    payment.default_method === "credit_card" && payment.card_enabled ? "credit_card"
    : payment.iban_enabled ? "bank_transfer"
    : payment.card_enabled ? "credit_card" : "";
  const [method, setMethod] = React.useState(initialMethod);

  const child = children.find((c) => c.id === childId);
  const team = teams.find((t) => t.id === teamId);
  const logo = publicStorageUrl("team-logos", team?.logo_path);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <Step n={1} icon={IconChild} title="Çocuğunuzu seçin" />
        <Field label="Çocuk" htmlFor="childId" error={state.fieldErrors?.childId}>
          <Select id="childId" name="childId" required value={childId} onChange={(e) => {
            setChildId(e.target.value);
            const c = children.find((x) => x.id === e.target.value);
            if (c?.favorite_team_id) setTeamId(c.favorite_team_id);
          }}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} · {calcAge(c.birth_date)} yaş
              </option>
            ))}
          </Select>
        </Field>
        <Link href="/panel/cocuklarim?donus=/panel/kombine-kart/basvuru"
          className="self-start text-[13.5px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">
          Yeni çocuk ekle →
        </Link>
      </Card>

      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <Step n={2} icon={IconFootball} title="Takımı seçin" />
        <TeamPicker teams={teams} label="Takım" required
          defaultValue={teamId} onChange={setTeamId}
          error={state.fieldErrors?.teamId} />
      </Card>

      {/* Dijital kart bilgisi — fiziksel kart gönderilmez, adres gerekmez */}
      <Card className="flex flex-col gap-4 p-6 sm:p-7">
        <Step n={3} icon={IconTicket} title="Dijital kart" />
        <p className="text-[14px] leading-[1.65] text-ink2">
          Kartınız <strong className="text-ink">dijitaldir</strong>; fiziksel kart gönderilmez,
          kargo ücreti yoktur. Ödeme tamamlandığında kart numaranız ve QR kodunuz
          panelinizde oluşur. Etkinlik girişlerinde QR kodu okutmanız yeterlidir.
        </p>
        <div className="flex items-start gap-2.5 rounded-[14px] bg-field px-4 py-3">
          <Icon icon={IconTicket} size={16} className="mt-[2px] shrink-0 text-muted" />
          <span className="text-[13px] leading-[1.55] text-muted">
            Üyelik 12 ay geçerlidir. Bitişe 60 gün kala yenileyebilirsiniz;
            kalan süreniz kaybolmaz.
          </span>
        </div>
      </Card>

      {/* İletişim — kulüp üyesine ulaşabilsin diye */}
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <Step n={4} icon={IconPhone} title="İletişim bilgileriniz" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" htmlFor="contactPhone" hint="zorunlu"
            error={state.fieldErrors?.contactPhone}>
            <Input id="contactPhone" name="contactPhone" type="tel" required
              autoComplete="tel" defaultValue={contact?.phone ?? ""}
              placeholder="05XX XXX XX XX" />
          </Field>
          <Field label="Adres" htmlFor="contactAddress" hint="isteğe bağlı">
            <Input id="contactAddress" name="contactAddress" maxLength={200}
              defaultValue={contact?.address_line ?? ""}
              placeholder="İlçe / şehir" />
          </Field>
        </div>

        {/*
          KVKK aydınlatması burada, alanın HEMEN ALTINDA.
          Kombine kart aslında kulübün üyelik kartı; kulübün üyesini
          tanıması işin doğası. Ama veli bunu GÖREREK girmeli — küçük
          puntoyla sözleşmeye gömmek yeterli değil.
        */}
        <div className="flex items-start gap-2.5 rounded-[14px] bg-field px-4 py-3">
          <Icon icon={IconShield} size={16} className="mt-[2px] shrink-0 text-muted" />
          <span className="text-[12.5px] leading-[1.6] text-muted">
            Kartın ait olduğu kulüp; çocuğunuzun adını, yaşını ve sizin ad, telefon
            ile e-posta bilgilerinizi <strong className="text-ink2">yalnızca üyelik
            işlemleri için</strong> görebilir. Sipariş ve ödeme bilgileriniz kulüple
            paylaşılmaz. Ayrıntı için{" "}
            <Link href="/kvkk" className="font-semibold text-ink underline">
              aydınlatma metni
            </Link>.
          </span>
        </div>
      </Card>

      {/* Ödeme yöntemi — burada yalnızca SEÇİLİR, ödeme sonraki adımda alınır */}
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <Step n={5} icon={IconCard} title="Ödeme yöntemi" />

        {!payment.any_enabled ? (
          <Alert tone="danger">
            Şu anda ödeme kabul edemiyoruz. Lütfen daha sonra tekrar deneyin.
          </Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {payment.card_enabled && (
              <MethodOption
                icon={IconCard}
                title="Kredi / banka kartı"
                note="Anında onaylanır"
                selected={method === "credit_card"}
                onSelect={() => setMethod("credit_card")}
              />
            )}
            {payment.iban_enabled && (
              <MethodOption
                icon={IconBank}
                title="IBAN ile öde"
                note="Havale / EFT"
                selected={method === "bank_transfer"}
                onSelect={() => setMethod("bank_transfer")}
              />
            )}
          </div>
        )}
        <input type="hidden" name="paymentMethod" value={method} />

        {method === "bank_transfer" && !bank.iban && (
          <Alert tone="orange">
            Havale bilgileri henüz tanımlanmamış. Kart ile ödeyebilirsiniz.
          </Alert>
        )}

        <span className="text-[13px] leading-[1.55] text-muted">
          Ödeme bilgileri bir sonraki adımda istenir. Fikrinizi değiştirirseniz
          orada diğer yönteme geçebilirsiniz.
        </span>
      </Card>

      {/* Özet */}
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <span className="flex items-center gap-2.5 font-display text-[19px] font-semibold tracking-[-.02em]">
          <Icon icon={IconTicket} size={20} className="text-accent-ink" /> Başvuru özeti
        </span>
        <div className="flex flex-col gap-3">
          <SummaryRow label="Çocuk" value={child ? `${child.first_name} ${child.last_name}` : "—"} />
          <SummaryRow label="Takım" value={team?.name ?? "—"} logo={logo} />
          <SummaryRow label="Kart türü" value="Dijital · QR kodlu" />
          <SummaryRow label="Üyelik süresi" value="12 ay" />
          <SummaryRow label="Ödeme" value={
            method === "credit_card" ? "Kredi / banka kartı" :
            method === "bank_transfer" ? "Havale / EFT" : "—"} />
        </div>
        <Divider />
        <div className="flex items-center justify-between">
          {/* "kargo dahil" KALDIRILDI: kart dijitaldir, kargo kalemi yoktur */}
          <span className="text-[14.5px] text-ink2">Toplam</span>
          <span className="font-display text-[26px] font-semibold tracking-[-.02em] text-accent-ink">{price}</span>
        </div>

        <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-field p-4">
          <Checkbox id="sale" name="sale" required
            label={<><Link href="/mesafeli-satis" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Mesafeli satış sözleşmesini</Link> okudum, onaylıyorum.</>} />
          <Checkbox id="guardian" name="guardian" required
            label="Kaydettiğim çocuğun velisi veya vasisi olduğumu beyan ederim." />
        </div>

        <Button
          type="submit"
          size="lg"
          variant="solid"
          loading={pending}
          disabled={!payment.any_enabled || !method || !childId || !teamId}
        >
          Başvuruyu tamamla
        </Button>
      </Card>
    </form>
  );
}

function Step({ n, icon, title }: { n: number; icon: Parameters<typeof Icon>[0]["icon"]; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[14px] font-bold text-accent-ink">{n}</span>
      <span className="flex items-center gap-2 font-display text-[19px] font-semibold tracking-[-.02em]">
        <Icon icon={icon} size={19} className="text-muted" />{title}
      </span>
    </div>
  );
}

function SummaryRow({ label, value, logo }: { label: string; value: string; logo?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-bold tracking-[.08em] text-muted2">{label.toUpperCase()}</span>
      <span className="flex items-center gap-2 text-[14.5px] font-semibold">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-5 w-5 object-contain" />
        )}
        {value}
      </span>
    </div>
  );
}

/** Ödeme yöntemi seçim kutusu */
function MethodOption({
  icon, title, note, selected, onSelect,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  title: string; note: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center gap-3.5 rounded-[16px] border-2 px-4 py-4 text-left transition-all duration-150 ${
        selected
          ? "border-accent bg-accent-soft"
          : "border-line bg-field hover:border-accent-line"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${
        selected ? "bg-accent text-accent-ink" : "bg-chip text-muted"
      }`}>
        <Icon icon={icon} size={19} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[14.5px] font-semibold">{title}</span>
        <span className="text-[12.5px] text-muted">{note}</span>
      </span>
    </button>
  );
}
