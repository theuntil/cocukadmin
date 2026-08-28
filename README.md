# ct-admin — Çocuk Tribünü Yönetim Paneli

Ana siteden bağımsız çalışan, kendi Docker konteynerindeki yönetim paneli.

## Ekranlar

| Bölüm | Ne yapılır |
|---|---|
| Gösterge paneli | 13 metrik, bekleyen işler, son hareketler |
| Görüntülenmeler | Günlük seyir, en çok okunan sayfalar, trafik kaynakları |
| Siparişler | Liste, detay, fatura yükleme, kargo, iptal, dekont onayı |
| Kombine kartlar | Durum takibi, siparişe geçiş |
| Bağışlar | Onay/red, bağışçı mesajı moderasyonu |
| Blog | Ekle, düzenle, sil, kapak görseli |
| Etkinlikler | Ekle, düzenle, sil, kontenjan ve erişim kuralları |
| Medya | Sürükle-bırak yükleme, galeri, önizleme, URL kopyalama, silme |
| Üyeler | Arama, doğrulama durumu |
| Ayarlar | Ödeme yöntemleri, aç/kapa, bakım modu, logo, fiyat |

## Otomatik e-posta tetikleyicileri

Aşağıdaki işlemler kullanıcıya otomatik e-posta gönderir (ct-notify üzerinden):

| İşlem | E-posta |
|---|---|
| Faturayı siparişe yükleme | "Faturanız hazır" |
| Kart durumu → Basıldı | "Kartınız basıldı" |
| Kargo bilgisi girme | "Kartınız kargoya verildi" + takip no |
| Kart durumu → Teslim edildi | "Kartınız teslim edildi" |
| Dekont onayı | "Ödemeniz onaylandı" |
| Bağış onayı | "Bağışınız için teşekkürler" |

## Güvenlik

**Üç katmanlı yetki.** Middleware oturumu doğrular → layout personel rolünü kontrol
eder → veritabanındaki her RPC kendi yetkisini ayrıca kontrol eder. Bir katman
atlansa bile diğerleri devrede kalır.

**Rol bazlı menü.** Editör yalnızca içerik bölümlerini, finans yalnızca sipariş ve
bağışları görür. Menüde görünmeyen sayfaya doğrudan gidilse bile RPC reddeder.

**Personel olmayan giriş yapamaz.** Şifre doğru olsa bile rolü yoksa oturum hemen
kapatılır.

**service_role anahtarı yalnızca sunucuda.** `NEXT_PUBLIC_` öneki yok, tarayıcıya sızmaz.

**Panel arama motorlarına kapalı:** `robots: noindex, nofollow, nocache`.

**Konteyner sıkılaştırması:** root olmayan kullanıcı, tüm capability'ler düşürülmüş,
`no-new-privileges`, bellek sınırı, tini ile sinyal yönetimi.

## Görüntülenme sistemi

Ham istek tablosu tutulmaz; her görüntülenme doğrudan **saatlik özet satırına** yazılır.
Milyonlarca satır birikmez, sorgular hızlı kalır.

IP ve user-agent **saklanmaz**. Tekil ziyaretçi, tarayıcıda üretilen ve **gün değişince
yenilenen** rastgele bir kimlikle sayılır — kişi günler arası izlenemez.

Sorgu parametreleri temizlenir (`/blog/yazi?utm=x` → `/blog/yazi`), yönlendiren yalnızca
alan adına indirgenir, bot trafiği ayrı işaretlenir ve istatistiklere karışmaz.

Panel ve yönetim sayfaları hiç izlenmez.

## Kurulum

Bkz. `docker-compose.yml` başındaki notlar ve `.env.example`.
