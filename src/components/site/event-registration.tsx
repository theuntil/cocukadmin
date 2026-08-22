"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Divider, Select, Field } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck, IconAlert, IconQr, IconUsers } from "@/components/ui/icons";
import { registerForEvent, cancelEventRegistration } from "@/lib/actions/app";
import { IDLE } from "@/lib/actions/types";
import { useActionToast } from "@/components/ui/action-toast";
import type { ChildEligibility } from "@/lib/types";
import { ChildPhoto } from "@/components/panel/child-photo";

export function EventRegistration({
  eventId, eventTitle, children, waitlistEnabled, remaining,
  profileComplete = true,
}: {
  eventId: string;
  eventTitle: string;
  children: ChildEligibility[];
  waitlistEnabled: boolean;
  remaining: number | null;
  profileComplete?: boolean;
}) {
  const [state, action, pending] = useActionState(registerForEvent, IDLE);
  useActionToast(state);

  /*
   * Üç ayrı grup:
   *   · eligible   — kayıt yapılabilir
   *   · registered — ZATEN kayıtlı (engel değil, tamamlanmış işlem)
   *   · blocked    — gerçekten katılamayanlar (yaş, kart, kontenjan...)
   *
   * Önceden "zaten kayıtlı" da engel sayılıp "katılamayan çocuklar"
   * listesinde gösteriliyordu; bu yanlış bir izlenim veriyordu.
   */
  const eligible = children.filter((c) => c.eligible);
  const registered = children.filter((c) => !c.eligible && c.reason === "already_registered");
  const blocked = children.filter((c) => !c.eligible && c.reason !== "already_registered");

  // Tek uygun çocuk varsa kendiliğinden seçili gelir
  const [selected, setSelected] = React.useState(eligible[0]?.child_id ?? "");

  React.useEffect(() => {
    if (!selected && eligible.length > 0) setSelected(eligible[0]!.child_id);
  }, [eligible, selected]);

  if (state.ok && state.data) {
    const d = state.data as { status: string; check_in_code: string; waitlist_position: number | null };
    return (
      <Card className="ct-scale flex flex-col items-center gap-5 p-7 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon icon={IconCheck} size={26} />
        </span>
        <div className="flex flex-col gap-2">
          <span className="font-display text-[21px] font-semibold tracking-[-.02em]">
            {d.status === "waitlisted" ? "Bekleme listesindesiniz" : "Kaydınız alındı"}
          </span>
          <p className="text-[14px] leading-[1.6] text-ink2">
            {d.status === "waitlisted"
              ? `Sıradaki ${d.waitlist_position}. kişisiniz. Yer açılırsa size bildirim göndereceğiz.`
              : `${eventTitle} etkinliğinde görüşmek üzere!`}
          </p>
        </div>

        {d.status === "confirmed" && d.check_in_code && (
          <div className="flex w-full flex-col items-center gap-2 rounded-[16px] border border-line bg-field p-5">
            <span className="flex items-center gap-2 text-[12px] font-bold tracking-[.1em] text-muted2">
              <Icon icon={IconQr} size={15} /> GİRİŞ KODU
            </span>
            <span className="font-mono text-[26px] font-bold tracking-[.15em] text-ink">{d.check_in_code}</span>
            <span className="text-[12.5px] text-muted">Etkinlik girişinde bu kodu gösterin.</span>
          </div>
        )}

        <Link href="/panel/etkinliklerim" className="text-[14px] font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">
          Kayıtlarımı görüntüle →
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-7">
      <div className="flex flex-col gap-1">
        <span className="font-display text-[20px] font-semibold tracking-[-.02em]">Etkinliğe katıl</span>
        <span className="text-[13.5px] text-muted">
          {remaining === null ? "Kontenjan sınırsız" : remaining > 0 ? `${remaining} yer kaldı` : waitlistEnabled ? "Kontenjan doldu — bekleme listesi açık" : "Kontenjan doldu"}
        </span>
      </div>

      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      {!profileComplete ? (
        <>
          <Alert tone="orange">
            <span className="flex items-start gap-2">
              <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0" />
              Etkinliğe kaydolmadan önce profil bilgilerinizi (şehir ve takım) tamamlamanız gerekiyor.
            </span>
          </Alert>
          <Link href="/kurulum">
            <Button variant="solid" size="lg" className="w-full">Profilimi tamamla</Button>
          </Link>
        </>
      ) : children.length === 0 ? (
        <>
          <Alert tone="orange">
            Kayıt yapmak için önce panelinizden bir çocuk kaydı eklemelisiniz.
          </Alert>
          <Link href="/panel/cocuklarim"><Button size="lg" className="w-full">Çocuk ekle</Button></Link>
        </>
      ) : eligible.length === 0 && registered.length > 0 ? (
        /* Tüm çocuklar kayıtlı: bu bir engel değil, tamamlanmış kayıt */
        <>
          <Alert tone="green">
            <span className="flex items-start gap-2">
              <Icon icon={IconCheck} size={16} className="mt-[2px] shrink-0" />
              {registered.length === 1
                ? `${registered[0]!.first_name} bu etkinliğe kayıtlı.`
                : "Çocuklarınızın tümü bu etkinliğe kayıtlı."}
            </span>
          </Alert>

          <div className="flex flex-col gap-2.5">
            {registered.map((c) => (
              <RegisteredRow key={c.child_id} child={c} />
            ))}
          </div>

          {blocked.length > 0 && <BlockedList items={blocked} />}

          <Link href="/panel/etkinliklerim">
            <Button variant="outline" size="lg" className="w-full">Kayıtlarım</Button>
          </Link>
        </>
      ) : eligible.length === 0 ? (
        <>
          <Alert tone="orange">
            <span className="flex items-start gap-2">
              <Icon icon={IconAlert} size={16} className="mt-[2px] shrink-0" />
              Şu an bu etkinliğe kaydedebileceğiniz bir çocuk bulunmuyor.
            </span>
          </Alert>
          <BlockedList items={blocked} />
          {blocked.some((c) => c.reason === "no_card" || c.reason === "card_required") && (
            <Link href="/panel/kombine-kart">
              <Button variant="solid" size="lg" className="w-full">Kombine kart al</Button>
            </Link>
          )}
        </>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="eventId" value={eventId} />

          {/* Çocuk seçimi: açılır liste yerine fotoğraflı kartlar.
              Tek çocuk varsa zaten seçili gelir. */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-ink2">
              Hangi çocuğunuz katılacak?
            </span>

            <input type="hidden" name="childId" value={selected} required />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {eligible.map((c) => {
                const active = selected === c.child_id;
                return (
                  <button
                    key={c.child_id}
                    type="button"
                    onClick={() => setSelected(c.child_id)}
                    aria-pressed={active}
                    className={`relative flex flex-col items-center gap-2.5 rounded-[18px] border-2 p-4 transition-all ${
                      active
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:border-accent-line"
                    }`}
                  >
                    {active && (
                      <span className="ct-selected absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full">
                        <Icon icon={IconCheck} size={11} />
                      </span>
                    )}

                    <ChildPhoto childId={c.child_id}
                      name={`${c.first_name} ${c.last_name}`}
                      hasPhoto={Boolean(c.photo_path)}
                      className="h-16 w-16 text-[19px]" />

                    <span className="flex flex-col items-center gap-0.5">
                      <span className="line-clamp-1 text-[13.5px] font-semibold">
                        {c.first_name}
                      </span>
                      <span className="text-[11.5px] text-muted">{c.age} yaş</span>
                    </span>

                    {c.will_waitlist && (
                      <span className="rounded-full bg-orange-bg px-2 py-0.5 text-[10.5px] font-semibold text-orange-ink">
                        Bekleme listesi
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {state.fieldErrors?.childId && (
              <span className="text-[12.5px] font-medium text-danger">
                {state.fieldErrors.childId}
              </span>
            )}
          </div>

          {/* Zaten kayıtlı çocuklar — buradan çıkarılabilir */}
          {registered.length > 0 && (
            <div className="flex flex-col gap-2.5 border-t border-line2 pt-4">
              {registered.map((c) => (
                <RegisteredRow key={c.child_id} child={c} />
              ))}
            </div>
          )}

          <Button type="submit" variant="solid" size="lg" loading={pending}>
            <Icon icon={IconUsers} size={17} />
            {eligible.find((c) => c.child_id === selected)?.will_waitlist ? "Bekleme listesine katıl" : "Katıl"}
          </Button>

          {blocked.length > 0 && (
            <>
              <Divider />
              <BlockedList items={blocked} />
            </>
          )}
        </form>
      )}
    </Card>
  );
}

function BlockedList({ items }: { items: ChildEligibility[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold tracking-[.1em] text-muted2">KATILAMAYAN ÇOCUKLAR</span>
      {items.map((c) => (
        <div key={c.child_id} className="flex flex-col gap-0.5 rounded-[12px] bg-chip px-3.5 py-2.5">
          <span className="text-[13.5px] font-semibold">{c.first_name} {c.last_name}</span>
          <span className="text-[12.5px] leading-[1.5] text-muted">{c.message}</span>
        </div>
      ))}
    </div>
  );
}


/**
 * Kayıtlı çocuk satırı.
 *
 * Kaydın yanında "Etkinlikten çık" düğmesi durur: kullanıcı kaydını
 * panele gitmeden buradan iptal edebilir. İptal geri alınamayacağı için
 * onay istenir.
 */
function RegisteredRow({ child }: { child: ChildEligibility }) {
  const [state, action, pending] = useActionState(cancelEventRegistration, IDLE);
  const [asking, setAsking] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  if (state.ok) {
    return (
      <div className="flex items-center gap-2 rounded-[12px] bg-chip px-4 py-3">
        <Icon icon={IconCheck} size={14} className="shrink-0 text-muted" />
        <span className="text-[13px] text-muted">
          {child.first_name} için kayıt iptal edildi.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-green bg-green-soft px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-green">
          <Icon icon={IconCheck} size={13} />
          {child.first_name} kayıtlı
          {child.registration_status === "waitlisted" ? " (bekleme listesi)" : ""}
        </span>

        {!asking && child.registration_id && (
          <button type="button" onClick={() => setAsking(true)}
            className="text-[12.5px] font-semibold text-danger underline decoration-danger/40 decoration-2 underline-offset-4">
            Etkinlikten çık
          </button>
        )}
      </div>

      {asking && child.registration_id && (
        <form ref={formRef} action={action} className="flex flex-col gap-2.5">
          <input type="hidden" name="registrationId" value={child.registration_id} />
          <input type="hidden" name="reason" value="Kullanıcı kaydını iptal etti" />

          <span className="text-[12.5px] leading-[1.5] text-ink2">
            {child.first_name} için kayıt iptal edilecek. Kontenjan doluysa
            yeniden kayıt olamayabilirsiniz.
          </span>

          {state.message && !state.ok && (
            <span className="text-[12.5px] font-medium text-danger">{state.message}</span>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="outline" loading={pending}
              className="!border-danger !text-danger hover:!bg-danger-soft">
              Evet, çık
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Vazgeç
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
