# Dümen

Arkadaşlarla Ankara'yı gezerken "nereye gidiyoruz" tartışmasını bitirmek için yaptığım küçük bir web uygulaması. Herkes gitmek istediği yeri listeye ekliyor, listede yerin fotoğrafı, Google puanı ve bize uzaklığı görünüyor, "Git"e basınca Google Haritalar toplu taşıma rotasını aktarmalarıyla açıyor.

Hepimiz iPhone kullandığımız için native uygulama yazmak yerine PWA olarak yaptım. Safari'den ana ekrana eklenince normal bir uygulama gibi tam ekran açılıyor.

https://aliaydn33.github.io/dumen/

## Özellikler

- Ankara ve çevresinde yer arama (OpenStreetMap). Bulunamayan bir yer adıyla elle de eklenebiliyor
- Ünlü yerlerin fotoğrafı Wikipedia'dan otomatik geliyor, olmayanlara telefondan fotoğraf eklenebiliyor
- Google puanı: "Google'da bak" ile Google Haritalar açılıyor, puanı listeye ekleyen kişi yazıyor
- Ortak liste: biri bir yer ekleyince herkeste anında görünüyor
- Konuma göre mesafe ve en yakın yer
- Sıraya, yakınlığa, puana ya da kaç kişinin istediğine göre sıralama
- "Ben de gitmek istiyorum", gidilen yerleri ayırma, not ekleme
- Karanlık mod

## Kullandıklarım

Framework yok, düz HTML, CSS ve JavaScript. Arama için [Photon](https://photon.komoot.io) (OpenStreetMap verisiyle çalışan ücretsiz bir arama servisi; o cevap vermezse klavyedeki Ara tuşuyla OpenStreetMap'in kendi arama servisi Nominatim), fotoğraflar için Wikipedia ve Wikidata API'leri, ortak liste için Firebase (anonim giriş ve Firestore). Yol tarifi için Google Haritalar ve Apple Haritalar bağlantıları kullanılıyor. Hiçbiri API anahtarı ya da kart istemiyor. Site GitHub Pages'te duruyor.

Başta Google Places API kullanmıştım ama Google Cloud kart için ön ödeme istediği için ücretsiz servislere geçtim.

## Kurulum

Doldurulması gereken tek dosya `config.js`, o da sadece ortak liste için.

### Firebase

1. Firebase'de proje oluştur.
2. Authentication altında Anonymous girişini aç.
3. Firestore veritabanı oluştur, Rules kısmına `firestore.rules` dosyasının içeriğini yapıştırıp yayınla.
4. Projeye web uygulaması ekle. Verdiği ayarlardaki `apiKey`, `authDomain`, `projectId` ve `appId` değerlerini `config.js`'e yaz. `groupId` için de tahmin edilmesi zor bir şey seç.

Firebase'in ücretsiz planı yetiyor, kart istemiyor. Firebase ayarlanmamışsa uygulama deneme modunda çalışıyor ve liste sadece o cihazda tutuluyor.

### Yayınlama

Repo'da Settings > Pages > Deploy from a branch > `main` / root.

Bilgisayarda denemek için:

```
python -m http.server 8000
```

Sonra http://localhost:8000 adresini aç.

## iPhone'a ekleme

Linki Safari'de aç, Paylaş > Ana Ekrana Ekle. İsim ilk açılışta uygulamanın içinde soruluyor çünkü iOS, Safari ile ana ekran uygulamasının verilerini ayrı tutuyor.

## Notlar

- Harita verisi © OpenStreetMap katkıcıları (ODbL). Wikipedia'dan gelen fotoğraflar Wikimedia Commons'taki lisanslarıyla kullanılıyor, her fotoğrafın kaynağına ayrıntı sayfasından gidilebiliyor.
- Photon'un herkese açık sunucusu makul kullanım için ücretsiz. Arkadaş grubu için yeterli, çok kullanılırsa kendi sunucusunu kurmak gerekir. Nominatim'in kuralları yazarken arama yapmayı yasakladığı için o sadece Ara'ya basınca, saniyede en fazla bir kez çağrılıyor.
- Deneme modunda eklenen yerler Firebase kurulunca ilk açılışta ortak listeye taşınıyor.
- Kafe gibi küçük yerlerin çoğunun Wikipedia fotoğrafı yok. Onlara telefondan fotoğraf eklenince küçültülüp listeye kaydediliyor.
- `config.js` herkese açık, Firebase ayarlarının orada görünmesi normal. Asıl koruma Firestore kuralları.
- `vendor/firebase.js`, Firebase SDK'nın (12.19) esbuild ile tek dosyaya paketlenmiş hali.
