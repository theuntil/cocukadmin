# public/fonts/ — Wise

Başlıklarda **Wise** fontu kullanılıyor. Lisanslı olduğu için depoya
konulamıyor; dosyayı siz koyacaksınız.

## Koyulacak dosya

```
public/fonts/wise.ttf
```

Ad birebir bu olmalı — `globals.css` içindeki `@font-face` bunu arıyor.

## Neden tek tanım

Elimizde tek kesim var (ayrı Bold/SemiBold dosyası yok). Bu yüzden
`@font-face` şöyle yazıldı:

```css
font-weight: 100 900;
```

Tarayıcı bu tek dosyayı **her kalınlık için** kullanır ve kalın
gösterimi kendisi sentezler.

> İki ayrı tanım yazsaydık (600 ve 700, ikisi de aynı dosya), tarayıcı
> "bu ağırlık zaten var" deyip sentezleme yapmaz ve **başlıklar ince
> kalırdı.**

## Dosya yoksa ne olur

**Hiçbir şey kırılmaz.** Zincir:

```
Wise  →  Bricolage Grotesque  →  sistem fontu
```

`font-display: swap` sayesinde sayfa beklemeden çizilir.

## woff2 elinize geçerse

`.ttf` boyut olarak büyük. woff2 sürümü olursa `globals.css` içindeki
`src` satırına ekleyin:

```css
src: url("/fonts/wise.woff2") format("woff2"),
     url("/fonts/wise.ttf") format("truetype");
```

Tarayıcı desteklediği ilk biçimi seçer.

## Gövde metni

Gövdede **Inter** var, Google Fonts üzerinden otomatik geliyor.
