import "server-only";
import { storageDownload, storageUpload } from "@/lib/storage";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildCertificatePdf } from "@/lib/certificate/pdf";
import { sendMail } from "@/lib/mail/provider";
import { certificateEmailHtml } from "@/lib/certificate/email";

/**
 * SERTİFİKA ÜRETİMİ VE DAĞITIMI
 *
 * Kombine kart oluştuğunda çağrılır: PDF üretilir, kapalı kovaya
 * yazılır, kayıt açılır ve e-posta gönderilir.
 *
 * ┌─ NEDEN HATA FIRLATMIYOR ⚠️ ───────────────────────────────────┐
 * │ Bu işlem ödeme onayının İÇİNDEN çağrılıyor. Sertifika          │
 * │ üretilemezse ödemenin de başarısız sayılması saçma olurdu:     │
 * │ para alınmış, kart oluşmuş, yalnızca belge çıkmamış.            │
 * │                                                                  │
 * │ Bu yüzden sonuç döndürülüyor, atılmıyor. Yönetici sertifikalar  │
 * │ sayfasından eksiği görüp elle üretebiliyor.                     │
 * └──────────────────────────────────────────────────────────────────┘
 */
export interface IssueResult {
  ok: boolean;
  certificateId?: string;
  number?: string;
  existing?: boolean;
  emailed?: boolean;
  /** Sertifika üretildi ama e-posta gidemediyse sebebi */
  emailError?: string;
  error?: string;
}

async function ayarlar() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings").select("key,value")
    .in("key", [
      "certificates.enabled", "certificates.email_enabled",
      "certificates.logo", "certificates.signature", "certificates.signer_title",
    ]);

  const m = new Map(
    (data ?? []).map((r) => {
      const v = (r as { key: string; value: unknown }).value;
      return [(r as { key: string }).key, v];
    }),
  );

  const metin = (k: string) => {
    const v = m.get(k);
    return typeof v === "string" ? v : String(v ?? "").replace(/^"|"$/g, "");
  };

  return {
    /* Ayar yoksa AÇIK kabul ediliyor: yeni kurulumda sertifika
       sessizce üretilmemesindense üretilmesi daha az şaşırtıcı. */
    enabled: m.get("certificates.enabled") !== false,
    emailEnabled: m.get("certificates.email_enabled") !== false,
    logo: metin("certificates.logo"),
    signature: metin("certificates.signature"),
    signerTitle: metin("certificates.signer_title") || "Çocuk Tribünü",
  };
}

/** Ayarlardaki görseli depolamadan indirir; yoksa null döner */
async function gorselIndir(yol: string): Promise<Uint8Array | null> {
  if (!yol) return null;
  try {
    const svc = createServiceClient();
    const _in = await storageDownload("site-media", yol);
    const data = _in.ok ? new Blob([_in.body as BlobPart], { type: _in.contentType }) : null;
    const error = _in.ok ? null : new Error(_in.error);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    /* Görsel indirilemezse belge onsuz üretilir — süs eksik kalır
       ama sertifika çıkar. */
    return null;
  }
}

export async function issueCertificate(opts: {
  /** Çocuk kimliği. Yoksa `cardId` üzerinden bulunur. */
  childId?: string | null;
  cardId?: string | null;
}): Promise<IssueResult> {
  try {
    const ayar = await ayarlar();
    if (!ayar.enabled) return { ok: false, error: "Sertifika üretimi kapalı." };

    const supabase = await createClient();

    /* ┌─ ÇOCUK KİMLİĞİ KARTTAN BULUNUYOR ⚠️ ──────────────────────┐
       │ Ödeme onaylandığında `admin_mark_payment_paid` yalnızca     │
       │ `card_id`, `order_number` ve tutarı döndürüyor —            │
       │ `child_id` DÖNDÜRMÜYOR.                                      │
       │                                                               │
       │ Çağıran taraf onu okumaya çalışıyor, `undefined` buluyor ve  │
       │ sertifika hiç üretilmiyordu. Üstelik sessizce: hata yok,     │
       │ kayıt yok, e-posta yok.                                       │
       │                                                               │
       │ Artık kart kimliği yeterli: çocuğu karttan buluyoruz.        │
       │ Sipariş fonksiyonunun imzasını değiştirmek, onu çağıran      │
       │ başka yerleri de kırardı.                                     │
       └───────────────────────────────────────────────────────────────┘ */
    let childId = opts.childId ?? null;

    if (!childId && opts.cardId) {
      const { data: kart } = await supabase
        .from("cards").select("child_id").eq("id", opts.cardId).maybeSingle();
      childId = (kart as { child_id: string | null } | null)?.child_id ?? null;
    }

    if (!childId) {
      return { ok: false, error: "Sertifika için çocuk kaydı bulunamadı." };
    }

    /* Çocuk + veli + takım bilgisi. Adlar PDF'e yazılacak ve kayda
       kopyalanacak. */
    const { data: cocuk, error: cErr } = await supabase
      .from("children")
      .select("id, first_name, last_name, user_id, teams:favorite_team_id(name)")
      .eq("id", childId)
      .maybeSingle();

    if (cErr) return { ok: false, error: cErr.message };
    if (!cocuk) return { ok: false, error: "Çocuk kaydı bulunamadı." };

    const c = cocuk as unknown as {
      id: string; first_name: string; last_name: string;
      user_id: string; teams: { name: string } | null;
    };

    const { data: veli } = await supabase
      .from("profiles").select("first_name,last_name").eq("id", c.user_id).maybeSingle();

    const v = veli as { first_name: string | null; last_name: string | null } | null;
    const veliAdi = `${v?.first_name ?? ""} ${v?.last_name ?? ""}`.trim();

    if (!veliAdi) {
      return { ok: false, error: "Veli adı eksik; sertifika üretilemedi." };
    }

    const cocukAdi = `${c.first_name} ${c.last_name}`.trim();

    /* Numara ve kayıt önce açılıyor: PDF adında numara geçiyor ve
       aynı çocuk için ikinci kez üretilmesi böylece engelleniyor. */
    const gecici = `gecici/${c.id}.pdf`;
    const { data: kayit, error: kErr } = await supabase.rpc("admin_create_certificate", {
      p_child_id: c.id,
      p_card_id: opts.cardId ?? null,
      p_path: gecici,
      p_parent: veliAdi,
      p_child: cocukAdi,
      p_team: c.teams?.name ?? null,
    });

    if (kErr) return { ok: false, error: kErr.message };

    const k = kayit as { id: string; number: string; existing: boolean };
    if (k.existing) {
      return { ok: true, certificateId: k.id, number: k.number, existing: true };
    }

    const [logo, imza] = await Promise.all([
      gorselIndir(ayar.logo),
      gorselIndir(ayar.signature),
    ]);

    let pdf: Uint8Array;
    try {
      pdf = await buildCertificatePdf({
      parentName: veliAdi,
      childName: cocukAdi,
      teamName: c.teams?.name ?? null,
      number: k.number,
      issuedAt: new Date(),
        logo, signature: imza,
        signerTitle: ayar.signerTitle,
      });
    } catch (err) {
      /* ┌─ KAYIT GERİ ALINIYOR ⚠️ ────────────────────────────────┐
         │ Numara ve kayıt PDF'ten ÖNCE açılıyor. PDF üretilemezse   │
         │ ortada dosyası olmayan bir sertifika kaydı kalırdı ve     │
         │ "geçerli sertifika var" kuralı yüzünden yeniden üretim de │
         │ engellenirdi — kalıcı olarak sıkışırdı.                   │
         │                                                             │
         │ Bu yüzden kayıt siliniyor ve hata çağırana dönüyor.       │
         └─────────────────────────────────────────────────────────────┘ */
      await supabase.from("certificates").delete().eq("id", k.id);
      return { ok: false, error: `PDF üretilemedi: ${(err as Error).message}` };
    }

    /* Yol kullanıcı kimliğiyle başlıyor: ileride kullanıcı silinirse
       tüm belgeleri tek klasörden temizlenebilir. */
    const yol = `${c.user_id}/${k.number}.pdf`;

    const svc = createServiceClient();
    const _yz = await storageUpload({
      bucket: "certificates",
      path: yol,
      body: pdf,
      contentType: "application/pdf",
    });
    const yErr = _yz.ok ? null : new Error(_yz.error);

    if (yErr) return { ok: false, error: `PDF kaydedilemedi: ${yErr.message}` };

    await supabase.from("certificates").update({ storage_path: yol }).eq("id", k.id);

    /* ── E-posta ── */
    let emailed = false;
    let mailHatasi: string | null = null;
    if (ayar.emailEnabled) {
      try {
        const { data: auth } = await svc.auth.admin.getUserById(c.user_id);
        const eposta = auth?.user?.email;

        if (!eposta) {
          mailHatasi = "Kullanıcının e-posta adresi bulunamadı.";
        } else {
          /* Panelin kendi SMTP modülü — takım davetleri de buradan
             gidiyor, yani bu yolun çalıştığı biliniyor. Ayrıca EK
             gönderebiliyor; sertifika PDF olarak iliştiriliyor. */
          /* ┌─ SAĞLAYICI DOĞRUDAN ÇAĞRILIYOR ⚠️ ────────────────────┐
             │ `sendMessage` panelden yazılan maillere göre tasarlanmış: │
             │ önce `mail_messages` kaydı açılmasını, sonra kimliğinin   │
             │ verilmesini bekliyor.                                      │
             │                                                             │
             │ Sertifika bildirimi bir yazışma değil, sistem postası —   │
             │ gelen kutusunda ayrı bir kayıt olarak durmasına gerek yok.│
             │ Bu yüzden SMTP sağlayıcısı doğrudan çağrılıyor.            │
             └─────────────────────────────────────────────────────────────┘ */
          const smtp = await smtpAyarlari();

          if (!smtp) {
            mailHatasi = "SMTP ayarları eksik. Mail ayarlarını tamamlayın.";
          } else {
            const res = await sendMail({
              to: eposta,
              subject: "Bilinçli Ebeveyn Sertifikanız hazır",
              html: certificateEmailHtml({
                firstName: v?.first_name ?? null,
                childName: cocukAdi,
                number: k.number,
              }),
              text:
                `Bilinçli Ebeveyn Sertifikanız hazır.\n\n` +
                `${cocukAdi} için kombine kartınız oluştu.\n` +
                `Belge numaranız: ${k.number}\n\n` +
                `Sertifikanız bu e-postanın ekindedir.`,
              fromEmail: smtp.fromEmail,
              fromName: smtp.fromName,
              replyTo: smtp.replyTo,
              smtp: smtp.config,
              attachments: [{
                filename: `${k.number}.pdf`,
                content: Buffer.from(pdf),
                contentType: "application/pdf",
              }],
            });

            if (res.ok) {
              await supabase.rpc("admin_certificate_emailed", { p_id: k.id });
              emailed = true;
            } else {
              mailHatasi = res.error ?? "Bilinmeyen hata";
            }
          }
        }
      } catch (err) {
        /* ┌─ HATA ARTIK ÇAĞIRANA BİLDİRİLİYOR ⚠️ ──────────────────┐
           │ Önce yalnızca günlüğe yazılıyordu. Sertifika üretiliyor, │
           │ panelde görünüyor ama e-posta gitmiyordu ve bunu kimse   │
           │ fark etmiyordu — sunucu günlüğüne bakmadıkça.            │
           │                                                            │
           │ Sertifika SİLİNMİYOR: belge geçerli, yalnızca posta      │
           │ gitmedi. Yönetici Sertifikalar sayfasından yeniden       │
           │ gönderebilir. Ama artık bunu bildiği için.               │
           └────────────────────────────────────────────────────────────┘ */
        const mesaj = (err as Error).message;
        console.error("[sertifika] e-posta gönderilemedi:", mesaj);
        mailHatasi = mesaj;
      }
    }

    return {
      ok: true, certificateId: k.id, number: k.number, existing: false, emailed,
      emailError: mailHatasi ?? undefined,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * SMTP ayarlarını okur.
 *
 * Parola `mail_settings_internal` ile geliyor — servis anahtarı
 * gerektiren, tarayıcıya asla gitmeyen bir fonksiyon.
 */
async function smtpAyarlari() {
  try {
    const svc = createServiceClient();
    const { data } = await svc.rpc("mail_settings_internal");

    const s = data as unknown as {
      smtp_host: string | null; smtp_port: number | null; smtp_secure: boolean | null;
      smtp_user: string | null; smtp_pass: string | null;
      from_email: string | null; from_name: string | null; reply_to: string | null;
    } | null;

    if (!s?.smtp_host || !s.smtp_user || !s.smtp_pass || !s.from_email) return null;

    return {
      fromEmail: s.from_email,
      fromName: s.from_name ?? "Çocuk Tribünü",
      replyTo: s.reply_to,
      config: {
        host: s.smtp_host,
        port: Number(s.smtp_port ?? 465),
        secure: s.smtp_secure ?? true,
        user: s.smtp_user,
        pass: s.smtp_pass,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Mevcut bir sertifikanın e-postasını yeniden gönderir.
 *
 * ★ ÜRETİMLE AYNI YOLU KULLANIR. İki ayrı gönderim yolu tutmak,
 *   birinin bozulduğunu fark etmemeye yol açıyordu — sertifika
 *   e-postasının aylarca gitmemesinin sebeplerinden biri buydu.
 */
export async function resendCertificateEmail(
  certificateId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: cert, error } = await supabase
      .from("certificates")
      .select("id, number, child_name, user_id, storage_path")
      .eq("id", certificateId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!cert) return { ok: false, error: "Sertifika bulunamadı." };

    const c = cert as {
      id: string; number: string; child_name: string;
      user_id: string; storage_path: string;
    };

    const svc = createServiceClient();

    /* PDF kovadan indiriliyor: yeniden ÜRETMİYORUZ. Kullanıcının
       elindeki belgeyle e-postadaki aynı olmalı. */
    const _in = await storageDownload("certificates", c.storage_path);
    const dosya = _in.ok ? new Blob([_in.body as BlobPart], { type: _in.contentType }) : null;
    const dErr = _in.ok ? null : new Error(_in.error);

    if (dErr || !dosya) {
      return { ok: false, error: `Belge dosyası bulunamadı: ${dErr?.message ?? ""}` };
    }

    const { data: auth } = await svc.auth.admin.getUserById(c.user_id);
    const eposta = auth?.user?.email;
    if (!eposta) return { ok: false, error: "Kullanıcının e-posta adresi bulunamadı." };

    const { data: veli } = await supabase
      .from("profiles").select("first_name").eq("id", c.user_id).maybeSingle();

    const smtp = await smtpAyarlari();
    if (!smtp) return { ok: false, error: "SMTP ayarları eksik." };

    const res = await sendMail({
      to: eposta,
      subject: "Bilinçli Ebeveyn Sertifikanız hazır",
      html: certificateEmailHtml({
        firstName: (veli as { first_name: string | null } | null)?.first_name ?? null,
        childName: c.child_name,
        number: c.number,
      }),
      text: `Bilinçli Ebeveyn Sertifikanız ekte. Belge numarası: ${c.number}`,
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName,
      replyTo: smtp.replyTo,
      smtp: smtp.config,
      attachments: [{
        filename: `${c.number}.pdf`,
        content: Buffer.from(await dosya.arrayBuffer()),
        contentType: "application/pdf",
      }],
    });

    if (!res.ok) return { ok: false, error: res.error };

    await supabase.rpc("admin_certificate_emailed", { p_id: c.id });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
