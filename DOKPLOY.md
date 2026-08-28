# Dokploy Kurulumu — Yönetim Paneli

## "Compose file not found" hatası

Dokploy `docker-compose.yml` dosyasını **deponun kökünde** arıyor.

Paketi açtığınızda `cocuk-tribunu-admin/` diye bir klasör çıkıyor. Bu
klasörün tamamını push ederseniz dosya bir alt dizinde kalır ve Dokploy
bulamaz.

### Çözüm A — dosyaları köke taşıyın (önerilen)

```bash
# Paketi açın
tar -xzf cocuk-tribunu-admin.tar.gz

# Depo klasörüne İÇERİĞİ kopyalayın (klasörün kendisini değil)
cp -r cocuk-tribunu-admin/. /yol/cocukadmin/

cd /yol/cocukadmin
git add -A
git commit -m "Yönetim paneli"
git push
```

Depo kökünde şunlar görünmeli:

```
Dockerfile
docker-compose.yml
package.json
next.config.ts
src/
public/
```

### Çözüm B — Compose Path'i değiştirin

Dokploy → uygulama → **General** → Compose Path:

```
./cocuk-tribunu-admin/docker-compose.yml
```

---

## Environment değerleri

Dokploy → **Environment** sekmesine:

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.childrentribune.online
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public anahtar>
SUPABASE_SERVICE_ROLE_KEY=<service_role anahtarı>
NEXT_PUBLIC_SITE_URL=https://cocuktribunu.org
NEXT_PUBLIC_TEAM_URL=https://takim.cocuktribunu.org

NOTIFY_SERVICE_URL=http://ct-notify:8080
NOTIFY_SERVICE_SECRET=<ct-notify ile aynı sır>
```

> `NEXT_PUBLIC_*` değerleri tarayıcıya giden JS'in içine **gömülür**.
> Yalnızca çalışma anında verilirse istemci tarafı boş kalır. Bu yüzden
> hem `args` hem `environment` olarak tanımlılar — biri eksikse panel
> açılır ama Supabase'e bağlanamaz.

## Domain

Dokploy → **Domains** → Add Domain

| Alan | Değer |
|---|---|
| Host | `admin.childrentribune.online` |
| Service | `admin` |
| Port | `3000` |
| HTTPS | açık (Let's Encrypt) |

## Ağ

Compose dosyası `ocuk-tribn-supabase-p7owij` adlı dış ağa bağlanıyor —
Supabase ile aynı ağ. Sizin Supabase yığınınızın ağ adı farklıysa
`docker-compose.yml` sonundaki `name:` satırını güncelleyin:

```bash
docker network ls | grep supabase
```

## Yaygın hatalar

| Hata | Sebep |
|---|---|
| `Compose file not found` | Dosya depo kökünde değil (yukarı bakın) |
| `network ... not found` | Ağ adı yanlış — `docker network ls` ile bakın |
| Panel açılıyor ama giriş çalışmıyor | `NEXT_PUBLIC_*` derleme anında verilmemiş |
| `Could not find the function ... schema cache` | Supabase REST konteynerini yeniden başlatın |
