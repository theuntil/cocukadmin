"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, ButtonLink, Card, EmptyState, Spinner } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  IconInbox, IconSend, IconStar, IconTrash, IconSearch, IconFile,
  IconAlert, IconMail, IconPlus, IconSettings, IconCheck, IconClose,
  IconCheckSquare, IconSquare, IconMinusSquare, IconArchive, IconRefresh,
} from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/modal";
import { pollMailbox, bulkMailAction, deleteManyAction, flagMail } from "@/lib/actions/mail";
import type { MailRow, MailStats } from "@/lib/mail/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Box = "inbox" | "outbox" | "starred";

const TABS: {
  key: Box; label: string; short: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  /** Yalnızca ikon göster (yıldızlılar) */
  iconOnly?: boolean;
}[] = [
  { key: "inbox",   label: "Gelen postalar", short: "Gelen", icon: IconInbox },
  { key: "outbox",  label: "Giden postalar", short: "Giden", icon: IconSend },
  { key: "starred", label: "Yıldızlılar",    short: "",      icon: IconStar, iconOnly: true },
];

/** Panelin kutuyu tazeleme aralığı — sunucuya bağlanma aralığı DEĞİL */
const POLL_MS = 5000;

/**
 * MAİL KUTUSU
 *
 * ┌─ CANLI AMA SESSİZ ────────────────────────────────────────────┐
 * │ Liste 5 saniyede bir tazelenir. Sayfa YENİLENMEZ: yalnızca    │
 * │ değişen satırlar yeniden çizilir. Sunucu listenin özetini      │
 * │ (imza) döndürüyor; imza aynıysa React'e hiç dokunulmuyor —     │
 * │ kaydırma yeri kaymaz, seçim bozulmaz, ekran titremez.          │
 * │                                                                │
 * │ Mail sunucusuna 5 saniyede bir BAĞLANILMAZ; o iş sunucu        │
 * │ tarafındaki kilitle 25 saniyeye seyreltilir.                   │
 * └────────────────────────────────────────────────────────────────┘
 */
export function MailBox({
  box,
  initialRows,
  initialTotal,
  initialSignature,
  initialStats,
  search,
  fromEmail,
  mailActive,
  imapEnabled,
  imapError,
}: {
  box: Box;
  initialRows: MailRow[];
  initialTotal: number;
  initialSignature: string;
  initialStats: MailStats;
  search: string | null;
  fromEmail: string | null;
  mailActive: boolean;
  imapEnabled: boolean;
  imapError: string | null;
}) {
  const router = useRouter();

  const [rows, setRows] = React.useState(initialRows);
  const [total, setTotal] = React.useState(initialTotal);
  const [stats, setStats] = React.useState(initialStats);
  const [syncError, setSyncError] = React.useState<string | null>(imapError);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const signature = React.useRef(initialSignature);
  const inFlight = React.useRef(false);

  /* Sekme değişince her şey sıfırlanır — sunucu yeni listeyi zaten
     gönderdi, istemci durumu onunla hizalanır. */
  React.useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setStats(initialStats);
    signature.current = initialSignature;
    setSelected(new Set());
  }, [initialRows, initialTotal, initialStats, initialSignature]);

  /* ── Canlı tazeleme ── */
  React.useEffect(() => {
    let alive = true;

    const tick = async () => {
      /* Önceki istek bitmediyse yenisi açılmaz: yavaş bağlantıda
         istekler üst üste binip sunucuyu boğmasın. */
      if (inFlight.current || document.hidden) return;
      inFlight.current = true;

      try {
        const snap = await pollMailbox(box, search);
        if (!alive) return;

        setStats(snap.stats);
        setSyncError(snap.syncError ?? null);

        // İmza aynıysa hiçbir şey değişmemiş: React'e dokunma
        if (snap.signature && snap.signature === signature.current) return;

        signature.current = snap.signature;
        setRows(snap.rows);
        setTotal(snap.total);

        /* Silinmiş satırlar seçimde kalmasın */
        setSelected((prev) => {
          if (prev.size === 0) return prev;
          const ids = new Set(snap.rows.map((r) => r.id));
          const next = new Set([...prev].filter((id) => ids.has(id)));
          return next.size === prev.size ? prev : next;
        });
      } catch {
        /* Ağ hatası sessiz geçilir: bir sonraki turda tekrar denenir.
           Kullanıcıya her titremede hata göstermek rahatsız edici. */
      } finally {
        inFlight.current = false;
      }
    };

    const timer = window.setInterval(tick, POLL_MS);

    /* Sekmeye geri dönülünce beklemeden tazele */
    const onVisible = () => { if (!document.hidden) void tick(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [box, search]);

  /* Bildirim kendiliğinden kaybolur */
  React.useEffect(() => {
    if (!notice?.ok) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  /* ── Seçim ── */
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /* ── Toplu işlemler ── */
  const runBulk = async (action: "read" | "unread" | "star" | "unstar" | "archive") => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await bulkMailAction([...selected], action);
      setNotice({ ok: res.ok, text: res.message ?? "" });
      if (res.ok) {
        setSelected(new Set());
        signature.current = "";   // bir sonraki turda kesin tazelensin
      }
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      const res = await deleteManyAction([...selected]);
      setNotice({ ok: res.ok, text: res.message ?? "" });
      setConfirmDelete(false);
      if (res.ok) setSelected(new Set());
      signature.current = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleStar = async (row: MailRow) => {
    /* İyimser: tıklama anında değişir, sunucu sonra onaylar */
    setRows((prev) => prev.map((r) =>
      r.id === row.id ? { ...r, is_starred: !r.is_starred } : r));
    signature.current = "";
    const res = await flagMail(row.id, "is_starred", !row.is_starred);
    if (!res.ok) {
      setRows((prev) => prev.map((r) =>
        r.id === row.id ? { ...r, is_starred: row.is_starred } : r));
    }
  };

  const emptyTitle = search
    ? "Sonuç bulunamadı"
    : box === "inbox" ? "Gelen posta yok"
    : box === "outbox" ? "Henüz posta gönderilmedi"
    : "Yıldızlı posta yok";

  return (
    <div className="flex flex-col gap-5">

      {/* ══ BAŞLIK ══ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
            Mail
          </h1>
          <span className="truncate text-[13px] text-muted">
            {fromEmail ?? "Mail hesabı tanımlı değil"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/mail/ayarlar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:border-ink/25 hover:text-ink"
            title="Mail ayarları">
            <Icon icon={IconSettings} size={17} />
          </Link>
          <ButtonLink href="/mail/yaz" variant="ink" size="md">
            <Icon icon={IconPlus} size={16} /> Yeni mail
          </ButtonLink>
        </div>
      </div>

      {/* ══ UYARILAR ══ */}
      {!mailActive && (
        <Alert tone="orange" title="Mail gönderimi kapalı">
          <Link href="/mail/ayarlar" className="font-semibold underline">Mail ayarları</Link>{" "}
          bölümünden sistemi açın.
        </Alert>
      )}
      {box !== "outbox" && !imapEnabled && (
        <Alert tone="orange" title="Gelen posta alımı kapalı">
          <Link href="/mail/ayarlar" className="font-semibold underline">Mail ayarları</Link>{" "}
          bölümünden IMAP bilgilerini girip alımı açın.
        </Alert>
      )}
      {syncError && imapEnabled && (
        <Alert tone="danger" title="Sunucuya bağlanılamıyor">{syncError}</Alert>
      )}
      {notice && (
        <Alert tone={notice.ok ? "green" : "danger"}>{notice.text}</Alert>
      )}

      {/* ══ SEKMELER ══ */}
      <div className="ct-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const on = box === t.key;
          // Sayaç yalnızca gelen kutusunda: okunmamış posta sayısı
          const sayac = t.key === "inbox" ? stats.inbox_unread : 0;

          return (
            <Link key={t.key} href={`/mail?kutu=${t.key}`}
              aria-current={on ? "page" : undefined}
              aria-label={t.iconOnly ? t.label : undefined}
              title={t.iconOnly ? t.label : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border font-semibold transition-colors",
                t.iconOnly ? "h-[38px] w-[38px] justify-center" : "px-4 py-2 text-[13.5px]",
                /* Seçili sekme NÖTR koyu zemin: açık temada siyah, koyu
                   temada açık. Sarı vurgu artık yalnızca gerçekten
                   dikkat çekmesi gereken yerlerde. */
                on
                  ? "border-solid bg-solid text-on-solid"
                  : "border-line bg-surface text-ink2 hover:border-ink/25 hover:text-ink",
              )}>
              <Icon icon={t.icon} size={16} />
              {!t.iconOnly && (
                <>
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </>
              )}
              {sayac > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  on ? "bg-on-solid/20 text-on-solid" : "bg-orange text-white",
                )}>
                  {sayac > 99 ? "99+" : sayac}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ══ ARAMA ══ */}
      <form action="/mail" method="get" className="flex items-center gap-2">
        <input type="hidden" name="kutu" value={box} />
        <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
          <Icon icon={IconSearch} size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2" />
          <input name="ara" defaultValue={search ?? ""}
            placeholder="Konu, adres veya içerikte ara"
            className="h-[40px] w-full rounded-full border border-line bg-field pl-9 pr-4 text-[13.5px] text-ink placeholder:text-muted2 focus:border-green focus:outline-none" />
        </div>
        {search && (
          <Link href={`/mail?kutu=${box}`}
            className="shrink-0 text-[13px] font-semibold text-muted hover:text-ink">
            Temizle
          </Link>
        )}
      </form>

      {/* ══ TOPLU İŞLEM ÇUBUĞU ══ */}
      {selected.size > 0 && (
        <div className="ct-fade sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-[16px] border border-line bg-surface px-3 py-2.5 shadow-[var(--shadow-sm)]">
          <button type="button" onClick={() => setSelected(new Set())}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink2 transition-colors hover:bg-chip"
            title="Seçimi kaldır">
            <Icon icon={IconClose} size={15} />
          </button>

          <span className="mr-1 text-[13.5px] font-bold text-ink">
            {selected.size} seçili
          </span>

          <BulkButton icon={IconCheck} label="Okundu" busy={busy}
            onClick={() => void runBulk("read")} />
          <BulkButton icon={IconStar} label="Yıldızla" busy={busy}
            onClick={() => void runBulk("star")} />
          <BulkButton icon={IconStar} label="Yıldızı kaldır" busy={busy} hideOnMobile
            onClick={() => void runBulk("unstar")} />
          {box === "inbox" && (
            <BulkButton icon={IconArchive} label="Arşivle" busy={busy} hideOnMobile
              onClick={() => void runBulk("archive")} />
          )}

          <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-danger px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon icon={IconTrash} size={14} />}
            Sil
          </button>
        </div>
      )}

      {/* ══ LİSTE ══ */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon icon={box === "starred" ? IconStar : box === "outbox" ? IconSend : IconMail} size={24} />}
          title={emptyTitle}
          description={search
            ? "Farklı bir kelime deneyin."
            : box === "inbox"
              ? "Yeni postalar geldiğinde burada kendiliğinden görünür."
              : box === "outbox"
                ? "İlk mailinizi göndermek için “Yeni mail” düğmesini kullanın."
                : "Bir postayı yıldızlayınca burada toplanır."}
          action={box === "outbox" && !search
            ? <ButtonLink href="/mail/yaz" variant="ink" size="md">Yeni mail</ButtonLink>
            : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Tümünü seç */}
          <div className="flex items-center gap-3 border-b border-line2 px-3 py-2.5 sm:px-4">
            <CheckBox
              state={allSelected ? "all" : someSelected ? "some" : "none"}
              onClick={toggleAll}
              label="Tümünü seç"
            />
            <span className="text-[12.5px] text-muted">
              {selected.size > 0 ? `${selected.size} / ${rows.length}` : `${total} posta`}
            </span>
            <span className="ml-auto hidden items-center gap-1.5 text-[12px] text-muted sm:flex">
              <Icon icon={IconRefresh} size={12} />
              kendiliğinden güncelleniyor
            </span>
          </div>

          <ul className="divide-y divide-line2">
            {rows.map((m) => {
              const unread = m.box === "inbox" && !m.is_read;
              const failed = m.status === "failed";
              const sel = selected.has(m.id);

              return (
                <li key={m.id}
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-3 transition-colors sm:items-center sm:gap-3 sm:px-4",
                    sel ? "bg-chip" : unread ? "bg-chip/40" : "hover:bg-chip/40",
                  )}>

                  <div className="pt-0.5 sm:pt-0">
                    <CheckBox
                      state={sel ? "all" : "none"}
                      onClick={() => toggleOne(m.id)}
                      label={`${m.subject ?? "Posta"} seç`}
                    />
                  </div>

                  <Link href={`/mail/${m.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "truncate text-[13px]",
                        unread ? "font-bold text-ink" : "font-semibold text-ink2",
                      )}>
                        {m.box === "inbox"
                          ? (m.from_name || m.from_email || "—")
                          : (m.to_list && m.to_list.length > 1
                              ? `${m.to_email} +${m.to_list.length - 1}`
                              : (m.to_email || "—"))}
                      </span>
                      {failed && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-bold text-danger">
                          <Icon icon={IconAlert} size={10} /> Gitmedi
                        </span>
                      )}
                      {m.status === "sending" && (
                        <span className="shrink-0 rounded-full bg-orange-soft px-2 py-0.5 text-[11px] font-bold text-orange-ink">
                          Gönderiliyor
                        </span>
                      )}
                      <span className="ml-auto hidden shrink-0 text-[12px] text-muted sm:block">
                        {formatDate(m.received_at ?? m.sent_at ?? m.created_at, true)}
                      </span>
                    </div>

                    <span className={cn(
                      "truncate text-[14.5px]",
                      unread ? "font-semibold text-ink" : "text-ink",
                    )}>
                      {m.subject || "(konu yok)"}
                    </span>

                    <div className="flex items-center gap-2">
                      {m.preview && (
                        <span className="truncate text-[12.5px] text-muted">{m.preview}</span>
                      )}
                      {m.has_attachments && (
                        <Icon icon={IconFile} size={12} className="shrink-0 text-muted2" />
                      )}
                    </div>

                    <span className="text-[11.5px] text-muted2 sm:hidden">
                      {formatDate(m.received_at ?? m.sent_at ?? m.created_at, true)}
                    </span>
                  </Link>

                  <button type="button" onClick={() => void toggleStar(m)}
                    title={m.is_starred ? "Yıldızı kaldır" : "Yıldızla"}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                      /* Yıldız turuncu: iki temada da net görünen tek
                         dikkat rengi. `accent-ink` koyu temada kayboluyordu. */
                      m.is_starred
                        ? "text-orange"
                        : "text-muted2 hover:bg-chip hover:text-ink2",
                    )}>
                    <Icon icon={IconStar} size={16}
                      className={m.is_starred ? "fill-current" : undefined} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {total > rows.length && (
        <span className="text-center text-[13px] text-muted">
          {rows.length} / {total} posta gösteriliyor. Aramayla daraltabilirsiniz.
        </span>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={busy}
        title={`${selected.size} posta silinsin mi?`}
        description="Seçili postalar hem panelden hem mail sunucusundan silinecek; sunucuda çöp kutusuna taşınır."
        confirmLabel="Sil"
        onConfirm={() => void runDelete()}
      />
    </div>
  );
}

/* ── Onay kutusu ── */
function CheckBox({
  state, onClick, label,
}: { state: "none" | "some" | "all"; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      aria-pressed={state !== "none"}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-colors",
        /* Seçili durumda `accent-ink` kullanılıyordu; o renk koyu temada
           neredeyse siyah ve koyu zeminde ikon kayboluyordu. Metin rengi
           kullanılıyor: iki temada da okunur. */
        state === "none" ? "text-muted2 hover:bg-chip hover:text-ink2" : "text-ink",
      )}>
      <Icon
        icon={state === "all" ? IconCheckSquare : state === "some" ? IconMinusSquare : IconSquare}
        size={19}
      />
    </button>
  );
}

/* ── Toplu işlem düğmesi ── */
function BulkButton({
  icon, label, onClick, busy, hideOnMobile,
}: {
  icon: Parameters<typeof Icon>[0]["icon"];
  label: string; onClick: () => void; busy: boolean; hideOnMobile?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-field px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink/30 disabled:opacity-50",
        hideOnMobile && "hidden sm:inline-flex",
      )}>
      <Icon icon={icon} size={14} />
      {label}
    </button>
  );
}
