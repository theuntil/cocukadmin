"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconPlus, IconEdit, IconShield } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { saveLegal } from "@/lib/actions/content-extra";
import { IDLE } from "@/lib/actions/types";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { formatDate } from "@/lib/utils";

interface LegalDoc {
  id: string; slug: string; title: string; body: string;
  version: number; effective_from: string; is_active: boolean;
}

export function LegalManager({ documents }: { documents: LegalDoc[] }) {
  const [editing, setEditing] = React.useState<LegalDoc | null>(null);
  const [creating, setCreating] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Politikalar</h1>
          <span className="text-[14px] text-muted">
            {documents.length} belge · içerikler kod içinde sabit değildir
          </span>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Icon icon={IconPlus} size={17} /> Yeni politika
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={<Icon icon={IconShield} size={26} />} title="Henüz politika yok"
          action={<Button onClick={() => setCreating(true)}>Yeni politika</Button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold">{d.title}</span>
                  <Badge tone="muted">v{d.version}</Badge>
                  {!d.is_active && <Badge tone="orange">Pasif</Badge>}
                </div>
                <span className="font-mono text-[12.5px] text-muted">
                  /{d.slug} · yürürlük {formatDate(d.effective_from)}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(d)}>
                <Icon icon={IconEdit} size={14} /> Düzenle
              </Button>
            </Card>
          ))}
        </div>
      )}

      <LegalForm key={`new-${creating}`} open={creating}
        onClose={() => setCreating(false)} doc={null} />
      <LegalForm key={editing?.id ?? "edit-closed"} open={Boolean(editing)}
        onClose={() => setEditing(null)} doc={editing} />
    </div>
  );
}

function LegalForm({
  open, onClose, doc,
}: { open: boolean; onClose: () => void; doc: LegalDoc | null }) {
  const [state, action, pending] = useActionState(saveLegal, IDLE);
  useActionEffect(state, onClose);

  return (
    <Modal open={open} onClose={onClose}
      title={doc ? `${doc.title} · v${doc.version}` : "Yeni politika"}
      description={doc ? "Kaydedince sürüm numarası artar ve yürürlük tarihi bugün olur." : undefined}
      size="lg">
      <form action={action} className="flex flex-col gap-4">
        {doc && <input type="hidden" name="id" value={doc.id} />}

        {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

        <Field label="Başlık" htmlFor="lTitle" error={state.fieldErrors?.title}>
          <Input id="lTitle" name="title" required maxLength={200} defaultValue={doc?.title ?? ""} />
        </Field>

        <Field label="Kısa yol" htmlFor="lSlug" hint="boşsa başlıktan üretilir">
          <Input id="lSlug" name="slug" maxLength={120} defaultValue={doc?.slug ?? ""} />
        </Field>

        <Field label="İçerik" htmlFor="lBody" hint="HTML kullanabilirsiniz"
          error={state.fieldErrors?.body}>
          <Textarea id="lBody" name="body" required minLength={20} rows={16}
            defaultValue={doc?.body ?? ""} className="font-mono text-[13px]" />
        </Field>

        <Checkbox id="lActive" name="isActive" label="Aktif (sitede görünür)"
          defaultChecked={doc?.is_active ?? true} />

        <Button type="submit" size="lg" loading={pending}>
          {doc ? "Yeni sürüm olarak kaydet" : "Politikayı ekle"}
        </Button>
      </form>
    </Modal>
  );
}
