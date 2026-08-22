"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconMail, IconPhone, IconCheck, IconShield, IconClock } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { requestEmailChange } from "@/lib/actions/profile";
import { requestPhoneChange, confirmPhoneChange } from "@/lib/actions/profile";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

/**
 * E-posta adresi.
 *
 * Değiştirme işleminin tamamı tek bir pencerede yürür: adres yazılır,
 * onay bağlantısı gönderilir, pencere ancak sonuç ekranı okunduktan sonra
 * kapanır. Kullanıcı ayarlar sayfasına geri dönüp adım aramaz.
 */
export function EmailCard({
  currentEmail, verified, pending,
}: {
  currentEmail: string;
  verified: boolean;
  pending: { new_email: string; expires_at: string } | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, submitting] = useActionState(requestEmailChange, IDLE);
  useActionToast(state);

  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconMail} size={18} className="text-muted" />
          <span className="font-display text-[18px] font-semibold tracking-[-.02em]">
            E-posta adresi
          </span>
        </div>
        {verified && (
          <Badge tone="green"><Icon icon={IconCheck} size={11} /> Doğrulandı</Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12.5px] text-muted">Mevcut adres</span>
          <span className="truncate text-[14.5px] font-semibold">{currentEmail}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Değiştir
        </Button>
      </div>

      {pending && (
        <div className="flex items-start gap-3 rounded-[14px] border border-orange-line bg-orange-bg px-4 py-3.5">
          <Icon icon={IconClock} size={17} className="mt-[2px] shrink-0 text-orange-ink" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold">{pending.new_email}</span>
              <Badge tone="orange">Onay bekliyor</Badge>
            </div>
            <span className="text-[13px] leading-[1.55] text-ink2">
              Bu adrese gönderdiğimiz bağlantıya tıklayana kadar adresiniz değişmez.
            </span>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="E-posta adresini değiştir"
        size="sm"
      >
        {state.ok ? (
          /* Sonuç ekranı: pencere kapanmadan önce ne olduğu anlatılır */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
                <Icon icon={IconMail} size={24} />
              </span>
              <span className="text-[16px] font-semibold">Onay bağlantısı gönderildi</span>
              <p className="text-[13.5px] leading-[1.6] text-ink2">
                {state.message}
              </p>
            </div>
            <Button size="lg" onClick={() => setOpen(false)}>Tamam</Button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 rounded-[12px] bg-field px-4 py-3">
              <span className="text-[12px] text-muted">Mevcut</span>
              <span className="truncate text-[14px] font-semibold">{currentEmail}</span>
            </div>

            <Field label="Yeni e-posta adresi" htmlFor="newEmail"
              error={state.fieldErrors?.email}>
              <Input id="newEmail" name="email" type="email" required autoComplete="email"
                placeholder="yeni@ornek.com" autoFocus />
            </Field>

            {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

            <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
              <Icon icon={IconShield} size={15} className="mt-[2px] shrink-0 text-muted" />
              <span className="text-[12.5px] leading-[1.5] text-muted">
                Onay bağlantısı yeni adrese gönderilir. Siz onaylayana kadar
                mevcut adresinizle giriş yapmaya devam edersiniz.
              </span>
            </div>

            <Button type="submit" size="lg" loading={submitting}>
              Onay bağlantısı gönder
            </Button>
          </form>
        )}
      </Modal>
    </Card>
  );
}

/**
 * Telefon numarası.
 *
 * İki adımın ikisi de aynı pencerede: numara yazılır, kod gelir, kod aynı
 * pencerede girilir. Numara ancak kod doğrulandığında değişir.
 */
export function PhoneCard({
  verified, last4,
}: { verified: boolean; last4: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"form" | "code" | "done">("form");
  const [phone, setPhone] = React.useState("");
  const [requestId, setRequestId] = React.useState("");

  const [reqState, reqAction, reqPending] = useActionState(requestPhoneChange, IDLE);
  const [okState, okAction, okPending] = useActionState(confirmPhoneChange, IDLE);

  // Kod gönderildi: aynı pencerede kod adımına geç
  React.useEffect(() => {
    if (!reqState.ok) return;
    const d = reqState.data as { phone?: string; requestId?: string } | undefined;
    if (d?.phone) setPhone(d.phone);
    if (d?.requestId) setRequestId(d.requestId);
    setStep("code");
  }, [reqState]);

  React.useEffect(() => { if (okState.ok) setStep("done"); }, [okState.ok]);

  const close = () => {
    setOpen(false);
    // Pencere kapanınca baştan başlasın
    setTimeout(() => { setStep("form"); setPhone(""); setRequestId(""); }, 250);
  };

  /*
   * Numara var mı?
   *
   * phone_last4 sütunu sonradan eklendiği için ESKİ doğrulanmış kayıtlarda
   * boştur. Yalnızca last4'e bakılsaydı bu kullanıcılara "Numara ekle"
   * denirdi. Doğrulanmış olmak da numaranın varlığını kanıtlar.
   */
  const hasNumber = Boolean(last4) || verified;

  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconPhone} size={18} className="text-muted" />
          <span className="font-display text-[18px] font-semibold tracking-[-.02em]">
            Telefon numarası
          </span>
        </div>
        {hasNumber && verified && (
          <Badge tone="green"><Icon icon={IconCheck} size={11} /> Doğrulandı</Badge>
        )}
        {hasNumber && !verified && <Badge tone="orange">Doğrulanmadı</Badge>}
      </div>

      {hasNumber ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] text-muted">Kayıtlı numara</span>
            <span className="font-mono text-[14.5px] font-semibold">
              {last4 ? `+90 5** *** ** ${last4}` : "Doğrulanmış numara kayıtlı"}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {verified ? "Numarayı değiştir" : "Doğrula"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-field px-4 py-3.5">
          <span className="text-[13.5px] text-muted">Kayıtlı numaranız yok</span>
          <Button size="sm" onClick={() => setOpen(true)}>Numara ekle</Button>
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        title={hasNumber ? "Telefon numarasını değiştir" : "Telefon numarası ekle"}
        size="sm"
      >
        {step === "form" && (
          <form action={reqAction} className="flex flex-col gap-4">
            {hasNumber && (
              <div className="flex flex-col gap-1 rounded-[12px] bg-field px-4 py-3">
                <span className="text-[12px] text-muted">Mevcut</span>
                <span className="font-mono text-[14px] font-semibold">
                  {last4 ? `+90 5** *** ** ${last4}` : "Doğrulanmış numara kayıtlı"}
                </span>
              </div>
            )}

            <Field label={hasNumber ? "Yeni numara" : "Telefon numarası"} htmlFor="newPhone"
              error={reqState.fieldErrors?.phone}>
              <Input id="newPhone" name="phone" type="tel" required
                inputMode="numeric" maxLength={20} placeholder="5XX XXX XX XX"
                autoComplete="tel" autoFocus />
            </Field>

            {reqState.message && !reqState.ok && (
              <Alert tone="danger">{reqState.message}</Alert>
            )}

            <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
              <Icon icon={IconShield} size={15} className="mt-[2px] shrink-0 text-muted" />
              <span className="text-[12.5px] leading-[1.5] text-muted">
                Bu numaraya doğrulama kodu gönderilir. Kod girilene kadar
                mevcut numaranız geçerli kalır.
              </span>
            </div>

            <Button type="submit" size="lg" loading={reqPending}>Kod gönder</Button>
          </form>
        )}

        {step === "code" && (
          <form action={okAction} className="flex flex-col gap-4">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="requestId" value={requestId} />

            <div className="flex items-start gap-3 rounded-[12px] bg-chip px-4 py-3.5">
              <Icon icon={IconPhone} size={16} className="mt-[2px] shrink-0 text-muted" />
              <span className="text-[13px] leading-[1.55] text-ink2">
                <strong>{phone}</strong> numarasına 6 haneli bir kod gönderdik.
              </span>
            </div>

            <Field label="Doğrulama kodu" htmlFor="phoneCode"
              error={okState.fieldErrors?.code}>
              <Input id="phoneCode" name="code" required inputMode="numeric"
                maxLength={6} placeholder="000000" autoComplete="one-time-code" autoFocus
                className="text-center font-mono text-[20px] tracking-[.35em]" />
            </Field>

            {okState.message && !okState.ok && <Alert tone="danger">{okState.message}</Alert>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg" loading={okPending}>Doğrula ve kaydet</Button>
              <Button type="button" size="lg" variant="ghost" onClick={() => setStep("form")}>
                Numarayı düzelt
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
                <Icon icon={IconCheck} size={26} />
              </span>
              <span className="text-[16px] font-semibold">Numaranız güncellendi</span>
              <p className="font-mono text-[14px] text-ink2">{phone}</p>
            </div>
            <Button size="lg" onClick={close}>Tamam</Button>
          </div>
        )}
      </Modal>
    </Card>
  );
}
