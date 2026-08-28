"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Button, Card, Checkbox, Field, H3, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconMail, IconPhone, IconCheck, IconAlert, IconEdit, IconShield,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useActionToast } from "@/components/ui/action-toast";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { setUserContact, toggleVerification } from "@/lib/actions/users";
import { IDLE } from "@/lib/actions/types";
import { formatDate, cn } from "@/lib/utils";

/**
 * İLETİŞİM VE DOĞRULAMA
 *
 * ┌─ NEDEN KART, TİK DEĞİL ───────────────────────────────────────┐
 * │ Doğrulama durumu küçük bir tik simgesiyle gösteriliyordu.      │
 * │ Tik "var/yok" der ama NEYİN doğrulandığını, NE ZAMAN olduğunu  │
 * │ ve nasıl değiştirileceğini söylemez.                            │
 * │                                                                  │
 * │ Kart hepsini birden gösteriyor: bilginin kendisi, durumu,       │
 * │ tarihi ve tek dokunuşla değiştirme.                             │
 * └──────────────────────────────────────────────────────────────────┘
 */
export function ContactPanel({
  userId, email, phone, emailVerifiedAt, phoneVerifiedAt,
}: {
  userId: string;
  email: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
}) {
  const [duzenle, setDuzenle] = React.useState<"email" | "phone" | null>(null);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <H3 className="text-[18px]">İletişim</H3>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted2">
          <Icon icon={IconShield} size={13} /> yalnızca yönetici
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BilgiKarti
          userId={userId}
          alan="email"
          icon={IconMail}
          etiket="E-POSTA"
          deger={email}
          dogrulandiAt={emailVerifiedAt}
          onEdit={() => setDuzenle("email")}
        />
        <BilgiKarti
          userId={userId}
          alan="phone"
          icon={IconPhone}
          etiket="TELEFON"
          deger={phone}
          dogrulandiAt={phoneVerifiedAt}
          onEdit={() => setDuzenle("phone")}
        />
      </div>

      <DuzenleModal
        userId={userId}
        alan={duzenle}
        mevcut={duzenle === "email" ? email : phone}
        dogrulanmis={Boolean(duzenle === "email" ? emailVerifiedAt : phoneVerifiedAt)}
        onClose={() => setDuzenle(null)}
      />
    </Card>
  );
}

/* ═══════════════════ TEK BİLGİ KARTI ═══════════════════ */

function BilgiKarti({
  userId, alan, icon, etiket, deger, dogrulandiAt, onEdit,
}: {
  userId: string;
  alan: "email" | "phone";
  icon: Parameters<typeof Icon>[0]["icon"];
  etiket: string;
  deger: string | null;
  dogrulandiAt: string | null;
  onEdit: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  const dogru = Boolean(dogrulandiAt);

  const cevir = async () => {
    setBusy(true);
    try {
      const res = await toggleVerification(userId, alan, !dogru);
      if (res.ok) toast.success(res.message ?? "Güncellendi");
      else toast.error("Güncellenemedi", res.message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-[16px] border p-4 transition-colors",
      dogru ? "border-green/35 bg-green-soft/40" : "border-line bg-field",
    )}>
      <div className="flex items-start gap-3">
        <span className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]",
          dogru ? "bg-green text-white" : "bg-chip text-muted",
        )}>
          <Icon icon={icon} size={18} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10.5px] font-bold tracking-[.12em] text-muted2">{etiket}</span>
          <span className="truncate text-[14px] font-semibold" title={deger ?? ""}>
            {deger ?? "—"}
          </span>
        </div>

        <button type="button" onClick={onEdit} title="Değiştir"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/70 text-ink2 transition-colors hover:border-ink/30 hover:text-ink">
          <Icon icon={IconEdit} size={13} />
        </button>
      </div>

      {/* Durum satırı — tik yerine açık metin ve tarih */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line2/70 pt-2.5">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-[12px] font-semibold",
          dogru ? "text-green" : "text-muted",
        )}>
          <Icon icon={dogru ? IconCheck : IconAlert} size={13} />
          {dogru ? "Doğrulandı" : "Doğrulanmadı"}
          {dogrulandiAt && (
            <span className="font-normal text-muted2">· {formatDate(dogrulandiAt)}</span>
          )}
        </span>

        <button type="button" onClick={() => void cevir()} disabled={busy || !deger}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors disabled:opacity-45",
            dogru
              ? "border-line text-muted hover:border-danger hover:text-danger"
              : "border-line text-green hover:border-green",
          )}>
          {dogru ? "Kaldır" : "Doğrulandı işaretle"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════ DÜZENLEME PENCERESİ ═══════════════════ */

function DuzenleModal({
  userId, alan, mevcut, dogrulanmis, onClose,
}: {
  userId: string;
  alan: "email" | "phone" | null;
  mevcut: string | null;
  /** Bu bilgi şu an doğrulanmış mı — kutunun başlangıç durumu */
  dogrulanmis: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(setUserContact, IDLE);
  useActionToast(state);

  useActionEffect(state, () => { onClose(); router.refresh(); });

  const mail = alan === "email";

  return (
    <Modal open={alan !== null} onClose={onClose}
      title={mail ? "E-posta değiştir" : "Telefon değiştir"}
      size="sm">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="userId" value={userId} />

        {mail ? (
          <Field label="Yeni e-posta" htmlFor="email">
            <Input id="email" name="email" type="email" required autoFocus
              defaultValue={mevcut ?? ""} placeholder="ornek@eposta.com" />
          </Field>
        ) : (
          <Field label="Yeni telefon" htmlFor="phone" hint="05XX XXX XX XX">
            <Input id="phone" name="phone" type="tel" required autoFocus
              defaultValue={mevcut ?? ""} placeholder="05XX XXX XX XX" />
          </Field>
        )}

        {/* ┌─ KUTU MEVCUT DURUMU YANSITIR ⚠️ ────────────────────┐
            │ Kutu her zaman boş açılıyordu. Doğrulanmış bir       │
            │ telefonu düzenleyip kaydeden yönetici, farkında      │
            │ olmadan doğrulamayı kaldırmış oluyordu.              │
            │                                                       │
            │ Artık mevcut duruma göre açılıyor: bilgi doğruysa    │
            │ işaretli gelir, kaydedince öyle kalır. Değeri        │
            │ değiştirip kutuyu kapatmak bilinçli bir tercih olur. │
            └───────────────────────────────────────────────────────┘ */}
        <div className="rounded-[14px] bg-field px-4 py-3.5">
          <Checkbox id="markVerified" name="markVerified"
            defaultChecked={dogrulanmis}
            label="Doğrulanmış olarak işaretle" />
          <p className="mt-2 text-[12px] leading-[1.55] text-muted">
            {dogrulanmis
              ? "Bu bilgi şu an doğrulanmış. Kutuyu açık bırakırsanız öyle kalır; kapatırsanız doğrulama kaldırılır."
              : "Yeni bilgi normalde doğrulanmamış sayılır — kimse o adrese ulaşıp teyit etmedi. Kişiyle görüşüp teyit ettiyseniz işaretleyin."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line2 pt-4">
          <Button type="submit" variant="ink" loading={pending}>Kaydet</Button>
          <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
        </div>
      </form>
    </Modal>
  );
}
