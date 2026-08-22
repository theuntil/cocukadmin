import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { IconChild, IconArrowRight } from "@/components/ui/icons";
import type { OnboardingState } from "@/lib/onboarding";

/**
 * Zorunlu adımlar bitti ama isteğe bağlı olanlar (çocuk, adres) eksikse
 * gösterilen hatırlatma şeridi. Kapatılabilir olması gerekmiyor —
 * eksik tamamlanınca kendiliğinden kayboluyor.
 */
export function SetupBanner({ state }: { state: OnboardingState }) {
  /* Kart sanaldır: teslimat adresi istenmez. Geriye tek isteğe bağlı
     adım kalır — çocuk kaydı. */
  const missing: { label: string; icon: Parameters<typeof Icon>[0]["icon"]; step: string }[] = [];
  if (!state.hasChild) missing.push({ label: "Çocuk kaydı", icon: IconChild, step: "child" });

  if (missing.length === 0) return null;

  return (
    <Link href={`/kurulum?adim=${missing[0]!.step}`} className="block">
      <div className="ct-fade flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-accent-line bg-accent-soft px-5 py-4 transition-colors hover:bg-accent/25">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent text-accent-ink">
            <Icon icon={missing[0]!.icon} size={18} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold text-ink">
              Kurulumu tamamlayın
            </span>
            <span className="text-[13px] text-ink2">
              Eksik: {missing.map((m) => m.label).join(", ")} · kart başvurusu için gerekli
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-[13.5px] font-bold text-ink">
          Tamamla <Icon icon={IconArrowRight} size={15} />
        </span>
      </div>
    </Link>
  );
}
