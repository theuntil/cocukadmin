"use client";

import * as React from "react";
import { Button, Card, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconFile, IconClose, IconTicket } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

interface Receipt {
  id: string; bucket_id: string; path: string;
  mime_type: string | null; uploaded_at: string;
}

/**
 * Dekont önizleme.
 *
 * Dekont kovası herkese açık değildir; bağlantı imzalı ve kısa ömürlüdür.
 * Böylece dosya adresi paylaşılsa bile üçüncü kişiler açamaz.
 */
export function ReceiptPreview({ receipts }: { receipts: Receipt[] }) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [full, setFull] = React.useState(false);
  const [isPdf, setIsPdf] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const open = async (r: Receipt) => {
    setLoading(r.id);
    setError(null);

    try {
      /* İmzalı adres yerine yetki kontrollü uç: R2'de imzalı okuma
         adresi üretilmiyor, erişim her istekte doğrulanıyor. */
      const adres = `/api/storage/dosya?kova=${encodeURIComponent(r.bucket_id || "payment-receipts")}`
        + `&yol=${encodeURIComponent(r.path)}`;

      setIsPdf((r.mime_type ?? "").includes("pdf")
        || r.path.toLowerCase().endsWith(".pdf"));
      setUrl(adres);
      setFull(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  if (receipts.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconFile} size={18} className="text-muted" />
        <H3 className="text-[18px]">Müşteri dekontu ({receipts.length})</H3>
      </div>

      {error && <span className="text-[13px] text-danger">{error}</span>}

      <div className="flex flex-col gap-2.5">
        {receipts.map((r) => (
          <div key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line2 px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13.5px] font-semibold">
                {r.path.split("/").pop()}
              </span>
              <span className="text-[12px] text-muted">
                {formatDate(r.uploaded_at, true)}
              </span>
            </div>
            <Button size="sm" variant="outline" loading={loading === r.id}
              onClick={() => void open(r)}>
              Görüntüle
            </Button>
          </div>
        ))}
      </div>

      {full && url && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[rgba(15,31,26,.92)]"
          onClick={() => setFull(false)}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[14px] font-semibold text-white">Dekont</span>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white">
                Yeni sekmede aç
              </a>
              <button type="button" onClick={() => setFull(false)} aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                <Icon icon={IconClose} size={17} />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto px-3 pb-4"
            onClick={(e) => e.stopPropagation()}>
            {isPdf ? (
              <object data={url} type="application/pdf"
                className="h-full w-full max-w-[900px] rounded-[14px] bg-white"
                aria-label="Dekont">
                <div className="flex h-full items-center justify-center rounded-[14px] bg-surface p-8">
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-[14px] font-semibold underline">
                    Dekontu yeni sekmede aç
                  </a>
                </div>
              </object>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={url} alt="Dekont"
                className="max-h-full w-auto max-w-full rounded-[14px] object-contain" />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
