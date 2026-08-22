"use client";

import { Icon } from "@/components/ui/icon";
import { IconChild } from "@/components/ui/icons";

/**
 * Çocuk fotoğrafı.
 *
 * Görsel doğrudan depolamadan DEĞİL, kendi sunucumuz üzerinden gelir:
 *   /api/child-photo/{childId}
 *
 * Bu uç her istekte oturumu doğrular. Adres kopyalanıp başka tarayıcıda
 * açılsa bile giriş yapmamış veya yetkisiz biri 403 alır. İmzalı bağlantı
 * kullanılsaydı, bağlantıya sahip herkes süresi dolana kadar açabilirdi.
 */
export function ChildPhoto({
  childId, name, hasPhoto, className, rounded = "full", fallbackIcon = true,
}: {
  childId: string;
  name: string;
  /** Kayıtta fotoğraf var mı — yoksa istek hiç yapılmaz */
  hasPhoto: boolean;
  className?: string;
  rounded?: "full" | "lg";
  fallbackIcon?: boolean;
}) {
  const initials = name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");

  const shape = rounded === "full" ? "rounded-full" : "rounded-[14px]";

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-chip font-display font-semibold text-muted ${shape} ${className ?? ""}`}>
      {hasPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={childPhotoUrl(childId)} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : fallbackIcon ? (
        <Icon icon={IconChild} size={16} />
      ) : null}
    </span>
  );
}

/** Oturum doğrulamalı fotoğraf adresi */
export function childPhotoUrl(childId: string): string {
  return `/api/child-photo/${childId}`;
}
