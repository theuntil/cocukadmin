"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconFile, IconSend, IconArrowLeft, IconImage } from "@/components/ui/icons";
import { MailImageUpload } from "@/components/admin/mail-image-upload";
import { MailAttachments, type MailEk } from "@/components/admin/mail-attachments";
import { useActionEffect } from "@/components/ui/use-action-effect";
import { RecipientInput } from "@/components/admin/recipient-input";
import { sendMailAction } from "@/lib/actions/mail";
import { IDLE } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

type Format = "text" | "html";

/**
 * MAİL YAZMA
 *
 * Normal bir mail penceresi, tek sütun: Kime · Konu · Mesaj → Gönder.
 *
 * ★ Varsayılan kip DÜZ METİN. Alt satıra geçmeler, boş satırlar ve
 *   "> " ile başlayan alıntılar olduğu gibi korunur; kimse mail
 *   yazarken `<p>` etiketi düşünmez. HTML kipi isteyene açık.
 *
 * ★ Yanıtla / İlet'te özgün ileti sunucuda hazırlanıp buraya dolu
 *   gelir; altında da özgün mailin kendisi önizlenir.
 */
export function MailComposer({
  ready,
  readyReason,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  inReplyTo = "",
  mode = "new",
}: {
  ready: boolean;
  readyReason?: string;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  inReplyTo?: string;
  mode?: "new" | "reply" | "forward";
}) {
  const [state, action, pending] = useActionState(sendMailAction, IDLE);

  const [count, setCount] = React.useState(0);
  const [partnerLogo, setPartnerLogo] = React.useState("");
  const [ekler, setEkler] = React.useState<MailEk[]>([]);
  const [format, setFormat] = React.useState<Format>("text");
  const [body, setBody] = React.useState(
    initialBody || "Merhaba,\n\n\n\nSaygılarımızla,\nÇocuk Tribünü",
  );
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  /* Gönderim başarılıysa ek listesi sıfırlanır: aynı ekler ikinci
     maile taşınmasın. `useActionEffect` durumun kimliğini izliyor,
     tek seferde çalışıyor. */
  useActionEffect(state, () => setEkler([]));

  /* Yanıt yazarken imleç EN BAŞA gelsin: alıntının altına değil
     üstüne yazılır. Mail programlarının alışılmış davranışı. */
  React.useEffect(() => {
    if (mode === "new") return;
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(0, 0);
    el.scrollTop = 0;
  }, [mode]);

  /* Kip değişince gövde biçimi de çevrilir ki içerik bozulmasın:
     metinden HTML'e geçerken satırlar <br> olur, tersinde etiketler
     ayıklanır. Kullanıcı yazdığını kaybetmez. */
  const changeFormat = (next: Format) => {
    if (next === format) return;
    setBody((cur) => {
      if (next === "html") {
        return cur
          .split(/\n{2,}/)
          .map((p) => `<p>${p.split("\n").join("<br>\n")}</p>`)
          .join("\n");
      }
      return cur
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    });
    setFormat(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
      <Link href="/mail"
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> Mail
      </Link>

      {!ready && (
        <Alert tone="orange" title="Gönderim yapılamaz">
          {readyReason ?? "Mail ayarları eksik."}{" "}
          <Link href="/mail/ayarlar" className="font-semibold underline">Mail ayarlarına git</Link>
        </Alert>
      )}

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="inReplyTo" value={inReplyTo} />
        <input type="hidden" name="format" value={format} />

        <Card className="flex flex-col overflow-hidden">
          {/* Kime */}
          <div className="flex flex-col gap-2 border-b border-line2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-3 sm:px-5">
            <span className="shrink-0 pt-3 text-[13px] font-semibold text-muted sm:w-[52px]">
              Kime
            </span>
            <div className="min-w-0 flex-1">
              <RecipientInput name="to" initial={initialTo}
                error={state.fieldErrors?.to} onCountChange={setCount} />
            </div>
          </div>

          {/* Konu */}
          <div className="flex items-center gap-3 border-b border-line2 px-4 py-3.5 sm:px-5">
            <label htmlFor="subject" className="w-[52px] shrink-0 text-[13px] font-semibold text-muted">
              Konu
            </label>
            <input
              id="subject" name="subject" required maxLength={200}
              defaultValue={initialSubject}
              placeholder="Mailin konusu"
              className="min-w-0 flex-1 border-0 bg-transparent text-[14.5px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted2"
            />
          </div>
          {state.fieldErrors?.subject && (
            <div className="border-b border-line2 bg-danger-soft px-5 py-2 text-[12.5px] font-medium text-danger">
              {state.fieldErrors.subject}
            </div>
          )}

          {/* Başlık */}
          <div className="flex items-center gap-3 border-b border-line2 px-4 py-3.5 sm:px-5">
            <label htmlFor="heading" className="w-[52px] shrink-0 text-[13px] font-semibold text-muted">
              Başlık
            </label>
            <input
              id="heading" name="heading" maxLength={160}
              placeholder="İsteğe bağlı — örn. Sayın yetkili,"
              className="min-w-0 flex-1 border-0 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted2"
            />
          </div>

          {/* Biçim seçimi */}
          <div className="flex items-center gap-2 border-b border-line2 bg-field px-4 py-2.5 sm:px-5">
            <span className="mr-1 text-[12.5px] font-semibold text-muted">Biçim</span>
            <FormatTab active={format === "text"} onClick={() => changeFormat("text")} label="Metin" />
            <FormatTab active={format === "html"} onClick={() => changeFormat("html")} label="HTML" />
            <span className="ml-auto hidden text-[12px] text-muted2 sm:block">
              {format === "text"
                ? "Alt satıra geçmeler korunur"
                : "Etiketleri kendiniz yazarsınız"}
            </span>
          </div>

          {/* Mesaj */}
          <div className="px-4 py-4 sm:px-5">
            <textarea
              ref={bodyRef}
              id="bodyHtml" name="bodyHtml" required maxLength={60000} rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={format === "text" ? "Mesajınızı yazın…" : "<p>Mesajınız</p>"}
              className={cn(
                "w-full resize-y border-0 bg-transparent leading-[1.7] text-ink outline-none placeholder:text-muted2",
                format === "html" ? "font-mono text-[13px]" : "text-[14.5px]",
              )}
            />
          </div>
          {state.fieldErrors?.bodyHtml && (
            <div className="border-t border-line2 bg-danger-soft px-5 py-2 text-[12.5px] font-medium text-danger">
              {state.fieldErrors.bodyHtml}
            </div>
          )}

          {format === "html" && (
            <div className="border-t border-line2 bg-field px-4 py-2.5 text-[12px] text-muted sm:px-5">
              Paragraf <code className="rounded bg-chip px-1">&lt;p&gt;</code> ·
              kalın <code className="rounded bg-chip px-1">&lt;strong&gt;</code> ·
              satır sonu <code className="rounded bg-chip px-1">&lt;br&gt;</code> ·
              bağlantı <code className="rounded bg-chip px-1">&lt;a href=&quot;…&quot;&gt;</code>
            </div>
          )}
        </Card>

        {/* Ekler */}
        <Card className="flex flex-col gap-3.5 p-5">
          <span className="flex items-center gap-2.5 text-[14.5px] font-semibold">
            <Icon icon={IconFile} size={17} className="text-ink2" />
            Dosya ekleri
            <span className="font-normal text-muted">· isteğe bağlı</span>
          </span>

          {/* Ek listesi tek bir gizli alanda JSON olarak taşınıyor:
              form alanları çoklu değer taşıyamıyor ve her ek için ayrı
              alan üretmek hataya açık. */}
          <input type="hidden" name="attachments" value={JSON.stringify(ekler)} />

          <MailAttachments value={ekler} onChange={setEkler} disabled={pending} />
        </Card>

        {/* Karşı logo */}
        <Card className="flex flex-col gap-3.5 p-5">
          <span className="flex items-center gap-2.5 text-[14.5px] font-semibold">
            <Icon icon={IconImage} size={17} className="text-ink2" />
            Karşı logo
            <span className="font-normal text-muted">· isteğe bağlı</span>
          </span>
          <MailImageUpload
            name="partnerLogoUrl"
            label="Karşı kurumun logosu"
            hint="PNG · şeffaf zemin"
            value={partnerLogo}
            onChange={setPartnerLogo}
          />
        </Card>

        {/* Gönder */}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="ink" size="lg" loading={pending}
            disabled={!ready || count === 0}>
            <Icon icon={IconSend} size={17} />
            {pending ? "Gönderiliyor…" : count > 1 ? `${count} kişiye gönder` : "Gönder"}
          </Button>
          <span className="text-[12.5px] text-muted">
            Mail hemen gider ve <strong>Giden postalar</strong>&apos;a düşer.
          </span>
        </div>
      </form>
    </div>
  );
}

/** Metin / HTML seçici */
function FormatTab({
  active, onClick, label,
}: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "bg-solid text-on-solid"
          : "border border-line bg-surface text-ink2 hover:border-ink/30 hover:text-ink",
      )}>
      {label}
    </button>
  );
}
