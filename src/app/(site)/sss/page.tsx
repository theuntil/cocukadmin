import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow, H2, Section } from "@/components/ui";
import { PageHeader } from "@/components/site/page-header";
import { Accordion } from "@/components/site/faq";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description: "Kombine kart, etkinlikler, ödeme ve gizlilik hakkında merak edilenler.",
};

const GROUPS = [
  {
    title: "Kombine kart",
    items: [
      { q: "Kart tam olarak ne işe yarıyor?", a: "Kart, çocuğunuzun Çocuk Tribünü üyeliğini gösterir. Kart sahibi çocuklara özel etkinliklere katılım hakkı verir ve kulüplerle yürüttüğümüz görüşmelerde temsil sağlar. Maç bileti yerine geçmez." },
      { q: "Kart ne zaman kullanılabilir olur?", a: "Kart dijitaldir; fiziksel kart basılmaz ve kargo gönderilmez. Ödeme onaylandığı an kart numaranız ve QR kodunuz panelinizde oluşur, aynı anda kullanılabilir hâle gelir." },
      { q: "Üyelik otomatik yenilenir mi?", a: "Hayır. Otomatik ödeme talimatı almayız. Süre dolmadan 60 gün önce yenileme yapabilirsiniz." },
      { q: "Yenilemede yeni kart gelir mi?", a: "Hayır, mevcut kartınızın geçerlilik süresi uzatılır. Yeni kart basılmaz." },
    ],
  },
  {
    title: "İmza kampanyası",
    items: [
      { q: "İmza için üye olmam gerekir mi?", a: "Hayır, üyeliksizdir." },
      { q: "Telefon numaram saklanıyor mu?", a: "Açık şekilde saklanmaz; yalnızca mükerrer imzayı engellemek için geri döndürülemez özeti tutulur." },
      { q: "İmzam kimlere gösteriliyor?", a: "Ad ve soyadınız kamuya açık listelenmez. Yalnızca toplam sayılar ve takım bazlı istatistikler görünür." },
    ],
  },
  {
    title: "Etkinlikler",
    items: [
      { q: "Etkinliklere kimler katılabilir?", a: "Etkinliğe göre değişir. Bazıları herkese açıktır; bazıları yalnızca geçerli kombine kartı olan çocuklara, bazıları ise belirli bir takımın kart sahiplerine özeldir. Etkinlik sayfasında bu bilgi açıkça yazar." },
      { q: "Kontenjan dolarsa ne olur?", a: "Bekleme listesi açıksa sıraya girersiniz. Onaylı bir katılımcı iptal ettiğinde sıradaki ilk kişi otomatik olarak onaylanır ve bildirim gönderilir." },
      { q: "Etkinlik girişinde ne göstereceğim?", a: "Kayıt sonrası size 8 haneli bir giriş kodu verilir. Girişte bu kodu göstermeniz yeterlidir; kod yalnızca bir kez kullanılabilir." },
      { q: "Veli olarak ben de katılabilir miyim?", a: "Çoğu etkinlikte veli refakati zorunludur. Kayıt sırasında refakatçi sayısını belirtebilirsiniz." },
    ],
  },
  {
    title: "Ödeme",
    items: [
      { q: "Hangi ödeme yöntemleri var?", a: "Kredi/banka kartı ve havale (IBAN). Kartla ödemede kart bilgileriniz şifrelenerek doğrudan bankaya iletilir, sunucularımıza kaydedilmez." },
      { q: "Havale ile ödersem ne zaman aktifleşir?", a: "Açıklamaya başvuru numaranızı yazıp dekontu panelden yükleyin. Ekibimiz genellikle 1 iş günü içinde onaylar; onay anında kart aktifleşir." },
      { q: "İptal edebilir miyim?", a: "Evet. 14 gün içinde koşulsuz cayma hakkınız vardır; iptal ve iade koşulları ilgili sayfada ayrıntılı yazılıdır." },
    ],
  },
  {
    title: "Hesap ve gizlilik",
    items: [
      { q: "Çocuğumun hangi bilgilerini istiyorsunuz?", a: "Yalnızca ad, soyad, doğum tarihi ve (isteğe bağlı) şehir ile takım tercihi. T.C. kimlik numarası, okul, sağlık verisi veya fotoğraf istemiyoruz." },
      { q: "Hesabımı nasıl silerim?", a: "Panel > Hesap ayarları bölümünden silme talebi oluşturabilirsiniz. Talep 7 gün boyunca iptal edilebilir; süre dolduğunda kişisel verileriniz kalıcı olarak silinir." },
      { q: "Hesabımı silersem siparişlerim ne olur?", a: "Mali kayıtlar mevzuat gereği saklanır ancak kimlik bağı koparılır ve adres bilgileri maskelenir." },
    ],
  },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="SIKÇA SORULANLAR" title="Aklınızdaki soru burada olabilir." description="Bulamazsanız iletişim sayfasından bize yazın." />
      <Section>
        <Container className="flex max-w-[860px] flex-col gap-12">
          {GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Eyebrow className="text-accent-ink">{g.title.toUpperCase()}</Eyebrow>
                <H2 className="text-[28px]">{g.title}</H2>
              </div>
              <Accordion items={g.items} />
            </div>
          ))}
          <p className="text-[14.5px] text-ink2">
            Sorunuz yanıtlanmadı mı?{" "}
            <Link href="/iletisim" className="font-semibold text-ink underline decoration-accent-line decoration-2 underline-offset-4 hover:decoration-[3px]">Bize yazın</Link>.
          </p>
        </Container>
      </Section>
    </>
  );
}
