# Dümen

Arkadaşlarla Ankara'yı gezerken "nereye gidiyoruz" tartışmasını bitirmek için yaptığım küçük bir web uygulaması. Herkes gitmek istediği yeri listeye ekliyor, listede yerin Google puanı ve fotoğrafı görünüyor, "Git"e basınca Google Haritalar toplu taşıma rotasını aktarmalarıyla açıyor.

Hepimiz iPhone kullandığımız için native uygulama yazmak yerine PWA olarak yaptım. Safari'den ana ekrana eklenince normal bir uygulama gibi tam ekran açılıyor.

https://aliaydn33.github.io/dumen/

## Özellikler

- Google Places ile yer arama (Ankara ve çevresiyle sınırlı)
- Google puanı, değerlendirme sayısı ve fotoğraf
- Ortak liste: biri bir yer ekleyince herkeste anında görünüyor
- Konuma göre mesafe ve en yakın yer
- Sıraya, yakınlığa, puana ya da kaç kişinin istediğine göre sıralama
- "Ben de gitmek istiyorum", gidilen yerleri ayırma, not ekleme
- Karanlık mod

## Kullandıklarım

Framework yok, düz HTML, CSS ve JavaScript. Arama, puan ve fotoğraflar için Google Maps JavaScript API (Places), ortak liste için Firebase (anonim giriş ve Firestore). Site GitHub Pages'te duruyor.

## Kurulum

Doldurulması gereken tek dosya `config.js`.

### Google Maps anahtarı

1. Google Cloud Console'da bir proje aç ve faturalandırma hesabı bağla.
2. Maps JavaScript API ile Places API (New)'u etkinleştir.
3. Bir API anahtarı oluştur. Web sitesi kısıtlamasına `https://kullaniciadi.github.io/*` adresini, API kısıtlamasına da bu iki API'yi ekle.
4. Anahtarı `config.js` içinde `googleMapsApiKey` kısmına yaz.

Ücret konusu: Places API'de puan bilgisi ve fotoğraf için ayrı ayrı ayda 1000 ücretsiz istek hakkı var. Fotoğraf yer eklenirken bir kez çekilip küçültülerek kaydediliyor. Uygulamayı açmak istek harcamıyor, sadece yer eklemek harcıyor. Arkadaş grubu kullanımında bu sınıra yaklaşmak zor.

### Firebase

1. Firebase'de proje oluştur. İstersen yukarıdaki Google Cloud projesini seçebilirsin.
2. Authentication altında Anonymous girişini aç.
3. Firestore veritabanı oluştur, Rules kısmına `firestore.rules` dosyasının içeriğini yapıştırıp yayınla.
4. Projeye web uygulaması ekle. Verdiği ayarlardaki `apiKey`, `authDomain`, `projectId` ve `appId` değerlerini `config.js`'e yaz. `groupId` için de tahmin edilmesi zor bir şey seç.

Firebase ayarlanmamışsa uygulama deneme modunda çalışıyor ve liste sadece o cihazda tutuluyor.

### Yayınlama

Repo'da Settings > Pages > Deploy from a branch > `main` / root.

Bilgisayarda denemek için:

```
python -m http.server 8000
```

Sonra http://localhost:8000 adresini aç. Google anahtarında localhost kısıtlaması da ekli olmalı.

## iPhone'a ekleme

Linki Safari'de aç, Paylaş > Ana Ekrana Ekle. İsim ilk açılışta uygulamanın içinde soruluyor çünkü iOS, Safari ile ana ekran uygulamasının verilerini ayrı tutuyor.

## Notlar

- `config.js` herkese açık, anahtarların orada görünmesi normal. Asıl koruma Google anahtarındaki web sitesi kısıtlaması ve Firestore kuralları.
- Google'ın kullanım şartları puan ve fotoğraf gibi yer bilgilerinin uzun süre saklanmasını sınırlıyor. Masrafı sıfırda tutmak için bunları ekleme anında kaydediyorum. Küçük ve kişisel bir proje olduğu için böyle bıraktım, herkese açık bir ürün olsaydı bu kısmı değiştirmem gerekirdi.
- `vendor/firebase.js`, Firebase SDK'nın (12.19) esbuild ile tek dosyaya paketlenmiş hali.
