"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

/**
 * HugeIcons (free sürüm) sarmalayıcı.
 * Kullanım:  <Icon icon={Home01Icon} size={20} />
 * Paketler:  @hugeicons/react + @hugeicons/core-free-icons
 */
export function Icon({ size = 20, strokeWidth = 1.8, ...rest }: HugeiconsIconProps) {
  return <HugeiconsIcon size={size} strokeWidth={strokeWidth} {...rest} />;
}

export { HugeiconsIcon };
