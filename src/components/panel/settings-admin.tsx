"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, Field, H3, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCard, IconHeart, IconSignature, IconTicket, IconCalendar, IconSettings, IconAlert, IconMoney } from "@/components/ui/icons";
import { toggleSetting, updateTextSetting, updatePlanPrice } from "@/lib/actions/settings";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { formatMoney } from "@/lib/utils";
import type { SettingRow } from "@/app/yonetim/ayarlar/page";

const CATEGORY_META: Record<string, { title: string; icon: Parameters<typeof Icon>[0]["icon"]; note?: string }> = {
  payments: { title: "Ödeme yöntemleri", icon: IconCard, note: "İkisi de kapalıysa kullanıcılar «Şu anda ödeme kabul edemiyoruz» mesajı görür." },
  signatures: { title: "İmza kampanyası", icon: IconSignature },
  cards: { title: "Kombine kart", icon: IconTicket },
  events: { title: "Etkinlikler", icon: IconCalendar },
  site: { title: "Site", icon: IconSettings },
  general: { title: "Genel", icon: IconSettings },
};

export function SettingsPanel({
  settings, price, currency,
}: { settings: SettingRow[]; price: number; currency: string }) {
  const categories = Array.from(new Set(settings.map((s) => s.category)));

  const cardOn = settings.find((s) => s.key === "payments.card_enabled")?.value === true;
  const ibanOn = settings.find((s) => s.key === "payments.iban_enabled")?.value === true;
  const maintenance = settings.find((s) => s.key === "site.maintenance_mode")?.value === true;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Site ayarları</h1>
        <span className="text-[14px] text-muted">
          Buradaki değişiklikler anında yayına girer. Her değişiklik denetim kaydına yazılır.
        </span>
      </div>

      {maintenance && (
        <Alert tone="danger" title="Bakım modu açık">
          Ziyaretçiler şu anda bakım sayfası görüyor. Yöneticiler siteyi normal kullanmaya devam eder.
        </Alert>
      )}

      {!cardOn && !ibanOn && (
        <Alert tone="danger" title="Hiçbir ödeme yöntemi açık değil">
          Kullanıcılar kart başvurusu yapamaz. En az bir yöntem açın.
        </Alert>
      )}

      {/* Kombine kart fiyatı */}
      <PriceCard price={price} currency={currency} />

      {categories.map((cat) => {
        const meta = CATEGORY_META[cat] ?? CATEGORY_META.general;
        const rows = settings.filter((s) => s.category === cat);

        return (
          <Card key={cat} className="flex flex-col gap-5 p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-accent-ink">
                <Icon icon={meta.icon} size={20} />
              </span>
              <div className="flex flex-col gap-1">
                <H3 className="text-[19px]">{meta.title}</H3>
                {meta.note && <span className="text-[13px] leading-[1.55] text-muted">{meta.note}</span>}
              </div>
            </div>

            <div className="flex flex-col divide-y divide-line2">
              {rows.map((row) =>
                typeof row.value === "boolean"
                  ? <ToggleRow key={row.key} row={row} />
                  : <TextRow key={row.key} row={row} />,
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ToggleRow({ row }: { row: SettingRow }) {
  const [state, action, pending] = useActionState(toggleSetting, IDLE);
  useActionToast(state);
  const [on, setOn] = React.useState(row.value === true);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex items-center justify-between gap-4 py-4">
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="value" value={String(!on)} />

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">{row.label}</span>
        {row.description && (
          <span className="text-[12.5px] leading-[1.5] text-muted">{row.description}</span>
        )}
        {state.message && !state.ok && (
          <span className="mt-1 text-[12.5px] font-medium text-danger">{state.message}</span>
        )}
      </div>

      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-label={row.label}
        disabled={pending}
        onClick={() => setOn((v) => !v)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
          on ? "bg-accent" : "bg-line"
        }`}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200"
          style={{ left: on ? 26 : 4 }}
        />
      </button>
    </form>
  );
}

function TextRow({ row }: { row: SettingRow }) {
  const [state, action, pending] = useActionState(updateTextSetting, IDLE);
  const current = typeof row.value === "string" ? row.value : "";
  const isMethod = row.key === "payments.default_method";

  return (
    <form action={action} className="flex flex-col gap-2.5 py-4">
      <input type="hidden" name="key" value={row.key} />
      <div className="flex flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">{row.label}</span>
        {row.description && (
          <span className="text-[12.5px] leading-[1.5] text-muted">{row.description}</span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        {isMethod ? (
          <Select name="value" defaultValue={current} className="flex-1">
            <option value="credit_card">Kredi / banka kartı</option>
            <option value="bank_transfer">Havale / EFT</option>
          </Select>
        ) : (
          <Input name="value" defaultValue={current} maxLength={500} className="flex-1"
            placeholder="Boş bırakılabilir" />
        )}
        <Button type="submit" variant="outline" size="md" loading={pending} className="shrink-0">
          Kaydet
        </Button>
      </div>

      {state.message && (
        <span className={`text-[12.5px] font-medium ${state.ok ? "text-muted" : "text-danger"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}

function PriceCard({ price, currency }: { price: number; currency: string }) {
  const [state, action, pending] = useActionState(updatePlanPrice, IDLE);

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-accent-ink">
          <Icon icon={IconMoney} size={20} />
        </span>
        <div className="flex flex-col gap-1">
          <H3 className="text-[19px]">Kombine kart bedeli</H3>
          <span className="text-[13px] text-muted">
            Şu anki fiyat: <strong className="text-ink">{formatMoney(price, currency)}</strong> / yıl
          </span>
        </div>
      </div>

      {state.message && (
        <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>
      )}

      <form action={action} className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
        <Field label="Yeni fiyat (TRY)" htmlFor="price" error={state.fieldErrors?.price}>
          <Input id="price" name="price" type="number" min={1} step="1" inputMode="numeric"
            defaultValue={price} className="sm:w-48" />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="shrink-0">Fiyatı güncelle</Button>
      </form>

      <div className="flex items-start gap-2.5 rounded-[14px] bg-chip px-4 py-3">
        <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0 text-muted" />
        <span className="text-[13px] leading-[1.55] text-ink2">
          Fiyat değişikliği yalnızca yeni siparişleri etkiler. Mevcut siparişlerde
          sipariş anındaki tutar korunur.
        </span>
      </div>
    </Card>
  );
}
