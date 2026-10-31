# AGENTS.md — Türk Dünyası Beceri Ağı için yapay zekâ talimatları

Bu dosya, projede çalışan her yapay zekâ asistanı (Gemini, Claude, Copilot vb.) içindir. Yeni metin, buton veya bölüm eklerken aşağıdaki kurallara uy.

## 1. Çeviri sistemi

- Site 7 dilde çalışır: `tr` (kaynak dil), `az`, `kk`, `ky`, `uz`, `tk`, `en`.
- Tüm arayüz metinleri **tek sözlükte** durur: `js/i18n/translations.js`. Kodun içine ayrı sözlük ekleme. JS ile oluşturulan metinler (oyun, mektup, alert/confirm, toast, aria-label, placeholder, title) de sözlükten `t()` ile alınır, Türkçe olarak koda gömülmez.
- Çalışma anında **Google Translate veya başka bir çevrim içi çeviri kullanılmaz**. Sözlükte olmayan metin Türkçe görünür.
- Yeni bir görünür metin eklediğinde **aynı değişiklikte 7 dilin hepsini** sözlüğe ekle. Eksik dil bırakma.
- Çeviriyi kelime kelime değil, **metnin durduğu yere göre** yap: buton kısa ve emir kipinde, açıklama doğal cümle olsun. Yeni anlam ekleme, hiçbir şeyi çıkarma.

## 2. Çevrilmeyecekler

Bunları `data-no-translate` ile işaretle ve sözlüğe koyma:

- Kişi adları (Müslüme, Leyla Məmmədova, Döwlet Mergenow…). Adlar kendi yazımıyla kalır, Kiril/Latin'e çevrilmez.
- E-posta, URL, kullanıcı kimliği (TDA-TR-3616), saat, sayaç, sayı.
- Yer ve kültür adları: Anıtkabir, Registan, İçerişehir, Düşbere, Kımız. Gerekirse yanına kısa açıklama, o açıklama çevrilir.
- Kullanıcıların yazdığı her şey: mektuplar, makaleler, yorumlar, profil metinleri.
- Marka adı "Turan".

## 3. Terim sözlüğü (her dilde aynı kalır)

| tr | az | kk | ky | uz | tk | en |
|---|---|---|---|---|---|---|
| beceri | bacarıq | дағды | көндүм | ko‘nikma | başarnyk | skill |
| Beceri Puanı | Bacarıq Xalı | Дағды ұпайы | Көндүм упайы | Ko‘nikma bali | Başarnyk baly | Skill Point |
| mektup | məktub | хат | кат | maktub | hat | letter |

- Kazakça için "қабілет" kullanma, her zaman "дағды".
- Türkmence ve Özbekçe yalnız Latin, Kazakça ve Kırgızca yalnız Kiril alfabesiyle yazılır. Özbekçede kesme işareti `‘` (U+2018) kullanılır, `'` değil.
- "Beceri Puanı" için "puan", "skor", "BP" gibi farklı adlar kullanma.
- **Puan terimlerinin satırları taslaktır:** kesinleştirmeden önce her dili bilen biri kontrol etmeli.

## 4. Ton ve hassas konular

- Kullanıcıya "sen" diye hitap et, tüm dillerde aynı samimiyetle.
- 7 ülke için "7 Türk ülkesi ve topluluğu" de; "7 bağımsız devlet" deme (KKTC'yi yalnız Türkiye tanır).
- Bayrak ve tarih metinlerinde birinci çoğul şahıs ("şehitlerimiz") kullanma; "geleneksel yoruma göre" gibi tarafsız ifade kullan.
- Prototipte çalışmayan özellikleri gerçekmiş gibi anlatma: bot rakip "demo rakip", sabit cevaplı asistan "demo asistan" olarak belirtilir.

## 5. Arayüz

- Yeni menü öğesi veya buton eklerken en uzun dilde (genelde `kk` veya `uz`) 360, 1024 ve 1280 px genişlikte kontrol et. Üst menüde 9 sekmenin hepsi görünmeli: gizli kaydırma çubuğuyla kayan menü kabul edilmez.
- Butonlarda ve etiketlerde sabit genişlik ve `white-space: nowrap` kullanma. Metin başka dilde %30-50 uzayabilir.
- Metin rengi arka planla en az 4.5:1 kontrast vermeli (büyük yazıda 3:1). Koyu zemin üstüne koyu yazı, beyaz zemin üstüne açık gri yazı yasak.
- `data-i18n` özniteliğini içinde ikon veya rozet olan öğeye koyma, yalnız metni saran `<span>`'a koy. Yoksa çeviri ikonu siler.

## 6. Bitirmeden önce kontrol

- [ ] Yeni görünür metinlerin hepsi 7 dilde sözlükte var.
- [ ] Ad, sayı ve kullanıcı metinleri `data-no-translate` ile işaretli.
- [ ] Sayfa 360, 1024 ve 1280 px genişlikte `kk` ve `uz` dillerinde bozulmuyor, menüde 9 sekme de görünüyor.
- [ ] Tarayıcının Network sekmesinde `translate.googleapis.com` isteği yok.
- [ ] tr → kk → tr geçişinden sonra ekranda Kazakça metin kalmıyor.
- [ ] Konsolda kırmızı hata yok.
