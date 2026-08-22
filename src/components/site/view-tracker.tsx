"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Görüntülenme sayacı. Ana tabloyu her istekte güncellemek yerine
 * hafif bir olay kaydı yazar; veritabanı bunları 10 dakikada bir toplar.
 */
export function ViewTracker({ contentType, contentId }: { contentType: string; contentId: string }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const key = `ct-view-${contentType}-${contentId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* sessionStorage yoksa devam */ }

    const supabase = createClient();
    void supabase.rpc("track_content_view", {
      p_content_type: contentType,
      p_content_id: contentId,
      p_session_hash: null,
    });
  }, [contentType, contentId]);

  return null;
}
