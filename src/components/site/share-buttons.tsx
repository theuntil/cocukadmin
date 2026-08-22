"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  IconTwitter, IconFacebook, IconMail, IconCopy, IconCheck, IconShare,
} from "@/components/ui/icons";

/**
 * Paylaşım düğmeleri.
 *
 * Mobilde cihazın kendi paylaşım penceresi açılır (tek dokunuş, tüm uygulamalar);
 * desteklenmeyen tarayıcılarda ağ ağ düğmelerine düşer.
 */
export function ShareButtons({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = React.useState(false);
  const [canNative, setCanNative] = React.useState(false);
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    setUrl(window.location.href);
    setCanNative(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const share = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Kullanıcı vazgeçtiyse sessiz kal
    }
  };

  const copy = () => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const enc = encodeURIComponent;
  const links = [
    { label: "X'te paylaş", icon: IconTwitter,
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { label: "Facebook'ta paylaş", icon: IconFacebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "E-posta ile gönder", icon: IconMail,
      href: `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}` },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {canNative && (
        <button type="button" onClick={share}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90">
          <Icon icon={IconShare} size={15} /> Paylaş
        </button>
      )}

      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
          aria-label={l.label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-chip hover:text-ink">
          <Icon icon={l.icon} size={16} />
        </a>
      ))}

      <button type="button" onClick={copy} aria-label="Bağlantıyı kopyala"
        className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold transition-colors ${
          copied ? "border-green bg-green-soft text-green"
                 : "border-line text-muted hover:bg-chip hover:text-ink"}`}>
        <Icon icon={copied ? IconCheck : IconCopy} size={15} />
        {copied ? "Kopyalandı" : "Bağlantı"}
      </button>
    </div>
  );
}
