# Dümen · Ankara'yı gezek

Arkadaşlarla ortak gezi rotası. Herkes gitmek istediği yeri arayıp listeye ekler; yerin
Google fotoğrafı, puanı (ör. ★ 4,3) ve uzaklığı görünür. "Git"e basınca Google Haritalar
otobüs/metro aktarmalarıyla rotayı açar. iPhone'da ana ekrana eklenince uygulama gibi çalışır,
telefon karanlık moddaysa o da karanlık olur.

## Neler var

- **Arama:** Google Places ile, Ankara ve çevresiyle sınırlı. Yakındakiler mesafesiyle görünür.
- **Fotoğraf:** Her yerin Google fotoğrafı; listede yuvarlak, sıradaki durakta büyük kapak olarak.
- **Ortak liste:** Biri ekleyince herkesin telefonunda anında görünür (Firebase).
- **Sıradaki durak:** Listenin başındaki yer büyük kartla gösterilir, tek dokunuşla "Git".
- **Sıralama:** Sıra (elle yukarı/aşağı), Yakın, Puan, Popüler. Konum açıksa en yakın yer işaretlenir.
- **Ben de:** Bir yere sen de gitmek istiyorsan anahtarı aç; "Popüler"de öne çıkar.
- **Git:** Toplu taşıma (aktarmalı), yürüyerek ya da Apple Haritalar.
- **Gittik:** "Gittiklerimiz"e taşınır; yanlışlıkla bastıysan "Geri al".
- **Not ve davet:** Her yere kısa not; sağ üstteki profilden arkadaşlarına bağlantı gönder.

Bir yere dokununca ayrıntı sayfası açılır: fotoğraf, puan, adres, kimlerin gitmek istediği,
yol tarifi seçenekleri, not, sırayı değiştirme ve silme.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html`, `styles.css`, `app.js` | Uygulamanın kendisi |
| `config.js` | **Senin dolduracağın tek dosya** (anahtarlar) |
| `vendor/firebase.js` | Firebase kütüphanesi (paketlenmiş, dokunma) |
| `firestore.rules` | Veritabanı güvenlik kuralları (Firebase'e yapıştıracaksın) |
| `manifest.webmanifest`, `icons/` | Ana ekran ikonu ve adı (Dümen) |

Anahtarlar olmadan da açılır ama arama kapalı olur ve liste sadece o telefonda durur (deneme modu).

---

## Kurulum (yaklaşık 20 dakika, bir kez yapılır)

Sıra: önce Firebase projesi, sonra aynı projede Google Maps anahtarı, sonra GitHub Pages, en son iPhone.

### 1. Firebase: ortak liste

1. <https://console.firebase.google.com> → **Proje ekle** → adı `dumen` (Analytics'i kapatabilirsin).
2. Sol menü **Build › Authentication › Get started › Sign-in method › Anonymous › Enable › Save**.
3. **Build › Firestore Database › Create database** → konum `eur3 (europe-west)` → **production mode**.
4. Firestore'da **Rules** sekmesi → içini sil, `firestore.rules` dosyasının içeriğini yapıştır → **Publish**.
5. ⚙ **Project settings › General** → aşağıda **Your apps** → web ikonu `</>` → takma ad `Dümen` → **Register app**.
6. Çıkan `firebaseConfig` içinden `apiKey`, `authDomain`, `projectId`, `appId` değerlerini `config.js`'teki `firebase:` kısmına yaz:

```js
firebase: {
  apiKey: "AIza...",
  authDomain: "dumen-xxxx.firebaseapp.com",
  projectId: "dumen-xxxx",
  appId: "1:1234567890:web:abcdef"
},
groupId: "ankara-ekip-7f3k",   // tahmin edilmesi zor bir şey yap
```

### 2. Google Maps: arama, puan ve fotoğraf

Google puanını ve fotoğrafını göstermenin resmi yolu Places API. **Kart ister**, ama sizin
kullanımınız ücretsiz kotada kalır (aşağıda).

1. <https://console.cloud.google.com> → üstteki proje seçiciden **Firebase'in açtığı `dumen` projesini** seç.
2. **Billing (Faturalandırma)** → projeye faturalandırma hesabı bağla.
3. **APIs & Services › Library** → şu ikisini bulup **Enable** et:
   - **Maps JavaScript API**
   - **Places API (New)** (eski "Places API" değil)
4. **APIs & Services › Credentials › Create credentials › API key**. Oluşan anahtarı aç ve kısıtla:
   - **Application restrictions → Websites** → ekle: `https://KULLANICIADIN.github.io/*`
     (bilgisayarında denemek istersen `http://localhost:8000/*` de ekle)
   - **API restrictions → Restrict key** → sadece *Maps JavaScript API* ve *Places API (New)*
   - Firebase'in kendi oluşturduğu "Browser key"e dokunma; bu ayrı bir anahtar olsun.
5. Anahtarı `config.js`'te `googleMapsApiKey: "..."` içine yaz.
6. Güvenlik için **Billing › Budgets & alerts** → küçük bir bütçe (ör. 1 $) ve e-posta uyarısı kur.

**Maliyet:** Bir yer eklemek Google'da 2 işlem sayılır: puan/adres (ayda 1.000 ücretsiz) ve
fotoğraf (ayda 1.000 ücretsiz). Arama önerileri, bir yer seçildiğinde ücretsiz; yazıp vazgeçilen
aramalar da ayda 10.000'e kadar ücretsiz. Fotoğraf ekleme anında küçültülüp listeye kaydedildiği
için arkadaşlar uygulamayı her açtığında tekrar sayılmaz. Yani ayda yüzlerce yer eklemedikçe 0 ₺.

### 3. GitHub Pages: internete koy

1. GitHub'da **New repository** → adı `dumen` → **Public** → Create.
2. **Add file › Upload files** → bu klasördeki her şeyi (`icons/` ve `vendor/` klasörleriyle birlikte) sürükle → **Commit changes**.
3. Repo **Settings › Pages** → *Source: Deploy from a branch* → `main` / `(root)` → **Save**.
4. 1–2 dakika sonra adresin hazır: `https://KULLANICIADIN.github.io/dumen/`

### 4. iPhone'da açmak (herkes kendi telefonunda)

1. Linki **Safari**'de aç (WhatsApp'tan geldiyse uzun bas › Safari'de Aç).
2. Alttaki **Paylaş** düğmesi (yukarı oklu kare) → aşağı kaydır → **Ana Ekrana Ekle**.
3. Ad "Dümen" olarak gelir → sağ üstten **Ekle**.
4. Ana ekrandaki kırmızı dümen ikonundan aç → adını yaz → **Konumu aç**'a bas, izin ver.

Artık Safari çubuğu olmadan, tam ekran uygulama gibi açılır. Arkadaşlarını davet etmek için
uygulamada sağ üstteki yuvarlak profil düğmesi › **Arkadaşlarını davet et**.

> Safari'de yazdığın isim ana ekran uygulamasına taşınmaz (iOS ikisini ayrı tutar);
> o yüzden isim ilk açılışta uygulamanın içinde sorulur.

---

## Bilgisayarda denemek

```bash
cd dumen
python3 -m http.server 8000
# tarayıcıda http://localhost:8000
```

## Sık karşılaşılanlar

- **"Google Maps anahtarı reddedildi"**: Websites kısıtlamasındaki adres yanlış (sonundaki `/*` dahil), API'ler açılmamış ya da faturalandırma bağlı değil. Değişiklikler 5 dakikaya kadar gecikebilir.
- **Fotoğraf yerine baş harf görünüyor**: O yerin Google fotoğrafı yoktur ya da o an çekilemedi. Yere dokun › **Google fotoğrafını ekle**. Hiçbir yerde fotoğraf çıkmıyorsa bana yaz.
- **"Ortak listeye bağlanılamadı"**: Anonymous giriş açık değil ya da `config.js`'teki Firebase değerleri eksik.
- **"Kaydedilemedi: Firebase kuralları izin vermiyor"**: Güncel `firestore.rules` yapıştırılıp Publish edilmemiş.
- **Git'e basınca uygulama yerine tarayıcı açılıyor**: Yere dokun › **Google Haritalar uygulamasında aç**.
- **Yeni sürüm yükledim ama telefonda eski görünüyor**: Uygulamayı uygulama değiştiriciden kaydırıp kapat, tekrar aç.

## Güvenlik ve kurallar

- `config.js` herkese açık bir dosya; anahtarların sayfada görünmesi normal. Koruma Google
  tarafındaki **web sitesi kısıtlaması** ve Firebase **kuralları** ile sağlanır. Liste, linki
  bilen herkese açıktır; arkadaş grubu için yeterli.
- Google'ın kuralları, puan ve fotoğraf gibi yer bilgilerinin uzun süre saklanmasını sınırlıyor.
  Dümen maliyeti sıfırda tutmak için bunları ekleme anında bir kez alıp listeye kaydediyor; bu,
  küçük bir arkadaş grubunun kendi kullanımı için pratik bir tercih. Uygulamayı herkese açık bir
  ürüne çevirirsen bu kısmın değişmesi gerekir. Fotoğrafı çekenin adı ayrıntı sayfasında gösterilir.
