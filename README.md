# Çocuk Tribünü — Web Uygulaması

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Supabase

---

## Hızlı başlangıç

```bash
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri
cp .env.example .env.local
#    .env.local dosyasını Supabase bilgilerinizle doldurun

# 3. Geliştirme
npm run dev          # http://localhost:3000

# 4. Üretim
npm run build && npm start
```

### Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Anon (public) anahtar |
| `SUPABASE_SERVICE_ROLE_KEY` | — | **Sadece sunucu.** RLS'i bypass eder; asla `NEXT_PUBLIC_` yapmayın |
| `NEXT_PUBLIC_SITE_URL` | ✓ | OAuth dönüşleri ve sitemap için tam alan adı |
| `NEXT_PUBLIC_BANK_NAME` / `_HOLDER` / `_IBAN` | ✓ | Havale ekranında gösterilir |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | — | Bot koruması. Boş bırakılırsa doğrulama atlanır |

### Veritabanı

Sırayla çalıştırın (Supabase SQL Editor):

1. `cocuk_tribunu_schema.sql` (migration 001)
2. `migration_002.sql` (bağış + gelişmiş etkinlik + hata düzeltmeleri)
3. `migration_003_web.sql` (**bu uygulama için gerekli**, bildirim okundu işaretleme + staff okuma politikaları)

### Supabase Auth ayarları

- **Authentication → URL Configuration → Redirect URLs**: `https://<alan-adiniz>/api/auth/callback`
- Google/Apple girişi kullanacaksanız ilgili sağlayıcıyı **Providers** altında etkinleştirin.

---

## Proje yapısı

```
src/
├── app/
│   ├── (site)/              Herkese açık sayfalar (nav + footer'lı layout)
│   ├── (auth)/              Giriş, kayıt, şifre (split-screen layout)
│   ├── basvuru/             Kart başvurusu + ödeme akışı
│   ├── panel/               Üye alanı (sidebar layout, giriş zorunlu)
│   ├── yonetim/             Yönetim paneli (rol kontrolü)
│   ├── api/auth/            OAuth callback + çıkış
│   ├── globals.css          Tasarım sistemi (renk tokenları + animasyonlar)
│   ├── layout.tsx           Root layout, fontlar, metadata
│   ├── sitemap.ts robots.ts
│   └── not-found.tsx error.tsx loading.tsx
├── components/
│   ├── ui/                  Button, Card, Field, Badge… + Icon + motion
│   ├── site/                Nav, Footer, formlar, tema
│   └── panel/               Sidebar, yönetici bileşenleri
├── lib/
│   ├── supabase/            client / server / middleware
│   ├── actions/             Server Actions (auth, app, admin)
│   ├── data.ts              Sunucu tarafı okuma fonksiyonları
│   ├── types.ts utils.ts
└── middleware.ts            Oturum tazeleme + rota koruması
```

---

## Tasarım sistemi

Renk değerleri tasarım dosyasından **birebir** alınmıştır (`globals.css`):

| Token | Açık | Koyu |
|---|---|---|
| `--green` | `#0e7a57` | `#45dfa0` |
| `--orange` | `#f4622a` | `#ff9152` |
| `--lime` | `#e8ff5a` | `#dff265` |
| `--page` | `#fdfaf4` | `#080908` |
| `--sidebar` | `#0f1f1a` | `#050605` |

Fontlar: **Bricolage Grotesque** (başlıklar) + **Manrope** (gövde).
Yarıçaplar: kart 26px, panel 20px, form alanı 12px.

Tailwind v4 CSS-first yapılandırma kullanır — `tailwind.config.js` yoktur, tokenlar
`globals.css` içindeki `@theme inline` bloğunda tanımlıdır.

### Animasyonlar

Tamamı CSS `transform`/`opacity` üzerinden (GPU hızlandırmalı), ek kütüphane yok:

- `.ct-rise`, `.ct-fade`, `.ct-scale`, `.ct-slide-down` — giriş animasyonları
- `.ct-stagger` — liste elemanlarının kademeli girişi
- `<Reveal>` — IntersectionObserver ile scroll'da açılma
- `<CountUp>` — sayaçların hedefe doğru sayması
- `prefers-reduced-motion` tercihi tüm animasyonları kapatır

### İkonlar

HugeIcons **free** sürümü (`@hugeicons/react` + `@hugeicons/core-free-icons`).
Tüm ikonlar `src/components/ui/icons.ts` içinden tek elden export edilir:

```tsx
import { Icon } from "@/components/ui/icon";
import { IconTicket } from "@/components/ui/icons";

<Icon icon={IconTicket} size={20} />
```

---

## Güvenlik notları

- **Middleware** her istekte `getUser()` ile token'ı sunucuda doğrular. `getSession()`
  kullanılmaz çünkü çerezden okunan oturum doğrulanmamıştır.
- **Kritik yazma işlemleri** (sipariş, ödeme, imza, bağış, etkinlik kaydı) doğrudan tablo
  yazımıyla değil, veritabanındaki `SECURITY DEFINER` RPC'ler üzerinden yapılır.
- **IP adresi** her zaman sunucudan (`x-forwarded-for`) alınır, asla formdan gelmez.
  Aksi hâlde kullanıcı hız sınırını sahte IP ile atlayabilirdi.
- **Zod** ile tüm form girdileri sunucu tarafında yeniden doğrulanır.
- **`service_role` anahtarı** yalnızca `lib/supabase/server.ts` içinde, `server-only`
  paketiyle korunan modülde kullanılır; client bundle'a giremez.
- **Açık yönlendirme koruması**: OAuth callback yalnızca site içi (`/` ile başlayan) yollara
  yönlendirir.
- **Güvenlik başlıkları** `next.config.ts` içinde: HSTS, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy.
- **Dekont yükleme** private bucket'a yapılır; dosya yolu kullanıcı kimliğiyle başlamak
  zorundadır (Storage politikası bunu şart koşar).

---

## Rota haritası

**Herkese açık**
`/` · `/hakkimizda` · `/kombine-kart` · `/imza-kampanyasi` · `/etkinlikler` ·
`/etkinlikler/[slug]` · `/takimlar` · `/takimlar/[slug]` · `/blog` · `/blog/[slug]` ·
`/duyurular` · `/bagis` · `/bagis/[slug]` · `/bagis/sorgula` · `/iletisim` · `/sss` ·
`/gonullu-ol` · `/basin`

**Yasal**
`/kvkk` · `/gizlilik` · `/cerez-politikasi` · `/uyelik-kosullari` ·
`/cocuk-verileri-politikasi` · `/mesafeli-satis` · `/iptal-iade`

**Kimlik**
`/giris` · `/kayit` · `/sifremi-unuttum` · `/sifre-yenile`

**Başvuru**
`/basvuru` · `/basvuru/odeme/[orderNumber]` · `/basvuru/tamamlandi`

**Panel** (giriş zorunlu)
`/panel` · `/panel/cocuklarim` · `/panel/kartlarim` · `/panel/siparisler` ·
`/panel/odemeler` · `/panel/adreslerim` · `/panel/etkinliklerim` · `/panel/bagislarim` ·
`/panel/bildirimler` · `/panel/ayarlar`

**Yönetim** (rol zorunlu)
`/yonetim` · `/yonetim/odemeler` · `/yonetim/bagislar` · `/yonetim/siparisler` ·
`/yonetim/etkinlikler` · `/yonetim/check-in`

---

## Bilinen eksikler

Dürüst liste — bunlar bilinçli olarak kapsam dışı bırakıldı:

| Konu | Durum |
|---|---|
| Görsel yükleme (avatar, haber görseli) | Storage bucket'ları hazır, arayüz yazılmadı |
| Yönetim panelinde içerik editörü (haber/etkinlik oluşturma) | Şu an Supabase Studio'dan yapılıyor |
| Online ödeme (iyzico/Stripe) | Yalnızca havale/EFT akışı var; webhook yazılmadı |
| E-posta/SMS gönderimi | Bildirimler veritabanına yazılıyor, gönderim katmanı yok |
| Çok dillilik | Yalnızca Türkçe |
| Test paketi | Otomatik test yazılmadı |
| QR kod okuyucu | Check-in kodu elle giriliyor; kamera taraması yok |
| `districts` tablosu | Boş — ilçe seçimi arayüzü var ama veri yüklenmeli |

Kalite kontrolü olarak `npm run build` ve `npx tsc --noEmit` temiz geçiyor.
