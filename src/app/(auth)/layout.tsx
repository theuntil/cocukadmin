import Link from "next/link";
import { Logo } from "@/components/site/nav";
import { ThemeToggle } from "@/components/site/theme";
import { getBranding, getAuthScreen } from "@/lib/branding";
import { getActivePlan } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

/**
 * GİRİŞ / KAYIT DÜZENİ
 *
 * Sağ panelin içeriği yönetim panelinden gelir: alıntı, açıklama, arka
 * plan görseli ve sayaçlar. Hepsi boş bırakılabilir.
 *
 * ★ Vurgu rengi kaldırıldı. Sayaçlar ve bağlantılar sarı yerine
 *   beyaz/nötr; giriş ekranı bir pazarlama sayfası değil, sakin olmalı.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [plan, branding, ekran] = await Promise.all([
    getActivePlan(),
    getBranding(),
    getAuthScreen(),
  ]);

  const price = plan ? formatMoney(plan.price, plan.currency) : "—";

  /* Sağ panelde gösterilecek bir şey var mı? Hepsi boşsa panel
     tamamen gizlenir ve form ortalanır — boş bir yarım ekran
     bırakmaktansa tek sütuna dönmek daha temiz. */
  const sagPanelDolu = Boolean(ekran.quote || ekran.quoteNote || ekran.image || ekran.showStats);

  return (
    <div className={sagPanelDolu ? "grid min-h-dvh lg:grid-cols-[1fr_1.1fr]" : "min-h-dvh"}>
      {/* ── Sol: form ── */}
      <div className="flex flex-col bg-page">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" aria-label="Anasayfa">
            <Logo size={branding.sizePanel} light={branding.logoLight} dark={branding.logoDark} />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="ct-rise w-full max-w-[420px]">{children}</div>
        </div>

        <div className="px-6 py-6 text-center text-[12.5px] text-muted sm:px-10">
          © {new Date().getFullYear()} Çocuk Tribünü ·{" "}
          <Link href="/kvkk" className="hover:text-ink">KVKK</Link> ·{" "}
          <Link href="/gizlilik" className="hover:text-ink">Gizlilik</Link>
        </div>
      </div>

      {/* ── Sağ: görsel panel ── */}
      {sagPanelDolu && (
        <div className="relative hidden overflow-hidden bg-deep p-12 lg:flex lg:flex-col lg:justify-between">
          {ekran.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ekran.image} alt="" aria-hidden
                className="absolute inset-0 h-full w-full object-cover" />
              {/* Perde: görselin üstündeki beyaz yazılar her fotoğrafta
                  okunsun. Fotoğraf açık renkliyse perdesiz okunmuyor. */}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
            </>
          ) : (
            /* Görsel yoksa çok hafif bir doku — düz siyah fazla sert. */
            <div aria-hidden className="absolute inset-0 opacity-[.06]"
              style={{ backgroundImage: "radial-gradient(circle at 25% 20%, #fff 0, transparent 45%), radial-gradient(circle at 80% 75%, #fff 0, transparent 50%)" }} />
          )}

          {/* Sağ panelde logo YOK: sol üstte zaten var, ikinci kez
              göstermek gereksiz tekrar. */}
          <div />

          <div className="relative flex flex-col gap-6">
            {ekran.quote && (
              <blockquote className="font-display text-[clamp(28px,2.6vw,40px)] font-semibold leading-[1.14] tracking-[-.03em] text-white">
                &ldquo;{ekran.quote}&rdquo;
              </blockquote>
            )}

            {ekran.quoteNote && (
              <p className="max-w-[440px] text-[15px] leading-[1.65] text-white/75">
                {ekran.quoteNote}
              </p>
            )}

            {ekran.showStats && (
              <div className="flex gap-8 border-t border-white/15 pt-6">
                <Sayac deger="81" etiket="şehir" />
                <Sayac deger={price} etiket="yıllık kombine" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Sayaç — sarı vurgu yerine beyaz; giriş ekranı sakin kalsın */
function Sayac({ deger, etiket }: { deger: string; etiket: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[26px] font-semibold text-white">{deger}</span>
      <span className="text-[12.5px] text-white/60">{etiket}</span>
    </div>
  );
}
