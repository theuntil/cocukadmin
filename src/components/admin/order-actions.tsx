"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Field, H3, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconInvoice, IconCard, IconClose, IconUpload, IconBank, IconTrash,
  IconClock, IconCheck, IconAlert,
} from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { attachInvoice, changeCardStatus, cancelOrder, deleteOrder, reviewPayment, markPaymentPaid } from "@/lib/actions/orders";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { uploadToStorage, safeFileName } from "@/lib/storage/client";
import { removeFromStorage } from "@/lib/storage/remove";
import { createClient } from "@/lib/supabase/client";
import { ReceiptViewer } from "@/components/admin/receipt-viewer";

interface OrderInfo {
  id: string; orderNumber: string; status: string; amount: number;
  paymentId: string | null; paymentStatus: string | null;
  cardId: string | null; cardStatus: string | null;
  hasInvoice: boolean;
}

/* Kart dijitaldir: kargo, teslimat VE HAZIRLIK aşaması yoktur.
   "Beklemede" ve "Hazırlanıyor" kaldırıldı — ödeme tamamlanınca kart
   anında aktifleşiyor, arada bir durum yok. Eski kayıtlarda bu
   değerler görünebilir; etiketleri duruyor ama seçilemiyorlar. */
const CARD_STATUSES = [
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Askıya alındı" },
  { value: "expired", label: "Süresi doldu" },
  { value: "cancelled", label: "İptal" },
];

export function OrderActions({
  order, permissions,
}: {
  order: OrderInfo;
  permissions: { finance: boolean; shipping: boolean; cancel: boolean };
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Kart durumu en üstte: en sık kullanılan işlem */}
      {permissions.shipping && order.cardId && (
        <CardStatusForm cardId={order.cardId} current={order.cardStatus} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {permissions.finance && order.paymentStatus === "awaiting_review" && order.paymentId && (
          <PaymentReview paymentId={order.paymentId} />
        )}

        {permissions.finance && order.paymentId
          && order.paymentStatus && !["paid", "refunded", "cancelled"].includes(order.paymentStatus) && (
          <MarkPaid paymentId={order.paymentId} />
        )}

        {permissions.finance && (
          <InvoiceUpload orderId={order.id} orderNumber={order.orderNumber} amount={order.amount} />
        )}
      </div>
    </div>
  );
}

/* ── Ödeme onay / red ── */
function PaymentReview({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(reviewPayment, IDLE);
  useActionToast(state);
  const [rejecting, setRejecting] = React.useState(false);

  return (
    <Card className="flex flex-col gap-4 border-orange-line bg-orange-bg p-6">
      <H3 className="text-[18px] text-orange-ink">Dekont incelemesi</H3>
      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      {/* Dekontun kendisi burada görünür: yönetici belgeyi görmeden
          onay veremesin. Bağlantı imzalı ve kısa ömürlüdür. */}
      <ReceiptViewer paymentId={paymentId} />

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="paymentId" value={paymentId} />
        <input type="hidden" name="decision" value={rejecting ? "reject" : "approve"} />

        {rejecting && (
          <Field label="Red gerekçesi" htmlFor="rejectReason" error={state.fieldErrors?.reason}>
            <Textarea id="rejectReason" name="reason" required minLength={5} maxLength={500}
              placeholder="Kullanıcıya gösterilecek açıklama" />
          </Field>
        )}

        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" size="md" loading={pending}
            onClick={() => setRejecting(false)}>
            Onayla
          </Button>
          <Button type={rejecting ? "submit" : "button"} size="md" variant="outline"
            onClick={() => { if (!rejecting) setRejecting(true); }}>
            {rejecting ? "Reddet" : "Reddet…"}
          </Button>
          {rejecting && (
            <Button type="button" size="md" variant="ghost" onClick={() => setRejecting(false)}>
              Vazgeç
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

/* ── Fatura yükleme ── */
function InvoiceUpload({
  orderId, orderNumber, amount,
}: { orderId: string; orderNumber: string; amount: number }) {
  const [state, action, pending] = useActionState(attachInvoice, IDLE);
  const [path, setPath] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [size, setSize] = React.useState(0);
  const [mime, setMime] = React.useState("application/pdf");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) { setError("Dosya en fazla 10 MB olabilir."); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError("Yalnızca PDF, JPG veya PNG yükleyebilirsiniz."); return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "pdf";
      const target = `${orderNumber}/${Date.now()}.${ext}`;
      const _yuk = await uploadToStorage({
        bucket: "invoices",
        path: target,
        file: file,
      });
      const upErr = _yuk.ok ? null : new Error(_yuk.error);
      if (upErr) throw new Error(upErr.message);

      setPath(target);
      setFileName(file.name);
      setSize(file.size);
      setMime(file.type);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (state.ok) {
    return (
      <Card className="flex flex-col gap-3 border-green bg-green-soft p-6">
        <H3 className="text-[18px]">Fatura yüklendi</H3>
        <p className="text-[14px] text-ink2">{state.message}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconInvoice} size={18} className="text-muted" />
        <H3 className="text-[18px]">Fatura yükle</H3>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="path" value={path} />
        <input type="hidden" name="mime" value={mime} />
        <input type="hidden" name="size" value={size} />

        <Field label="Fatura numarası" htmlFor="invNo" error={state.fieldErrors?.invoiceNumber}>
          <Input id="invNo" name="invoiceNumber" required maxLength={60} placeholder="CT2026000123" />
        </Field>

        <Field label="Tutar" htmlFor="invAmount" hint="boş bırakılırsa sipariş tutarı">
          <Input id="invAmount" name="amount" type="number" step="0.01" min={0} defaultValue={amount} />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink2">Fatura dosyası</span>
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

          {path ? (
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-green bg-green-soft px-4 py-3">
              <span className="truncate text-[13.5px] font-semibold">{fileName}</span>
              <button type="button" aria-label="Kaldır"
                onClick={() => { setPath(""); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }}
                className="shrink-0 text-muted hover:text-danger">
                <Icon icon={IconClose} size={16} />
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="md" loading={uploading}
              onClick={() => inputRef.current?.click()} className="self-start">
              <Icon icon={IconUpload} size={15} /> Dosya seç
            </Button>
          )}
          <span className="text-[12px] text-muted">PDF, JPG veya PNG · en fazla 10 MB</span>
        </div>

        <Field label="Not" htmlFor="invNote" hint="isteğe bağlı">
          <Input id="invNote" name="note" maxLength={500} />
        </Field>

        <Button type="submit" size="lg" loading={pending} disabled={!path}>
          Faturayı kaydet ve bildir
        </Button>
        <span className="text-[12.5px] text-muted">
          Kaydedince kullanıcıya otomatik e-posta gider.
        </span>
      </form>
    </Card>
  );
}

/* ── Kart durumu: liste yerine kutucuk seçimi ──
   Her durum kendi ikonu ve açıklamasıyla görünür; geçersiz geçişler
   tıklanamaz. Kural veritabanındakinin aynısıdır. */

const CARD_STATUS_BOXES = [
  { value: "active",     label: "Aktif",        icon: IconCheck,
    hint: "Kullanıma hazır, kullanıcıya e-posta gider" },
  { value: "suspended",  label: "Askıda",       icon: IconAlert,
    hint: "Geçici olarak durduruldu" },
  { value: "expired",    label: "Süresi doldu", icon: IconClock,
    hint: "Yenilenmesi gerekiyor" },
  { value: "cancelled",  label: "İptal",        icon: IconClose,
    hint: "Geri alınamaz" },
];

const CARD_ALLOWED: Record<string, string[]> = {
  /* Eski kayıtlar bu durumlarda kalmış olabilir; çıkış yolu bırakıldı
     ki takılıp kalmasınlar. Ama bu durumlara GİRİŞ yok. */
  pending:    ["active", "cancelled"],
  processing: ["active", "cancelled"],
  active:     ["expired", "suspended", "cancelled"],
  suspended:  ["active", "cancelled", "expired"],
  expired:    ["active", "cancelled"],
  cancelled:  [],
  ready:      ["active", "cancelled", "suspended"],
  shipped:    ["active", "cancelled"],
  delivered:  ["active", "suspended", "cancelled"],
  lost:       ["processing", "active", "cancelled"],
};

function CardStatusForm({ cardId, current }: { cardId: string; current: string | null }) {
  const [state, action, pending] = useActionState(changeCardStatus, IDLE);
  const [picked, setPicked] = React.useState<string | null>(null);
  const cur = current ?? "pending";
  const allowed = CARD_ALLOWED[cur] ?? [];

  React.useEffect(() => { if (state.ok) setPicked(null); }, [state.ok]);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={IconCard} size={18} className="text-muted" />
          <H3 className="text-[18px]">Kart durumu</H3>
        </div>
        <Link href={`/kartlar/${cardId}`}
          className="text-[13px] font-semibold text-muted hover:text-ink">
          Kart detayı →
        </Link>
      </div>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CARD_STATUS_BOXES.map((s) => {
          const isCurrent = s.value === cur;
          const canPick = allowed.includes(s.value);
          const isPicked = picked === s.value;

          return (
            <button
              key={s.value}
              type="button"
              disabled={!canPick || pending}
              onClick={() => setPicked(isPicked ? null : s.value)}
              className={`flex flex-col items-center gap-2 rounded-[16px] border-2 p-4 text-center transition-all ${
                isCurrent
                  ? "border-ink bg-chip"
                  : isPicked
                    ? "border-solid bg-chip"
                    : canPick
                      ? "border-line bg-surface hover:border-ink/25 hover:bg-chip/40"
                      : "cursor-not-allowed border-line2 bg-field opacity-40"
              }`}
            >
              <Icon icon={s.icon} size={19} />
              <span className="text-[12.5px] font-semibold leading-tight">{s.label}</span>
              {isCurrent && (
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">
                  ŞU AN
                </span>
              )}
            </button>
          );
        })}
      </div>

      {picked && (
        <form action={action} className="flex flex-col gap-3 border-t border-line2 pt-4">
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="status" value={picked} />

          <div className="flex items-start gap-2.5 rounded-[12px] bg-chip px-4 py-3">
            <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0 text-muted" />
            <span className="text-[13px] leading-[1.55] text-ink2">
              <strong>{CARD_STATUS_BOXES.find((s) => s.value === picked)?.label}</strong> yapılacak.{" "}
              {CARD_STATUS_BOXES.find((s) => s.value === picked)?.hint}.
            </span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>Durumu değiştir</Button>
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>Vazgeç</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/**
 * Sipariş kaydını TAMAMEN siler.
 *
 * ┌─ İPTAL İLE SİLME AYNI ŞEY DEĞİL ──────────────────────────────┐
 * │ İptal: kayıt kalır, durumu değişir, muhasebe izi korunur.      │
 * │ Silme: kayıt tamamen kalkar — test siparişi, yanlış giriş.     │
 * │                                                                 │
 * │ İkisi de gerekli, bu yüzden ayrı düğmeler.                      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Ödenmiş siparişte sunucu ek onay istiyor; kullanıcı kutucuğu
 * işaretlemeden silinmiyor.
 */
export function DeleteOrder({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter();
  const toast = useToast();
  const [asking, setAsking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [force, setForce] = React.useState(false);
  const [uyari, setUyari] = React.useState<string | null>(null);

  const sil = async () => {
    setBusy(true);
    try {
      const res = await deleteOrder(orderId, force);
      if (res.ok) {
        toast.success(res.message ?? "Sipariş silindi");
        setAsking(false);
        router.push("/siparisler");
      } else {
        /* Ödenmiş sipariş uyarısı pencerede kalsın: kullanıcı okuyup
           onay kutusunu işaretleyebilsin. */
        setUyari(res.message ?? "Silinemedi");
        toast.error("Silinemedi", res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => { setAsking(true); setUyari(null); }}
        className="!text-danger hover:!bg-danger-soft">
        <Icon icon={IconTrash} size={15} /> Kaydı sil
      </Button>

      <ConfirmDialog
        open={asking}
        onClose={() => { setAsking(false); setForce(false); setUyari(null); }}
        loading={busy}
        title={`${orderNumber} kaydı silinsin mi?`}
        description={
          uyari ??
          "Sipariş kaydı, bağlı kombine kart ve sertifikası tamamen silinecek. " +
          "Kartı korumak istiyorsanız silmek yerine İPTAL edin. Bu işlem geri alınamaz."
        }
        confirmLabel="Kalıcı olarak sil"
        onConfirm={() => void sil()}
        extra={
          <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] bg-field px-3.5 py-3">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--solid)]" />
            <span className="text-[12.5px] leading-[1.5] text-ink2">
              Ödemesi alınmış olsa bile sil.
              <span className="block text-muted">
                Muhasebe izi kopar — yalnızca test kayıtları için kullanın.
              </span>
            </span>
          </label>
        }
      />
    </>
  );
}

/* ── Sipariş iptali — sayfa başlığındaki düğmeden açılır ── */
export function CancelOrder({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [state, action, pending] = useActionState(cancelOrder, IDLE);
  const [asking, setAsking] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setAsking(true)}
        className="!text-danger hover:!bg-danger-soft">
        <Icon icon={IconClose} size={15} /> İptal et
      </Button>

      {state.message && !state.ok && (
        <span className="text-[12.5px] font-medium text-danger">{state.message}</span>
      )}

      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="reason" value="Yönetici tarafından iptal edildi" />
      </form>

      <ConfirmDialog
        open={asking}
        onClose={() => setAsking(false)}
        loading={pending}
        title={`${orderNumber} iptal edilsin mi?`}
        description="Sipariş, bekleyen ödeme ve kart iptal edilecek. Kullanıcıya bildirim gidecek. Bu işlem geri alınamaz."
        confirmLabel="Evet, iptal et"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}

/* ── Manuel ödeme onayı ──
   Havale/EFT veya elden ödeme alındığında kullanılır. Ödeme "ödendi"
   işaretlenince kart otomatik oluşur ve kullanıcıya bildirim gider. */
function MarkPaid({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(markPaymentPaid, IDLE);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2.5">
        <Icon icon={IconBank} size={18} className="text-muted" />
        <H3 className="text-[18px]">Ödeme alındı olarak işaretle</H3>
      </div>

      <p className="text-[13.5px] leading-[1.6] text-ink2">
        Havale, EFT veya elden ödeme aldıysanız kullanın. İşaretlendiğinde
        kart otomatik oluşturulur ve kullanıcıya bilgilendirme gider.
      </p>

      {state.message && <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="paymentId" value={paymentId} />

        <Field label="Dekont / referans no" htmlFor="payRef" hint="isteğe bağlı">
          <Input id="payRef" name="reference" maxLength={120} placeholder="Örn. TR-889210" />
        </Field>

        <Field label="Not" htmlFor="payNote" hint="isteğe bağlı, kayıtlara işlenir">
          <Textarea id="payNote" name="note" rows={2} maxLength={500} />
        </Field>

        <Button type="submit" size="lg" loading={pending}>Ödeme alındı</Button>
      </form>
    </Card>
  );
}
