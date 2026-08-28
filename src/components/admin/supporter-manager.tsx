"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconEdit, IconTrash, IconHeart, IconFile, IconUpload, IconClose } from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveSupporter, deleteSupporter } from "@/lib/actions/content-extra";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/utils";

interface Supporter {
  id: string; name: string; slug: string; logo_path: string | null;
  description: string | null; website_url: string | null;
  document_path: string | null; document_type: string | null;
  sort_order: number; is_active: boolean;
}

export function SupporterManager({ supporters }: { supporters: Supporter[] }) {
  const [editing, setEditing] = React.useState<Supporter | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [removing, setRemoving] = React.useState<Supporter | null>(null);
  const delRef = React.useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Destekçiler</h1>
          <span className="text-[14px] text-muted">{supporters.length} destekçi</span>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Icon icon={IconPlus} size={17} /> Yeni destekçi
        </Button>
      </div>

      {supporters.length === 0 ? (
        <EmptyState icon={<Icon icon={IconHeart} size={26} />} title="Henüz destekçi yok"
          description="Eklediğiniz destekçiler ana sayfada hero'nun altında akan şeritte görünür."
          action={<Button onClick={() => setCreating(true)}>Yeni destekçi</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supporters.map((s) => {
            const logo = publicStorageUrl("galeri", s.logo_path);
            return (
              <Card key={s.id} className={`flex flex-col gap-4 p-5 ${!s.is_active ? "opacity-60" : ""}`}>
                <div className="flex h-20 items-center justify-center rounded-[12px] bg-field">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="max-h-14 max-w-[80%] object-contain" />
                  ) : (
                    <Icon icon={IconHeart} size={22} className="text-muted2" />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold">{s.name}</span>
                    {!s.is_active && <Badge tone="muted">Pasif</Badge>}
                  </div>
                  {s.description && (
                    <p className="line-clamp-2 text-[13px] leading-[1.5] text-muted">{s.description}</p>
                  )}
                </div>

                <div className="mt-auto flex gap-2 border-t border-line2 pt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)} className="flex-1">
                    <Icon icon={IconEdit} size={14} /> Düzenle
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(s)}
                    className="!text-danger hover:!bg-danger-soft">
                    <Icon icon={IconTrash} size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SupporterForm key={`new-${creating}`} open={creating}
        onClose={() => setCreating(false)} supporter={null} />
      <SupporterForm key={editing?.id ?? "edit-closed"} open={Boolean(editing)}
        onClose={() => setEditing(null)} supporter={editing} />

      <form ref={delRef} action={deleteSupporter} className="hidden">
        <input type="hidden" name="id" value={removing?.id ?? ""} />
      </form>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`${removing?.name ?? ""} silinsin mi?`}
        description="Destekçi ve destek belgesi kalıcı olarak silinir."
        confirmLabel="Evet, sil"
        onConfirm={() => { delRef.current?.requestSubmit(); setRemoving(null); }}
      />
    </div>
  );
}

function SupporterForm({
  open, onClose, supporter,
}: { open: boolean; onClose: () => void; supporter: Supporter | null }) {
  const [state, action, pending] = useActionState(saveSupporter, IDLE);
  const [logo, setLogo] = React.useState(supporter?.logo_path ?? "");
  const [doc, setDoc] = React.useState(supporter?.document_path ?? "");
  const [docType, setDocType] = React.useState(supporter?.document_type ?? "");
  const [uploading, setUploading] = React.useState(false);
  const [docError, setDocError] = React.useState<string | null>(null);
  const docRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLogo(supporter?.logo_path ?? "");
    setDoc(supporter?.document_path ?? "");
    setDocType(supporter?.document_type ?? "");
  }, [supporter]);
  useActionEffect(state, onClose);

  const uploadDoc = async (file: File) => {
    setDocError(null);
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      setDocError("PDF veya PNG/JPG yükleyin."); return;
    }
    if (file.size > 10 * 1024 * 1024) { setDocError("En fazla 10 MB."); return; }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `destek-belgeleri/${Date.now()}.${ext}`;
      const _yuk = await uploadToStorage({
        bucket: "galeri",
        path: path,
        file: file,
      });
      const error = _yuk.ok ? null : new Error(_yuk.error);
      if (error) throw new Error(error.message);
      setDoc(path);
      setDocType(file.type);
    } catch (err) {
      setDocError((err as Error).message);
    } finally {
      setUploading(false);
      if (docRef.current) docRef.current.value = "";
    }
  };

  return (
    <Modal open={open} onClose={onClose}
      title={supporter ? "Destekçiyi düzenle" : "Yeni destekçi"} size="md">
      <form action={action} className="flex flex-col gap-4">
        {supporter && <input type="hidden" name="id" value={supporter.id} />}
        <input type="hidden" name="logoPath" value={logo} />
        <input type="hidden" name="documentPath" value={doc} />
        <input type="hidden" name="documentType" value={docType} />

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Field label="Destekçi adı" htmlFor="sName" error={state.fieldErrors?.name}>
          <Input id="sName" name="name" required maxLength={200} defaultValue={supporter?.name ?? ""} />
        </Field>

        <Field label="Açıklama" htmlFor="sDesc" hint="detay sayfasında görünür">
          <Textarea id="sDesc" name="description" rows={3} maxLength={2000}
            defaultValue={supporter?.description ?? ""} />
        </Field>

        <Field label="Web sitesi" htmlFor="sUrl" hint="https:// ile başlamalı"
          error={state.fieldErrors?.websiteUrl}>
          <Input id="sUrl" name="websiteUrl" type="url" placeholder="https://ornek.com"
            defaultValue={supporter?.website_url ?? ""} />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink2">Logo</span>
          <MediaPicker value={logo} onChange={setLogo} bucket="galeri" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink2">Destek belgesi</span>
          {docError && <span className="text-[12.5px] font-medium text-danger">{docError}</span>}

          <input ref={docRef} type="file" accept="application/pdf,image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadDoc(f); }} />

          {doc ? (
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-green bg-green-soft px-4 py-3">
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold">
                <Icon icon={IconFile} size={15} /> Belge yüklendi
              </span>
              <button type="button" onClick={() => { setDoc(""); setDocType(""); }}
                aria-label="Kaldır" className="text-muted hover:text-danger">
                <Icon icon={IconClose} size={15} />
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="md" loading={uploading}
              onClick={() => docRef.current?.click()} className="self-start">
              <Icon icon={IconUpload} size={15} /> Belge yükle
            </Button>
          )}
          <span className="text-[12px] text-muted">PDF, PNG veya JPG · en fazla 10 MB</span>
        </div>

        <Field label="Sıra" htmlFor="sSort" hint="küçük olan önce görünür">
          <Input id="sSort" name="sortOrder" type="number" defaultValue={supporter?.sort_order ?? 100} />
        </Field>

        <Checkbox id="sActive" name="isActive" label="Aktif (sitede görünür)"
          defaultChecked={supporter?.is_active ?? true} />

        <Button type="submit" size="lg" loading={pending}>
          {supporter ? "Değişiklikleri kaydet" : "Destekçiyi ekle"}
        </Button>
      </form>
    </Modal>
  );
}
