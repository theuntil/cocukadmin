"use client";

import { Icon } from "@/components/ui/icon";
import { IconFootball } from "@/components/ui/icons";
import { publicStorageUrl, formatDate } from "@/lib/utils";
import { childPhotoUrl } from "@/components/panel/child-photo";

/**
 * Kombine kart görseli.
 *
 * Ana sayfadaki tanıtım kartıyla AYNI tasarım dili kullanılır (aynı zemin,
 * doku, ışık yansıması ve çip) — kullanıcı sitede gördüğü kartın aynısını
 * panelinde bulur. Farkı: gerçek veri, ortadaki QR ve çocuğun fotoğrafı.
 *
 * İki boyut:
 *   · "large"   — kart sayfaları: QR ortada, büyük ve okunaklı
 *   · "compact" — dar alanlar: QR yok, yalnızca kimlik bilgisi
 */
export function CardMockup({
  cardNumber, childId, childName, childPhoto, teamName, teamLogo,
  validUntil, lifecycle, qrUrl, size = "large",
}: {
  cardNumber: string;
  /** Fotoğrafı güvenli uçtan çekmek için gerekli */
  childId?: string | null;
  childName: string;
  childPhoto?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
  validUntil?: string | null;
  lifecycle?: string | null;
  qrUrl?: string | null;
  size?: "large" | "compact";
}) {
  const expired = lifecycle === "expired";
  const logo = publicStorageUrl("team-logos", teamLogo ?? null);
  /* Fotoğraf kendi sunucumuz üzerinden gelir; her istekte oturum
     doğrulanır. Adres paylaşılsa bile yetkisiz kişi göremez. */
  const photo = childPhoto && childId ? childPhotoUrl(childId) : null;
  const large = size === "large";

  return (
    <div className="relative">
      {/* Kartın altındaki hafif gölge katmanı — derinlik hissi */}
      <div aria-hidden
        className="absolute inset-x-6 -bottom-3 h-16 rounded-[22px] bg-ink/10 blur-2xl" />

      <div
        className={`relative isolate overflow-hidden border border-white/10 text-deep-ink ${
          large ? "rounded-[24px]" : "rounded-[18px]"} ${expired ? "grayscale" : ""}`}
        style={{
          background: "linear-gradient(155deg, #17362c 0%, var(--deep) 55%, #0b1f19 100%)",
          boxShadow: "var(--shadow)",
          /* Sabit oran yerine alt sınır: dar ekranda içerik taşmasın */
          minHeight: large ? 230 : 150,
        }}
      >
        {/* Kart yüzeyi dokusu */}
        <div aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,.05) 22px 23px)",
          }} />

        {/* Işık yansıması */}
        <div aria-hidden
          className="pointer-events-none absolute -left-1/4 -top-1/2 h-[160%] w-1/2 rotate-12 opacity-[.07]"
          style={{ background: "linear-gradient(90deg, transparent, #fff, transparent)" }} />

        <div className={`relative flex min-w-0 flex-col justify-between gap-4 ${
          large ? "p-5 sm:p-7" : "p-4 sm:p-5"}`}>

          {/* Üst: marka + takım logosu */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className={`font-bold tracking-[.2em] text-deep-muted ${
                large ? "text-[10px]" : "text-[9px]"}`}>
                ÇOCUK TRİBÜNÜ
              </span>
              <span className={`font-display font-semibold tracking-[-.02em] ${
                large ? "text-[17px] sm:text-[19px]" : "text-[14px]"}`}>
                Kombine Kart
              </span>
            </div>

            {logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logo} alt={teamName ?? ""}
                className={`shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,.28)] ${
                  large ? "h-16 w-16 sm:h-24 sm:w-24" : "h-11 w-11"}`} />
            ) : (
              <Icon icon={IconFootball} size={large ? 24 : 17} className="text-deep-muted" />
            )}
          </div>

          {/* Orta: QR — kartın merkezinde. Yoksa çip gösterilir. */}
          {large && qrUrl ? (
            <div className="flex items-center justify-center py-1">
              <span className="rounded-[16px] bg-white p-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,.45)] sm:p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Kart QR kodu"
                  className="h-[96px] w-[96px] sm:h-[130px] sm:w-[130px] lg:h-[146px] lg:w-[146px]" />
              </span>
            </div>
          ) : (
            <div aria-hidden
              className={`rounded-[7px] border border-[#d8b35a]/40 ${
                large ? "h-8 w-11" : "h-6 w-8"}`}
              style={{ background: "linear-gradient(135deg, #e9cf8a, #b8933f 45%, #e9cf8a)" }} />
          )}

          {/* Alt: kart sahibi + fotoğraf */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={`font-bold tracking-[.2em] text-deep-muted ${
                large ? "text-[9.5px]" : "text-[8.5px]"}`}>
                KART SAHİBİ
              </span>
              <span className={`truncate font-display font-semibold leading-tight tracking-[-.01em] ${
                large ? "text-[17px] sm:text-[21px]" : "text-[14px]"}`}>
                {childName}
              </span>
              <span className={`truncate font-mono tracking-[.1em] text-deep-muted ${
                large ? "text-[11.5px] sm:text-[13px]" : "text-[10px]"}`}>
                {cardNumber}
              </span>
              {validUntil && (
                <span className={`truncate text-deep-muted ${
                  large ? "text-[11px] sm:text-[12px]" : "text-[10px]"}`}>
                  {formatDate(validUntil)} tarihine kadar
                </span>
              )}
            </div>

            {/* Fotoğraf yalnızca VARSA gösterilir; yoksa boş kutu durmaz */}
            {photo && (
              <span className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-white/20 bg-white/10 ${
                large ? "h-[58px] w-[58px] rounded-[16px] sm:h-[80px] sm:w-[80px] sm:rounded-[20px]"
                      : "h-11 w-11 rounded-[12px]"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </span>
            )}
          </div>
        </div>

        {expired && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-14deg] rounded-[12px] border-[3px] border-white/55 px-6 py-2 text-[17px] font-bold tracking-[.1em] text-white/70">
            SÜRESİ DOLDU
          </span>
        )}
      </div>
    </div>
  );
}
