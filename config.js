// Dümen ayarları. Nasıl doldurulacağı README.md'de.
window.DUMEN_CONFIG = {
  // Google Cloud > Maps JavaScript API + Places API (New) açık bir anahtar.
  // Boş bırakırsan arama çalışmaz.
  googleMapsApiKey: "AIzaSyAV7aM-urqM623yYWc4EJmR03KmDE1yz50",

  // Firebase proje ayarı (Project settings > Your apps > Web app > Config).
  // null bırakırsan uygulama "deneme modunda" çalışır: liste sadece o telefonda durur.
  firebase: null,
  // Örnek:
  // firebase: {
  //   apiKey: "AIza...",
  //   authDomain: "dumen-xxxx.firebaseapp.com",
  //   projectId: "dumen-xxxx",
  //   appId: "1:123:web:abc"
  // },

  // Ortak listenin adı. Aynı kodu kullanan herkes aynı listeyi görür.
  // Tahmin edilmesi zor bir şey yaz (ör. "ankara-ekip-7f3k").
  groupId: "ankara-ekip",

  // Arama bu kutunun içindeki yerlerle sınırlı (Ankara ili ve çevresi).
  searchBounds: { south: 38.65, west: 30.80, north: 40.75, east: 33.95 }
};
