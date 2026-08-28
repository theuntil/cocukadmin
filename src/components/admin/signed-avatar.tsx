"use client";

import { Icon } from "@/components/ui/icon";
import { IconChild } from "@/components/ui/icons";

const SIZES = {
  sm: "h-9 w-9 text-[12px]",
  md: "h-12 w-12 text-[14px]",
  lg: "h-[72px] w-[72px] text-[20px]",
} as const;

/**
 * İmzalı bağlantıyla gösterilen avatar.
 *
 * Çocuk fotoğrafları özel kovada durduğu için herkese açık adres yoktur;
 * bağlantı sunucudan kısa ömürlü olarak alınır. Bağlantı yoksa baş harfler
 * gösterilir.
 */
export function SignedAvatar({
  name, url, size = "md",
}: { name: string; url: string | null; size?: keyof typeof SIZES }) {
  const initials = name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-display font-semibold text-muted ${SIZES[size]}`}>
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <Icon icon={IconChild} size={16} />
      )}
    </span>
  );
}
