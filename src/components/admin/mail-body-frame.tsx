"use client";

import * as React from "react";

/**
 * Mail gövdesini yalıtılmış çerçevede gösterir.
 *
 * ★ NEDEN IFRAME: mail HTML'i kendi `<style>` bloğunu, tablo düzenini ve
 *   mutlak renklerini taşıyor. Doğrudan sayfaya basılsaydı panelin
 *   stilleri maili, mailin stilleri paneli bozardı.
 *
 * ★ `sandbox` içinde script ÇALIŞMAZ — gelen kutusundaki bir mail
 *   panelde kod çalıştıramaz.
 *
 * ★ Yükseklik içeriğe göre ayarlanır ama bir TABANIN altına inmez:
 *   iframe kendi ölçtüğü yüksekliği dayatıyor ve kısa içeriklerde
 *   sarmalayıcı içinde ezik duruyordu.
 */
/**
 * Bağlantıları yeni sekmeye yönlendirir.
 *
 * ★ Bu olmadan mail içindeki bağlantıya tıklayınca sayfa ÇERÇEVENİN
 *   İÇİNDE açılıyordu: kullanıcı mailin gövdesinde bir web sitesi
 *   görüyor, geri dönemiyordu. `<base target="_blank">` tek satırda
 *   çözüyor; her bağlantıya tek tek dokunmaya gerek yok.
 *
 * ★ `<head>` yoksa (düz gövde) baştan eklenir.
 */
function withBaseTarget(html: string): string {
  const base = '<base target="_blank" rel="noopener noreferrer">';
  if (/<base\b/i.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
  }
  return `${base}${html}`;
}

export function MailBodyFrame({
  html,
  minHeight = 520,
  maxHeight = 2400,
  className,
}: {
  html: string;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(minHeight);

  React.useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const measure = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      const h = Math.max(
        doc.body.scrollHeight,
        doc.documentElement?.scrollHeight ?? 0,
      );
      setHeight(Math.min(Math.max(h + 8, minHeight), maxHeight));
    };

    /* srcdoc yazıldıktan sonra ölçüm bir kere yetmiyor: görseller geç
       yükleniyor ve yükseklik sonradan değişiyor. Hem load olayında hem
       kısa aralıklarla ölçülüyor. */
    frame.addEventListener("load", measure);
    const timers = [80, 300, 900, 1800].map((ms) => window.setTimeout(measure, ms));

    return () => {
      frame.removeEventListener("load", measure);
      timers.forEach(window.clearTimeout);
    };
  }, [html, minHeight, maxHeight]);

  return (
    <iframe
      ref={ref}
      title="E-posta önizlemesi"
      srcDoc={withBaseTarget(html)}
      /* Script çalışmaz (gelen mail panelde kod çalıştıramaz) ama
         bağlantılar yeni sekmede açılabilsin diye popup izni verilir. */
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      className={className ?? "w-full rounded-[16px] border border-line bg-white"}
      style={{ height, display: "block" }}
    />
  );
}
