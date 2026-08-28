"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconShield, IconTrash, IconCheck } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useActionToast } from "@/components/ui/action-toast";
import { blockUser, deleteUser } from "@/lib/actions/users";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";

/**
 * ÜYE EYLEMLERİ — SAYFA BAŞLIĞINDA
 *
 * ┌─ NEDEN KART DEĞİL, İKON DÜĞME ────────────────────────────────┐
 * │ Engelleme ve silme sayfanın altında iki büyük kart olarak      │
 * │ duruyordu. Yıkıcı işlemler için fazla yer kaplıyor ve içerikle │
 * │ karışıyorlardı: kullanıcı aşağı inerken "kullanıcıyı sil"      │
 * │ formuyla karşılaşıyordu.                                        │
 * │                                                                  │
 * │ Artık başlıkta iki küçük düğme; formlar pencerede açılıyor.     │
 * │ Yıkıcı işlem görünür ama yolun üstünde değil.                   │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Engelleme admin, silme yalnızca süper yönetici yetkisi ister.
 */
export function UserActions({
  userId, userName, blocked, canDelete, canBlock,
}: {
  userId: string; userName: string; blocked: boolean;
  canDelete: boolean; canBlock: boolean;
}) {
  const [engelAcik, setEngelAcik] = React.useState(false);
  const [silAcik, setSilAcik] = React.useState(false);

  if (!canBlock && !canDelete) return null;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {canBlock && (
          <button type="button" onClick={() => setEngelAcik(true)}
            title={blocked ? "Engeli kaldır" : "Kullanıcıyı engelle"}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
              blocked
                ? "border-green/40 text-green hover:border-green"
                : "border-line text-ink2 hover:border-orange hover:text-orange"
            }`}>
            <Icon icon={blocked ? IconCheck : IconShield} size={17} />
          </button>
        )}

        {canDelete && (
          <button type="button" onClick={() => setSilAcik(true)} title="Kullanıcıyı sil"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger">
            <Icon icon={IconTrash} size={17} />
          </button>
        )}
      </div>

      <EngelModal open={engelAcik} onClose={() => setEngelAcik(false)}
        userId={userId} blocked={blocked} />
      <SilModal open={silAcik} onClose={() => setSilAcik(false)}
        userId={userId} userName={userName} />
    </>
  );
}

/* ═══════════════════ ENGELLEME ═══════════════════ */

function EngelModal({
  open, onClose, userId, blocked,
}: {
  open: boolean; onClose: () => void; userId: string; blocked: boolean;
}) {
  const [state, action, pending] = useActionState(blockUser, IDLE);
  useActionToast(state);

  useActionEffect(state, onClose);

  return (
    <Modal open={open} onClose={onClose}
      title={blocked ? "Engeli kaldır" : "Kullanıcıyı engelle"}
      description={blocked
        ? "Kullanıcı yeniden giriş yapabilir hâle gelir."
        : "Kullanıcı giriş yapamaz; mevcut kartları etkilenmez."}
      size="sm">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="block" value={blocked ? "false" : "true"} />

        {!blocked && (
          <Field label="Gerekçe" htmlFor="reason" hint="zorunlu · kayda geçer"
            error={state.fieldErrors?.reason}>
            <Textarea id="reason" name="reason" rows={3} required autoFocus maxLength={500}
              placeholder="Neden engelleniyor?" />
          </Field>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
          <Button type="submit" variant={blocked ? "ink" : "danger"} loading={pending}>
            {blocked ? "Engeli kaldır" : "Engelle"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════ SİLME ═══════════════════ */

function SilModal({
  open, onClose, userId, userName,
}: {
  open: boolean; onClose: () => void; userId: string; userName: string;
}) {
  const [state, action, pending] = useActionState(deleteUser, IDLE);
  useActionToast(state);

  return (
    <Modal open={open} onClose={onClose} title="Kullanıcıyı sil"
      description={`${userName} ve tüm kayıtları kalıcı olarak silinecek.`}
      size="sm">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="userId" value={userId} />

        <Alert tone="danger" title="Bu işlem geri alınamaz">
          Çocuk kayıtları, kartlar ve sipariş geçmişi de silinir.
          Engellemek çoğu durumda yeterlidir.
        </Alert>

        <Field label="Gerekçe" htmlFor="dreason" hint="en az 5 karakter · kayda geçer"
          error={state.fieldErrors?.reason}>
          <Textarea id="dreason" name="reason" rows={3} required maxLength={500}
            placeholder="Neden siliniyor?" />
        </Field>

        {/* İkinci onay: yanlışlıkla silmeyi zorlaştırır. Düğmeye
            basmak yetmiyor, kelimeyi yazmak gerekiyor. */}
        <Field label="Onay" htmlFor="confirm"
          hint="silmek için SIL yazın" error={state.fieldErrors?.confirm}>
          <Input id="confirm" name="confirm" required autoComplete="off" placeholder="SIL" />
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
          <Button type="submit" variant="danger" loading={pending}>Kalıcı olarak sil</Button>
          <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
        </div>
      </form>
    </Modal>
  );
}
