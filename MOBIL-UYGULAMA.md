# Mobil Uygulama Notları (React Native / Expo)

Bu belge, ileride yazılacak mobil uygulamanın mevcut altyapıyla nasıl
çalışacağını anlatır. Altyapı mobil için hazırdır; ek bir sunucu değişikliği
gerekmez.

---

## 1. Oturum

Supabase istemcisi mobilde oturumu cihazda saklar. Web'deki çerez yerine
`Authorization: Bearer <access_token>` başlığı kullanılır.

```ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,   // mobilde URL yok
    },
  },
);
```

Veritabanı sorguları, RPC çağrıları ve RLS aynen web'deki gibi çalışır.
Ayrı bir uyarlama gerekmez.

---

## 2. Çocuk fotoğrafları — DİKKAT

Çocuk fotoğrafları **özel kovadadır** ve doğrudan indirilemez. Ne herkese
açık adresleri vardır, ne de imzalı bağlantı üretilebilir (istemcinin
depolamadan okuma yetkisi yoktur).

Tek erişim yolu sunucudaki uçtur:

```
GET https://www.cocuktribunu.org/api/child-photo/{childId}
Authorization: Bearer <access_token>
```

Bu uç her istekte oturumu doğrular ve "bu kullanıcı bu çocuğun velisi mi ya
da personel mi" diye kontrol eder. Başlık gönderilmezse **401** döner.

### React Native'de gösterim

`Image` bileşeni başlık gönderebilir:

```tsx
import { Image } from "react-native";
import { supabase } from "./lib/supabase";

function ChildAvatar({ childId }: { childId: string }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  if (!token) return <Placeholder />;

  return (
    <Image
      source={{
        uri: `https://www.cocuktribunu.org/api/child-photo/${childId}`,
        headers: { Authorization: `Bearer ${token}` },
      }}
      style={{ width: 72, height: 72, borderRadius: 36 }}
    />
  );
}
```

`expo-image` kullanıyorsanız aynı `headers` alanı desteklenir ve önbellek
yönetimi daha iyidir:

```tsx
import { Image } from "expo-image";

<Image
  source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
  cachePolicy="memory"        // diske YAZMAYIN: çocuk fotoğrafı
  style={{ width: 72, height: 72, borderRadius: 36 }}
/>
```

**Önemli:** `cachePolicy="disk"` kullanmayın. Fotoğraf cihazın diskine
şifresiz yazılır; telefon başkasının eline geçerse erişilebilir. Sunucu
zaten `cache-control: no-store` gönderiyor, istemci tarafında da diske
yazmamak gerekir.

### Token yenilenmesi

Access token yaklaşık bir saatte bir yenilenir. Görsel URL'si sabittir ama
başlık her seferinde güncel token'ı taşımalıdır. Yukarıdaki gibi
`getSession()` ile alırsanız Supabase istemcisi yenilemeyi kendisi yapar.

Uzun süre açık kalan ekranlarda token değişimini dinleyin:

```ts
supabase.auth.onAuthStateChange((_event, session) => {
  setToken(session?.access_token ?? null);
});
```

---

## 3. Profil fotoğrafları

Aynı mantık, farklı uç:

```
GET /api/avatar/{userId}
Authorization: Bearer <access_token>
```

Fark: profil fotoğraflarını giriş yapmış **her** kullanıcı görebilir (üye
listelerinde görünürler). Çocuk fotoğrafı yalnızca velisine ve personele
açıktır.

---

## 4. Fotoğraf yükleme

Yükleme doğrudan Supabase Storage'a yapılır; sunucu ucuna gerek yoktur.
Yol biçimi **zorunludur**:

```
{veli_id}/children/{dosya_adı}
```

```ts
const { data: { user } } = await supabase.auth.getUser();
const path = `${user!.id}/children/${childId}-${Date.now()}.jpg`;

const { error } = await supabase.storage
  .from("child-photos")
  .upload(path, blob, { contentType: "image/jpeg", upsert: false });

// Ardından kaydı güncelle
await supabase.rpc("set_child_photo_path", {
  p_child_id: childId,
  p_path: path,
});
```

`upsert: true` KULLANMAYIN — güncelleme yetkisi kapalıdır (imzalı bağlantı
sızıntısını önlemek için). Her yükleme benzersiz ada gittiği için gerek de
yoktur.

---

## 5. Ödeme

Kart ödemesi için `@stripe/stripe-react-native` kullanılır. Sunucu tarafı
hazırdır:

1. `createPaymentIntent` yerine doğrudan RPC:
   `upsert_payment_intent` — ama önce PaymentIntent'i sunucudan almak
   gerekir. Bunun için ince bir uç eklenmelidir:
   `POST /api/payment/intent` (henüz yok, mobil çalışması başlayınca eklenir)

2. Ödeme onaylandıktan sonra `force_complete_order` zaten çağrılıyor;
   webhook ve eşitleme ucu mobilde de aynı şekilde çalışır.

Sağlayıcı değişirse (iyzico/PayTR) mobil taraf etkilenmez:
`src/lib/payment/` altındaki arayüz sağlayıcıdan bağımsızdır.

---

## 6. Derin bağlantılar

Etkinlik QR kodları `https://cocuktribunu.org/e/{token}` adresine gider.
Mobil uygulamada bu adresi yakalamak için Universal Links (iOS) ve App
Links (Android) tanımlayın; aksi hâlde tarayıcıda açılır.

---

## 7. Özet: mobilde çalışan / çalışmayan

| Konu | Durum |
|---|---|
| Giriş, kayıt, oturum | Hazır |
| Veritabanı sorguları, RLS | Hazır |
| Çocuk fotoğrafı görüntüleme | Hazır (Bearer başlığı ile) |
| Profil fotoğrafı | Hazır |
| Fotoğraf yükleme | Hazır |
| Etkinlik kaydı, kart görüntüleme | Hazır |
| Kart ödemesi | Sunucuya ince bir uç eklenmeli |
| Push bildirim | Henüz yok — ct-notify e-posta/SMS gönderiyor |
