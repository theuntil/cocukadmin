import { publicStorageUrl } from "@/lib/utils";

/**
 * Kullanıcı avatarı.
 *
 * Fotoğraf yoksa adın baş harflerinden bir yer tutucu üretilir. Renk, ada göre
 * deterministik seçilir — aynı kişi her yerde aynı rengi alır, liste görünümünde
 * kişiler birbirinden ayırt edilebilir olur.
 */

const TONES = [
  "bg-[#E8F0EA] text-[#2C5541]",
  "bg-[#FDF0E4] text-[#8A4B12]",
  "bg-[#E9EEF8] text-[#2A4776]",
  "bg-[#F6E9F2] text-[#6E2B57]",
  "bg-[#EAF2F2] text-[#215E5E]",
  "bg-[#F3EEE3] text-[#6B5426]",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toLocaleUpperCase("tr-TR");
}

function toneFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum = (sum + name.charCodeAt(i)) % 997;
  return TONES[sum % TONES.length]!;
}

const SIZES = {
  sm: "h-8 w-8 text-[11.5px] rounded-[10px]",
  md: "h-11 w-11 text-[14px] rounded-[13px]",
  lg: "h-16 w-16 text-[19px] rounded-[18px]",
  xl: "h-24 w-24 text-[28px] rounded-[24px]",
} as const;

export function Avatar({
  name, path, userId, size = "md", className = "",
}: {
  name: string;
  path?: string | null;
  /** Fotoğrafı güvenli uçtan çekmek için gerekli */
  userId?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  /* Fotoğraf kendi sunucumuz üzerinden gelir; avatars kovası kapalıdır.
     userId verilmezse (eski çağrılar) baş harfler gösterilir. */
  const url = userId && path ? `/api/avatar/${userId}` : null;
  const base = `flex shrink-0 items-center justify-center overflow-hidden font-semibold ${SIZES[size]} ${className}`;

  if (url) {
    return (
      <span className={`${base} bg-chip`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }

  return (
    <span className={`${base} ${toneFor(name)}`} aria-hidden>
      {initials(name)}
    </span>
  );
}
