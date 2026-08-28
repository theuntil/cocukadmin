"use client";

import { Icon } from "@/components/ui/icon";
import { IconChild } from "@/components/ui/icons";

const SIZES = {
  sm: "h-9 w-9 text-[12px]",
  md: "h-12 w-12 text-[14px]",
  lg: "h-[72px] w-[72px] text-[20px]",
} as const;

/**
 * Çocuk fotoğrafı.
 *
 * Görsel doğrudan depolamadan DEĞİL, kendi sunucumuz üzerinden gelir:
 *   /api/child-photo/{childId}
 *
 * Bu uç her istekte oturumu doğrular; adres kopyalanıp başka tarayıcıda
 * açılsa bile yetkisiz kişi 403 alır. İmzalı bağlantıda bu koruma yoktur —
 * bağlantıya sahip herkes süresi dolana kadar açabilir.
 */
export function ChildPhoto({
  childId, name, hasPhoto, size = "sm",
}: {
  childId: string;
  name: string;
  hasPhoto: boolean;
  size?: keyof typeof SIZES;
}) {
  const initials = name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-display font-semibold text-muted ${SIZES[size]}`}>
      {hasPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={`/api/child-photo/${childId}`} alt=""
          className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <Icon icon={IconChild} size={16} />
      )}
    </span>
  );
}
