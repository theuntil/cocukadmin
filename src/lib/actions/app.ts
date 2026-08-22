"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/actions/types";
import { normalizePhone } from "@/lib/utils";

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] = issue.message;
  return out;
}

/** İstemcinin gerçek IP'si — asla formdan alınmaz. */
async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Cloudflare Turnstile doğrulaması (anahtar tanımlı değilse atlanır). */
async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: await clientIp() }),
      cache: "no-store",
    });
    const json = (await res.json()) as { success: boolean };
    return json.success;
  } catch {
    return false;
  }
}

/* ═════════════════════ ÇOCUKLAR ═════════════════════ */

const childSchema = z.object({
  firstName: z.string().trim().min(2, "Ad en az 2 karakter").max(80),
  lastName: z.string().trim().min(2, "Soyad en az 2 karakter").max(80),
  birthDate: z.string().refine((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const min = new Date(); min.setFullYear(now.getFullYear() - 18);
    return d <= now && d >= min;
  }, "Doğum tarihi geçerli olmalı (0–18 yaş)"),
  cityId: z.coerce.number().int().positive().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  // Etkinliklerde grup ayrımı için gerekli olduğundan seçim zorunlu
  gender: z.enum(["female", "male"], { message: "Cinsiyet seçin" }),
});

export async function addChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = childSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    cityId: formData.get("cityId") || null,
    teamId: formData.get("teamId") || null,
    gender: formData.get("gender") || undefined,
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Oturum bulunamadı." };

  const { data, error } = await supabase.from("children").insert({
    user_id: auth.user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    birth_date: parsed.data.birthDate,
    gender: parsed.data.gender,
    city_id: parsed.data.cityId ?? null,
    favorite_team_id: parsed.data.teamId ?? null,
  }).select().single();

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/cocuklarim");
  // Fotoğraf ekleme adımı için oluşturulan kaydı geri döndürüyoruz
  return { ok: true, message: "Çocuk kaydı eklendi.", data: { child: data } };
}

export async function updateChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Kayıt bulunamadı." };

  const parsed = childSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    cityId: formData.get("cityId") || null,
    teamId: formData.get("teamId") || null,
    gender: formData.get("gender") || undefined,
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("children").update({
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    birth_date: parsed.data.birthDate,
    gender: parsed.data.gender,
    city_id: parsed.data.cityId ?? null,
    favorite_team_id: parsed.data.teamId ?? null,
  }).eq("id", id.data);
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/cocuklarim");
  return { ok: true, message: "Çocuk bilgileri güncellendi." };
}

export async function deleteChild(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("children").delete().eq("id", id.data);
  revalidatePath("/panel/cocuklarim");
}

/* ═════════════════════ ADRESLER ═════════════════════ */

const addressSchema = z.object({
  title: z.string().trim().min(1, "Başlık gerekli").max(60),
  recipientName: z.string().trim().min(3, "Alıcı adı gerekli").max(120),
  phone: z.string().trim().min(10, "Telefon gerekli"),
  cityId: z.coerce.number().int().positive("Şehir seçin"),
  districtId: z.coerce.number().int().positive().optional().nullable(),
  neighborhood: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Posta kodu 5 haneli olmalı").optional().or(z.literal("")),
  fullAddress: z.string().trim().min(10, "Adres en az 10 karakter").max(500),
  isDefault: z.boolean().optional(),
});

export async function saveAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addressSchema.safeParse({
    title: formData.get("title"),
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    cityId: formData.get("cityId"),
    districtId: formData.get("districtId") || null,
    neighborhood: formData.get("neighborhood") || null,
    postalCode: formData.get("postalCode") || "",
    fullAddress: formData.get("fullAddress"),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const phone = normalizePhone(parsed.data.phone);
  if (!/^\+90\d{10}$/.test(phone)) return { ok: false, fieldErrors: { phone: "Telefon numarası geçersiz" } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Oturum bulunamadı." };

  const payload = {
    user_id: auth.user.id,
    title: parsed.data.title,
    recipient_name: parsed.data.recipientName,
    phone,
    city_id: parsed.data.cityId,
    district_id: parsed.data.districtId ?? null,
    neighborhood: parsed.data.neighborhood ?? null,
    postal_code: parsed.data.postalCode || null,
    full_address: parsed.data.fullAddress,
    is_default: parsed.data.isDefault ?? false,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase.from("addresses").update(payload).eq("id", String(id))
    : await supabase.from("addresses").insert(payload);

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/adreslerim");
  return { ok: true, message: id ? "Adres güncellendi." : "Adres eklendi." };
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("addresses").delete().eq("id", id.data);
  revalidatePath("/panel/adreslerim");
}

/* ═════════════════════ KART SİPARİŞİ ═════════════════════ */

export async function createCardOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      childId: z.string().uuid("Çocuk seçin"),
      teamId: z.string().uuid("Takım seçin"),
      // Kart dijital: teslimat adresi gerekmez
      addressId: z.string().uuid().optional().or(z.literal("")),
      /* Telefon ZORUNLU: kombine kart kulübün üyelik kartı ve kulübün
         üyesine ulaşabilmesi gerekiyor. Veli bunu formda, ne için
         kullanılacağını GÖREREK giriyor. */
      contactPhone: z.string().trim()
        .transform((v) => v.replace(/[\s()-]/g, ""))
        .refine((v) => /^\+?[0-9]{10,15}$/.test(v), "Geçerli bir telefon numarası girin"),
      contactAddress: z.string().trim().max(200).optional().default(""),
      paymentMethod: z.enum(["credit_card", "bank_transfer"], { message: "Ödeme yöntemi seçin" }),
    })
    .safeParse({
      childId: formData.get("childId"),
      teamId: formData.get("teamId"),
      addressId: formData.get("addressId") ?? "",
      contactPhone: formData.get("contactPhone") ?? "",
      contactAddress: formData.get("contactAddress") ?? "",
      paymentMethod: formData.get("paymentMethod"),
    });

  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();

  /* İletişim bilgisi ÖNCE kaydedilir. Sipariş açıldıktan sonra
     kaydetseydik, telefon yazımı hatalı olduğunda sipariş açılmış ama
     kulübün ulaşamayacağı bir üye oluşurdu. */
  const { error: iletisimHatasi } = await supabase.rpc("save_my_contact", {
    p_phone: parsed.data.contactPhone,
    p_address: parsed.data.contactAddress || null,
  });

  if (iletisimHatasi) {
    return { ok: false, fieldErrors: { contactPhone: friendlyError(iletisimHatasi) } };
  }
  /* Açık sipariş varsa yenisi açılmaz: kullanıcı ödemeyi yarıda bırakıp
     döndüğünde hata almaz, kaldığı yerden devam eder. */
  const { data, error } = await supabase.rpc("get_or_create_card_order", {
    p_child_id: parsed.data.childId,
    p_team_id: parsed.data.teamId,
    p_address_id: parsed.data.addressId || null,
    p_plan_slug: "yillik-kombine",
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { order_number?: string; order_id?: string; id?: string } | null;

  /* Sipariş numarası yoksa yönlendirilecek yer de yoktur. Sessizce
     "başarılı" demek yerine kullanıcıya açık hata gösterilir. */
  if (!result?.order_number) {
    return { ok: false, message: "Başvuru kaydı oluşturulamadı. Lütfen tekrar deneyin." };
  }

  revalidatePath("/panel/siparislerim");
  revalidatePath("/panel/kombine-kart");

  /*
   * BAŞVURU SONRASI TEK YOL: onay sayfası.
   *
   * Eskiden sipariş oluşunca form aynı ekranda istemci durumuna geçiyordu.
   * Kullanıcı sayfayı yenilediğinde ya da geri geldiğinde bu durum
   * kayboluyor, başvuru ekranı da "bu çocuk için başvuru yapılmış" deyip
   * çıkmaz sokağa sokuyordu.
   *
   * Artık sunucu tarafında yönlendirme yapılır: başvurunun karşılığı olan
   * KALICI bir adres vardır, yenilense de paylaşılsa da aynı sayfayı açar.
   *
   * NOT: redirect() NEXT_REDIRECT istisnası fırlatır; try/catch ile
   * sarmalanmamalıdır, aksi hâlde yönlendirme yutulur.
   */
  redirect(`/panel/kombine-kart/basvuru/tamamlandi?siparis=${encodeURIComponent(result.order_number)}`);
}

/* ═════════════════════ DEKONT ═════════════════════ */

export async function attachReceipt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const paymentId = z.string().uuid().safeParse(formData.get("paymentId"));
  const path = z.string().min(3).safeParse(formData.get("path"));
  if (!paymentId.success || !path.success) return { ok: false, message: "Dosya bilgisi eksik." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_payment_receipt", {
    p_payment_id: paymentId.data,
    p_path: path.data,
    p_mime: String(formData.get("mime") ?? ""),
    p_size: Number(formData.get("size") ?? 0),
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/siparislerim");
  return { ok: true, message: "Dekontunuz alındı. En kısa sürede incelenecek." };
}

/* ═════════════════════ İMZA ═════════════════════ */

export async function submitSignature(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      campaignSlug: z.string().min(1),
      firstName: z.string().trim().min(2, "Adınızı girin").max(80),
      lastName: z.string().trim().min(2, "Soyadınızı girin").max(80),
      contact: z.string().trim().min(6, "Telefon numaranızı girin"),
      teamId: z.string().uuid("Takım seçin").optional().nullable(),
      cityId: z.coerce.number().int().positive().optional().nullable(),
      kvkk: z.literal("on", { message: "KVKK metnini onaylamalısınız" }),
      terms: z.literal("on", { message: "Koşulları kabul etmelisiniz" }),
    })
    .safeParse({
      campaignSlug: formData.get("campaignSlug"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      contact: formData.get("contact"),
      teamId: formData.get("teamId") || null,
      cityId: formData.get("cityId") || null,
      kvkk: formData.get("kvkk"),
      terms: formData.get("terms"),
    });

  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  if (!(await verifyTurnstile(formData.get("cf-turnstile-response") as string | null))) {
    return { ok: false, message: "Robot doğrulaması başarısız. Lütfen tekrar deneyin." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_signature", {
    p_campaign_slug: parsed.data.campaignSlug,
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_identity_value: parsed.data.contact,
    p_identity_source: "phone",
    p_team_id: parsed.data.teamId,
    p_city_id: parsed.data.cityId,
    p_consent_kvkk: true,
    p_consent_terms: true,
    p_consent_contact: formData.get("contactConsent") === "on",
    p_verification_method: "captcha",
    p_client_ip: await clientIp(), // gerçek IP sunucudan — formdan ASLA
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/imza-kampanyasi");
  return {
    ok: true,
    message: "İmzanız alındı. Desteğiniz için teşekkürler!",
    data: data as Record<string, unknown>,
  };
}




/* ═════════════════════ ETKİNLİK ═════════════════════ */

export async function registerForEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ eventId: z.string().uuid(), childId: z.string().uuid("Çocuk seçin"), note: z.string().max(300).optional().nullable() })
    .safeParse({
      eventId: formData.get("eventId"),
      childId: formData.get("childId"),
      note: formData.get("note") || null,
    });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: parsed.data.eventId,
    p_child_id: parsed.data.childId,
    p_note: parsed.data.note,
    p_guardian_count: Number(formData.get("guardianCount") ?? 1),
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/etkinliklerim");
  return { ok: true, message: "Kaydınız alındı.", data: data as Record<string, unknown> };
}

export async function cancelEventRegistration(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = z.string().uuid().safeParse(formData.get("registrationId"));
  if (!id.success) return { ok: false, message: "Kayıt bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_event_registration", {
    p_registration_id: id.data,
    p_reason: String(formData.get("reason") ?? ""),
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/etkinliklerim");
  return { ok: true, message: "Kaydınız iptal edildi." };
}

/* ═════════════════════ PROFİL & HESAP ═════════════════════ */

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      firstName: z.string().trim().min(2, "Adınızı girin").max(80),
      lastName: z.string().trim().min(2, "Soyadınızı girin").max(80),
      username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,30}$/, "3–30 karakter, harf/rakam/alt çizgi").optional().or(z.literal("")),
      cityId: z.coerce.number().int().positive().optional().nullable(),
      marketing: z.boolean().optional(),
    })
    .safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      username: formData.get("username") || "",
      cityId: formData.get("cityId") || null,
      marketing: formData.get("marketing") === "on",
    });

  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Oturum bulunamadı." };

  const { error } = await supabase.from("profiles").update({
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    username: parsed.data.username || null,
    city_id: parsed.data.cityId ?? null,
    consent_marketing: parsed.data.marketing ?? false,
  }).eq("id", auth.user.id);

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/ayarlar");
  return { ok: true, message: "Profiliniz güncellendi." };
}

export async function requestAccountDeletion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("confirm") !== "HESABIMI SİL") {
    return { ok: false, fieldErrors: { confirm: "Onaylamak için kutuya tam olarak «HESABIMI SİL» yazın" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_account_deletion", {
    p_reason: String(formData.get("reason") ?? ""),
  });
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel", "layout");
  return { ok: true, message: "Hesap silme talebiniz alındı.", data: data as Record<string, unknown> };
}

export async function cancelAccountDeletion(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/panel", "layout");
  return { ok: true, message: "Hesap silme talebiniz iptal edildi." };
}

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.user.id).is("read_at", null);
  revalidatePath("/panel/bildirimler");
}

/* ═════════════════════ E-POSTA BÜLTENİ ═════════════════════ */

export async function subscribeNewsletter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
      firstName: z.string().trim().max(80).optional().nullable(),
      cityId: z.coerce.number().int().positive().optional().nullable(),
    })
    .safeParse({
      email: formData.get("email"),
      firstName: formData.get("firstName") || null,
      cityId: formData.get("cityId") || null,
    });

  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subscribe_newsletter", {
    p_email: parsed.data.email,
    p_first_name: parsed.data.firstName,
    p_city_id: parsed.data.cityId,
    p_source: String(formData.get("source") ?? "website"),
    p_client_ip: await clientIp(),
  });

  if (error) return { ok: false, message: friendlyError(error) };

  const result = data as { message?: string } | null;
  return { ok: true, message: result?.message ?? "Kaydınız alındı." };
}

/* ═════════════════════ FOTOĞRAFLAR ═════════════════════ */

/**
 * Çocuğun fotoğraf yolunu kaydeder. Yolun kullanıcının kendi klasöründe olması
 * veritabanı trigger'ı (app.validate_child_photo_path) ile ayrıca doğrulanır.
 */
export async function setChildPhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      childId: z.string().uuid(),
      path: z.string().max(300).nullable(),
    })
    .safeParse({
      childId: formData.get("childId"),
      path: formData.get("path") ? String(formData.get("path")) : null,
    });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("children")
    .update({ photo_path: parsed.data.path })
    .eq("id", parsed.data.childId);

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/cocuklarim");
  return { ok: true, message: parsed.data.path ? "Fotoğraf güncellendi." : "Fotoğraf kaldırıldı." };
}

/** Kullanıcının kendi profil fotoğrafını kaydeder. */
export async function setProfileAvatar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const path = formData.get("path") ? String(formData.get("path")) : null;
  if (path !== null && path.length > 300) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", auth.user.id);

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel", "layout");
  return { ok: true, message: path ? "Fotoğrafınız güncellendi." : "Fotoğrafınız kaldırıldı." };
}

/* ═════════════════════ PROFİL TAMAMLAMA ═════════════════════ */

/**
 * Google/Apple ile gelen kullanıcılarda şehir ve takım bilgisi olmaz.
 * Bu action karşılama ekranından çağrılır; veritabanı tarafında
 * complete_my_profile() alanları ayrıca doğrular.
 */
export async function completeProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  /*
   * Yalnızca AD ve SOYAD zorunlu.
   *
   * Şehir, takım ve kullanıcı adı kayıt akışından kaldırıldı: kart çocuğun
   * adına düzenleniyor ve çocuğun takımı bir sonraki adımda seçiliyor.
   * Bu alanlar zorunlu kaldığı sürece "Devam et" sessizce başarısız
   * oluyordu — form onları hiç göndermiyordu.
   */
  const parsed = z
    .object({
      firstName: z.string().trim().min(2, "Adınızı girin").max(80),
      lastName: z.string().trim().min(2, "Soyadınızı girin").max(80),
    })
    .safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
    });

  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();

  // Formda varsa alınır; yoksa mevcut değer korunur
  const rawCity = formData.get("cityId");
  const rawTeam = formData.get("teamId");

  const { error } = await supabase.rpc("complete_my_profile", {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_city_id: rawCity ? Number(rawCity) : null,
    p_team_id: rawTeam ? String(rawTeam) : null,
    p_marketing: formData.get("marketing") === "on",
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel", "layout");
  return { ok: true, message: "Profiliniz tamamlandı." };
}

/**
 * Çocuğun kimlik numarası — isteğe bağlı.
 * Boş gönderilirse kayıt silinir. Ham numara saklanmaz.
 */
export async function setChildNationalId(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    childId: z.string().uuid(),
    nationalId: z.string().trim().max(20).optional().or(z.literal("")),
  }).safeParse({
    childId: formData.get("childId"),
    nationalId: formData.get("nationalId") ?? "",
  });

  if (!parsed.success) return { ok: false, message: "Geçersiz istek." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_child_national_id", {
    p_child_id: parsed.data.childId,
    p_national_id: parsed.data.nationalId || null,
  });

  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/panel/cocuklarim");
  return { ok: true };
}

/**
 * Kurulumu tek adımda tamamlar.
 *
 * Veli adı, çocuk bilgileri, takım ve şehir birlikte gönderilir.
 * Sunucu tarafında tek işlem: ya hepsi yazılır ya hiçbiri.
 */
export async function completeSetup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({
    parentFirstName: z.string().trim().min(2, "Adınızı girin").max(60),
    parentLastName: z.string().trim().min(2, "Soyadınızı girin").max(60),
    childFirstName: z.string().trim().min(2, "Çocuğun adını girin").max(60),
    childLastName: z.string().trim().min(2, "Çocuğun soyadını girin").max(60),
    childBirthDate: z.string().trim().min(8, "Doğum tarihini girin"),
    teamId: z.string().uuid("Takım seçin"),
    cityId: z.string().trim().min(1, "Şehir seçin"),
    phone: z.string().trim().optional().default(""),
  }).safeParse({
    parentFirstName: formData.get("parentFirstName"),
    parentLastName: formData.get("parentLastName"),
    childFirstName: formData.get("childFirstName"),
    childLastName: formData.get("childLastName"),
    childBirthDate: formData.get("childBirthDate"),
    teamId: formData.get("teamId"),
    cityId: formData.get("cityId"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_setup", {
    p_data: {
      parent_first_name: d.parentFirstName,
      parent_last_name: d.parentLastName,
      child_first_name: d.childFirstName,
      child_last_name: d.childLastName,
      child_birth_date: d.childBirthDate,
      team_id: d.teamId,
      city_id: Number(d.cityId),
      phone: d.phone || null,
    },
  });

  /* Fonksiyonun Türkçe mesajları birebir geçsin: "18 yaşından küçük"
     gibi uyarılar kullanıcıya ulaşmalı. */
  if (error) return { ok: false, message: error.message };

  revalidatePath("/panel");
  redirect("/panel");
}
