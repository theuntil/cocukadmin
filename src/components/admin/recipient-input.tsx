"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconClose } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * ALICI GİRİŞİ — etiketli.
 *
 * Adresi yazıp <kbd>Enter</kbd>'a basınca etiket olur. Virgül, noktalı
 * virgül ve boşluk da aynı işi görür; yapıştırılan uzun listeler
 * kendiliğinden ayrılır.
 *
 * ★ Alandan çıkınca (blur) yazılmış olan adres de eklenir. Kullanıcının
 *   "yazdım ama Enter'a basmadım" diye maili eksik göndermesi en can
 *   sıkıcı hata olurdu.
 *
 * ★ Boş alanda <kbd>Backspace</kbd> son etiketi siler — mail
 *   programlarının alışılmış davranışı.
 *
 * ★ Tekrar eden adres eklenmez, hepsi küçük harfe çevrilir.
 *
 * Sunucuya gizli alanla virgülle ayrılmış olarak gider.
 */
export function RecipientInput({
  name,
  initial = "",
  error,
  onCountChange,
}: {
  name: string;
  initial?: string;
  error?: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = React.useState<string[]>(() =>
    [...new Set(
      initial.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean),
    )],
  );
  const [draft, setDraft] = React.useState("");
  const [invalid, setInvalid] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { onCountChange?.(items.length); }, [items, onCountChange]);

  /** Metni adreslere ayırır ve geçerli olanları ekler */
  const commit = (raw: string): boolean => {
    const parts = raw.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return true;

    const bad = parts.find((p) => !EMAIL.test(p));
    if (bad) {
      setInvalid(bad);
      return false;
    }

    setInvalid(null);
    setItems((prev) => [...new Set([...prev, ...parts])]);
    return true;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") {
      if (!draft.trim()) {
        if (e.key === "Tab") return;   // boşken Tab normal davranmalı
        e.preventDefault();
        return;
      }
      e.preventDefault();
      if (commit(draft)) setDraft("");
      return;
    }

    if (e.key === "Backspace" && draft === "" && items.length > 0) {
      e.preventDefault();
      setItems((prev) => prev.slice(0, -1));
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[\s,;]/.test(text)) return;    // tek adres: normal yapıştır
    e.preventDefault();
    if (commit(text)) setDraft("");
  };

  const remove = (v: string) => {
    setItems((prev) => prev.filter((x) => x !== v));
    setInvalid(null);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Sunucuya giden değer */}
      <input type="hidden" name={name} value={items.join(", ")} />

      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-[12px] border bg-field px-3 py-2 transition-colors",
          invalid || error ? "border-danger" : "border-line focus-within:border-green",
        )}
      >
        {items.map((v) => (
          <span key={v}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-chip py-1 pl-3 pr-1.5 text-[13px] font-medium text-ink">
            <span className="truncate">{v}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(v); }}
              aria-label={`${v} adresini kaldır`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger">
              <Icon icon={IconClose} size={11} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setInvalid(null); }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          /* Alandan çıkarken yazılmış adres kaybolmasın */
          onBlur={() => { if (draft.trim() && commit(draft)) setDraft(""); }}
          type="text"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={items.length === 0 ? "ornek@kurum.gov.tr" : "Başka adres ekle…"}
          className="min-w-[160px] flex-1 border-0 bg-transparent py-1 text-[14.5px] text-ink outline-none placeholder:text-muted2"
        />
      </div>

      {invalid ? (
        <span className="text-[12.5px] font-medium text-danger">
          Geçersiz adres: {invalid}
        </span>
      ) : error ? (
        <span className="text-[12.5px] font-medium text-danger">{error}</span>
      ) : (
        <span className="text-[12px] text-muted2">
          Adresi yazıp <strong className="text-muted">Enter</strong>&apos;a basın.
          Birden fazla alıcı ekleyebilirsiniz.
        </span>
      )}
    </div>
  );
}
