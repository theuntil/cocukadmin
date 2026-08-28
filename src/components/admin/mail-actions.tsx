"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconStar, IconTrash } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { deleteMailAction, flagMail } from "@/lib/actions/mail";

/**
 * Silme düğmesi.
 *
 * ★ ONAY İSTER: silme geri alınamaz bir işlem ve mail SUNUCUDAN da
 *   kalkıyor. Tek tıkla olmamalı.
 *
 * ★ Sunucudan silinemezse panel kaydı da silinmez; kullanıcı hatayı
 *   görür. "Panelde yok ama telefonda var" durumu oluşmaz.
 */
export function DeleteMailButton({
  id, subject, compact = false, onDeleted,
}: {
  id: string;
  subject: string | null;
  compact?: boolean;
  /** Silinince nereye gidilecek (detay sayfasında liste) */
  onDeleted?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteMailAction(id);
      if (!res.ok) {
        setError(res.message ?? "Silinemedi.");
        return;
      }
      setOpen(false);
      if (onDeleted) router.push(onDeleted);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {compact ? (
        <button type="button" onClick={() => setOpen(true)} title="Sil"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink2 transition-colors hover:border-danger hover:text-danger">
          <Icon icon={IconTrash} size={14} />
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Icon icon={IconTrash} size={15} /> Sil
        </Button>
      )}

      <ConfirmDialog
        open={open}
        onClose={() => { setOpen(false); setError(null); }}
        loading={busy}
        title="Mail silinsin mi?"
        description={
          error
            ? error
            : `“${subject || "(konu yok)"}” hem panelden hem mail sunucusundan silinecek. ` +
              "Sunucuda çöp kutusuna taşınır."
        }
        confirmLabel="Sil"
        onConfirm={() => void run()}
      />
    </>
  );
}

/** Yıldızlama */
export function StarButton({ id, starred }: { id: string; starred: boolean }) {
  const router = useRouter();
  const [on, setOn] = React.useState(starred);
  const [busy, setBusy] = React.useState(false);

  const toggle = async () => {
    setBusy(true);
    const next = !on;
    setOn(next);   // iyimser: tıklama anında değişir
    try {
      const res = await flagMail(id, "is_starred", next);
      if (!res.ok) setOn(!next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void toggle()} disabled={busy}
      title={on ? "Yıldızı kaldır" : "Yıldızla"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
        /* `accent-ink` koyu temada neredeyse siyah; koyu zeminde ikon
           kayboluyordu. Yıldız turuncu: iki temada da net. */
        on ? "border-orange-line bg-orange-soft text-orange" : "border-line text-ink2 hover:border-ink/30"
      }`}>
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon icon={IconStar} size={14} />}
    </button>
  );
}
