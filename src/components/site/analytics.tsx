"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Sayfa görüntülenme takibi.
 *
 * Gizlilik kararları:
 * · IP ve user-agent sunucuya gönderilmez, saklanmaz.
 * · Tekil ziyaretçi için günlük rotasyonlu rastgele bir kimlik kullanılır.
 *   Bu kimlik sessionStorage'da tutulur, gün değişince yenilenir — kişi
 *   günler arası takip edilemez.
 * · Yönlendiren adresin yalnızca alan adı sunucuda saklanır.
 */
export function Analytics({ pageType = "page", entityId }: { pageType?: string; entityId?: string }) {
  const pathname = usePathname();
  const sent = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!pathname || sent.current === pathname) return;
    sent.current = pathname;

    // Panel ve yönetim sayfaları izlenmez
    if (pathname.startsWith("/panel") || pathname.startsWith("/yonetim") || pathname.startsWith("/kurulum")) {
      return;
    }

    const track = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const storageKey = `ct-fp-${today}`;

        let fingerprint = sessionStorage.getItem(storageKey);
        if (!fingerprint) {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          fingerprint = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
          // Önceki günlerin kimliklerini temizle
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k?.startsWith("ct-fp-") && k !== storageKey) sessionStorage.removeItem(k);
          }
          sessionStorage.setItem(storageKey, fingerprint);
        }

        const width = window.innerWidth;
        const device = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";

        // Aynı siteden gelen yönlendirmeler kaynak sayılmaz
        const ref = document.referrer;
        const sameOrigin = ref.startsWith(window.location.origin);

        const supabase = createClient();
        await supabase.rpc("track_page_view", {
          p_path: pathname,
          p_page_type: pageType,
          p_entity_id: entityId ?? null,
          p_referrer: sameOrigin ? null : ref || null,
          p_device: device,
          p_fingerprint: fingerprint,
          p_is_bot: /bot|crawl|spider|slurp|bingpreview|headless/i.test(navigator.userAgent),
        });
      } catch {
        // Analitik başarısız olursa sayfa etkilenmesin
      }
    };

    // Sayfa yüklenmesini yavaşlatmamak için beklet
    const id = setTimeout(() => { void track(); }, 900);
    return () => clearTimeout(id);
  }, [pathname, pageType, entityId]);

  return null;
}
