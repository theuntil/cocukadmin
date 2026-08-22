import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink, Card, Container, Eyebrow, H3, Section } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { Motion, MotionLines } from "@/components/ui/motion";
import { CardPreview } from "@/components/site/card-preview";
import { HeroBackdrop } from "@/components/site/hero-video";
import { FeaturedSupporter } from "@/components/site/featured-supporter";
import { toPreviewTeams } from "@/lib/preview-teams";
import { NewsletterForm } from "@/components/site/newsletter";
import { PressStrip } from "@/components/site/press-strip";
import { SectionHead, ScrollRow, ScrollItem } from "@/components/site/section-head";
import { FeatureCard } from "@/components/site/feature-card";
import {
  IconArrowRight, IconArrowDown, IconTicket, IconCalendar,
  IconShield, IconLocation, IconCheck, IconFootball, IconTarget, IconMail,
  IconQr, IconChild, IconRefresh,
} from "@/components/ui/icons";
import {
  getNews, getEvents, getActivePlan, getTeams, getHeroSettings,
  getCurrentUser,
  getPressCoverage, getSiteContent, getSupporters,
} from "@/lib/data";
import { formatDate, formatMoney, EVENT_TYPE_TR, publicStorageUrl } from "@/lib/utils";
import { SupporterMarquee } from "@/components/site/supporter-marquee";

export const metadata: Metadata = {
  description:
    "Çocuk Tribünü; stadyumlarda çocuklara ayrılmış güvenli bir tribün açılması için çalışan taraftar inisiyatifidir. Dijital kombine kart, etkinlikler ve şehir buluşmaları.",
  alternates: { canonical: "/" },
};

/* Yönetim panelinden eklenen içerik anında görünsün: site ve panel ayrı
   uygulamalar olduğu için panelden yapılan önbellek temizliği burayı
   etkilemiyor. */
export const revalidate = 0;

/**
 * 2022 Katar Dünya Kupası bölümünün arka plan görseli.
 *
 * Panelden değiştirmek isterseniz `home.fifa2026` içerik bloğuna görsel
 * yükleyip burayı o bloktan okuyacak şekilde değiştirin. Şu an sabit:
 * bölümün tamamen bu görselle çıkması istendi.
 */
const KATAR_GORSEL =
  "https://supabase.childrentribune.online/storage/v1/object/public/galeri/1787007282990-katar_pankart--1-.webp";

/**
 * KART TAMAMEN DİJİTALDİR.
 *
 * Eski metinlerde "adres seçin", "kart basılır, kargoya verilir", "kargo
 * takibi" gibi FİZİKSEL kart adımları vardı. Bunlar iş modeliyle çelişiyor
 * ve kullanıcıya yanlış söz veriyordu. Akış üç adıma indirildi.
 */
const STEPS = [
  {
    n: "01",
    icon: IconChild,
    title: "Çocuğunuzu ekleyin",
    text: "Panelden ad, soyad ve doğum tarihini girin. Yalnızca kart için gereken asgari bilgi istenir.",
  },
  {
    n: "02",
    icon: IconFootball,
    title: "Takımı seçin",
    text: "Çocuğunuzun tuttuğu takımı seçin. Kart o takımın renkleriyle, çocuğun kendi adına düzenlenir.",
  },
  {
    n: "03",
    icon: IconQr,
    title: "Ödeyin, kart anında aktif",
    text: "Kart veya havale ile ödeyin. Onay anında kart numarası ve QR kodu panelinizde oluşur. Beklemek yok.",
  },
];

/** Dijital kartın somut faydaları — süs değil, ölçülebilir vaatler */
const CARD_FACTS = [
  { icon: IconTicket, title: "Anında aktif", text: "Ödeme onaylandığı saniyede kart panelinizde. Basım, kargo, teslimat beklemesi yok." },
  { icon: IconQr, title: "QR ile giriş", text: "Etkinliklerde kartın ortasındaki QR kodu okutulur. Telefon yeter, kâğıt gerekmez." },
  { icon: IconShield, title: "Çocuğun kendi adına", text: "Kart çocuğun adına düzenlenir. Bilgiler kapalı alanda saklanır, kimseyle paylaşılmaz." },
  { icon: IconRefresh, title: "12 ay geçerli", text: "Bitişe 60 gün kala yenileyebilirsiniz. Kalan süreniz kaybolmaz, üzerine eklenir." },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error_description?: string }>;
}) {
  // EMNİYET KEMERİ
  // Supabase'in ADDITIONAL_REDIRECT_URLS listesi yanlışsa GoTrue kodu
  // /api/auth/callback yerine kök dizine bırakır. Kullanıcının girişi
  // boşa gitmesin diye burada yakalayıp doğru yere aktarıyoruz.
  const sp = await searchParams;
  if (sp.code) redirect(`/api/auth/callback?code=${encodeURIComponent(sp.code)}`);
  if (sp.error_description) redirect(`/giris?hata=${encodeURIComponent(sp.error_description)}`);

  const [user, news, events, plan, teams, press, blocks, supporters, hero] =
    await Promise.all([
      getCurrentUser(),
      getNews(3),
      getEvents({ limit: 3 }),
      getActivePlan(),
      getTeams(),
      getPressCoverage(3, true),
      getSiteContent(["home.fifa2026", "home.about", "home.newsletter"]),
      getSupporters(),
      getHeroSettings(),
    ]);

  // Plan bulunamazsa sabit fiyat GÖSTERİLMEZ: yanlış bilgi vermektense boş bırakılır
  const price = plan ? formatMoney(plan.price, plan.currency) : "—";
  const previewTeams = toPreviewTeams(teams);

  /*
   * ANA EYLEM DÜĞMESİ
   *
   * Giriş yapmamış kullanıcı → doğrudan paneldeki BAŞVURU ekranına gider.
   * Ara sayfa yok; middleware girişe yönlendirir ve giriş sonrası tam
   * olarak buraya geri getirir (`?devam=` parametresiyle).
   *
   * Giriş yapmış kullanıcı → kendi kartlarına gider.
   */
  const ctaHref = user ? "/panel/kombine-kart" : "/panel/kombine-kart/basvuru";
  const ctaLabel = user ? "Kombinelerim" : "Üye Ol";

  /* Öne çıkan destekçi: panelde girilen ada göre eşleşen kayıt.
     Bulunamazsa bölüm hiç gösterilmez. */
  const featured = hero.featuredSupporter
    ? supporters.find((s: { name: string }) =>
        s.name.toLocaleLowerCase("tr-TR")
          .includes(hero.featuredSupporter.toLocaleLowerCase("tr-TR")))
    : undefined;
  const katar = blocks.get("home.fifa2026");
  const about = blocks.get("home.about");
  const newsletter = blocks.get("home.newsletter");

  const heroVideo = hero.enabled && hero.videoUrl ? hero.videoUrl : "";

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          HERO — tam ekran, arka planda video

          Bölüm menü çubuğunun ALTINA kaydırılır (negatif üst boşluk).
          Böylece video ekranın en tepesinden başlar ve başlık çubuğu
          videonun üstünde saydam durur. Çubuk `sticky` olduğu için
          akıştan çıkmaz; yerleşim kayması olmaz.

          id="ct-hero" → başlık çubuğu bu bölümü izleyerek ne zaman
          renkleneceğine karar verir (bkz. site/nav.tsx).
         ══════════════════════════════════════════════════════════ */}
      <section
        id="ct-hero"
        className="ct-on-video relative isolate -mt-[72px] flex min-h-[100svh] flex-col justify-center overflow-hidden pb-20 pt-[112px] sm:-mt-[84px] sm:pt-[128px]"
      >
        <HeroBackdrop src={heroVideo} poster={hero.poster} overlayOpacity={hero.overlay} />

        <Container className="px-5 sm:px-8 lg:px-12">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div className="ct-hero-in flex flex-col gap-7">
              {/* Wise başlığı: çok büyük, sıkı satır aralığı, negatif
                  harf aralığı. Vurgu kelimesi altı çizili değil — parlak
                  yeşil doğrudan yazının rengi oluyor. */}
              <h1 className="ct-h1">
                Her çocuğun
                <br />
                bir <span className="text-lime">tribünü</span>
                <br />
                olsun.
              </h1>

              <p className="max-w-[500px] text-[17px] leading-[1.55] text-white/80 sm:text-[20px]">
                Stadyumlarda çocuklara ayrılmış, güvenli bir tribün açılması için
                çalışıyoruz. Kombine kart tamamen dijital: ödeme onaylandığı an aktif.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {/* ★ Sayfadaki TEK parlak yeşil düğme. Wise'ın kuralı:
                    birincil eylem bir tanedir, gerisi sakin kalır. */}
                <ButtonLink href={ctaHref} variant="lime" size="lg">
                  {ctaLabel}
                  <Icon icon={IconArrowRight} size={17} />
                </ButtonLink>
              </div>
            </div>

            {/* Kombine kart görünümü hero'da kalır — ürünün kendisi budur */}
            <div className="ct-float relative mx-auto w-full max-w-[460px] lg:mx-0">
              <span aria-hidden
                className="ct-glow pointer-events-none absolute -inset-10 -z-10 rounded-full bg-lime/20 blur-[90px]" />
              <CardPreview teams={previewTeams} />
            </div>
          </div>
        </Container>

        {/* Kaydırma işareti */}
        <div className="ct-cue pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
          <i className="not-italic text-white/60">
            <Icon icon={IconArrowDown} size={22} />
          </i>
        </div>
      </section>

      {/* Destekçi logoları — hero'nun hemen altında akan şerit */}
      <SupporterMarquee supporters={supporters} />

      {/* Öne çıkan destekçi — tek satır, belge bağlantısıyla */}
      {featured && (
        <FeaturedSupporter supporter={featured} docLabel={hero.featuredDocLabel} />
      )}

      {/* ══════════ MANİFESTO — tek cümle, büyük tipografi ══════════ */}
      <Section className="!py-24 sm:!py-32">
        <Container>
          <MotionLines
            as="h2"
            className="ct-h1 text-center"
            lines={[
              <React.Fragment key="1">Kart cepte.</React.Fragment>,
              <React.Fragment key="2">
                Çocuk <span className="text-ink">tribünde.</span>
              </React.Fragment>,
            ]}
          />
          <Motion variant="blur" delay={220}>
            <p className="ct-lead mx-auto mt-8 max-w-[620px] text-center">
              Fiziksel kart basmıyoruz. Kargo, teslimat, adres yok. Çocuğunuzun
              kombine kartı ödeme onaylandığı an panelinizde oluşuyor — numarası,
              QR kodu ve bir yıllık geçerliliğiyle.
            </p>
          </Motion>

          <div className="mt-16 grid gap-4 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
            {CARD_FACTS.map((f, i) => (
              <Motion key={f.title} variant="up" delay={i * 90}>
                <div className="flex h-full flex-col gap-4 rounded-[24px] border border-line bg-surface p-7 transition-colors duration-300 hover:border-ink/25">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-solid text-on-solid">
                    <Icon icon={f.icon} size={22} />
                  </span>
                  <span className="font-display text-[19px] font-semibold tracking-[-.02em]">
                    {f.title}
                  </span>
                  <p className="text-[14.5px] leading-[1.65] text-ink2">{f.text}</p>
                </div>
              </Motion>
            ))}
          </div>
        </Container>
      </Section>

      {/* ══════════ ÇOCUK TRİBÜNÜ NEDİR ══════════ */}
      <Section id="nedir" className="!py-24 sm:!py-32 bg-surface">
        <Container>
          <Motion variant="up" className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <span className="text-[12px] font-bold uppercase tracking-[.14em] text-muted2">
              {about?.subtitle ?? "ASIL AMACIMIZ"}
            </span>
            <h2 className="ct-h2">
              {about?.title ?? "Çocuk Tribünü nedir?"}
            </h2>
            <p className="ct-lead">
              {about?.body ??
                "Çocuk Tribünü; stadyumlarda çocuklara ayrılmış, güvenli ve gözetimli bir tribün bölümünün açılması için yürütülen bir taraftar inisiyatifidir."}
            </p>
          </Motion>

          {/* İki büyük kart. Adobe'nin ürün kartları gibi: ikon, başlık,
              açıklama, eylem — hepsi sola hizalı ve nefes alan boşlukla. */}
          <div className="mt-10 grid gap-4 lg:mt-14 lg:grid-cols-2 lg:gap-5">
            <Motion variant="left">
              <div className="group flex h-full flex-col gap-5 rounded-[24px] border border-line bg-page p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] sm:p-9">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-solid text-on-solid">
                  <Icon icon={IconTicket} size={26} />
                </span>
                <div className="flex flex-col gap-2.5">
                  <H3 className="!text-[22px] !tracking-[-.03em] sm:!text-[26px]">Dijital Kombine Kart</H3>
                  <p className="text-[15px] leading-[1.7] text-ink2">
                    Çocuğun kendi adına düzenlenen yıllık üyelik kartı. Ödeme
                    tamamlandığı an aktifleşir; kart sahibi çocuklara özel
                    etkinlikler ve şehir buluşmaları açılır.
                  </p>
                </div>

                {/* Küçük özellik rozetleri — ikonla birlikte */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { i: IconQr, t: "QR ile giriş" },
                    { i: IconRefresh, t: "12 ay geçerli" },
                    { i: IconCheck, t: "Anında aktif" },
                  ].map((r) => (
                    <span key={r.t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-[12.5px] font-medium text-ink2">
                      <Icon icon={r.i} size={13} />{r.t}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-2">
                  <ButtonLink href={ctaHref} variant="ink" size="lg">
                    {ctaLabel} <Icon icon={IconArrowRight} size={16} />
                  </ButtonLink>
                </div>
              </div>
            </Motion>

            <Motion variant="right" delay={80}>
              <div className="group flex h-full flex-col gap-5 rounded-[24px] border border-line bg-page p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] sm:p-9">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-chip text-ink">
                  <Icon icon={IconShield} size={26} />
                </span>
                <div className="flex flex-col gap-2.5">
                  <H3 className="!text-[22px] !tracking-[-.03em] sm:!text-[26px]">Güvenli tribün</H3>
                  <p className="text-[15px] leading-[1.7] text-ink2">
                    Stadyumlarda çocuklara ayrılmış, güvenli ve gözetimli bir
                    tribün bölümü için çalışan taraftar inisiyatifi. Etkinlikler,
                    şehir buluşmaları ve kulüp iş birlikleri.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { i: IconTarget, t: "15 yıllık akademik temel" },
                    { i: IconFootball, t: "Kulüp iş birlikleri" },
                  ].map((r) => (
                    <span key={r.t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-[12.5px] font-medium text-ink2">
                      <Icon icon={r.i} size={13} />{r.t}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-2">
                  <ButtonLink href="/hakkimizda" variant="outline" size="lg">
                    Daha fazlası <Icon icon={IconArrowRight} size={16} />
                  </ButtonLink>
                </div>
              </div>
            </Motion>
          </div>
        </Container>
      </Section>

      {/* ══════════ ÜÇ ADIM ══════════ */}
      <Section className="!py-24 sm:!py-32">
        <Container>
          <Motion variant="up" className="mx-auto flex max-w-[720px] flex-col items-center gap-4 text-center">
            <span className="text-[12px] font-bold uppercase tracking-[.14em] text-muted2">
              NASIL ÇALIŞIR
            </span>
            <h2 className="ct-h2">
              Üç adım, birkaç dakika.
            </h2>
            <p className="ct-lead">
              Yıllık {price} sembolik bedelle çocuğunuz kendi adına düzenlenmiş
              Çocuk Tribünü kombine kartına sahip olur.
            </p>
          </Motion>

          <ScrollRow cols={3} className="mt-10 sm:mt-14">
            {STEPS.map((s, i) => (
              <ScrollItem key={s.n}>
                <Motion variant="up" delay={i * 90} className="h-full">
                <div className="relative flex h-full flex-col gap-3.5 overflow-hidden rounded-[22px] border border-line bg-surface p-6 sm:p-7">
                  <span aria-hidden
                    className="pointer-events-none absolute -right-3 -top-6 font-display text-[110px] font-semibold leading-none tracking-[-.05em] text-ink/[.04]">
                    {s.n}
                  </span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-[16px] bg-chip text-ink">
                    <Icon icon={s.icon} size={22} />
                  </span>
                  <span className="relative font-display text-[13px] font-semibold tracking-[.18em] text-muted2">
                    {s.n}
                  </span>
                  <span className="relative font-display text-[21px] font-semibold tracking-[-.02em]">
                    {s.title}
                  </span>
                  <p className="relative text-[14.5px] leading-[1.65] text-ink2">{s.text}</p>
                </div>
                </Motion>
              </ScrollItem>
            ))}
          </ScrollRow>

          <Motion variant="up" delay={160}>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-[22px] border border-line bg-surface p-6 sm:p-7">
              <div className="flex flex-col gap-1">
                <span className="font-display text-[21px] font-semibold tracking-[-.02em]">
                  Yıllık üyelik {price}
                </span>
                {/* "kargo dahil" ifadesi KALDIRILDI: kart dijitaldir, kargo yoktur */}
                <span className="text-[13.5px] text-muted">
                  12 ay geçerli · dijital kart · kargo yok
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/kombine-kart" variant="outline" size="lg">
                  Detayları incele
                </ButtonLink>
                <ButtonLink href={ctaHref} variant="ink" size="lg">
                  {ctaLabel} <Icon icon={IconArrowRight} size={16} />
                </ButtonLink>
              </div>
            </div>
          </Motion>
        </Container>
      </Section>

      {/* ══════════ 2022 KATAR DÜNYA KUPASI ══════════ */}
      <Section className="!py-0">
        <Container>
          <Motion variant="scale">
            <div
              className="relative isolate overflow-hidden rounded-[30px] border border-line"
              style={{
                backgroundImage: `url(${KATAR_GORSEL})`,
                backgroundColor: "var(--deep)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Okunabilirlik perdesi: görselin üstündeki yazılar her
                  ekranda okunsun diye soldan sağa açılan koyu degrade. */}
              <div aria-hidden className="absolute inset-0"
                style={{ background: "linear-gradient(100deg, rgba(8,20,16,.86) 0%, rgba(8,20,16,.62) 52%, rgba(8,20,16,.34) 100%)" }} />

              <div className="relative p-8 sm:p-14">
                <div className="flex max-w-[620px] flex-col gap-5">
                  <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12.5px] font-bold tracking-[.12em] text-white backdrop-blur-sm">
                    <Icon icon={IconFootball} size={15} />
                    2022 · KATAR
                  </span>

                  <h2 className="font-display text-[clamp(28px,4.5vw,48px)] font-semibold leading-[1.05] tracking-[-.03em] text-white">
                    {katar?.title ?? "2022 Katar Dünya Kupası"}
                  </h2>

                  <p className="text-[15.5px] leading-[1.7] text-white/85">
                    {katar?.body ??
                      "Dünya Kupası, çocukların futbolla en yoğun temas kurduğu dönemdir. Çocuk Tribünü, 2022 Katar Dünya Kupası boyunca şehirlerde ortak izleme etkinlikleri, okul atölyeleri ve tribün kültürü buluşmaları düzenledi; bu ilgiyi kalıcı bir katılıma dönüştürmeyi hedefledi."}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <ButtonLink href="/etkinlikler" variant="light" size="lg">
                      Etkinlik takvimi
                      <Icon icon={IconArrowRight} size={16} />
                    </ButtonLink>
                    <ButtonLink href="/yaptiklarimiz" variant="outline" size="lg"
                      className="!border-white/25 !bg-white/5 !text-white backdrop-blur-sm hover:!border-white hover:!bg-white/10 hover:!text-white">
                      Bizden haberler
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </div>
          </Motion>
        </Container>
      </Section>

      {/* ══════════ ETKİNLİKLER ══════════ */}
      {events.length > 0 && (
        <Section className="!py-24 sm:!py-32">
          <Container>
            <SectionHead
              eyebrow="YAKLAŞAN ETKİNLİKLER"
              title="Şehirlerde buluşuyoruz."
              href="/etkinlikler"
              hrefLabel="Tüm etkinlikler"
            />

            <ScrollRow cols={3} className="mt-9 sm:mt-11">
              {events.map((e, i) => (
                <ScrollItem key={e.id}>
                  <Motion variant="up" delay={i * 80} className="h-full">
                    <FeatureCard
                      badge={formatDate(e.starts_at)}
                      badgeIcon={IconCalendar}
                      image={publicStorageUrl("event-media", e.cover_path)}
                      imageAlt={e.title}
                      ratio="16/10"
                      title={e.title}
                      description={
                        [e.city_name, e.venue_name].filter(Boolean).join(" · ") ||
                        e.short_description || undefined
                      }
                      href={`/etkinlikler/${e.slug}`}
                      linkLabel="Detaylar"
                    />
                  </Motion>
                </ScrollItem>
              ))}
            </ScrollRow>
          </Container>
        </Section>
      )}

      {/* ══════════ BASINDA BİZ ══════════ */}
      {press.length > 0 && (
        <Section className="!py-24 sm:!py-32 bg-surface">
          <Container>
            <SectionHead
              eyebrow="BASINDA BİZ"
              title="Bizden söz edenler."
              href="/basin"
              hrefLabel="Tüm haberler"
            />
            <Motion variant="blur" delay={100} className="mt-9">
              <PressStrip items={press} />
            </Motion>
          </Container>
        </Section>
      )}

      {/* ══════════ BLOG ══════════ */}
      {news.rows.length > 0 && (
        <Section className="!py-24 sm:!py-32">
          <Container>
            <SectionHead
              eyebrow="BLOG"
              title="Sahadan notlar."
              href="/blog"
              hrefLabel="Tüm yazılar"
            />

            <ScrollRow cols={3} className="mt-9 sm:mt-11">
              {news.rows.map((n, i) => (
                <ScrollItem key={n.id}>
                  <Motion variant="up" delay={i * 80} className="h-full">
                    <FeatureCard
                      badge={n.category_name ?? "Yazı"}
                      badgeIcon={IconFootball}
                      image={publicStorageUrl(n.image_bucket ?? "news-media", n.image_path)}
                      imageAlt={n.title}
                      ratio="16/10"
                      title={n.title}
                      description={n.excerpt ?? undefined}
                      href={`/blog/${n.slug}`}
                      linkLabel="Okumaya başla"
                    />
                  </Motion>
                </ScrollItem>
              ))}
            </ScrollRow>
          </Container>
        </Section>
      )}

      {/* ══════════ E-POSTA BÜLTENİ ══════════ */}
      <Section className="!py-24 sm:!py-32">
        <Container>
          <Motion variant="up">
            <div className="grid gap-8 rounded-[30px] border border-line2 bg-surface/60 p-8 sm:p-14 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-solid text-on-solid">
                  <Icon icon={IconMail} size={22} />
                </span>
                <h2 className="font-display text-[clamp(24px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-.03em]">
                  {newsletter?.title ?? "Gelişmelerden haberdar olun"}
                </h2>
                <p className="max-w-[460px] text-[15px] leading-[1.65] text-ink2">
                  {newsletter?.body ??
                    "Şehrinizdeki etkinlikler ve kombine kart duyuruları için e-posta listemize katılın."}
                </p>
                <div className="flex items-center gap-2 text-[13px] text-muted">
                  <Icon icon={IconTarget} size={15} />
                  Ayda en fazla 2 e-posta · reklam yok · tek tıkla çıkış
                </div>
              </div>

              <div className="rounded-[22px] border border-on-lime/15 bg-on-lime/5 p-6">
                <NewsletterForm onLime />
              </div>
            </div>
          </Motion>
        </Container>
      </Section>

    </>
  );
}

