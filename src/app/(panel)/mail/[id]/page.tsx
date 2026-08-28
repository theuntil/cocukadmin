import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconArrowRight, IconFile, IconDownload, IconReply } from "@/components/ui/icons";
import { MailBodyFrame } from "@/components/admin/mail-body-frame";
import { DeleteMailButton, StarButton } from "@/components/admin/mail-actions";
import { MarkReadOnServer } from "@/components/admin/mail-mark-read";
import { getMailDetail } from "@/lib/mail/data";
import { MAIL_STATUS_TR } from "@/lib/mail/types";
import { formatDate } from "@/lib/utils";
import { getAdminUser, hasRole } from "@/lib/data";

export const metadata: Metadata = { title: "Mail" };
export const dynamic = "force-dynamic";

/**
 * MAİL DETAYI
 *
 * Sade başlık: konu · kim · tarih. Ayrı bir künye kartı YOK — aynı
 * bilgiyi iki kez göstermek ekranı kalabalıklaştırıyordu.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin", "editor", "support")) redirect("/");

  const { id } = await params;

  /* Kimlik biçimi baştan doğrulanır: bozuk kimlikle RPC çağırmak
     veritabanı hatası üretiyor, 404 daha doğru cevap. */
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const mail = await getMailDetail(id);
  if (!mail) notFound();

  const isInbox = mail.box === "inbox";
  const tarih = formatDate(
    isInbox ? mail.received_at : (mail.sent_at ?? mail.created_at), true);

  const kimden = [mail.from_name, mail.from_email].filter(Boolean).join(" · ") || "—";
  const kime = (mail.to_list && mail.to_list.length > 0
    ? mail.to_list.join(", ")
    : mail.to_email) || "—";

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      {/* Panelde açılan mail sunucuda da okundu işaretlenir */}
      {isInbox && mail.newly_read && mail.imap_uid && (
        <MarkReadOnServer uid={mail.imap_uid} folder={mail.folder} />
      )}

      {/* ── Üst çubuk ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link href={`/mail?kutu=${mail.box}`}
          className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> {isInbox ? "Gelen postalar" : "Giden postalar"}
        </Link>

        <div className="ct-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          {isInbox && mail.from_email && (
            <ButtonLink href={`/mail/yaz?yanit=${mail.id}`} variant="ink" size="sm">
              <Icon icon={IconReply} size={15} /> Yanıtla
            </ButtonLink>
          )}
          <ButtonLink href={`/mail/yaz?ilet=${mail.id}`} variant="outline" size="sm">
            <Icon icon={IconArrowRight} size={15} /> İlet
          </ButtonLink>
          <StarButton id={mail.id} starred={mail.is_starred} />
          <DeleteMailButton id={mail.id} subject={mail.subject} onDeleted={`/mail?kutu=${mail.box}`} />
        </div>
      </div>

      {/* ── Konu ve taraflar ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 font-display text-[23px] font-semibold leading-[1.2] tracking-[-.03em] sm:text-[27px]">
            {mail.subject || "(konu yok)"}
          </h1>
          {!isInbox && (
            <Badge tone={
              mail.status === "sent" ? "green"
              : mail.status === "failed" ? "danger" : "orange"}>
              {MAIL_STATUS_TR[mail.status] ?? mail.status}
            </Badge>
          )}
        </div>

        {/* Kimden / Kime, hemen altında tarih */}
        <div className="flex flex-col gap-1">
          <span className="text-[13.5px] text-ink2">
            <span className="text-muted">{isInbox ? "Kimden:" : "Kime:"}</span>{" "}
            <span className="font-medium">{isInbox ? kimden : kime}</span>
          </span>
          {isInbox && mail.to_email && (
            <span className="text-[13px] text-muted">
              Kime: {mail.to_email}
            </span>
          )}
          <span className="text-[12.5px] text-muted2">{tarih}</span>
        </div>
      </div>

      {mail.error && (
        <Alert tone="danger" title="Gönderilemedi">{mail.error}</Alert>
      )}

      {/* ── Ekler ──
          ┌─ ARTIK İNDİRİLEBİLİR ⚠️ ────────────────────────────────┐
          │ Ekler yalnızca etiket olarak görünüyordu: adı ve boyutu  │
          │ yazıyor ama tıklanamıyordu. Kullanıcı dosyayı görüyor,   │
          │ alamıyordu.                                               │
          │                                                            │
          │ Dosya içeriği veritabanında saklanmıyor (tek bir 10 MB'lık│
          │ ek, binlerce satırlık metinden büyük olurdu). İndirme     │
          │ anında IMAP'ten çekiliyor — bu yüzden bağlantı bir API    │
          │ ucuna gidiyor, doğrudan dosyaya değil.                     │
          └────────────────────────────────────────────────────────────┘ */}
      {mail.attachments && mail.attachments.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <span className="text-[12.5px] font-bold tracking-[.1em] text-muted2">
            EKLER · {mail.attachments.length}
          </span>

          <ul className="flex flex-col gap-2">
            {mail.attachments.map((a, i) => (
              <li key={i}>
                <a
                  href={`/api/mail/ek?mail=${mail.id}&i=${i}`}
                  /* `download` niteliği: tarayıcı PDF/resmi sekmede
                     açmak yerine indirsin. Dosya adı sunucudan gelen
                     başlıktan alınıyor. */
                  download
                  className="group flex items-center gap-3 rounded-[14px] border border-line bg-field px-4 py-3 transition-colors hover:border-ink/25 hover:bg-chip"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-chip text-ink2">
                    <Icon icon={IconFile} size={16} />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-semibold">
                      {a.filename ?? `ek-${i + 1}`}
                    </span>
                    <span className="text-[12px] text-muted">
                      {(a.size ?? 0) >= 1048576
                        ? `${((a.size ?? 0) / 1048576).toFixed(1)} MB`
                        : `${Math.max(1, Math.round((a.size ?? 0) / 1024))} KB`}
                      {a.contentType ? ` · ${a.contentType}` : ""}
                    </span>
                  </span>

                  <Icon icon={IconDownload} size={16}
                    className="shrink-0 text-muted2 transition-colors group-hover:text-ink" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Gövde ── */}
      {mail.body_html ? (
        <MailBodyFrame html={mail.body_html} minHeight={460} />
      ) : mail.body_text ? (
        <Card className="whitespace-pre-wrap p-6 text-[14px] leading-[1.7] text-ink2">
          {mail.body_text}
        </Card>
      ) : (
        <Card className="p-6 text-[13.5px] text-muted">İçerik bulunamadı.</Card>
      )}
    </div>
  );
}
