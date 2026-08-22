"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconUpload, IconFile, IconCheck } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { attachReceipt } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function ReceiptUpload({ paymentId, disabled }: { paymentId: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(attachReceipt, IDLE);
  useActionToast(state);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [path, setPath] = React.useState<string | null>(null);

  const onPick = async (f: File | null) => {
    setUploadError(null);
    setPath(null);
    if (!f) { setFile(null); return; }

    if (!ALLOWED.includes(f.type)) {
      setUploadError("Yalnızca JPG, PNG, WEBP veya PDF yükleyebilirsiniz.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setUploadError("Dosya en fazla 10 MB olabilir.");
      return;
    }

    setFile(f);
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Oturum bulunamadı");

      // Klasör adı kullanıcı kimliği olmalı — Storage politikası bunu şart koşuyor
      const ext = f.name.split(".").pop() ?? "bin";
      const key = `${auth.user.id}/${paymentId}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("payment-receipts")
        .upload(key, f, { contentType: f.type, upsert: false });

      if (error) throw error;
      setPath(key);
    } catch (err) {
      setUploadError((err as Error).message ?? "Dosya yüklenemedi.");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  if (state.ok) {
    return (
      <Alert tone="green" title="Dekontunuz alındı">
        <span className="flex items-start gap-2">
          <Icon icon={IconCheck} size={16} className="mt-[2px] shrink-0" />
          {state.message}
        </span>
      </Alert>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-7">
      <div className="flex flex-col gap-1">
        <span className="font-display text-[19px] font-semibold tracking-[-.02em]">Dekont yükleyin</span>
        <span className="text-[13.5px] text-muted">
          Ödemeyi yaptıktan sonra dekontunuzu yüklerseniz onay çok daha hızlı olur. Zorunlu değildir.
        </span>
      </div>

      {(uploadError || (state.message && !state.ok)) && (
        <Alert tone="danger">{uploadError ?? state.message}</Alert>
      )}

      <label
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-[18px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          path ? "border-accent-line bg-accent-soft" : "border-line bg-field hover:border-accent-line"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file" className="sr-only" accept={ALLOWED.join(",")} disabled={disabled || uploading}
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <span className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${path ? "bg-accent text-accent-ink" : "bg-chip text-muted"}`}>
          <Icon icon={path ? IconCheck : uploading ? IconFile : IconUpload} size={22} className={uploading ? "ct-spin" : ""} />
        </span>
        <span className="text-[14.5px] font-semibold text-ink">
          {uploading ? "Yükleniyor…" : path ? file?.name : "Dosya seçin veya buraya sürükleyin"}
        </span>
        <span className="text-[12.5px] text-muted">JPG, PNG, WEBP veya PDF · en fazla 10 MB</span>
      </label>

      {path && (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="paymentId" value={paymentId} />
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="mime" value={file?.type ?? ""} />
          <input type="hidden" name="size" value={String(file?.size ?? 0)} />
          <Button type="submit" size="lg" variant="solid" loading={pending}>Dekontu gönder</Button>
        </form>
      )}
    </Card>
  );
}
