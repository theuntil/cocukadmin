"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/lib/actions/types";

/**
 * SUNUCU EYLEMİ SONUCUNU BİLDİRİME ÇEVİRİR
 *
 * ┌─ NEDEN ORTAK BİR KANCA ───────────────────────────────────────┐
 * │ Her form kendi hata metnini alanın altında gösteriyordu. Uzun  │
 * │ formlarda o metin ekranın dışında kalıyor; kullanıcı düğmeye   │
 * │ basıyor, hiçbir şey olmamış gibi görünüyor.                    │
 * │                                                                 │
 * │ Bu kanca `useActionState` sonucunu izleyip üstten bildirim      │
 * │ çıkarıyor. Sayfa içi mesajlar kalıyor — biri ayrıntı, diğeri    │
 * │ dikkat çekme işi görüyor.                                       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Kullanımı:
 *   const [state, action, pending] = useActionState(kaydet, IDLE);
 *   useActionToast(state, { basari: "Kaydedildi" });
 */
export function useActionToast(
  state: ActionState,
  opts?: { basari?: string; hata?: string; sessizBasari?: boolean },
) {
  const toast = useToast();

  /* Aynı durum nesnesi için iki kez bildirim çıkmasın: React her
     render'da aynı `state`i verebiliyor. */
  const sonRef = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (state === sonRef.current) return;
    if (!state || (state.ok === undefined && !state.message && !state.fieldErrors)) return;

    sonRef.current = state;

    if (state.ok) {
      if (!opts?.sessizBasari) toast.success(opts?.basari ?? state.message ?? "İşlem tamamlandı");
      return;
    }

    /* Alan hataları varsa metni sayfa içinde zaten görünüyor; burada
       yalnızca dikkat çekiliyor. */
    if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      toast.warning(opts?.hata ?? "Eksik veya hatalı alan", "İşaretli alanları kontrol edin.");
      return;
    }

    if (state.message) {
      toast.error(opts?.hata ?? "İşlem tamamlanamadı", state.message);
    }
  }, [state, opts, toast]);
}
