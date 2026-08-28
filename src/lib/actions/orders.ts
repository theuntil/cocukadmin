"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail } from "@/lib/notify";
import { getUserEmail } from "@/lib/data";
import { issueCertificate } from "@/lib/certificate/issue";
import { friendlyError, type ActionState } from "@/lib/actions/types";

/**
 * Sipariş işlemleri.
 *
 * Yetki kontrolü her zaman veritabanında yapılır (RPC'ler app.is_finance() /
 * app.is_admin() çağırır). Buradaki kontroller yalnızca arayüz kolaylığıdır.
 */

const uuid = z.string().uuid();

/* ── Fatura yükleme ── */
export async function attachInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    orderId: uuid,
    invoiceNumber: z.string().trim().min(3, "Fatura numarası girin").max(60),
    path: z.string().min(3).max(400),
    mime: z.string().max(120).default("application/pdf"),
    size: z.coerce.number().int().nonnegative().optional(),
    amount: z.coerce.number().nonnegative().optional(),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }).safeParse({
    orderId: formData.get("orderId"),
    invoiceNumber: formData.get("invoiceNumber"),
    path: formData.get("path"),
    mime: formData.get("mime") ?? "application/pdf",
    size: formData.get("size") ?? undefined,
    amount: formData.get("amount") ?? undefined,
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("attach_order_invoice", {
    p_order_id: parsed.data.orderId,
    p_invoice_number: parsed.data.invoiceNumber,
    p_path: parsed.data.path,
    p_mime: parsed.data.mime,
    p_size: parsed.data.size ?? null,
    p_amount: parsed.data.amount ?? null,
    p_note: parsed.data.note || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { invoice_id: string; order_number: string; user_id: string | null };

  // Kullanıcıya "faturanız hazır" e-postası — dosya bağlantısıyla birlikte
  try {
    const email = await getUserEmail(result.user_id);
    if (email) {
      /* E-postaya DOSYA BAĞLANTISI konmaz.
         İmzalı bağlantı "sahibi olan açsın" demektir: e-posta iletilirse
         fatura üçüncü kişilerin eline geçer. Kullanıcı kendi paneline
         girer, fatura orada kimliği doğrulanmış şekilde açılır. */

      await sendTemplateEmail({
        to: email,
        template: "invoice_ready",
        params: {
          orderNumber: result.order_number,
          invoiceNumber: parsed.data.invoiceNumber,
          amount: parsed.data.amount ? `${parsed.data.amount} TRY` : undefined,
          issuedAt: new Date().toLocaleDateString("tr-TR"),
        },
      });
      await supabase.rpc("mark_invoice_notified", { p_invoice_id: result.invoice_id });
    }
  } catch (err) {
    console.error("[invoice-mail]", (err as Error).message);
  }

  revalidatePath("/siparisler");
  revalidatePath(`/siparisler/${parsed.data.orderId}`);
  return { ok: true, message: "Fatura yüklendi ve kullanıcıya bildirildi." };
}


/* ── Kart durumu ── */
export async function changeCardStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    cardId: uuid,
    status: z.enum(["pending", "processing", "active", "suspended", "expired", "cancelled"]),
  }).safeParse({ cardId: formData.get("cardId"), status: formData.get("status") });

  if (!parsed.success) return { ok: false, message: "Geçersiz durum." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_card_status", {
    p_card_id: parsed.data.cardId,
    p_status: parsed.data.status,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  // Basıldı / teslim edildi bildirimleri
  // Kart aktif olduğunda kullanıcıya bildirilir (dijital kart, kargo yok)
  if (parsed.data.status === "active") {
    try {
      const info = data as {
        user_id?: string | null; child_name?: string; card_number?: string; valid_until?: string;
      } | null;
      const email = await getUserEmail(info?.user_id ?? null);
      if (email) {
        await sendTemplateEmail({
          to: email, template: "card_ready",
          params: {
            childName: info?.child_name ?? "",
            cardNumber: info?.card_number ?? "",
            validUntil: info?.valid_until
              ? new Date(info.valid_until).toLocaleDateString("tr-TR") : "",
          },
        });
      }
    } catch (err) {
      console.error("[card-mail]", (err as Error).message);
    }
  }

  revalidatePath("/kartlar");
  revalidatePath("/siparisler");
  return { ok: true, message: "Kart durumu güncellendi." };
}

/* ── Sipariş iptali ── */
export async function cancelOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    orderId: uuid,
    reason: z.string().trim().min(5, "Gerekçe en az 5 karakter olmalı").max(500),
  }).safeParse({ orderId: formData.get("orderId"), reason: formData.get("reason") });

  if (!parsed.success) return { ok: false, fieldErrors: { reason: "Gerekçe girin (en az 5 karakter)" } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_order", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/siparisler");
  return { ok: true, message: "Sipariş iptal edildi." };
}

/* ── Ödeme onay / red ── */
export async function reviewPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    paymentId: uuid,
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  }).safeParse({
    paymentId: formData.get("paymentId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  if (parsed.data.decision === "reject" && !parsed.data.reason) {
    return { ok: false, fieldErrors: { reason: "Red gerekçesi zorunlu" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    parsed.data.decision === "approve" ? "approve_payment" : "reject_payment",
    parsed.data.decision === "approve"
      ? { p_payment_id: parsed.data.paymentId }
      : { p_payment_id: parsed.data.paymentId, p_reason: parsed.data.reason },
  );

  if (error) return { ok: false, message: friendlyError(error) };

  if (parsed.data.decision === "approve") {
    try {
      const info = data as { user_id?: string | null; order_number?: string } | null;
      const email = await getUserEmail(info?.user_id ?? null);
      if (email) {
        await sendTemplateEmail({
          to: email, template: "payment_approved",
          params: { orderNumber: info?.order_number ?? "" },
        });
      }
    } catch (err) {
      console.error("[payment-mail]", (err as Error).message);
    }
  }

  /* ┌─ SERTİFİKA BURADA DA ÜRETİLMELİ ⚠️ ───────────────────────┐
     │ Havale akışında ödeme İKİ FARKLI YOLDAN onaylanabiliyor:   │
     │                                                             │
     │   · Dekont incelemesi → `reviewPayment` (burası)            │
     │   · Elle işaretleme  → `markPaymentPaid`                    │
     │                                                             │
     │ Sertifika yalnızca ikincisine bağlanmıştı. Havale asıl      │
     │ ödeme yöntemi olduğu ve dekontlar buradan onaylandığı için  │
     │ pratikte sertifika HİÇ üretilmiyordu.                       │
     │                                                             │
     │ İki yol da aynı yardımcıyı çağırıyor; `admin_create_certificate`│
     │ zaten mükerrer üretimi engelliyor.                           │
     └─────────────────────────────────────────────────────────────┘ */
  let sertifikaNotu = "";
  if (parsed.data.decision === "approve") {
    try {
      const info = data as { card_id?: string | null } | null;
      if (info?.card_id) {
        const cert = await issueCertificate({ cardId: info.card_id });
        if (cert.ok && !cert.existing) {
          sertifikaNotu = cert.emailed
            ? " Sertifika üretildi ve e-posta gönderildi."
            : ` Sertifika üretildi ama e-posta GÖNDERİLEMEDİ${cert.emailError ? `: ${cert.emailError}` : "."}`;
        } else if (!cert.ok) {
          sertifikaNotu = ` Sertifika üretilemedi: ${cert.error}`;
        }
      }
    } catch (err) {
      console.error("[sertifika]", (err as Error).message);
      sertifikaNotu = " Sertifika üretilemedi; Sertifikalar sayfasından tekrar deneyin.";
    }
  }

  revalidatePath("/siparisler");
  revalidatePath("/sertifikalar");
  return {
    ok: true,
    message: (parsed.data.decision === "approve" ? "Ödeme onaylandı." : "Ödeme reddedildi.")
      + sertifikaNotu,
  };
}

/* ── Manuel "ödeme yapıldı" işaretleme (havale/EFT) ── */
export async function markPaymentPaid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    paymentId: uuid,
    note: z.string().trim().max(500).optional().or(z.literal("")),
    reference: z.string().trim().max(120).optional().or(z.literal("")),
  }).safeParse({
    paymentId: formData.get("paymentId"),
    note: formData.get("note") ?? "",
    reference: formData.get("reference") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_payment_paid", {
    p_payment_id: parsed.data.paymentId,
    p_note: parsed.data.note || null,
    p_reference: parsed.data.reference || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  try {
    const info = data as { user_id?: string | null; order_number?: string } | null;
    const email = await getUserEmail(info?.user_id ?? null);
    if (email) {
      await sendTemplateEmail({
        to: email, template: "payment_approved",
        params: { orderNumber: info?.order_number ?? "" },
      });
    }
  } catch (err) {
    console.error("[mark-paid-mail]", (err as Error).message);
  }

  /* ┌─ SERTİFİKA ÜRETİMİ ⚠️ ────────────────────────────────────┐
     │ Kart oluştu; sertifika da burada üretiliyor.                │
     │                                                              │
     │ Hata FIRLATILMIYOR: ödeme onayı başarılı sayılmalı. Para    │
     │ alınmış, kart oluşmuş; yalnızca belge çıkmamışsa bunun      │
     │ yüzünden tüm işlemi geri almak yanlış olur.                  │
     │                                                              │
     │ Eksik sertifikalar yönetim panelindeki Sertifikalar         │
     │ sayfasından elle üretilebiliyor.                             │
     └──────────────────────────────────────────────────────────────┘ */
  let sertifikaNotu = "";
  try {
    /* `admin_mark_payment_paid` `card_id` döndürüyor; `child_id`
       döndürmüyor. Çocuk, kart üzerinden bulunuyor. */
    const info = data as { card_id?: string | null } | null;
    if (info?.card_id) {
      const cert = await issueCertificate({ cardId: info.card_id });
      if (cert.ok && !cert.existing) {
        sertifikaNotu = cert.emailed
          ? " Sertifika üretildi ve e-posta gönderildi."
          : ` Sertifika üretildi ama e-posta GÖNDERİLEMEDİ${cert.emailError ? `: ${cert.emailError}` : "."}`;
      } else if (!cert.ok) {
        sertifikaNotu = ` Sertifika üretilemedi: ${cert.error}`;
      }
    }
  } catch (err) {
    console.error("[sertifika]", (err as Error).message);
    sertifikaNotu = " Sertifika üretilemedi; Sertifikalar sayfasından tekrar deneyin.";
  }

  revalidatePath("/siparisler");
  revalidatePath("/sertifikalar");
  return {
    ok: true,
    message: "Ödeme tamamlandı olarak işaretlendi, kart oluşturuldu." + sertifikaNotu,
  };
}

/* ── Yönetici tarafından manuel sipariş ── */
export async function createManualOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    userId: uuid,
    childId: uuid,
    teamId: uuid,
    addressId: uuid,
    paymentMethod: z.enum(["credit_card", "bank_transfer"]),
    markPaid: z.boolean().optional(),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }).safeParse({
    userId: formData.get("userId"),
    childId: formData.get("childId"),
    teamId: formData.get("teamId"),
    addressId: formData.get("addressId"),
    paymentMethod: formData.get("paymentMethod") ?? "bank_transfer",
    markPaid: formData.get("markPaid") === "on",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, fieldErrors: fe, message: "Tüm alanları doldurun." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_order", {
    p_user_id: parsed.data.userId,
    p_child_id: parsed.data.childId,
    p_team_id: parsed.data.teamId,
    p_address_id: parsed.data.addressId,
    p_payment_method: parsed.data.paymentMethod,
    p_mark_paid: parsed.data.markPaid ?? false,
    p_note: parsed.data.note || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { order_number: string; marked_paid: boolean; user_id: string };

  try {
    const email = await getUserEmail(result.user_id);
    if (email) {
      await sendTemplateEmail({
        to: email,
        template: result.marked_paid ? "payment_approved" : "order_received",
        params: { orderNumber: result.order_number, amount: "", childName: "" },
      });
    }
  } catch (err) {
    console.error("[manual-order-mail]", (err as Error).message);
  }

  revalidatePath("/siparisler");
  return { ok: true, message: `${result.order_number} numaralı sipariş oluşturuldu.` };
}

/* ── Kart yönetimi ── */
export async function createCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    childId: uuid,
    teamId: uuid,
    validUntil: z.string().optional().or(z.literal("")),
  }).safeParse({
    childId: formData.get("childId"),
    teamId: formData.get("teamId"),
    validUntil: formData.get("validUntil") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Çocuk ve takım seçin." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_card", {
    p_child_id: parsed.data.childId,
    p_team_id: parsed.data.teamId,
    p_order_id: null,
    p_valid_until: parsed.data.validUntil || null,
    p_status: "pending",
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/kartlar");
  return {
    ok: true,
    message: `Kart oluşturuldu: ${(data as { card_number: string }).card_number}`,
  };
}

export async function revokeCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    cardId: uuid,
    reason: z.string().trim().min(5, "Gerekçe girin").max(500),
  }).safeParse({ cardId: formData.get("cardId"), reason: formData.get("reason") });

  if (!parsed.success) return { ok: false, fieldErrors: { reason: "Gerekçe girin (en az 5 karakter)" } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_card", {
    p_card_id: parsed.data.cardId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/kartlar");
  return { ok: true, message: "Kart iptal edildi, QR kodu geçersiz kılındı." };
}

/**
 * Siparişi TAMAMEN siler.
 *
 * İptal etmekten farkı: kayıt listede kalmaz. Test siparişleri ve
 * yanlış girişler için.
 *
 * ★ Kartlar SİLİNMEZ, siparişten koparılır: çocuğun elindeki geçerli
 *   kartı sipariş kaydı yüzünden iptal etmek yanlış olur.
 *
 * ★ Ödenmiş sipariş `force` olmadan silinmez — muhasebe izi kopmasın.
 */
export async function deleteOrder(id: string, force = false): Promise<ActionState> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Geçersiz kayıt." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_order", {
    p_order_id: parsed.data,
    p_force: force,
  });

  if (error) {
    /* Fonksiyonun kendi Türkçe mesajı varsa olduğu gibi geçir:
       "ödenmiş sipariş" uyarısı kullanıcıya birebir gitmeli. */
    return { ok: false, message: error.message };
  }

  const d = data as { cards_deleted?: number } | null;

  revalidatePath("/siparisler");
  revalidatePath("/kartlar");
  revalidatePath("/sertifikalar");

  return {
    ok: true,
    message: (d?.cards_deleted ?? 0) > 0
      ? `Sipariş silindi. Bağlı ${d?.cards_deleted} kart ve sertifikası da kaldırıldı.`
      : "Sipariş silindi.",
  };
}
