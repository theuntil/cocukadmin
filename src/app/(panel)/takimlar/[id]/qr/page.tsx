import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconArrowLeft, IconQr, IconCheck, IconAlert, IconArrowRight } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, hasRole } from "@/lib/data";
import { formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "QR okutmaları" };
export const dynamic = "force-dynamic";

const SONUC: Record<string, { etiket: string; ok: boolean; aciklama: string }> = {
  ok:         { etiket: "Geçerli",       ok: true,  aciklama: "Kart geçerli, giriş verildi" },
  expired:    { etiket: "Süresi dolmuş", ok: false, aciklama: "Kartın geçerlilik tarihi geçmiş" },
  revoked:    { etiket: "İptal edilmiş", ok: false, aciklama: "Kart iptal edilmiş" },
  inactive:   { etiket: "Pasif kart",    ok: false, aciklama: "Kart aktif değil" },
  wrong_team: { etiket: "Başka takım",   ok: false, aciklama: "Kart bu takıma ait değil" },
  not_found:  { etiket: "Bulunamadı",    ok: false, aciklama: "Okunan QR bir karta ait değil" },
};

/**
 * QR OKUTMA GEÇMİŞİ
 *
 * Hangi kart, ne zaman, kim tarafından okutuldu ve sonuç ne oldu.
 *
 * ★ Karta tıklanınca kartın kendi sayfasına gidilir — okutma kaydından
 *   kartın tüm geçmişine tek tıkla ulaşılıyor.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!hasRole(user, "admin")) redirect("/");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createClient();

  const [teamRes, kayitRes] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("card_checkins")
      .select(
        "id, result, checked_at, card_id, " +
        "profiles!card_checkins_checked_by_fkey(first_name,last_name), " +
        "cards(card_number, status, valid_until, children(first_name,last_name))",
      )
      .eq("team_id", id)
      .order("checked_at", { ascending: false })
      .limit(300),
  ]);

  if (teamRes.error) {
    return <Alert tone="danger" title="Takım bulunamadı">{teamRes.error.message}</Alert>;
  }
  if (!teamRes.data) notFound();

  const team = teamRes.data as { id: string; name: string };

  if (kayitRes.error) {
    return (
      <div className="flex flex-col gap-5">
        <Link href={`/takimlar/${id}`}
          className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> {team.name}
        </Link>
        <Alert tone="danger" title="Okutma kayıtları alınamadı">{kayitRes.error.message}</Alert>
      </div>
    );
  }

  type Kayit = {
    id: string; result: string; checked_at: string; card_id: string | null;
    profiles: { first_name: string | null; last_name: string | null } | null;
    cards: {
      card_number: string; status: string; valid_until: string | null;
      children: { first_name: string; last_name: string } | null;
    } | null;
  };

  const kayitlar = (kayitRes.data ?? []) as unknown as Kayit[];
  const basarili = kayitlar.filter((k) => k.result === "ok").length;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/takimlar/${id}`}
        className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon icon={IconArrowLeft} size={15} /> {team.name}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
          QR okutmaları
        </h1>
        <span className="text-[13.5px] text-muted">
          {kayitlar.length} kayıt · {basarili} geçerli giriş
        </span>
      </div>

      {kayitlar.length === 0 ? (
        <EmptyState icon={<Icon icon={IconQr} size={24} />}
          title="Henüz QR okutulmamış"
          description="Görevliler kart okuttukça kayıtlar burada birikir." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line2">
            {kayitlar.map((k) => {
              const s = SONUC[k.result] ?? { etiket: k.result, ok: false, aciklama: "" };
              const cocuk = k.cards?.children;
              const ad = cocuk ? `${cocuk.first_name} ${cocuk.last_name}` : null;

              /* Kart silinmişse bağlantı verilmez — tıklanınca 404'e
                 götürmek yerine düz metin gösteriliyor. */
              const icerik = (
                <>
                  <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    s.ok ? "bg-green-soft text-green" : "bg-chip text-muted",
                  )}>
                    <Icon icon={s.ok ? IconCheck : IconAlert} size={15} />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-semibold">
                      {ad ?? k.cards?.card_number ?? "Bilinmeyen kart"}
                    </span>
                    <span className="truncate text-[12.5px] text-muted">
                      {k.cards?.card_number ? `${k.cards.card_number} · ` : ""}
                      {s.aciklama}
                    </span>
                  </span>

                  <Badge tone={s.ok ? "green" : "muted"}>{s.etiket}</Badge>

                  <span className="hidden shrink-0 flex-col items-end text-[12px] text-muted sm:flex">
                    <span>{formatDate(k.checked_at, true)}</span>
                    {k.profiles && (
                      <span className="text-muted2">
                        {`${k.profiles.first_name ?? ""} ${k.profiles.last_name ?? ""}`.trim() || "—"}
                      </span>
                    )}
                  </span>

                  {k.card_id && (
                    <Icon icon={IconArrowRight} size={15} className="shrink-0 text-muted2" />
                  )}
                </>
              );

              return (
                <li key={k.id}>
                  {k.card_id ? (
                    <Link href={`/kartlar/${k.card_id}`}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-chip/40 sm:px-5">
                      {icerik}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3.5 px-4 py-3 sm:px-5">{icerik}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
