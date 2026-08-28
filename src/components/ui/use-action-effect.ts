"use client";

import * as React from "react";
import type { ActionState } from "@/lib/actions/types";

/**
 * SUNUCU EYLEMİ BAŞARILI OLUNCA BİR KEZ ÇALIŞIR
 *
 * ┌─ NEDEN GEREKLİ ⚠️ ─────────────────────────────────────────────┐
 * │ Yaygın kalıp şuydu:                                             │
 * │                                                                  │
 * │   React.useEffect(() => {                                        │
 * │     if (state.ok) { onClose(); router.refresh(); }               │
 * │   }, [state.ok, onClose, router]);                               │
 * │                                                                  │
 * │ `onClose` üst bileşende `() => setX(null)` olarak yazılıyor —    │
 * │ yani HER RENDER'DA YENİ BİR FONKSİYON. Bağımlılık değişmiş       │
 * │ sayılıyor, efekt tekrar çalışıyor, `router.refresh()` yeniden    │
 * │ render tetikliyor ve döngü kapanmıyor.                           │
 * │                                                                  │
 * │ Sonuç: sayfa sürekli yenileniyor, tıklamalar işlemiyor —         │
 * │ ekran donmuş gibi görünüyor. Değişiklik KAYDEDİLİYOR ama         │
 * │ kullanıcı hiçbir şeye dokunamıyor.                               │
 * │                                                                  │
 * │ Bu kanca durumun KİMLİĞİNİ takip ediyor: aynı sonuç için işlem   │
 * │ bir kez çalışıyor, geri çağrının kimliği değişse bile.           │
 * └──────────────────────────────────────────────────────────────────┘
 */
export function useActionEffect(state: ActionState, fn: () => void) {
  /* Geri çağrı ref'te tutuluyor: bağımlılığa girmiyor, dolayısıyla
     her render'da yeniden oluşması efekti tetiklemiyor. */
  const fnRef = React.useRef(fn);
  React.useEffect(() => { fnRef.current = fn; });

  const islenenRef = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (!state.ok) return;
    if (islenenRef.current === state) return;   // bu sonuç zaten işlendi
    islenenRef.current = state;
    fnRef.current();
  }, [state]);
}
