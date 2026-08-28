"use client";

import * as React from "react";
import { markReadOnServerAction } from "@/lib/actions/mail";

/**
 * Panelde açılan iletiyi mail SUNUCUSUNDA da okundu işaretler.
 *
 * ★ Görünmez bileşen: hiçbir şey çizmez, yalnızca bir kez çalışır.
 *   Normal bir mail programı gibi davranmak için — panelde okuduğun
 *   mail telefonunda da okunmuş görünsün.
 *
 * ★ Sunucu bileşeninden çağrılamaz: IMAP bağlantısı sayfanın açılmasını
 *   geciktirirdi. Arka planda, sayfa çizildikten SONRA yapılır.
 *
 * ★ Başarısızlığı sessiz: okundu bilgisi zaten panelde kayıtlı.
 */
export function MarkReadOnServer({ uid, folder }: { uid: number; folder: string | null }) {
  const done = React.useRef(false);

  React.useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markReadOnServerAction(uid, folder).catch(() => null);
  }, [uid, folder]);

  return null;
}
