import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, EmptyState } from "@/components/ui";
import { PanelBody } from "@/components/panel/shell";
import { ApplicationForm } from "@/components/panel/application-form";
import { Icon } from "@/components/ui/icon";
import {
  IconArrowLeft, IconArrowRight, IconChild, IconAlert, IconClock, IconQr,
} from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { getTeams, getActivePlan, getPaymentOptions, getBankInfo } from "@/lib/data";
import { formatMoney, publicStorageUrl } from "@/lib/utils";
import type { Child } from "@/lib/types";

export const metadata: Metadata = { title: "Yeni başvuru", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Yeni kombine kart başvurusu.
 *
 * ÇIKMAZ SOKAK YOK.
 *
 * Eskiden devam eden başvurusu olan çocuk listeden tamamen çıkarılıyordu.
 * Tek çocuğu olan kullanıcı ilk başvurusundan hemen sonra "Tüm çocuklarınız
 * için başvuru yapılmış" ekranına düşüyor, devam edecek bağlantı da
 * bulamıyordu — hata gibi görünen bu ekran aslında bir tasarım hatasıydı.
 *
 * Artık her çocuk üç kümeden birine girer ve HER kümenin bir çıkışı vardır:
 *   · başvurulabilir → form
 *   · başvurusu sürüyor → onay/ödeme sayfasına bağlantı
 *   · kartı aktif → kartın kendisine bağlantı
 */

/** Siparişi hâlâ "açık" sayan durumlar — veritabanındaki kontrolle aynı liste */
const OPEN_STATUSES = ["pending", "payment_pending", "paid", "processing", "shipped"];

export default async function Page() {
  const supabase = await createClient();

  const [rowsRes, childrenRes, teams, plan, payment, bank, contactRes] = await Promise.all([
    supabase
      .from("v_my_cards_and_orders")
      .select("order_number,order_status,child_id,child_name,team_name,team_logo_path,card_id,card_number,card_status")
      .order("order_created_at", { ascending: false }),
    supabase.from("children").select("*").eq("status", "active").order("birth_date"),
    getTeams(),
    getActivePlan(),
    getPaymentOptions(),
    getBankInfo(),
    supabase.rpc("my_contact"),
  ]);

  const rows = (rowsRes.data ?? []) as {
    order_number: string; order_status: string;
    child_id: string | null; child_name: string | null;
    team_name: string | null; team_logo_path: string | null;
    card_id: string | null; card_number: string | null; card_status: string | null;
  }[];

  const kids = (childrenRes.data ?? []) as unknown as Child[];

  /* Daha önce girdiyse telefon alanı dolu gelsin — her başvuruda
     yeniden yazdırmak gereksiz sürtünme. */
  const contactRaw = contactRes.data as { found?: boolean; phone?: string; address_line?: string } | null;
  const contact = contactRaw?.found
    ? { phone: contactRaw.phone ?? null, address_line: contactRaw.address_line ?? null }
    : null;
  const price = plan ? formatMoney(plan.price, plan.currency) : "—";

  /* Devam eden başvurular — çocuk kimliğine göre eşleştirilir.
     Ad-soyad benzerliği yanlış eşleşme üretebilirdi. */
  const openByChild = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!r.child_id) continue;
    if (!OPEN_STATUSES.includes(r.order_status)) continue;
    if (!openByChild.has(r.child_id)) openByChild.set(r.child_id, r);
  }

  /* Aktif kartı olan çocuklar — bunlar için yeni başvuru değil YENİLEME
     yapılır, o da kartın kendi sayfasındadır. */
  const cardByChild = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!r.child_id || !r.card_id) continue;
    if (r.card_status === "cancelled") continue;
    if (!cardByChild.has(r.child_id)) cardByChild.set(r.child_id, r);
  }

  const availableKids = kids.filter(
    (k) => !openByChild.has(k.id) && !cardByChild.has(k.id),
  );
  const busyKids = kids.filter((k) => openByChild.has(k.id));
  const cardKids = kids.filter((k) => !openByChild.has(k.id) && cardByChild.has(k.id));

  return (
    <PanelBody>
      <div className="flex flex-col gap-6">
        <Link href="/panel/kombine-kart"
          className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon icon={IconArrowLeft} size={15} /> Kombine kart
        </Link>

        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[26px] font-semibold tracking-[-.03em] sm:text-[30px]">
            Yeni başvuru
          </h1>
          <span className="text-[14px] text-muted">
            Yıllık üyelik {price} · dijital kart, kargo yok
          </span>
        </div>

        {!payment.any_enabled && (
          <div className="flex items-start gap-3 rounded-[18px] border border-orange-line bg-orange-bg p-5">
            <Icon icon={IconAlert} size={19} className="mt-[2px] shrink-0 text-orange" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold text-orange-ink">
                Şu anda ödeme kabul edemiyoruz
              </span>
              <span className="text-[13.5px] text-orange-ink/85">
                Ödeme yöntemlerimiz geçici olarak kapalı.
              </span>
            </div>
          </div>
        )}

        {/* ── Devam eden başvurular: her zaman bir çıkış yolu ── */}
        {busyKids.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-[13px] font-bold tracking-[.1em] text-muted2">
              DEVAM EDEN BAŞVURULARINIZ
            </span>
            {busyKids.map((k) => {
              const r = openByChild.get(k.id)!;
              const logo = publicStorageUrl("team-logos", r.team_logo_path);
              return (
                <Link key={k.id} href={`/panel/kombine-kart/basvuru/tamamlandi?siparis=${encodeURIComponent(r.order_number)}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-accent-line">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-chip">
                        {logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
                        ) : (
                          <Icon icon={IconClock} size={17} className="text-muted" />
                        )}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-semibold">
                          {k.first_name} {k.last_name}
                        </span>
                        <span className="truncate text-[12.5px] text-muted">
                          {r.order_status === "pending" || r.order_status === "payment_pending"
                            ? "Ödeme bekleniyor"
                            : "İşleniyor"} · {r.order_number}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
                      Devam et <Icon icon={IconArrowRight} size={15} />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Kartı olan çocuklar ── */}
        {cardKids.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-[13px] font-bold tracking-[.1em] text-muted2">
              KARTI OLAN ÇOCUKLAR
            </span>
            {cardKids.map((k) => {
              const r = cardByChild.get(k.id)!;
              return (
                <Link key={k.id} href={`/panel/kombine-kart/${r.card_id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-accent-line">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-chip">
                        <Icon icon={IconQr} size={17} className="text-muted" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-semibold">
                          {k.first_name} {k.last_name}
                        </span>
                        <span className="truncate font-mono text-[12.5px] text-muted">
                          {r.card_number ?? "Kart aktif"}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
                      Kartı görüntüle <Icon icon={IconArrowRight} size={15} />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Başvuru formu ya da yönlendirme ── */}
        {kids.length === 0 ? (
          <EmptyState
            icon={<Icon icon={IconChild} size={26} />}
            title="Önce bir çocuk kaydı ekleyin"
            description="Kart çocuğun adına düzenlenir."
            action={<ButtonLink href="/panel/cocuklarim?donus=/panel/kombine-kart/basvuru" size="lg">
              Çocuk ekle <Icon icon={IconArrowRight} size={16} />
            </ButtonLink>}
          />
        ) : availableKids.length === 0 ? (
          <Card className="flex flex-col gap-2 p-6">
            <span className="text-[15px] font-semibold">
              Başvuru bekleyen çocuk kalmadı
            </span>
            <p className="text-[14px] leading-[1.6] text-ink2">
              Kayıtlı çocuklarınızın hepsinin ya kartı var ya da devam eden bir
              başvurusu. Yeni bir kart için önce Çocuklarım sayfasından yeni bir
              kayıt ekleyin.
            </p>
            <ButtonLink href="/panel/cocuklarim?donus=/panel/kombine-kart/basvuru"
              size="md" className="mt-2 self-start">
              Çocuk ekle <Icon icon={IconArrowRight} size={15} />
            </ButtonLink>
          </Card>
        ) : (
          <ApplicationForm
            children={availableKids}
            teams={teams}
            price={price}
            payment={payment}
            bank={bank}
            contact={contact}
          />
        )}
      </div>
    </PanelBody>
  );
}
