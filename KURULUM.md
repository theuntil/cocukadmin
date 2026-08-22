# Çocuk Tribünü — Kurulum (Baştan Sona)

## 1. Veritabanı

`cocuk_tribunu_full.sql` dosyasının **tamamını** çalıştırın. Tek dosya, 001–005 arası
tüm migration'ları içerir.

**Supabase Studio > SQL Editor** yavaş kalırsa psql kullanın:

```bash
psql "postgresql://postgres:PAROLA@supabase.childrentribune.online:5432/postgres" \
  -f cocuk_tribunu_full.sql
```

Idempotenttir — üç kez üst üste çalıştırdım, hiçbir kayıt çoğalmıyor, veri silinmiyor.

Kurulum sonrası beklenen: **48 tablo · 94 politika · 177 index · 88 fonksiyon ·
55 trigger · 9 view · 11 bucket**. Doğrulama sorguları dosyanın sonunda.

## 2. Supabase (self-hosted)

`docker-compose.yml` dosyasını kullanın (Google/Apple köprü satırları eklenmiş hâli).

### ⚠️ `.env` dosyanızda düzeltilmesi gereken

Şu an:
```env
SITE_URL=https://childrentribune.online
ADDITIONAL_REDIRECT_URLS=https://childrentribune.online/*,http://localhost:3000/*
```

Uygulamanız `cocuktribunu.org` üzerinde çalışacaksa **giriş sonrası dönüş çalışmaz**.
İki sebep: adres listede yok, ve `/*` tek seviye eşleşir — `/api/auth/callback` iki seviye.

```env
SITE_URL=https://cocuktribunu.org
ADDITIONAL_REDIRECT_URLS=https://cocuktribunu.org/**,https://childrentribune.online/**,http://localhost:3000/**
```

> Siteniz `childrentribune.online` üzerindeyse `SITE_URL`'i öyle bırakın, ama
> `NEXT_PUBLIC_SITE_URL` ile **aynı** olmalı. İkisi farklıysa giriş döngüye girer.

Sonra Dokploy'da **Deploy** (Rebuild değil — build edilecek bir şey yok).

### Doğrulama

```bash
curl -s https://supabase.childrentribune.online/auth/v1/settings | jq .external
```

Beklenen: `{"email": true, "phone": true, "google": true, "apple": true, ...}`

## 3. Web uygulaması

```bash
tar -xzf cocuk-tribunu-web.tar.gz && cd cocuk-tribunu
cp .env.local.ornek .env.local     # değerleri doldurun
npm install                        # ~511 MB, 1.5 GB boş alan gerekir
npm run build && npm start
```

`.env.local` içinde en kritik üç satır:

```env
NEXT_PUBLIC_SUPABASE_URL=https://supabase.childrentribune.online
NEXT_PUBLIC_SITE_URL=https://cocuktribunu.org      # Supabase SITE_URL ile AYNI
NEXT_PUBLIC_OAUTH_PROVIDERS=google,apple
```

## 4. public/ klasörüne koyulacaklar

| Dosya | Kullanım |
|---|---|
| `cocuktribunu.png` | Açık temada logo |
| `cocuktribunud.png` | Koyu temada logo |
| `favicon.ico` | Tarayıcı sekmesi |
| `favicon.png` | PWA ikonu (512×512) |

FIFA 2026 arka plan görseli koda gömülü değil — `site-media` bucket'ına yükleyip:

```sql
update public.site_content set image_path = 'fifa2026-hero.jpg'
 where key in ('home.fifa2026', 'fifa2026.intro');
```

## 5. Apple secret'ı yenileme

Apple client secret'ı **08.02.2027**'de sona eriyor. O tarihten önce:

```bash
node scripts/apple-client-secret.mjs \
  --team-id QM67F4QTUK --key-id J9LXYZNH59 \
  --client-id org.cocuktribunu.web --key ./AuthKey_J9LXYZNH59.p8
```

Çıktıyı `.env` içindeki `APPLE_SECRET` değerine yazıp auth servisini yeniden başlatın.

## 6. İlk yönetici hesabını oluşturma

Siteden normal şekilde kayıt olun, sonra SQL Editor'de:

```sql
select app.grant_role_by_email('sizin@epostaniz.com', 'super_admin');
```

Artık `/yonetim` paneline erişebilirsiniz.

---

## ⚠️ Güvenlik: sızan anahtarları değiştirin

`.env` dosyanızın tamamı sohbet geçmişinde. **Hepsini değiştirin.** En acil ikisi:

- **`JWT_SECRET`** — bunu bilen herkes `service_role` token'ı üretip RLS'in tamamını
  atlayabilir; kurduğumuz tüm güvenlik katmanı anlamsız hale gelir.
  Değişince `ANON_KEY` ve `SERVICE_ROLE_KEY` de yeniden üretilmeli, `.env.local`
  güncellenmeli.
- **`SMTP_PASS`** — `DASHBOARD_PASSWORD` ile aynı parola. İkisi de değişmeli, farklı olmalı.

Ayrıca: `POSTGRES_PASSWORD`, `SECRET_KEY_BASE`, `VAULT_ENC_KEY`, `PG_META_CRYPTO_KEY`,
`GOOGLE_SECRET`, `APPLE_SECRET`.

---

## 7. Vercel derleme hatası çözümü (react2shell CVE)

Vercel derlemeyi iki sebeple durduruyordu:

### a) Güvenlik açığı bulunan sürümler

| Paket | Önce | Sonra |
|---|---|---|
| next | 15.5.4 | **15.5.23** |
| react | 19.1.1 | **19.2.8** |
| react-dom | 19.1.1 | **19.2.8** |

Next 16'ya değil, 15.x hattının son yamalı sürümüne çıktım — Next 16 kırıcı
değişiklikler getiriyor ve projenin baştan gözden geçirilmesi gerekirdi.

Ayrıca Next'in içinden gelen iki paket daha açıklıydı (`postcss`, `sharp`).
Bunlar için `package.json` içine `overrides` eklendi:

```json
"overrides": {
  "postcss": "^8.5.23",
  "sharp": "^0.35.0"
}
```

Sonuç: `npm audit --omit=dev` → **found 0 vulnerabilities**

### b) `cookies was called outside a request scope`

Derleme günlüğündeki asıl çökme sebebi buydu. `generateStaticParams` ve `sitemap`,
HTTP isteği bağlamı **dışında** çalışır; orada `cookies()` çağrılamaz. Benim veri
katmanım her okumada oturum çerezini kullanan istemciyi çağırıyordu.

Çözüm: `createPublicClient()` eklendi — çerez kullanmayan, anon anahtarla çalışan
salt-okunur istemci. RLS yine devrede, yalnızca herkese açık veriyi görüyor.

Bunu kullanan yeni fonksiyonlar: `getNewsSlugs`, `getEventSlugs`, `getTeamSlugs`,
`getDonationCampaignSlugs`. Dört dinamik sayfanın `generateStaticParams`'ı ve
`sitemap.ts` bunlara çevrildi.

Ek fayda: veritabanına ulaşılamasa bile derleme artık çökmüyor, sayfalar istek
anında üretiliyor.

### Vercel'de yapmanız gerekenler

1. Yeni `package.json` ve `package-lock.json` dosyalarını commit'leyin
2. Vercel > Settings > Environment Variables altına `.env.local` değerlerinizi girin
   (özellikle `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_OAUTH_PROVIDERS`)
3. Redeploy

> `NEXT_PUBLIC_SITE_URL` Vercel'deki gerçek alan adınızla aynı olmalı ve o adres
> Supabase'in `ADDITIONAL_REDIRECT_URLS` listesinde bulunmalı — yoksa Google/Apple
> girişi başarılı olur ama kullanıcı siteye dönemez.

---

## 8. Google/Apple girişinden sonra yanlış adrese gitme sorunu

### Neden oluyordu?

Giriş sonrası `https://childrentribune.online/?code=...` adresine düşüyordu. İki ipucu:

- Alan adı yanlış (`cocuktribunu.org` değil)
- Yol yok (`/api/auth/callback` değil, kök dizin)

Bu GoTrue'nun geri düşme davranışı: uygulama `redirect_to` gönderiyor, GoTrue bunu
`GOTRUE_URI_ALLOW_LIST` içinde arıyor, **bulamayınca reddedip `SITE_URL`'e düşüyor**.
`?code=` kök dizine bırakılıyor ve orada onu işleyecek bir şey olmadığı için
oturum hiç açılmıyor.

### Çözüm — `.env` (Supabase tarafı)

```env
SITE_URL=https://cocuktribunu.org
ADDITIONAL_REDIRECT_URLS=https://cocuktribunu.org/**,http://localhost:3000/**
```

`/*` tek seviye eşleşir; `/api/auth/callback` iki seviyedir, bu yüzden `**` şart.
Vercel'in `.vercel.app` adresinde de test edecekseniz onu da listeye ekleyin.

Sonra `docker compose up -d auth` veya Dokploy'da **Deploy**.

### Çözüm — `.env.local` (Next.js tarafı)

```env
NEXT_PUBLIC_SITE_URL=https://cocuktribunu.org
```

Üçü de (`SITE_URL`, `NEXT_PUBLIC_SITE_URL`, Vercel alan adı) **aynı** olmalı.

### Emniyet kemeri

Yapılandırma yine bozulursa girişin boşa gitmemesi için, kök dizine `?code=` ile
gelinirse otomatik olarak `/api/auth/callback`'e aktaran bir yakalayıcı ekledim.
Ayrıca callback artık `error_description` parametresini de yakalayıp kullanıcıya
anlaşılır bir mesaj gösteriyor.

---

## 9. Profil tamamlama zorunluluğu (migration 006)

Google ve Apple bize yalnızca **ad, soyad ve e-posta** veriyor. Şehir ve takım
bilgisi gelmiyor — Apple'da kullanıcı e-postasını bile gizleyebiliyor.

### Nasıl çalışıyor?

| Durum | Davranış |
|---|---|
| Panele girer | Turuncu uyarı bandı: "Profiliniz eksik — kart başvurusu ve etkinlik kaydı yapamazsınız" |
| Paneli gezer | Serbest — siparişleri, bildirimleri görebilir |
| Kart başvurusu yapmak ister | `/panel/profilim` sayfasına yönlendirilir |
| Etkinliğe katılmak ister | Katılım kutusunda "Profilimi tamamla" düğmesi çıkar |
| Bilgileri doldurur | Bant kaybolur, her şey açılır |

Zorunlu alanlar: **ad, soyad, şehir, takım**.

### İki katmanlı koruma

Arayüz engellemesi tek başına yeterli değil — biri doğrudan API'ye istek atabilir.
Bu yüzden veritabanı tarafında da kilit var: `create_card_order()` ve
`register_for_event()` fonksiyonları `app.require_complete_profile()` çağırıyor.

Test kanıtı:
```
tamamlanma durumu: {"missing": ["city_id","favorite_team_id"], "complete": false}
siparis engellendi -> Bu işlem için önce profil bilgilerinizi tamamlamalısınız
takim zorunlu    -> Geçerli bir takım seçin
TAMAMLA          -> {"missing": [], "complete": true}
```

### Veritabanı değişiklikleri

- `profiles.favorite_team_id` (yeni sütun, teams'e FK)
- `profiles.onboarding_completed_at` (trigger ile otomatik dolar)
- `my_profile_completion()` — hangi alanlar eksik, arayüz buna göre form çizer
- `complete_my_profile()` — tamamlama RPC'si
- Bilgileri zaten tam olan mevcut kullanıcılar otomatik işaretlendi

---

## 10. Yönetim panelinden kontrol edilenler (migration 007)

`/yonetim/ayarlar` sayfasından, kod dokunmadan yönetebilecekleriniz:

| Ayar | Ne yapar |
|---|---|
| Kredi kartı ile ödeme | Kapalıysa kart seçeneği hiç görünmez |
| Havale / EFT ile ödeme | Kapalıysa havale seçeneği görünmez |
| Varsayılan ödeme yöntemi | Ödeme adımında önceden seçili gelen yöntem |
| Bağış kabul et | Kapalıysa bağış formu gizlenir |
| İmza kampanyası açık | Kapalıysa imza formu gizlenir |
| Kombine kart başvurusu açık | Kapalıysa yeni başvuru alınmaz |
| Etkinlik kayıtları açık | Kapalıysa hiçbir etkinliğe kayıt olunamaz |
| Bakım modu | Ziyaretçiler bakım sayfası görür, yöneticiler siteyi normal kullanır |
| Bakım modu mesajı | Bakım sayfasındaki metin |
| Üst duyuru şeridi | Boş bırakılırsa şerit görünmez |
| Kombine kart bedeli | Yıllık üyelik fiyatı |

**Her iki ödeme yöntemi de kapalıysa** kullanıcı *"Şu anda ödeme kabul edemiyoruz"* mesajı
görür ve başvuru düğmesi pasifleşir.

Fiyat değişikliği yalnızca **yeni** siparişleri etkiler; mevcut siparişlerde sipariş
anındaki tutar korunur (mali kayıt bütünlüğü).

Her değişiklik `audit_logs` tablosuna eski ve yeni değeriyle yazılır.

### Kart ödemesi hakkında dürüst not

Kart ödeme **seçeneği** ve tüm altyapısı hazır: seçim ekranı, ayar kontrolü, veritabanı
kayıtları, `payment_provider = 'iyzico'` işaretlemesi. Ancak **gerçek bir ödeme sağlayıcısı
entegrasyonu yok** — kart seçilip sipariş oluşturulduğunda kullanıcı "ödeme sayfası
hazırlanıyor" bilgisi görüyor.

İyzico/Stripe anahtarlarını aldığınızda yapılacak tek şey o ekrana ödeme formunu bağlamak
ve webhook'u yazmak. Şu an için varsayılanı **Havale/EFT** yapmanızı öneririm.

---

## 11. Bu turda değişen arayüz

- **Kart önizlemesi** gerçek karta benzetildi: 1.586 en-boy oranı, çip, ışık yansıması,
  doku. Takım seçimi kaldırıldı; tüm takımlar veritabanından gelip otomatik döngüyle,
  yumuşak geçişle değişiyor. Sıra: Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor, sonra
  diğerleri. Kart sahibi sabit: **Erkam Kutay Coşkun**.
- **Vurgu rengi sarı** oldu (`--accent: #e8ff5a`). Yeşil artık yalnızca "onaylandı"
  durum rozetlerinde kullanılıyor.
- **Logo** her yerde yalnızca görsel — yanındaki "Çocuk Tribünü" yazısı kaldırıldı.
- **İmza kampanyası ve kombine kart ayrı iki proje** olarak anlatılıyor; anasayfada
  "PROJE 01 / PROJE 02" kartları.
- **Başvuru akışı tamamen panelin içinde** (`/panel/basvuru`). Çocuk veya adres eklemeye
  gidildiğinde üstte "Başvuruya dön" şeridi çıkıyor; site ile panel arasında zıplama yok.
  Eski `/basvuru` adresleri panele yönlendiriyor.
- **Hero sadeleşti**: tek başlık, tek cümle, iki düğme, üç sayı. KVKK gibi ince yazılar
  kaldırıldı.
- **İskeletler sayfaya özel**: anasayfa hero düzenini, liste sayfaları filtre şeridini,
  panel sayfaları kart ızgarasını taklit ediyor.

---

## 12. Tüm e-posta ve SMS işlemleri kendi servisimizde (migration 009)

Supabase'in kendi e-posta gönderimi **tamamen devre dışı**. Her şey ct-notify'dan gidiyor.

| İşlem | Nereden |
|---|---|
| Kayıt sonrası hoş geldiniz | ct-notify |
| E-posta doğrulama kodu | ct-notify |
| Telefon doğrulama SMS'i | ct-notify (Twilio Verify) |
| Şifre sıfırlama kodu | ct-notify |
| Sipariş / ödeme / bağış bildirimleri | ct-notify |

### Supabase `.env` düzeltmesi — ZORUNLU

Supabase artık doğrulama e-postası göndermemeli, yoksa kullanıcı iki ayrı e-posta alır:

```env
ENABLE_EMAIL_AUTOCONFIRM=true
```

Bu ayar Supabase'in kayıt sırasında doğrulama e-postası göndermesini kapatır.
Doğrulamayı biz yapıyoruz ve sonucu `profiles.email_verified_at` alanında tutuyoruz.

Değişiklikten sonra: `docker compose up -d auth`

### Şifre sıfırlama akışı

Eski akış (Supabase bağlantısı) kaldırıldı. Yenisi:

1. Kullanıcı `/sifremi-unuttum`'a e-postasını girer
2. ct-notify 6 haneli kod gönderir
3. Kullanıcı **kodu ve yeni şifresini aynı formda** girer
4. Sunucu kodu doğrular, ardından Supabase Admin API ile şifreyi değiştirir

**Neden tek adımda?** "Kod doğrulandı" bilgisi istemciye hiç gitmiyor. İki adıma
bölseydik, saldırgan ikinci adımı doğrudan çağırıp kod doğrulamasını atlayabilirdi.

Her sıfırlama denemesi `password_reset_log` tablosuna yazılır (e-posta ve IP hash'li).

### Oturum içi şifre değiştirme

`/panel/ayarlar` → Şifre değiştir. Yeni şifreyi kabul etmeden önce **mevcut şifre
doğrulanır** — oturumu ele geçiren biri şifreyi değiştiremez.

### E-posta doğrulama güvenliği

`mark_email_verified()` fonksiyonu, doğrulanan adresin **hesabın gerçek adresi**
olduğunu `auth.users` üzerinden kontrol eder. Aksi hâlde biri kendi adresine kod
alıp başkasının hesabını doğrulatabilirdi.

Test kanıtı:
```
yabanci adres reddedildi -> Bu adres hesabınıza ait değil
kendi adresi             -> {"ok": true, "verified_at": "..."}
kimlik sorgusu korumali  -> permission denied for function user_id_by_email
ham eposta saklandi mi   -> 0
```

### Şifre kuralları

En az 8 karakter, harf ve rakam içermeli, en fazla 72 karakter (bcrypt sınırı).

---

## 13. E-postaların spam'e düşmemesi için

turkticaret.net üzerinden Gmail'e giden e-postalar, DNS kayıtları olmadan
çoğunlukla spam klasörüne düşer. Bu, kullanıcıların doğrulama kodunu hiç
görmemesi demektir.

Alan adınızın DNS ayarlarına eklemeniz gerekenler:

**SPF** (TXT kaydı, `@` için):
```
v=spf1 include:turkticaret.net ~all
```

**DKIM**: turkticaret.net panelinden DKIM'i etkinleştirin, size verdiği TXT
kaydını ekleyin.

**DMARC** (TXT kaydı, `_dmarc` için):
```
v=DMARC1; p=none; rua=mailto:iletisim@cocuktribunu.com
```

Kontrol: Gmail'de mesajı açın → üç nokta → **Orijinali göster**.
`SPF: PASS`, `DKIM: PASS` görmelisiniz.

> Kesin SPF değeri için turkticaret.net destek ekibine sorun; sağlayıcıya göre
> `include:` kısmı değişebilir.

---

## 14. Kurulum sihirbazı

### Düzeltilen hata: sonsuz yönlendirme döngüsü

Sihirbaz `/panel/kurulum` adresindeydi, yani **panel layout'unun içindeydi**.
Panel layout ise eksik kurulumda sihirbaza yönlendiriyordu:

```
/panel/kurulum → layout: "kurulum eksik" → /panel/kurulum → layout: ... (sonsuz)
```

Sonuç: boş ekran veya sürekli dönen iskelet.

**Çözüm:** sihirbaz `(setup)` rota grubuna taşındı, artık `/kurulum` adresinde ve
panel layout'u ona uygulanmıyor.

```
1. Kullanıcı /panel'e girer
2. panel/layout: zorunlu adım eksik → /kurulum
3. /kurulum: kendi sade kabuğu, yönlendirme yok → sihirbaz çizilir
4. Adımlar bitince → /panel
5. panel/layout: her şey tamam → panel açılır
```

Ayrıca sihirbaza, zorunlu adımlar bitmişse **"Panele git"** kaçış bağlantısı eklendi;
kullanıcı çocuk/adres adımlarını atlayıp panele geçebiliyor.



Google/Apple ile giriş yapan kullanıcı artık doğrudan `/panel/kurulum` sihirbazına
düşüyor. Sosyal medya kayıt akışı gibi adım adım ilerliyor, üstte nokta göstergesi var.

| Adım | Zorunlu mu? | Ne toplanıyor |
|---|---|---|
| Bilgileriniz | ✓ | Ad, soyad, şehir, takım |
| E-posta | ✓ | Kod ile doğrulama |
| Telefon | ✓ | SMS kodu ile doğrulama |
| Çocuğunuz | — | Atlanabilir, sonra eklenebilir |
| Adres | — | Atlanabilir, sonra eklenebilir |

**Tamamlanmış adımlar hiç gösterilmez.** Kullanıcı birkaç gün sonra girip e-postasını
doğrulamadıysa yalnızca e-posta adımı çıkar. Yarıda bıraktıysa kaldığı yerden devam eder.

Zorunlu adımlar bitmeden panel kullanılamaz — `panel/layout.tsx` sihirbaza yönlendirir.
İsteğe bağlı adımlar eksikse panelde sarı bir hatırlatma şeridi görünür.

---

## 15. Panel sadeleştirildi

Sol menü 10 öğeden 6'ya indi:

| Önce | Sonra |
|---|---|
| Kart başvurusu + Kombine kartlar | **Kombine kart** (kartlar üstte, başvuru altta) |
| Siparişler + Ödemeler | **Siparişlerim** (ödeme bilgisi sipariş kartının içinde) |
| Çocuklarım | Çocuklarım |
| Adreslerim | Hesabım içine taşındı |
| Etkinlik kayıtlarım | Etkinliklerim |
| Bağışlarım | Genel bakışta gösteriliyor |
| Bildirimler | Bildirimler |
| Hesap ayarları | Hesabım |

Siparişler ve ödemeler ayrıydı ama her siparişin tek bir ödemesi var — ayrı tutmanın
anlamı yoktu. Ödeme durumu artık sipariş kartının içinde.

Eski adresler (`/panel/kartlarim`, `/panel/basvuru`, `/panel/siparisler`,
`/panel/odemeler`, `/panel/profilim`) yeni sayfalara yönlendiriyor.

---

## 16. Çocuk eklerken fotoğraf

Çocuk kaydedildikten hemen sonra fotoğraf ekleme adımı çıkıyor. İsteyen o an ekler,
isteyen "Tamam" deyip sonra Çocuklarım sayfasından ekler.

---

## 17. Şifre sıfırlama güvenliği

Üç katmanlı koruma:

**1. Kayıtlı olmayan adrese e-posta gitmez.** Ama yanıt birebir aynı kalır —
saldırgan hangi adreslerin kayıtlı olduğunu anlayamaz (hesap sayımı/enumeration
saldırısı). Servis tarafında `silent` modu kod üretir, kaydeder, göndermez.

**2. Hesap bazlı hız sınırı:** dakikada 1, günde 10 istek.
İstek gönderilmese bile sayaç işler; böylece tarama yapılamaz.

**3. ct-notify'ın kendi sınırları** üstüne biner: hedef başına saatlik/günlük,
IP başına saatlik.

Test kanıtı:
```
kayitli degil            -> f
kayitli                  -> t
gunluk sinir (10 istek)  -> {"reason":"daily_limit","allowed":false}
dokuz istek sonrasi      -> {"allowed":true,"today_count":9}
dun ki istekler          -> {"allowed":true,"today_count":0}
hemen ikinci istek       -> {"reason":"cooldown","retry_after_sec":60}
```

`email_is_registered` ve `user_id_by_email` fonksiyonları **yalnızca service_role**
tarafından çağrılabilir. Normal kullanıcı denerse `permission denied` alır.

---

## 18. Hesap silinince her şey siliniyor

Supabase Studio'dan bir kullanıcı silindiğinde artık doğrulama servisi kayıtları da
temizleniyor. `auth.users` üzerindeki silme trigger'ı şunları siler:

- `notify.otp_requests` — kullanıcının tüm doğrulama kodları
- `password_reset_log` — şifre sıfırlama geçmişi

OTP kayıtları farklı bir pepper ile hash'lendiği için hedefi SQL'den hesaplayamıyoruz;
bu yüzden kod gönderilirken `meta.user_id` alanına kullanıcı kimliği yazılıyor ve
silme buradan yapılıyor.

Panel üzerinden hesap silmede (`purge_user`) de aynı temizlik çalışıyor, ayrıca
çocuk fotoğrafları ve avatarlar depolama temizlik kuyruğuna düşüyor.

---

## 19. E-posta şablonları

iOS sistem bildirimi estetiğine geçildi: sade, bol boşluklu, tek odak noktası.
SF Pro font yığını, 20px yuvarlatılmış kart, iOS renk paleti.

**Koyu mod desteği** `prefers-color-scheme` ile eklendi — Apple Mail ve iOS Mail'de
otomatik çalışır. Gmail'in koyu modu sınırlı destekliyor, orada açık tema görünür.

Şablonlar: `email_verify`, `password_reset`, `login_code`, `welcome`,
`order_received`, `payment_approved`, `donation_receipt`, `event_reminder`.
