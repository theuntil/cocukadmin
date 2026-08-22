# public/ klasörüne koymanız gereken görseller

| Dosya | Kullanım | Öneri |
|---|---|---|
| `cocuktribunu.png` | Açık temada logo (nav, footer, panel) | şeffaf PNG, en az 200×200 |
| `cocuktribunud.png` | Koyu temada logo | şeffaf PNG, açık renkli varyant |
| `favicon.ico` | Tarayıcı sekmesi | 32×32 |
| `favicon.png` | PWA / Apple touch icon | 512×512 |

## FIFA 2026 arka plan görseli

Anasayfadaki FIFA 2026 şeridinin ve `/fifa-2026` sayfasının arka planı **veritabanından**
gelir; koda gömülü değildir.

1. Görseli Supabase Storage'da **`site-media`** bucket'ına yükleyin (örn. `fifa2026-hero.jpg`).
2. Yolu `site_content` tablosuna yazın:

```sql
update public.site_content
   set image_path = 'fifa2026-hero.jpg'
 where key in ('home.fifa2026', 'fifa2026.intro');
```

Karartma oranını da oradan ayarlayabilirsiniz:

```sql
update public.site_content
   set data = jsonb_set(data, '{overlay_opacity}', '0.65')
 where key = 'home.fifa2026';
```

Görsel yüklenmezse şerit, tasarımın koyu yeşil zeminiyle sorunsuz görünmeye devam eder.
