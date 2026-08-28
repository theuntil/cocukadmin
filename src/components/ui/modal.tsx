"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { IconClose } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Erişilebilir modal: Esc ile kapanır, odak içeride kalır,
 * arka plan kaydırması kilitlenir. Mobilde alttan açılır sayfa gibi davranır.
 */
export function Modal({
  open, onClose, title, description, children, size = "md", closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    // Açılışta ilk odaklanabilir öğeye odaklan
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),a[href]',
      )?.focus();
    }, 40);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const width = size === "sm" ? "max-w-[420px]" : size === "lg" ? "max-w-[720px]" : "max-w-[560px]";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="ct-fade absolute inset-0 bg-[rgba(15,31,26,.55)] backdrop-blur-[2px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={panelRef}
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-line bg-surface shadow-[0_40px_90px_-30px_rgba(15,31,26,.5)]",
          "max-h-[92dvh] rounded-t-[26px] sm:max-h-[88dvh] sm:rounded-[26px]",
          width,
        )}
        style={{ animation: "ct-modal-in .28s cubic-bezier(.22,1,.36,1) both" }}
      >
        {/* Mobilde tutamaç */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />

        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[20px] font-semibold tracking-[-.02em]">{title}</h2>
            {description && <p className="text-[13.5px] leading-[1.55] text-muted">{description}</p>}
          </div>
          <button
            type="button" onClick={onClose} aria-label="Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink"
          >
            <Icon icon={IconClose} size={18} />
          </button>
        </div>

        <div className="ct-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Onay kutusu — çıkış yap, sil gibi geri dönüşü olmayan işlemler için */
export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = "Onayla",
  cancelLabel = "Vazgeç", tone = "danger", loading = false, extra,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "green";
  loading?: boolean;
  /** Düğmelerin üstünde ek içerik — ör. "eminim" onay kutusu */
  extra?: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      {extra && <div className="mb-4">{extra}</div>}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button" onClick={onConfirm} disabled={loading}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-[14.5px] font-semibold text-white",
            "transition-transform duration-200 active:scale-[.97] disabled:opacity-60",
            tone === "danger" ? "bg-danger" : "bg-solid",
          )}
        >
          {loading && <span className="ct-spin inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent" />}
          {confirmLabel}
        </button>
        <button
          type="button" onClick={onClose} disabled={loading}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-line bg-surface px-5 py-3 text-[14.5px] font-semibold text-ink transition-colors hover:border-ink/25 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
