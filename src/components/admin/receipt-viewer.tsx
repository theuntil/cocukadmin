"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconFile, IconClose, IconSearch } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

interface Receipt {
  id: string; bucket_id: string; path: string;
  mime_type: string | null; uploaded_at: string;
}

/**
 * Dekont görüntüleyici.
 *
 * Ödemeye bağlı dekontları küçük önizleme olarak gösterir; tıklayınca tam
 * ekran açılır. Yönetici belgeyi görmeden onay veremesin diye onay
 * kartının içine yerleştirilmiştir.
 *
 * Dekont kovası herkese açık değildir: bağlantı imzalı ve 10 dakika
 * ömürlüdür, adres paylaşılsa bile üçüncü kişiler açamaz.
 */
export function ReceiptViewer({ paymentId }: { paymentId: string }) {
  const [items, setItems] = React.useState<(Receipt & { url: string })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [full, setFull] = React.useState<string | null>(null);
  const [fullIsPdf, setFullIsPdf] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const supabase = createClient();

        const { data, error: err } = await supabase
          .from("payment_receipts")
          .select("id, bucket_id, path, mime_type, uploaded_at")
          .eq("payment_id", paymentId)
          .order("uploaded_at", { ascending: false });

        if (err) throw new Error(err.message);
        if (!alive) return;

        const rows = (data ?? []) as Receipt[];
        const withUrls: (Receipt & { url: string })[] = [];

        for (const r of rows) {
          const signed = { signedUrl: `/api/storage/dosya?kova=${encodeURIComponent(r.bucket_id || "payment-receipts")}&yol=${encodeURIComponent(r.path)}` };

          if (signed?.signedUrl) withUrls.push({ ...r, url: signed.signedUrl });
        }

        if (alive) setItems(withUrls);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [paymentId]);

  const isPdf = (r: Receipt) =>
    (r.mime_type ?? "").includes("pdf") || r.path.toLowerCase().endsWith(".pdf");

  if (loading) {
    return <span className="h-[160px] w-full animate-pulse rounded-[14px] bg-surface/60" />;
  }

  if (error) {
    return (
      <span className="rounded-[12px] bg-surface px-4 py-3 text-[13px] text-danger">
        Dekont yüklenemedi: {error}
      </span>
    );
  }

  if (items.length === 0) {
    return (
      <span className="rounded-[12px] bg-surface px-4 py-3 text-[13px] text-muted">
        Bu ödeme için yüklenmiş dekont bulunamadı.
      </span>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setFull(r.url); setFullIsPdf(isPdf(r)); }}
            className="group relative flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface text-left transition-colors hover:border-ink/25"
          >
            <span className="flex h-[180px] items-center justify-center overflow-hidden bg-chip">
              {isPdf(r) ? (
                <span className="flex flex-col items-center gap-2">
                  <Icon icon={IconFile} size={28} className="text-muted2" />
                  <span className="text-[12px] font-semibold text-muted">PDF belge</span>
                </span>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.url} alt="Dekont" loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}

              <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Icon icon={IconSearch} size={14} />
              </span>
            </span>

            <span className="flex flex-col gap-0.5 px-3.5 py-2.5">
              <span className="truncate text-[12.5px] font-semibold">
                {r.path.split("/").pop()}
              </span>
              <span className="text-[11.5px] text-muted">
                {formatDate(r.uploaded_at, true)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Tam ekran */}
      {full && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[rgba(15,31,26,.94)]"
          onClick={() => setFull(null)}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[14px] font-semibold text-white">Dekont</span>
            <div className="flex items-center gap-2">
              <a href={full} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/25">
                Yeni sekmede aç
              </a>
              <button type="button" onClick={() => setFull(null)} aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                <Icon icon={IconClose} size={17} />
              </button>
            </div>
          </div>

          {/* min-h-0 olmadan büyük belgeler ekranı taşırır */}
          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto px-3 pb-4 sm:px-5 sm:pb-5"
            onClick={(e) => e.stopPropagation()}>
            {fullIsPdf ? (
              <object data={full} type="application/pdf"
                className="h-full w-full max-w-[900px] rounded-[14px] bg-white"
                aria-label="Dekont">
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[14px] bg-surface p-8 text-center">
                  <span className="text-[14px] text-ink2">
                    Belge bu tarayıcıda gösterilemiyor.
                  </span>
                  <a href={full} target="_blank" rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white">
                    Yeni sekmede aç
                  </a>
                </div>
              </object>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={full} alt="Dekont"
                className="max-h-full w-auto max-w-full rounded-[14px] object-contain" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
