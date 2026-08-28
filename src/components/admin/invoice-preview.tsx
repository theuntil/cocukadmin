"use client";

import * as React from "react";
import { Badge, Button, Card, H3 } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconInvoice, IconClose, IconDownload, IconUpload } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

/**
 * Fatura önizlemesi.
 *
 * Faturalar özel (public olmayan) bir bucket'ta durur, bu yüzden doğrudan URL
 * verilemez; görüntülemek için kısa ömürlü imzalı bağlantı üretilir.
 * Bağlantı istek anında alınır, sayfa kaynağına gömülmez.
 */
export function InvoicePreview({
  invoiceId, invoiceNumber, issuedAt, orderId,
}: {
  invoiceId: string;
  invoiceNumber: string | null;
  issuedAt: string | null;
  orderId: string;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [full, setFull] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isPdf, setIsPdf] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const supabase = createClient();
        const { data: inv, error: qErr } = await supabase
          .from("order_invoices").select("bucket_id,path").eq("id", invoiceId).maybeSingle();

        if (qErr) throw new Error(qErr.message);
        if (!inv?.path) throw new Error("Fatura dosyası bulunamadı.");

        const adres = `/api/storage/dosya?kova=${encodeURIComponent((inv.bucket_id as string) || "invoices")}`
          + `&yol=${encodeURIComponent(inv.path as string)}`;
        if (!alive) return;

        setUrl(adres);
        setIsPdf((inv.path as string).toLowerCase().endsWith(".pdf"));
      } catch (err) {
        if (alive) setError((err as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [invoiceId]);

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-green text-white">
              <Icon icon={IconInvoice} size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">
                Fatura {invoiceNumber ?? ""}
              </span>
              <span className="text-[12.5px] text-muted">
                {issuedAt ? formatDate(issuedAt) : ""} · kullanıcıya bildirildi
              </span>
            </div>
          </div>
          <Badge tone="green">Yüklendi</Badge>
        </div>

        {loading && (
          <div className="h-[280px] w-full animate-pulse rounded-[14px] bg-field" />
        )}

        {error && (
          <span className="text-[13px] text-danger">{error}</span>
        )}

        {url && !loading && (
          <>
            <button type="button" onClick={() => setFull(true)}
              className="group relative overflow-hidden rounded-[14px] border border-line bg-field">
              {isPdf ? (
                <object data={`${url}#toolbar=0&navpanes=0`} type="application/pdf"
                  className="pointer-events-none h-[320px] w-full" aria-label="Fatura önizleme" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="Fatura" className="max-h-[320px] w-full object-contain" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-[rgba(15,31,26,0)] text-[13.5px] font-semibold text-white opacity-0 transition-all group-hover:bg-[rgba(15,31,26,.45)] group-hover:opacity-100">
                Tam ekran görüntüle
              </span>
            </button>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setFull(true)}>
                Tam ekran
              </Button>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold hover:bg-chip">
                <Icon icon={IconDownload} size={14} /> İndir
              </a>
              <ReplaceInvoice orderId={orderId} />
            </div>
          </>
        )}
      </Card>

      {full && url && (
        <div role="dialog" aria-modal="true" aria-label="Fatura"
          className="ct-fade fixed inset-0 z-[100] flex flex-col bg-[rgba(8,16,13,.94)]"
          onClick={() => setFull(false)}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[14px] font-semibold text-white/80">
              Fatura {invoiceNumber ?? ""}
            </span>
            <button type="button" onClick={() => setFull(false)} aria-label="Kapat"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
              <Icon icon={IconClose} size={19} />
            </button>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto px-3 pb-4 sm:px-5 sm:pb-5"
            onClick={(e) => e.stopPropagation()}>
            {isPdf ? (
              <object data={url} type="application/pdf"
                className="h-full w-full max-w-[900px] rounded-[14px] bg-white"
                aria-label="Fatura" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="Fatura"
                className="max-h-full w-auto max-w-full rounded-[14px] object-contain" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Faturayı değiştirmek için yükleme formuna kaydırır */
function ReplaceInvoice({ orderId }: { orderId: string }) {
  return (
    <button type="button"
      onClick={() => {
        document.getElementById(`invoice-upload-${orderId}`)?.scrollIntoView({
          behavior: "smooth", block: "center",
        });
      }}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold hover:bg-chip">
      <Icon icon={IconUpload} size={14} /> Değiştir
    </button>
  );
}
