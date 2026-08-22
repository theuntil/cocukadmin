/**
 * İskelet ekranlar.
 *
 * Her iskelet, karşılık geldiği sayfanın GERÇEK yerleşimini taklit eder:
 * aynı kart sayısı, aynı yükseklikler, aynı ızgara. Böylece içerik gelince
 * yerleşim sıçraması (layout shift) olmaz.
 *
 * Ölçüler responsive: mobil/tablet/masaüstünde gerçek sayfayla aynı kırılımları
 * kullanır.
 */

export function Bone({
  className = "", style,
}: { className?: string; style?: React.CSSProperties }) {
  return <span className={`ct-skeleton block rounded-[8px] ${className}`} style={style} aria-hidden />;
}

function Frame({ children, label = "Yükleniyor" }: { children: React.ReactNode; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/* ── Sayfa başlığı ── */
export function HeaderSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <Bone className="h-3 w-32" />
      <Bone className={`h-9 ${wide ? "w-full max-w-[420px]" : "w-56"}`} />
      <Bone className="h-4 w-full max-w-[560px]" />
    </div>
  );
}

/* ── Kombine kart sayfası: gerçek kart oranı 1.586:1 ── */
export function CardGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Frame label="Kartlar yükleniyor">
      <HeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Bone className="h-11 w-11 shrink-0 rounded-[13px]" />
                <div className="flex flex-col gap-1.5">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-24" />
                </div>
              </div>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-line2 pt-3">
              <Bone className="h-3 w-28" />
              <Bone className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Kart detayı: gerçek kart mockup oranıyla ── */
export function CardDetailSkeleton() {
  return (
    <Frame label="Kart yükleniyor">
      <Bone className="h-4 w-28" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-44" />
          <Bone className="h-3.5 w-32" />
        </div>
        <Bone className="h-7 w-24" />
      </div>

      {/* Aşama göstergesi */}
      <div className="rounded-[20px] border border-line bg-surface p-6">
        <Bone className="mb-4 h-5 w-20" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col gap-2">
              <Bone className="h-1.5 rounded-full" />
              <Bone className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        {/* Kart görseli — gerçek kart oranı */}
        <Bone className="w-full rounded-[24px]" style={{ aspectRatio: "1.586 / 1" }} />
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-6">
          <Bone className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Bone className="h-3.5 w-24" />
              <Bone className="h-3.5 w-28" />
            </div>
          ))}
          <Bone className="mx-auto mt-2 h-40 w-40 rounded-[12px]" />
        </div>
      </div>
    </Frame>
  );
}

/* ── Sipariş listesi ── */
export function OrderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Frame label="Siparişler yükleniyor">
      <HeaderSkeleton />
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-5 w-20 rounded-full" />
                </div>
                <Bone className="h-3 w-40" />
              </div>
              <Bone className="h-6 w-24" />
            </div>
            <div className="flex flex-wrap gap-5 border-t border-line2 pt-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Bone key={j} className="h-3.5 w-28" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Tablo (üyeler, kartlar) ── */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Frame label="Tablo yükleniyor">
      <HeaderSkeleton />
      <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
        <div className="flex gap-4 border-b border-line2 px-5 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Bone key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line2 px-5 py-4 last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <Bone key={j} className={`h-4 flex-1 ${j === 0 ? "max-w-[180px]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Haber / blog kartları ── */
export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Frame label="Yazılar yükleniyor">
      <HeaderSkeleton />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface">
            <Bone className="aspect-[16/10] w-full rounded-none" />
            <div className="flex flex-col gap-2.5 p-5">
              <Bone className="h-3 w-20" />
              <Bone className="h-5 w-full" />
              <Bone className="h-5 w-3/4" />
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Destekçi logoları ── */
export function SupporterGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Frame label="Destekçiler yükleniyor">
      <HeaderSkeleton />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-6">
            <Bone className="h-24 w-full rounded-[14px]" />
            <Bone className="h-4 w-32" />
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Etkinlik / içerik detayı: medya + başlık + gövde ── */
export function ContentDetailSkeleton() {
  return (
    <Frame label="İçerik yükleniyor">
      <Bone className="h-4 w-32" />
      <div className="flex flex-col gap-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-10 w-full max-w-[560px]" />
        <Bone className="h-10 w-3/4 max-w-[420px]" />
        <Bone className="h-5 w-full max-w-[620px]" />
      </div>
      <Bone className="aspect-[16/9] w-full rounded-[20px]" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className={`h-4 ${i % 4 === 3 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="aspect-square w-full rounded-[14px]" />
        ))}
      </div>
    </Frame>
  );
}

/* ── Profil / kullanıcı detayı ── */
export function ProfileSkeleton() {
  return (
    <Frame label="Profil yükleniyor">
      <Bone className="h-4 w-24" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-3.5 w-64" />
        </div>
        <Bone className="h-7 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-surface p-6">
            <Bone className="h-5 w-28" />
            <Bone className="h-px w-full" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between gap-4">
                <Bone className="h-3.5 w-24" />
                <Bone className="h-3.5 w-28" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Form sayfası ── */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Frame label="Form yükleniyor">
      <HeaderSkeleton />
      <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-6 sm:p-7">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-12 w-full rounded-[12px]" />
          </div>
        ))}
        <Bone className="h-12 w-full rounded-full sm:w-48" />
      </div>
    </Frame>
  );
}

/* ── İstatistik kartları (gösterge paneli) ── */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Yükleniyor">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
          <Bone className="h-10 w-10 rounded-[12px]" />
          <Bone className="h-7 w-24" />
          <Bone className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}


/* ── Geriye dönük uyumluluk için takma adlar ──
   Eski loading.tsx dosyaları bu isimleri kullanıyor. */
export const MediaGridSkeleton = ArticleGridSkeleton;
export const DetailSkeleton = ContentDetailSkeleton;
export const ListSkeleton = OrderListSkeleton;
export const GridSkeleton = ArticleGridSkeleton;

/* ── Panel: liste + eylem düğmesi (adresler, çocuklar) ── */
export function PanelListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Frame>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-40" />
          <Bone className="h-3.5 w-28" />
        </div>
        <Bone className="h-12 w-36 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <Bone className="h-11 w-11 shrink-0 rounded-[13px]" />
              <div className="flex flex-col gap-1.5">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Panel: bildirim akışı ── */
export function NotificationSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Frame>
      <HeaderSkeleton />
      <div className="flex flex-col divide-y divide-line2 rounded-[20px] border border-line bg-surface">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3.5 p-5">
            <Bone className="h-9 w-9 shrink-0 rounded-[11px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3.5 w-full" />
            </div>
            <Bone className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Panel: genel bakış (istatistik + liste) ── */
export function PanelSkeleton() {
  return (
    <Frame>
      <div className="flex flex-col gap-2">
        <Bone className="h-7 w-52" />
        <Bone className="h-3.5 w-36" />
      </div>
      <StatsSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col divide-y divide-line2 rounded-[20px] border border-line bg-surface">
          <div className="p-5"><Bone className="h-5 w-32" /></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 p-4">
              <Bone className="h-9 w-9 shrink-0 rounded-[11px]" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-6">
          <Bone className="h-5 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4 border-b border-line2 pb-3 last:border-0">
              <Bone className="h-3.5 w-24" />
              <Bone className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ── Panel: ayarlar (bölümlü form) ── */
export function SettingsSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <Frame>
      <HeaderSkeleton />
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <Bone className="h-11 w-11 shrink-0 rounded-[14px]" />
            <div className="flex flex-col gap-1.5">
              <Bone className="h-5 w-36" />
              <Bone className="h-3.5 w-56" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center justify-between gap-4 border-b border-line2 pb-4 last:border-0">
              <div className="flex flex-col gap-1.5">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-56" />
              </div>
              <Bone className="h-7 w-12 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </Frame>
  );
}
