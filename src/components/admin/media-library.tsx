"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconImage, IconUpload, IconCopy, IconTrash, IconClose, IconFile, IconCheck } from "@/components/ui/icons";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { saveMedia, deleteMedia } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl, formatDate } from "@/lib/utils";

interface MediaItem {
  id: string; path: string; file_name: string; mime_type: string | null;
  file_size: number | null; folder: string; alt_text: string | null; created_at: string;
}

const MAX = 25 * 1024 * 1024;

function humanSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaLibrary({
  items, folders, activeFolder,
}: { items: MediaItem[]; folders: string[]; activeFolder: string }) {
  const [preview, setPreview] = React.useState<MediaItem | null>(null);
  const [removing, setRemoving] = React.useState<MediaItem | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const deleteRef = React.useRef<HTMLFormElement>(null);

  const copyUrl = async (item: MediaItem) => {
    const url = publicStorageUrl("galeri", item.path);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(item.id);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* pano izni yoksa sessiz geç */ }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-[-.03em]">Medya</h1>
          <span className="text-[14px] text-muted">{items.length} dosya</span>
        </div>
      </div>

      <UploadBox folders={folders} />

      {/* Klasör filtresi */}
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/medya"
            className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              !activeFolder ? "bg-solid text-on-solid" : "border border-line bg-surface text-ink2 hover:border-ink/25"
            }`}>
            Tümü
          </Link>
          {folders.map((f) => (
            <Link key={f} href={`/medya?klasor=${encodeURIComponent(f)}`}
              className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                activeFolder === f ? "bg-solid text-on-solid" : "border border-line bg-surface text-ink2 hover:border-ink/25"
              }`}>
              {f}
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<Icon icon={IconImage} size={26} />} title="Henüz dosya yok"
          description="Yukarıdaki alandan görsel veya belge yükleyin." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => {
            const url = publicStorageUrl("galeri", item.path);
            const isImage = (item.mime_type ?? "").startsWith("image/");

            return (
              <Card key={item.id} className="group flex flex-col overflow-hidden">
                <button type="button" onClick={() => setPreview(item)}
                  className="relative block aspect-square w-full overflow-hidden bg-chip">
                  {isImage && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={item.alt_text ?? ""} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Icon icon={IconFile} size={26} className="text-muted2" />
                    </span>
                  )}
                </button>

                <div className="flex flex-col gap-2 p-3">
                  <span className="truncate text-[12.5px] font-semibold" title={item.file_name}>
                    {item.file_name}
                  </span>
                  <span className="text-[11.5px] text-muted">{humanSize(item.file_size)}</span>

                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => void copyUrl(item)}
                      aria-label="URL'yi kopyala"
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-line text-[11.5px] font-semibold transition-colors hover:border-ink/25">
                      <Icon icon={copied === item.id ? IconCheck : IconCopy} size={13} />
                      {copied === item.id ? "Kopyalandı" : "URL"}
                    </button>
                    <button type="button" onClick={() => setRemoving(item)} aria-label="Sil"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-line text-muted transition-colors hover:border-danger hover:text-danger">
                      <Icon icon={IconTrash} size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Önizleme */}
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)}
        title={preview?.file_name ?? ""} size="lg">
        {preview && (
          <div className="flex flex-col gap-4">
            {(preview.mime_type ?? "").startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicStorageUrl("galeri", preview.path) ?? ""} alt={preview.alt_text ?? ""}
                className="max-h-[52vh] w-full rounded-[14px] object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[14px] bg-chip">
                <Icon icon={IconFile} size={30} className="text-muted2" />
              </div>
            )}

            <div className="flex flex-col gap-2 text-[13.5px]">
              <Row label="Klasör" value={preview.folder} />
              <Row label="Tür" value={preview.mime_type ?? "—"} />
              <Row label="Boyut" value={humanSize(preview.file_size)} />
              <Row label="Yüklenme" value={formatDate(preview.created_at, true)} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-bold tracking-[.06em] text-muted2">URL</span>
              <div className="flex gap-2">
                <input readOnly value={publicStorageUrl("galeri", preview.path) ?? ""}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 flex-1 rounded-[12px] border border-line bg-field px-3.5 font-mono text-[12.5px] outline-none" />
                <Button type="button" variant="outline" size="md"
                  onClick={() => void copyUrl(preview)}>
                  <Icon icon={copied === preview.id ? IconCheck : IconCopy} size={15} />
                </Button>
              </div>
            </div>

            <Button type="button" variant="outline" size="lg"
              onClick={() => { setRemoving(preview); setPreview(null); }}
              className="!border-danger !text-danger hover:!bg-danger-soft">
              <Icon icon={IconTrash} size={15} /> Dosyayı sil
            </Button>
          </div>
        )}
      </Modal>

      <form ref={deleteRef} action={deleteMedia} className="hidden">
        <input type="hidden" name="id" value={removing?.id ?? ""} />
      </form>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Dosya silinsin mi?"
        description={removing ? `"${removing.file_name}" kalıcı olarak silinecek. Bu dosyayı kullanan sayfalarda görsel kaybolur.` : undefined}
        confirmLabel="Evet, sil"
        onConfirm={() => { deleteRef.current?.requestSubmit(); setRemoving(null); }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line2 pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

/** Sürükle-bırak destekli yükleme alanı */
function UploadBox({ folders }: { folders: string[] }) {
  const [state, action, pending] = useActionState(saveMedia, IDLE);
  const [uploaded, setUploaded] = React.useState<{
    path: string; name: string; size: number; mime: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX) { setError("Dosya en fazla 25 MB olabilir."); return; }

    setBusy(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const path = `${Date.now()}-${safeName}`;
      const _yuk = await uploadToStorage({
        bucket: "galeri",
        path: path,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
      if (upErr) throw new Error(upErr.message);

      setUploaded({ path, name: file.name, size: file.size, mime: file.type });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  React.useEffect(() => { if (state.ok) setUploaded(null); }, [state.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6">
      {error && <Alert tone="danger">{error}</Alert>}
      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      {!uploaded ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false);
              const f = e.dataTransfer.files?.[0]; if (f) void upload(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[16px] border-2 border-dashed px-6 py-10 transition-colors ${
              dragging ? "border-solid bg-chip" : "border-line bg-field hover:border-ink/25"
            }`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-solid text-on-solid">
              <Icon icon={busy ? IconUpload : IconUpload} size={20} />
            </span>
            <span className="text-[14.5px] font-semibold">
              {busy ? "Yükleniyor…" : "Dosyayı sürükleyin veya tıklayın"}
            </span>
            <span className="text-[12.5px] text-muted">
              Görsel, PDF veya MP4 · en fazla 25 MB
            </span>
          </div>

          <input ref={inputRef} type="file" className="sr-only"
            accept="image/*,application/pdf,video/mp4"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        </>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="path" value={uploaded.path} />
          <input type="hidden" name="fileName" value={uploaded.name} />
          <input type="hidden" name="fileSize" value={uploaded.size} />
          <input type="hidden" name="mimeType" value={uploaded.mime} />

          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-green bg-green-soft px-4 py-3">
            <span className="truncate text-[13.5px] font-semibold">{uploaded.name}</span>
            <button type="button" onClick={() => setUploaded(null)} aria-label="Vazgeç"
              className="shrink-0 text-muted hover:text-danger">
              <Icon icon={IconClose} size={16} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Klasör" htmlFor="folder" hint="küçük harf ve tire">
              <Input id="folder" name="folder" defaultValue="genel" pattern="[a-z0-9\-]+"
                list="folder-list" maxLength={40} />
              <datalist id="folder-list">
                {folders.map((f) => <option key={f} value={f} />)}
              </datalist>
            </Field>
            <Field label="Alternatif metin" htmlFor="altText" hint="erişilebilirlik için">
              <Input id="altText" name="altText" maxLength={300} />
            </Field>
          </div>

          <Button type="submit" size="lg" loading={pending}>Kütüphaneye ekle</Button>
        </form>
      )}
    </Card>
  );
}
