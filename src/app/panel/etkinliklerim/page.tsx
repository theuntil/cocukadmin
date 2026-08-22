import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card, Divider, EmptyState } from "@/components/ui";
import { PanelBody, PanelHeader } from "@/components/panel/shell";
import { CancelRegistration } from "@/components/panel/cancel-registration";
import { Icon } from "@/components/ui/icon";
import { IconCalendar, IconLocation, IconQr, IconCheck } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { formatDate, REGISTRATION_STATUS_TR, statusTone } from "@/lib/utils";
import type { MyEventRegistration } from "@/lib/types";

export const metadata: Metadata = { title: "Etkinlik Kayıtlarım", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_my_event_registrations")
    .select("*")
    .order("starts_at", { ascending: false });

  const regs = (data ?? []) as unknown as MyEventRegistration[];
  const now = Date.now();
  const upcoming = regs.filter((r) => new Date(r.starts_at).getTime() >= now && r.status !== "cancelled");
  const past = regs.filter((r) => new Date(r.starts_at).getTime() < now || r.status === "cancelled");

  return (
    <PanelBody>
      <PanelHeader
        title="Etkinlik kayıtlarım"
        subtitle={`${upcoming.length} yaklaşan · ${past.length} geçmiş`}
        action={{ href: "/etkinlikler", label: "Etkinliklere göz at" }}
      />

      {regs.length === 0 ? (
        <EmptyState
          icon={<Icon icon={IconCalendar} size={26} />}
          title="Henüz etkinlik kaydınız yok"
          description="Şehrinizdeki buluşmalara katılmak için etkinlikler sayfasına göz atın."
          action={<ButtonLink href="/etkinlikler" variant="solid">Etkinlikler</ButtonLink>}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="flex flex-col gap-4">
              <span className="ct-eyebrow">YAKLAŞAN</span>
              <div className="ct-stagger flex flex-col gap-4">
                {upcoming.map((r) => <RegCard key={r.registration_id} reg={r} showCode />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="flex flex-col gap-4">
              <span className="ct-eyebrow">GEÇMİŞ</span>
              <div className="flex flex-col gap-4">
                {past.map((r) => <RegCard key={r.registration_id} reg={r} />)}
              </div>
            </section>
          )}
        </>
      )}
    </PanelBody>
  );
}

function RegCard({ reg, showCode }: { reg: MyEventRegistration; showCode?: boolean }) {
  const canCancel = showCode && ["confirmed", "waitlisted", "pending"].includes(reg.status);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Link href={`/etkinlikler/${reg.event_slug}`}
            className="font-display text-[19px] font-semibold tracking-[-.02em] hover:text-accent-ink">
            {reg.event_title}
          </Link>
          <span className="text-[13.5px] text-muted">
            Katılımcı: {reg.child_first_name} {reg.child_last_name}
            {reg.attendee_count > 1 && ` (+${reg.attendee_count - 1} refakatçi)`}
          </span>
        </div>
        <Badge tone={statusTone(reg.status)}>
          {reg.status === "waitlisted" && reg.waitlist_position
            ? `Bekleme listesi · ${reg.waitlist_position}. sıra`
            : (REGISTRATION_STATUS_TR[reg.status] ?? reg.status)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted">
        <span className="flex items-center gap-2"><Icon icon={IconCalendar} size={15} />{formatDate(reg.starts_at, true)}</span>
        <span className="flex items-center gap-2">
          <Icon icon={IconLocation} size={15} />
          {[reg.venue_name, reg.city_name].filter(Boolean).join(" · ") || "Konum açıklanacak"}
        </span>
      </div>

      {reg.checked_in_at && (
        <div className="flex items-center gap-2 rounded-[12px] bg-accent-soft px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink">
          <Icon icon={IconCheck} size={16} /> Giriş yapıldı · {formatDate(reg.checked_in_at, true)}
        </div>
      )}

      {showCode && reg.status === "confirmed" && reg.check_in_code && !reg.checked_in_at && (
        <>
          <Divider />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-[11.5px] font-bold tracking-[.1em] text-muted2">
                <Icon icon={IconQr} size={14} /> GİRİŞ KODU
              </span>
              <span className="font-mono text-[22px] font-bold tracking-[.15em]">{reg.check_in_code}</span>
            </div>
            <span className="max-w-[220px] text-[12.5px] leading-[1.5] text-muted">
              Etkinlik girişinde bu kodu gösterin. Kod yalnızca bir kez kullanılabilir.
            </span>
          </div>
        </>
      )}

      {canCancel && (
        <div className="flex justify-end border-t border-line2 pt-3">
          <CancelRegistration registrationId={reg.registration_id} eventTitle={reg.event_title} />
        </div>
      )}
    </Card>
  );
}
