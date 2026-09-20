# LSÖ — MVP (Hava, Deniz, Finans)

Gerçek, ücretsiz API'lerden canlı veri çeken çalışan bir Node.js uygulaması.
- Hava durumu + 4 günlük tahmin: Open-Meteo
- Dalga yüksekliği/periyodu: Open-Meteo Marine
- Döviz (USD/EUR) + Gram Altın: Darphane (açık kaynak, key gerekmiyor)

## 1) Bilgisayarında deneme

```
cd lso-app
npm install
npm start
```

Sonra tarayıcıda `http://localhost:3000` adresini aç. Üstteki Mordoğan /
Eski Foça / Karşıyaka butonlarına basarak farklı konumlar için canlı veriyi
görebilirsin.

## 2) Telefona "PWA" olarak yükleme (ücretsiz deploy)

Telefonuna kurabilmen için önce internete açık bir adrese ihtiyacın var.
En kolay ücretsiz seçenek **Render.com**:

1. Bu klasörü bir GitHub reposuna yükle (github.com üzerinden yeni repo aç,
   dosyaları sürükle-bırak ile yükleyebilirsin — kod bilmene gerek yok).
2. render.com'a git, ücretsiz hesap aç, "New +" → "Web Service" seç.
3. GitHub reponu bağla.
4. Ayarlar:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. "Create Web Service" de. Birkaç dakika içinde sana
   `https://lso-app-xxxx.onrender.com` gibi bir adres verecek.

## 3) Telefonda "Ana Ekrana Ekle"

1. Telefonunda o adresi (Chrome/Safari) aç.
2. **Android (Chrome)**: sağ üstteki ⋮ menü → "Ana ekrana ekle".
3. **iPhone (Safari)**: alttaki paylaş ikonu → "Ana Ekrana Ekle".
4. Artık ikon telefonunda gerçek bir uygulama gibi duruyor, tıklayınca
   tam ekran açılıyor (tarayıcı çubuğu görünmüyor).

## Not: Ücretsiz Render planının bir kısıtı var

Ücretsiz katmanda sunucu 15 dakika kullanılmazsa "uyku"ya geçer, bir sonraki
açılışta ilk yüklemede birkaç saniye gecikme olabilir. Gerçek kullanıcılar
için büyüdüğümüzde ücretli bir plana (ayda ~7$) geçmek bu sorunu çözer.

## Sırada ne var

Bu MVP şu an sadece hava/deniz/finans gösteriyor. Konuştuğumuz diğer
modüller (spor, haber, deprem uyarısı, kıyı noktaları + yakın yerler,
onboarding akışı) bir sonraki adımda bu backend'e endpoint olarak eklenip
tasarım mockup'ındaki arayüzle birleştirilecek.
