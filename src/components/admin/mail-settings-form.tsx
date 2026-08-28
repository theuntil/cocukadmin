"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Alert, Badge, Button, Card, Checkbox, Divider, Field, Input, Select, Textarea,
} from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconMail, IconImage, IconSend, IconCheck, IconDownload, IconShield,
} from "@/components/ui/icons";
import { MailImageUpload } from "@/components/admin/mail-image-upload";
import { MailBodyFrame } from "@/components/admin/mail-body-frame";
import {
  saveMailSettings, sendTestMail, testSmtpConnection, testImapConnection, previewMail,
} from "@/lib/actions/mail";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import { MAIL_PRESET, type MailSettings } from "@/lib/mail/types";
import { formatDate } from "@/lib/utils";

/**
 * MAİL AYARLARI
 *
 * Dört blok: hesap · giden (SMTP) · gelen (IMAP) · görünüm.
 *
 * ★ SAĞLAYICI SEÇİMİ YOK. Tek yol var: kendi mail sunucumuz. Eskiden
 *   bir açılır kutu vardı; veritabanındaki değer listede bulunmayınca
 *   kutu boş kalıyor, form gönderildiğinde alan boş gidiyor ve kayıt
 *   sessizce reddediliyordu. Seçenek kalmayınca bu hata da kalmadı.
 *
 * ★ PAROLALAR SUNUCUDAN GELMEZ; yalnızca "kayıtlı" bilgisi gelir.
 *   Alan boş bırakılırsa mevcut parola korunur.
 */
export function MailSettingsForm({ settings }: { settings: MailSettings }) {
  const [state, action, pending] = useActionState(saveMailSettings, IDLE);
  useActionToast(state);
  const [testState, testAction, testPending] = useActionState(sendTestMail, IDLE);

  // SMTP
  const [smtpHost, setSmtpHost] = React.useState(settings.smtp_host ?? "");
  const [smtpPort, setSmtpPort] = React.useState(settings.smtp_port);
  const [smtpSecure, setSmtpSecure] = React.useState(settings.smtp_secure);
  const [smtpUser, setSmtpUser] = React.useState(settings.smtp_user ?? "");

  // IMAP
  const [imapHost, setImapHost] = React.useState(settings.imap_host ?? "");
  const [imapPort, setImapPort] = React.useState(settings.imap_port);
  const [imapUser, setImapUser] = React.useState(settings.imap_user ?? "");

  // Görünüm
  const [logoUrl, setLogoUrl] = React.useState(settings.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = React.useState(settings.banner_url ?? "");
  const [overlay, setOverlay] = React.useState(settings.banner_overlay);
  const [height, setHeight] = React.useState(settings.banner_height);

  const [smtpCheck, setSmtpCheck] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [imapCheck, setImapCheck] = React.useState<{ ok: boolean; message: string; folders?: string[] } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState("");

  /* Port değişince SSL kendiliğinden ayarlanır.
     465 → baştan SSL · 587 → düz başlar, STARTTLS ile yükselir.
     Bu ikisi karıştırılınca bağlantı hiç kurulmuyor; en sık yapılan hata. */
  const onSmtpPort = (p: number) => {
    setSmtpPort(p);
    if (p === 465) setSmtpSecure(true);
    else if (p === 587 || p === 25) setSmtpSecure(false);
  };

  const applyPreset = () => {
    setSmtpHost(MAIL_PRESET.smtp_host);
    setSmtpPort(MAIL_PRESET.smtp_port_ssl);
    setSmtpSecure(true);
    setSmtpUser(MAIL_PRESET.account);
    setImapHost(MAIL_PRESET.imap_host);
    setImapPort(MAIL_PRESET.imap_port);
    setImapUser(MAIL_PRESET.account);
  };

  React.useEffect(() => {
    const t = window.setTimeout(async () => {
      try {
        const res = await previewMail({
          subject: "Örnek e-posta",
          heading: "Sayın yetkili,",
          bodyHtml:
            "<p>Bu bir örnek içeriktir. Üst görsel, logo ve yazı düzeni burada nasıl görünüyorsa " +
            "gönderdiğiniz her mailde de öyle görünür.</p>" +
            "<p>Saygılarımızla,<br>Çocuk Tribünü</p>",
          partnerLogoUrl: null,
        });
        setPreview(res.html);
      } catch { /* önizleme kritik değil */ }
    }, 400);
    return () => window.clearTimeout(t);
  }, [logoUrl, bannerUrl, overlay, height, state.ok]);

  const run = async (kind: "smtp" | "imap") => {
    setBusy(kind);
    try {
      if (kind === "smtp") setSmtpCheck(await testSmtpConnection());
      else setImapCheck(await testImapConnection());
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="flex min-w-0 flex-col gap-6">

        <form action={action} className="flex flex-col gap-6">
          {state.message && (
            <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>
          )}

          {/* ══ HESAP ══ */}
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Head icon={IconMail} title="Mail hesabı" />
              <button type="button" onClick={applyPreset}
                className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-ink/25">
                Sunucu bilgilerini doldur
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gönderen adresi" htmlFor="from_email"
                hint="mailin “kimden” satırı" error={state.fieldErrors?.from_email}>
                <Input id="from_email" name="from_email" type="email" required
                  defaultValue={settings.from_email ?? MAIL_PRESET.account} />
              </Field>
              <Field label="Gönderen adı" htmlFor="from_name">
                <Input id="from_name" name="from_name" maxLength={80}
                  defaultValue={settings.from_name ?? "Çocuk Tribünü"} />
              </Field>
              <Field label="Yanıt adresi" htmlFor="reply_to" hint="isteğe bağlı"
                error={state.fieldErrors?.reply_to}>
                <Input id="reply_to" name="reply_to" type="email"
                  defaultValue={settings.reply_to ?? ""} />
              </Field>
            </div>

            <Checkbox id="is_active" name="is_active" defaultChecked={settings.is_active}
              label="Mail gönderimi açık" />
          </Card>

          {/* ══ GİDEN — SMTP ══ */}
          <Card className="flex flex-col gap-5 p-6">
            <Head icon={IconSend} title="Giden posta (SMTP)" />

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Sunucu" htmlFor="smtp_host">
                <Input id="smtp_host" name="smtp_host" value={smtpHost} required
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder={MAIL_PRESET.smtp_host} />
              </Field>
              <Field label="Bağlantı noktası" htmlFor="smtp_port">
                <Select id="smtp_port" name="smtp_port" value={String(smtpPort)}
                  onChange={(e) => onSmtpPort(Number(e.target.value))}>
                  <option value="465">465 · SSL</option>
                  <option value="587">587 · STARTTLS</option>
                  <option value="25">25 · şifresiz</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kullanıcı adı" htmlFor="smtp_user" hint="genelde e-posta adresi">
                <Input id="smtp_user" name="smtp_user" value={smtpUser} autoComplete="off"
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder={MAIL_PRESET.account} />
              </Field>
              <Field label="Parola" htmlFor="smtp_pass"
                hint={settings.has_smtp_pass ? "kayıtlı · boş bırakırsanız değişmez" : "gerekli"}>
                <Input id="smtp_pass" name="smtp_pass" type="password" autoComplete="new-password"
                  placeholder={settings.has_smtp_pass ? "•••••••••••• (kayıtlı)" : "hesap parolası"} />
              </Field>
            </div>

            {/* Onay kutusu işaretsizken form değer göndermez; durum
                doğrudan buradan taşınır. */}
            <input type="hidden" name="smtp_secure" value={smtpSecure ? "on" : "off"} />

            <div className="flex items-start gap-2.5 rounded-[14px] bg-field px-4 py-3">
              <Icon icon={IconShield} size={16} className="mt-[2px] shrink-0 text-muted" />
              <span className="text-[13px] leading-[1.6] text-muted">
                Güvenlik: <strong className="text-ink2">{smtpSecure ? "SSL/TLS" : "STARTTLS"}</strong>{" "}
                (port {smtpPort}). Port değiştirdiğinizde kendiliğinden düzelir —
                465 ile 587’yi karıştırmak bağlantıyı kurmayan en sık hatadır.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm"
                loading={busy === "smtp"} onClick={() => void run("smtp")}>
                Giden bağlantıyı sına
              </Button>
              {smtpCheck && (
                <span className={`text-[12.5px] font-medium ${smtpCheck.ok ? "text-green" : "text-danger"}`}>
                  {smtpCheck.ok && <Icon icon={IconCheck} size={13} className="mr-1 inline" />}
                  {smtpCheck.message}
                </span>
              )}
            </div>
            <span className="-mt-2 text-[12px] text-muted">
              Sınama KAYDEDİLMİŞ bilgilerle yapılır — önce kaydedin.
            </span>
          </Card>

          {/* ══ GELEN — IMAP ══ */}
          <Card className="flex flex-col gap-5 p-6">
            <Head icon={IconDownload} title="Gelen posta (IMAP)" />
            <p className="text-[13.5px] leading-[1.6] text-ink2">
              Panel mail sunucunuza bağlanıp gelen kutusuna bakar. Sürekli açık
              bağlantı tutulmaz: “Postaları al” dediğinizde bağlanır, yeni
              iletileri alır, kapatır.
            </p>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Sunucu" htmlFor="imap_host">
                <Input id="imap_host" name="imap_host" value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder={MAIL_PRESET.imap_host} />
              </Field>
              <Field label="Bağlantı noktası" htmlFor="imap_port">
                <Select id="imap_port" name="imap_port" value={String(imapPort)}
                  onChange={(e) => setImapPort(Number(e.target.value))}>
                  <option value="993">993 · SSL</option>
                  <option value="143">143 · şifresiz</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kullanıcı adı" htmlFor="imap_user">
                <Input id="imap_user" name="imap_user" value={imapUser} autoComplete="off"
                  onChange={(e) => setImapUser(e.target.value)}
                  placeholder={MAIL_PRESET.account} />
              </Field>
              <Field label="Parola" htmlFor="imap_pass"
                hint={settings.has_imap_pass ? "kayıtlı · boş bırakırsanız değişmez" : "gerekli"}>
                <Input id="imap_pass" name="imap_pass" type="password" autoComplete="new-password"
                  placeholder={settings.has_imap_pass ? "•••••••••••• (kayıtlı)" : "hesap parolası"} />
              </Field>
            </div>

            <input type="hidden" name="imap_secure" value={imapPort === 993 ? "on" : "off"} />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Gelen klasörü" htmlFor="imap_folder">
                <Input id="imap_folder" name="imap_folder"
                  defaultValue={settings.imap_folder || "INBOX"} />
              </Field>
              <Field label="Gönderilenler" htmlFor="imap_sent_folder">
                <Input id="imap_sent_folder" name="imap_sent_folder"
                  defaultValue={settings.imap_sent_folder || "Sent"} />
              </Field>
              <Field label="Çöp kutusu" htmlFor="imap_trash_folder">
                <Input id="imap_trash_folder" name="imap_trash_folder"
                  defaultValue={settings.imap_trash_folder || "Trash"} />
              </Field>
            </div>

            <div className="flex flex-col gap-2.5">
              <Checkbox id="imap_enabled" name="imap_enabled"
                defaultChecked={settings.imap_enabled}
                label="Gelen posta alımı açık" />
              <Checkbox id="imap_save_sent" name="imap_save_sent"
                defaultChecked={settings.imap_save_sent}
                label="Gönderdiğim mailler sunucudaki “Gönderilmiş” klasörüne de yazılsın" />
              <Checkbox id="reset_imap" name="reset_imap"
                label="Kutuyu baştan tara (son okunan kaydı sıfırla)" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm"
                loading={busy === "imap"} onClick={() => void run("imap")}>
                Gelen bağlantıyı sına
              </Button>
              {imapCheck && (
                <span className={`text-[12.5px] font-medium ${imapCheck.ok ? "text-green" : "text-danger"}`}>
                  {imapCheck.ok && <Icon icon={IconCheck} size={13} className="mr-1 inline" />}
                  {imapCheck.message}
                </span>
              )}
            </div>

            {imapCheck?.folders && imapCheck.folders.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-field px-4 py-3">
                <span className="text-[12.5px] font-semibold text-ink2">
                  Sunucudaki klasörler — doğru adı buradan kopyalayın
                </span>
                <span className="text-[12px] leading-[1.7] text-muted">
                  {imapCheck.folders.join(" · ")}
                </span>
              </div>
            )}

            {settings.imap_last_sync && (
              <span className="text-[12px] text-muted">
                Son eşitleme: {formatDate(settings.imap_last_sync, true)}
                {settings.imap_last_error && ` · son hata: ${settings.imap_last_error}`}
              </span>
            )}
          </Card>

          {/* ══ GÖRÜNÜM ══ */}
          <Card className="flex flex-col gap-5 p-6">
            <Head icon={IconImage} title="Mail görünümü" />
            <p className="text-[13.5px] leading-[1.6] text-ink2">
              Gönderdiğiniz her mail bu görünümle çıkar. Üst görsel mailin
              başında tam genişlikte durur, logomuz onun üstünde ortalanır.
            </p>

            <MailImageUpload name="banner_url" label="Üst görsel" aspect="banner"
              hint="1200×420 px önerilir" value={bannerUrl} onChange={setBannerUrl} />

            <MailImageUpload name="logo_url" label="Logomuz"
              hint="PNG · şeffaf zemin · açık renkli" value={logoUrl} onChange={setLogoUrl} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Görsel karartma · %${overlay}`} htmlFor="banner_overlay"
                hint="logo okunabilsin diye">
                <input id="banner_overlay" name="banner_overlay" type="range"
                  min={0} max={90} step={5} value={overlay}
                  onChange={(e) => setOverlay(Number(e.target.value))}
                  className="w-full accent-[var(--solid)]" />
              </Field>
              <Field label={`Görsel yüksekliği · ${height}px`} htmlFor="banner_height">
                <input id="banner_height" name="banner_height" type="range"
                  min={110} max={340} step={10} value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full accent-[var(--solid)]" />
              </Field>
            </div>

            <Divider />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kurum adı" htmlFor="brand_name">
                <Input id="brand_name" name="brand_name" maxLength={80}
                  defaultValue={settings.brand_name ?? "Çocuk Tribünü"} />
              </Field>
              <Field label="Site adresi" htmlFor="site_url">
                <Input id="site_url" name="site_url"
                  defaultValue={settings.site_url ?? "https://cocuktribunu.org"} />
              </Field>
            </div>

            <Field label="Alt bilgi" htmlFor="footer_note" hint="künye — mailin en altında">
              <Input id="footer_note" name="footer_note" maxLength={400}
                defaultValue={settings.footer_note ?? ""}
                placeholder="Çocuk Tribünü · İstanbul" />
            </Field>

            <Field label="İmza" htmlFor="signature_html"
              hint="her mailin sonuna eklenir · basit HTML">
              <Textarea id="signature_html" name="signature_html" rows={4}
                className="font-mono text-[13px]"
                defaultValue={settings.signature_html ?? ""}
                placeholder="<strong>Çocuk Tribünü</strong><br>iletisim@cocuktribunu.org" />
            </Field>
          </Card>

          <Button type="submit" variant="ink" size="lg" loading={pending}>Ayarları kaydet</Button>
        </form>

        {/* ══ TEST ══ */}
        <Card className="flex flex-col gap-4 p-6">
          <Head icon={IconSend} title="Test e-postası" />
          <p className="text-[13.5px] leading-[1.6] text-ink2">
            Ayarları kaydettikten sonra kendinize bir test gönderin. Gerçek bir
            mail programında nasıl göründüğünü görmenin tek yolu budur.
          </p>
          {testState.message && (
            <Alert tone={testState.ok ? "green" : "danger"}>{testState.message}</Alert>
          )}
          <form action={testAction} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Field label="Adres" htmlFor="testEmail" error={testState.fieldErrors?.testEmail}>
                <Input id="testEmail" name="testEmail" type="email" required
                  placeholder="siz@ornek.com" />
              </Field>
            </div>
            <Button type="submit" variant="ink" loading={testPending} disabled={!settings.is_active}>
              Test gönder
            </Button>
          </form>
          {!settings.is_active && (
            <span className="text-[12.5px] text-muted">
              Önce “Mail gönderimi açık” kutusunu işaretleyip kaydedin.
            </span>
          )}
        </Card>
      </div>

      {/* ══ ÖNİZLEME ══ */}
      <div className="min-w-0">
        <div className="xl:sticky xl:top-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[13px] font-bold tracking-[.1em] text-muted2">MAİL GÖRÜNÜMÜ</span>
            <Badge tone={settings.is_active ? "green" : "muted"}>
              {settings.is_active ? "Açık" : "Kapalı"}
            </Badge>
          </div>
          {preview ? (
            <MailBodyFrame html={preview} minHeight={540} maxHeight={1200} />
          ) : (
            <div className="flex h-[540px] items-center justify-center rounded-[16px] border border-dashed border-line bg-field text-[13.5px] text-muted">
              Hazırlanıyor…
            </div>
          )}
          <p className="mt-3 text-[12px] leading-[1.6] text-muted">
            Gönderdiğiniz her mail böyle görünür. Değişiklikler kaydedilmeden
            önizlenir; kalıcı olması için “Ayarları kaydet” gerekir.
          </p>
        </div>
      </div>
    </div>
  );
}

function Head({ icon, title }: { icon: Parameters<typeof Icon>[0]["icon"]; title: string }) {
  return (
    <span className="flex items-center gap-2.5 font-display text-[18px] font-semibold tracking-[-.02em]">
      <Icon icon={icon} size={19} className="text-ink2" />{title}
    </span>
  );
}
