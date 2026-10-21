# Türk Dünyası Beceri Ağı (TDA)

Türk Dünyası'ndaki öğrencileri; öğretebildikleri, öğrenmek istedikleri ve ayırabilecekleri zaman üzerinden bir araya getiren çok dilli karşılıklı beceri paylaşım platformu.

## 🌟 Özellikler
- **7 Türk Devleti Desteği:** Türkiye, Azerbaycan, Kazakistan, Özbekistan, Kırgızistan, Türkmenistan, Kuzey Kıbrıs Türk Cumhuriyeti.
- **Dinamik Çoklu Dil (i18n):** Türkçe, Azerbaycan Türkçesi, Kazakça, Kırgızca, Özbekçe, Türkmence ve İngilizce tam yerelleştirme.
- **Beceri Eşleştirme Sistemi:** Zaman temelli puan mekanizması (1 saat = 1 Beceri Puanı).
- **Akıllı Asistan Turan:** Soru-cevap ve yapay zekâ metin dedektörü.
- **Topluluk Odaları & Doğrulanmış Profiller:** Akran öğrenimi ve bilgi alışverişi.

## 🚀 Canlı Önizleme (GitHub Pages)
Bu proje GitHub Pages üzerinde statik web sitesi olarak barındırılmaya tam uyumludur.

## 📁 Proje Yapısı
```
├── index.html                  # Ana giriş sayfası (Root Entry Point)
├── .nojekyll                   # GitHub Pages doğrudan sunum ayarı
├── .gitignore                  # Git dışlama kuralları
├── css/                        # Modüler CSS Mimarisi
│   ├── main.css
│   ├── components.css
│   ├── tabs.css
│   ├── features.css
│   ├── flags-ticker.css
│   ├── turan.css
│   └── messaging.css
├── js/                         # JavaScript Modülleri & i18n
│   ├── app.js                  # Uygulama başlatıcı
│   ├── config.js               # Veri modelleri ve yapılandırma
│   ├── i18n/                   # Dil motoru ve çeviri tabloları
│   └── modules/                # Fonksiyonel modüller (auth, matching, turan vb.)
└── curated_i18n.json           # Çeviri ve sözlük veri kaynağı
```

## 🛠️ Yerel Çalıştırma
Statik bir web projesi olduğu için herhangi bir HTTP sunucusuyla çalıştırılabilir:
```powershell
# PowerShell ile:
powershell -ExecutionPolicy Bypass -File ./server.ps1
```
Veya doğrudan tarayıcıda `index.html` dosyasını açabilirsiniz.
