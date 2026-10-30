/**
 * =================================================================================================
 * TÜRK DÜNYASI BECERİ AĞI - ÇOK OYUNCULU ONLİNE KELİME OYUNU (WORD GAME & REALTIME MATCHMAKING)
 * =================================================================================================
 * Özellikler:
 * 1. Mini Görevler & Türk Lehçeleri (Kazakça, Kırgızca, Özbekçe, Türkmence, Azerbaycan Türkçesi,
 *    KKTC/Kıbrıs Ağzı) 45 Soruluk 3 Şıklı (A, B, C) Dinamik Kelime Havuzu.
 * 2. İki Temel Oyun Modu:
 *    - A) Rastgele / Otomatik Eşleştirme (Quick Match - Canlı Kuyruk + Çevrim İçi Havuz)
 *    - B) Arkadaş ID / Oda Kodu ile Özel Maç (Play with Friend - Kurucu Başlatmalı Özel Oda)
 * 3. Gerçek Zamanlı (Real-Time) Çok Katmanlı Senkronizasyon Mimarisi:
 *    - BroadcastChannel API (Sekmeler arası 0ms WebSocket eşdeğeri senkronizasyon)
 *    - LocalStorage Realtime Event Bridge (Pencereler arası anlık oda ve durum paylaşımı)
 *    - HTTP/WebSocket Relay (/api/wordgame sunucu senkronizasyonu)
 * 4. Süre Sayacı (10sn / 15sn), Hız Puanı, Seri (Streak) Bonusu, Ses Efektleri ve Sonuç Ekranı.
 * =================================================================================================
 */

window.TDAWordGame = (function() {
  const STORAGE_STATS_KEY = 'tda-wordgame-stats-v1';
  const STORAGE_ROOMS_KEY = 'tda-wordgame-rooms-v1';
  const STORAGE_PACKET_KEY = 'tda-wordgame-rt-packet-v1';
  const SESSION_PLAYER_KEY = 'tda-wordgame-session-player-v1';
  const DAILY_REWARD_KEY = 'tda-wordgame-daily-reward-v1';

  // --- 1. ÜLKE BAYRAKLARI VE ÇEVRİM İÇİ RAKİP / ARKADAŞ HAVUZU ---
  const COUNTRY_FLAGS = {
    'Türkiye': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Turkey.svg',
    'Azerbaycan': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Azerbaijan.svg',
    'Kazakistan': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Kazakhstan.svg',
    'Özbekistan': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Uzbekistan.svg',
    'Kırgızistan': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Kyrgyzstan.svg',
    'Türkmenistan': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Turkmenistan.svg',
    'Kuzey Kıbrıs Türk Cumhuriyeti': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg'
  };

  const ONLINE_PEERS = [
    { playerId: 'TDA-KZ-301', studentId: 'TDA-DEMO-003', name: 'Aruzhan Sarsenova', country: 'Kazakistan', dialect: 'Kazakça', accuracy: 0.78, avgSpeed: 4.8 },
    { playerId: 'TDA-AZ-202', studentId: 'TDA-DEMO-002', name: 'Leyla Məmmədova', country: 'Azerbaycan', dialect: 'Azerbaycan Türkçesi', accuracy: 0.82, avgSpeed: 4.2 },
    { playerId: 'TDA-UZ-404', studentId: 'TDA-DEMO-004', name: 'Dilnoza Karimova', country: 'Özbekistan', dialect: 'Özbekçe', accuracy: 0.75, avgSpeed: 5.1 },
    { playerId: 'TDA-KG-505', studentId: 'TDA-DEMO-005', name: 'Aizada Turgunbaeva', country: 'Kırgızistan', dialect: 'Kırgızca', accuracy: 0.74, avgSpeed: 5.5 },
    { playerId: 'TDA-TM-606', studentId: 'TDA-DEMO-006', name: 'Mähri Orazowa', country: 'Türkmenistan', dialect: 'Türkmence', accuracy: 0.80, avgSpeed: 4.6 },
    { playerId: 'TDA-CY-707', studentId: 'TDA-DEMO-007', name: 'Elif Demir', country: 'Kuzey Kıbrıs Türk Cumhuriyeti', dialect: 'Kıbrıs Türkçesi', accuracy: 0.77, avgSpeed: 4.9 },
    { playerId: 'TDA-KZ-812', studentId: 'TDA-KZ-812', name: 'Arman Sauytbay', country: 'Kazakistan', dialect: 'Kazakça', accuracy: 0.72, avgSpeed: 5.8 },
    { playerId: 'TDA-UZ-915', studentId: 'TDA-UZ-915', name: 'Bekzod Karimov', country: 'Özbekistan', dialect: 'Özbekçe', accuracy: 0.79, avgSpeed: 4.5 }
  ];

  // --- 2. YEDEK (FALLBACK) SORU HAVUZU (SUNUCUSUZ / FILE:// MODU İÇİN TAM 45 SORU) ---
  const FALLBACK_QUESTIONS = [
    { id: "wg-01", dialect: "Kazakça", country: "Kazakistan", word: "arkadaş / dost", question: "Kazakçada 'arkadaş / dost' kelimesinin karşılığı hangisidir?", options: ["Dos (Дос)", "Tamır (Тамыр)", "Bala (Бала)"], correctIndex: 0, hint: "Ortak Türkçe 'dost' kelimesinin Kazak Türkçesindeki ses uyumuna uğramış biçimidir." },
    { id: "wg-02", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "kardeş", question: "Azerbaycan Türkçesinde 'kardeş' kelimesinin karşılığı hangisidir?", options: ["Qonşu", "Qardaş", "Yoldaş"], correctIndex: 1, hint: "Eski Türkçe 'karındaş' (aynı karından olan) kökünden gelir." },
    { id: "wg-03", dialect: "Özbekçe", country: "Özbekistan", word: "teşekkür ederim", question: "Özbekçede 'teşekkür ederim / sağ ol' anlamında en sık kullanılan ifade hangisidir?", options: ["Marhamat", "Rahmat", "Xayr"], correctIndex: 1, hint: "Orta Asya Türk Cumhuriyetlerinin tamamında 'Rahmat / Rakhmet' teşekkür anlamında kullanılır." },
    { id: "wg-04", dialect: "Kırgızca", country: "Kırgızistan", word: "kardeş / ağabey", question: "Kırgızcada 'birader / erkek kardeş / dost' anlamında kullanılan hitap hangisidir?", options: ["Boorum / Bayke", "Çon ata", "Mugalim"], correctIndex: 0, hint: "'Boor' (bağır/ciğer) kökünden gelen 'boorum' candan kardeşi, 'bayke' ise ağabeyi ifade eder." },
    { id: "wg-05", dialect: "Türkmence", country: "Türkmenistan", word: "nasılsın", question: "Türkmencede 'Nasılsın?' sorusunun karşılığı hangisidir?", options: ["Nirede ýaşaýarsyň?", "Ýagdaýlaryňyz nähili?", "Adyňyz näme?"], correctIndex: 1, hint: "'Ýagdaý' durum/hal, 'nähili' ise nasıl demektir." },
    { id: "wg-06", dialect: "Kazakça", country: "Kazakistan", word: "elma", question: "Kazakçada 'elma' kelimesinin karşılığı hangisidir?", options: ["Almurt (Алмұрт)", "Alma (Алма)", "Jüzim (Жүзім)"], correctIndex: 1, hint: "Almatı şehrinin adı da 'elmalı yer' anlamındaki 'Alma-Ata'dan gelir." },
    { id: "wg-07", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "öğrenci", question: "Azerbaycan Türkçesinde 'üniversite öğrencisi / talebe' kelimesinin karşılığı hangisidir?", options: ["Müəllim", "Tələbə", "Şagird"], correctIndex: 1, hint: "Yükseköğretim öğrencileri için 'tələbə', ilk ve ortaöğretim için 'şagird' kullanılır." },
    { id: "wg-08", dialect: "Özbekçe", country: "Özbekistan", word: "kitap", question: "Özbekçede 'kitap' kelimesinin yazılışı ve söylenişi hangisidir?", options: ["Kitob", "Qalam", "Daftar"], correctIndex: 0, hint: "Özbek Türkçesinde kalın 'a' sesleri çoğu kelimede 'o'ya yakın telaffuz edilir (Kitob, Toshkent)." },
    { id: "wg-09", dialect: "Kırgızca", country: "Kırgızistan", word: "öğretmen", question: "Kırgızcada 'öğretmen' kelimesinin karşılığı hangisidir?", options: ["Okuuçu (Окуучу)", "Mugalim (Мугалим)", "Kitep (Китеп)"], correctIndex: 1, hint: "'Okuuçu' öğrenci, 'Mugalim' ise öğretmen demektir." },
    { id: "wg-10", dialect: "Türkmence", country: "Türkmenistan", word: "su", question: "Türkmencede 'su' kelimesinin karşılığı hangisidir?", options: ["Suw", "Od", "Ýel"], correctIndex: 0, hint: "Eski Türkçedeki 'sub/suv' biçimini koruyarak 'suw' şeklinde yazılır." },
    { id: "wg-11", dialect: "KKTC / Kıbrıs Ağzı", country: "Kuzey Kıbrıs Türk Cumhuriyeti", word: "nasılsın", question: "Kıbrıs Türkçesinde samimi olarak 'Nasılsın?' anlamında kullanılan yaygın ifade hangisidir?", options: ["Napan?", "Nereye giden?", "Ne işler?"], correctIndex: 0, hint: "'Ne yaparsın?' ifadesinin Kıbrıs ağzında kısalmış ve kalıplaşmış halidir." },
    { id: "wg-12", dialect: "Kazakça", country: "Kazakistan", word: "okul", question: "Kazakçada 'okul' kelimesinin karşılığı hangisidir?", options: ["Mektep (Мектеп)", "Kitaphana (Кітапхана)", "Dükön (Дүкен)"], correctIndex: 0, hint: "Kazakça, Kırgızca, Özbekçe ve Azerbaycan Türkçesinde okul için 'Mektep / Məktəb' kullanılır." },
    { id: "wg-13", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "konuşmak", question: "Azerbaycan Türkçesinde 'konuşmak' fiilinin karşılığı hangisidir?", options: ["Danışmaq", "Dinləmək", "Soruşmaq"], correctIndex: 0, hint: "Türkiye Türkçesinde 'fikir almak' anlamındaki 'danışmak', Azerbaycan'da 'konuşmak' demektir." },
    { id: "wg-14", dialect: "Özbekçe", country: "Özbekistan", word: "günaydın / hayırlı sabahlar", question: "Özbekçede 'Günaydın / Hayırlı sabahlar' nasıl söylenir?", options: ["Xayrli tong", "Xayrli tun", "Xush kelibsiz"], correctIndex: 0, hint: "Eski Türkçe 'tan' (şafak vakti) kelimesi Özbekçede 'tong' olarak yaşar." },
    { id: "wg-15", dialect: "Kırgızca", country: "Kırgızistan", word: "göl", question: "Kırgızcada 'Issık Göl' adında da geçen 'göl' kelimesinin karşılığı hangisidir?", options: ["Too (Тоо)", "Köl (Көл)", "Talaa (Талаа)"], correctIndex: 1, hint: "'Too' dağ, 'Köl' ise göl demektir (Issık Köl = Sıcak Göl)." },
    { id: "wg-16", dialect: "Türkmence", country: "Türkmenistan", word: "at", question: "Türkmencede milli simge olan 'at' için kullanılan edebi/geleneksel kelime hangisidir?", options: ["Bedew", "Düýe", "Guş"], correctIndex: 0, hint: "Ahal-Teke küheylanları Türkmen edebiyatında 'Behişdi Bedew' (Cennet Atı) olarak anılır." },
    { id: "wg-17", dialect: "Kazakça", country: "Kazakistan", word: "teşekkürler", question: "Kazakçada 'Teşekkür ederim' nasıl söylenir?", options: ["Rahmet (Рақмет)", "Keşiriñiz (Кешіріңіз)", "Sälem (Сәлем)"], correctIndex: 0, hint: "'Keşiriñiz' affedersiniz, 'Sälem' merhaba, 'Rahmet' ise teşekkürler demektir." },
    { id: "wg-18", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "sabah", question: "Azerbaycan Türkçesinde 'sabah' kelimesi hangi anlamda kullanılır?", options: ["Dün", "Yarın", "Akşam"], correctIndex: 1, hint: "Azerbaycan Türkçesinde 'sabah' yarın, 'səhər' ise sabah vakti demektir." },
    { id: "wg-19", dialect: "Özbekçe", country: "Özbekistan", word: "hoş geldiniz", question: "Özbekçede 'Hoş geldiniz' ifadesinin karşılığı hangisidir?", options: ["Xush kelibsiz", "Oq yo‘l", "Salomat bo‘ling"], correctIndex: 0, hint: "'Oq yo‘l' iyi yolculuklar, 'Xush kelibsiz' ise hoş geldiniz demektir." },
    { id: "wg-20", dialect: "Kırgızca", country: "Kırgızistan", word: "geleneksel çadır", question: "Kırgızcada geleneksel keçe Türk çadırına (yurt) ne ad verilir?", options: ["Boz üy (Боз үй)", "Saray (Сарай)", "Korgon (Коргон)"], correctIndex: 0, hint: "Doğal keçe renginden dolayı 'Boz ev' anlamında 'Boz üy' denir." },
    { id: "wg-21", dialect: "Türkmence", country: "Türkmenistan", word: "halı", question: "Türkmencede UNESCO mirası olan 'halı' kelimesinin karşılığı hangisidir?", options: ["Haly", "Keçe", "Ýüpek"], correctIndex: 0, hint: "Türkmen bayrağında da 5 boyun 'haly gölleri' (halı motifleri) yer alır." },
    { id: "wg-22", dialect: "Kazakça", country: "Kazakistan", word: "bilgi / ilim", question: "Kazakçada 'bilim / bilgi / eğitim' anlamındaki kelime hangisidir?", options: ["Bilim (Білім)", "Öner (Өнер)", "Jol (Жол)"], correctIndex: 0, hint: "'Bil-' fiil kökünden türeyen ortak Türkçe kelimedir; 'Öner' ise sanat/hüner demektir." },
    { id: "wg-23", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "güzel / çok iyi", question: "Azerbaycan Türkçesinde 'iyi / güzel / hoş' anlamında çok sık kullanılan kelime hangisidir?", options: ["Yaxşı", "Pis", "Çətin"], correctIndex: 0, hint: "Ortak Türkçe 'yahşi' (iyi, güzel) kelimesi hemen tüm Türk lehçelerinde yaşar." },
    { id: "wg-24", dialect: "Özbekçe", country: "Özbekistan", word: "arkadaş / dost", question: "Özbekçede 'arkadaş / ortak / dost' anlamında kullanılan kelime hangisidir?", options: ["O‘rtoq / Do‘st", "Ustoz", "Qo‘shni"], correctIndex: 0, hint: "'Ustoz' üstat/öğretmen, 'Qo‘shni' komşu, 'O‘rtoq / Do‘st' ise arkadaş demektir." },
    { id: "wg-25", dialect: "Kırgızca", country: "Kırgızistan", word: "dağ", question: "Kırgızcada 'Ala-Too' (Aladağlar) adında da geçen 'dağ' kelimesinin karşılığı hangisidir?", options: ["Too (Тоо)", "Suu (Суу)", "Jer (Жер)"], correctIndex: 0, hint: "Eski Türkçe 'tağ' kelimesi Kırgız Türkçesinde uzun ünlülü 'too' biçimine dönüşmüştür." },
    { id: "wg-26", dialect: "Türkmence", country: "Türkmenistan", word: "öğrenci", question: "Türkmencede 'üniversite öğrencisi' anlamına gelen kelime hangisidir?", options: ["Talyp", "Mugallym", "Lukman"], correctIndex: 0, hint: "'Talyp' öğrenci, 'Mugallym' öğretmen, 'Lukman' ise doktor/hekim demektir." },
    { id: "wg-27", dialect: "KKTC / Kıbrıs Ağzı", country: "Kuzey Kıbrıs Türk Cumhuriyeti", word: "peynir", question: "Kuzey Kıbrıs mutfağının dünyaca ünlü geleneksel ızgara peyniri hangisidir?", options: ["Hellim", "Tulum", "Kaşar"], correctIndex: 0, hint: "Kıbrıs kültürünün en önemli gastronomi sembollerinden biridir." },
    { id: "wg-28", dialect: "Kazakça", country: "Kazakistan", word: "enstrüman", question: "Kazak bozkır kültürünün iki telli geleneksel müzik aleti hangisidir?", options: ["Dombra (Домбыра)", "Kemençe", "Kanun"], correctIndex: 0, hint: "Kazakistan'da her yıl Temmuz ayının ilk pazar günü 'Ulusal Dombra Günü' olarak kutlanır." },
    { id: "wg-29", dialect: "Özbekçe", country: "Özbekistan", word: "şehir / başkent", question: "Özbekçede 'Taşkent' (Toshkent) adındaki 'kent' kelimesinin anlamı nedir?", options: ["Şehir / Kale", "Nehir / Irmak", "Orman"], correctIndex: 0, hint: "Kaşgarlı Mahmud'un Divânu Lügati't-Türk eserinde de belirtildiği üzere 'Taş Şehir' demektir." },
    { id: "wg-30", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "beceri / yetenek", question: "Azerbaycan Türkçesinde 'beceri / yetenek' kelimesinin karşılığı hangisidir?", options: ["Bacarıq", "Səfər", "Xəbər"], correctIndex: 0, hint: "Platformumuzun Azerbaycan Türkçesindeki adı da 'Türk Dünyası Bacarıq Şəbəkəsi'dir." },
    { id: "wg-31", dialect: "Kazakça", country: "Kazakistan", word: "iyi yolculuklar", question: "Kazakçada yola çıkan birine 'İyi yolculuklar / Yolun açık olsun' demek için hangi ifade kullanılır?", options: ["Aq jol (Ақ жол)", "Qayyrly tün (Қайырлы түн)", "As bolsyn (Ас болсын)"], correctIndex: 0, hint: "Türk kültüründe 'ak' uğur ve iyiliği simgeler; 'Aq jol' (Ak yol) açık ve uğurlu yolculuk dileğidir." },
    { id: "wg-32", dialect: "Kırgızca", country: "Kırgızistan", word: "ekmek", question: "Kırgızcada ve Orta Asya Türk lehçelerinde 'ekmek' kelimesinin yaygın karşılığı hangisidir?", options: ["Nan (Нан)", "Et (Эт)", "May (Май)"], correctIndex: 0, hint: "Tandırlarda pişirilen geleneksel yuvarlak ekmeğe Kazak, Kırgız, Özbek ve Türkmen Türkçelerinde 'nan / non' denir." },
    { id: "wg-33", dialect: "Özbekçe", country: "Özbekistan", word: "aile", question: "Özbekçede 'aile' kelimesinin yazılışı ve söylenişi hangisidir?", options: ["Oila", "Mahalla", "Bozor"], correctIndex: 0, hint: "Özbek toplumunda 'Oila' (aile) ve 'Mahalla' (mahalle dayanışması) kültürel yapının temel taşlarıdır." },
    { id: "wg-34", dialect: "Türkmence", country: "Türkmenistan", word: "kardeş", question: "Türkmencede 'kardeş' kelimesinin karşılığı hangisidir?", options: ["Dogan", "Goňşy", "Myhman"], correctIndex: 0, hint: "'Aynı anneden doğan' anlamındaki Eski Türkçe kök, Türkmencede 'dogan' (kardeş) olarak yaşar." },
    { id: "wg-35", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "nasılsın", question: "Azerbaycan Türkçesinde 'Nasılsın?' sorusunun karşılığı hangisidir?", options: ["Necəsən?", "Haradasan?", "Kimsən?"], correctIndex: 0, hint: "Anadolu ağızlarında da yaşayan 'nice / nicesin' kelimesi Azerbaycan Türkçesinde 'Necəsən?' biçimindedir." },
    { id: "wg-36", dialect: "Kazakça", country: "Kazakistan", word: "kalp / yürek", question: "Kazakçada 'yürek / kalp' kelimesinin karşılığı hangisidir?", options: ["Jürek (Жүрек)", "Bilek (Білек)", "Tilek (Тілек)"], correctIndex: 0, hint: "Ortak Türkçe kelime başındaki 'y-' sesleri Kazakçada düzenli olarak 'j-' sesine dönüşür: Yürek -> Jürek, Yol -> Jol." },
    { id: "wg-37", dialect: "Kırgızca", country: "Kırgızistan", word: "merhaba / selam", question: "Kırgızcada günlük dilde 'Merhaba / Sağlıklı mısınız?' anlamında kullanılan selamlaşma hangisidir?", options: ["Salamatsızbı (Саламатсызбы)", "Körüşkönçö (Көрүшкөнчө)", "Jakşı kalıñız (Жакшы калыңыз)"], correctIndex: 0, hint: "'Körüşkönçö' görüşmek üzere, 'Salamatsızbı' ise merhaba / esen misiniz demektir." },
    { id: "wg-38", dialect: "Özbekçe", country: "Özbekistan", word: "öğretmen / üstat", question: "Özbekçede 'öğretmen / hoca' için büyük saygı ifade eden kelime hangisidir?", options: ["Ustoz", "Talaba", "Shifokor"], correctIndex: 0, hint: "Özbekistan'da 1 Ekim günü 'Ustoz va murabbiylar kuni' (Öğretmenler ve Rehberler Günü) olarak kutlanır." },
    { id: "wg-39", dialect: "Türkmence", country: "Türkmenistan", word: "misafir", question: "Türkmencede 'misafir / konuk' kelimesinin karşılığı hangisidir?", options: ["Myhman", "Ýolagçy", "Söwdagär"], correctIndex: 0, hint: "Türkmen atasözünde 'Myhman ataňdan uly' (Misafir babandan büyüktür/azizdir) denilerek konukseverlik vurgulanır." },
    { id: "wg-40", dialect: "KKTC / Kıbrıs Ağzı", country: "Kuzey Kıbrıs Türk Cumhuriyeti", word: "sevimli / güzel", question: "Kıbrıs Türkçesinde çocuklara veya sevilen kişilere söylenen 'sevimli, tatlı, güzel' anlamındaki hitap hangisidir?", options: ["Gancelli", "Bulli", "Gonnara"], correctIndex: 1, hint: "Kıbrıs ağzında 'Gancelli' bahçe kapısı, 'Bulli' ise civciv/sevimli/tatlı anlamında çok yaygın bir sevgi sözcüğüdür." },
    { id: "wg-41", dialect: "Azerbaycan Türkçesi", country: "Azerbaycan", word: "uçak", question: "Azerbaycan Türkçesinde 'uçak' kelimesinin karşılığı hangisidir?", options: ["Təyyarə", "Qatar", "Gəmi"], correctIndex: 0, hint: "'Qatar' tren, 'Gəmi' gemi, 'Təyyarə' ise uçak demektir." },
    { id: "wg-42", dialect: "Kazakça", country: "Kazakistan", word: "bayram / şölen", question: "Kazakçada ve genel Türk dünyasında 'düğün, şölen, büyük kutlama' anlamına gelen kadim kelime hangisidir?", options: ["Toy (Той)", "Kün (Күн)", "Ay (Ай)"], correctIndex: 0, hint: "Dede Korkut hikayelerinden bugünkü Kazak, Kırgız ve Özbek Türkçelerine kadar 'Toy' şölen ve düğün demektir." },
    { id: "wg-43", dialect: "Kırgızca", country: "Kırgızistan", word: "geleneksel şapka", question: "Kırgız erkeklerinin giydiği, UNESCO mirası beyaz keçeden yapılan milli başlık hangisidir?", options: ["Ak Kalpak (Ак калпак)", "Börk (Бөрк)", "Tebetey (Тебетей)"], correctIndex: 0, hint: "Kırgızistan'da her yıl 5 Mart günü 'Ak Kalpak Günü' olarak milli gururla kutlanır." },
    { id: "wg-44", dialect: "Özbekçe", country: "Özbekistan", word: "pilav", question: "Özbek mutfağının UNESCO mirası olan dünyaca ünlü milli pilav yemeğine ne ad verilir?", options: ["Palov (Osh)", "Somsa", "Lag‘mon"], correctIndex: 0, hint: "Özbek kültüründe dostluk sofralarının baş tacı olan pilava 'Palov' veya 'Osh' (Aş) denir." },
    { id: "wg-45", dialect: "Türkmence", country: "Türkmenistan", word: "barış / huzur", question: "Türkmencede 'barış, huzur, esenlik' anlamına gelen kelime hangisidir?", options: ["Parahatçylyk", "Gahrymançylyk", "Zähmet"], correctIndex: 0, hint: "'Parahat' (rahat/huzurlu) kökünden türeyen 'Parahatçylyk', Türkmenistan'ın tarafsızlık ve barış ilkesini simgeler." }
  ];

  // --- 3. MERKEZİ OYUN DURUMU (STATE) ---
  const state = {
    questions: [...FALLBACK_QUESTIONS],
    view: 'MENU', // 'MENU' | 'QUICK_SEARCH' | 'FRIEND_LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'RESULT'
    soundEnabled: true,
    wordBankOpen: false,
    wordBankFilter: 'ALL',

    // Oyun Ayarları
    settings: {
      roundCount: 5, // 5 veya 10 soru
      timePerQuestion: 15, // 10 veya 15 saniye
      dialectFilter: 'ALL' // 'ALL' veya belirli lehçe
    },

    // Aktif Oyuncu Kimliği (Sekmeye özel benzersiz ID)
    me: {
      playerId: '',
      name: 'Türk Dünyası Öğrencisi',
      country: 'Türkiye'
    },

    // İstatistikler
    stats: {
      played: 0,
      won: 0,
      bestStreak: 0,
      earnedSkillPoints: 0
    },

    // Aktif Oda / Maç Verisi
    room: null, // { roomId, mode: 'QUICK'|'FRIEND', isHost, status, seed, roundCount, timePerQuestion, dialectFilter, host, guest, questionIds }
    match: {
      questions: [],
      currentIndex: 0,
      timeLeft: 15,
      questionStartTime: 0,
      timerId: null,
      botTimeoutId: null,
      nextQuestionTimeoutId: null,
      myScore: 0,
      myStreak: 0,
      myBestStreak: 0,
      myAnswers: [], // { qId, choiceIndex, isCorrect, timeSpent, points }
      oppScore: 0,
      oppStreak: 0,
      oppBestStreak: 0,
      oppAnswers: [],
      isLiveHumanPeer: false
    }
  };

  let broadcastChannel = null;
  let quickSearchTimer = null;
  let serverPollInterval = null;
  let audioCtx = null;

  // --- 4. YARDIMCI FONKSİYONLAR VE DETERMINISTIK KARIŞTIRICI ---
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));
  }

  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function stringToSeed(str) {
    let hash = 2166136261;
    const s = String(str || 'TDA');
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0) || 123456;
  }

  function prepareSynchronizedQuestions(questionIds, seedStr) {
    const rng = seededRandom(stringToSeed(seedStr));
    const selected = questionIds
      .map(id => state.questions.find(q => q.id === id))
      .filter(Boolean);

    const pool = selected.length ? selected : state.questions.slice(0, state.settings.roundCount);

    return pool.map((q, idx) => {
      // Her sorunun 3 şıkkını ortak seed ile deterministik olarak karıştır (iki oyuncuda da birebir aynı A, B, C dizilimi çıkar)
      const indexedOptions = q.options.map((text, i) => ({ text, isCorrect: i === q.correctIndex }));
      for (let i = indexedOptions.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = indexedOptions[i];
        indexedOptions[i] = indexedOptions[j];
        indexedOptions[j] = temp;
      }
      const newCorrectIndex = indexedOptions.findIndex(o => o.isCorrect);
      return {
        ...q,
        index: idx,
        options: indexedOptions.map(o => o.text),
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0
      };
    });
  }

  function selectQuestionIdsForRoom(seedStr, count, dialectFilter) {
    const rng = seededRandom(stringToSeed(seedStr));
    let pool = [...state.questions];
    if (dialectFilter && dialectFilter !== 'ALL') {
      const filtered = pool.filter(q => q.dialect === dialectFilter);
      if (filtered.length >= 3) pool = filtered;
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, count).map(q => q.id);
  }

  // --- 5. WEB AUDIO API SES EFEKTLERİ MOTORU ---
  function playSound(type) {
    if (!state.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      if (type === 'correct') {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.12, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.26);
        });
      } else if (type === 'wrong') {
        [240, 195].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.11);
          gain.gain.setValueAtTime(0.08, now + idx * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.22);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.11);
          osc.stop(now + idx * 0.11 + 0.24);
        });
      } else if (type === 'tick') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'win') {
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.13, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.36);
        });
      }
    } catch (e) {}
  }

  // --- 6. OYUNCU KİMLİĞİ & İSTATİSTİK YÖNETİMİ ---
  function initPlayerIdentity() {
    const profile = window.TDAAuth?.getProfile();
    let savedSession = null;
    try {
      savedSession = JSON.parse(sessionStorage.getItem(SESSION_PLAYER_KEY) || 'null');
    } catch (e) {}

    if (savedSession && savedSession.playerId) {
      state.me = savedSession;
      if (profile) {
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        if (fullName) state.me.name = fullName;
        if (profile.country) state.me.country = profile.country;
      }
      return;
    }

    const prefixMap = {
      'Türkiye': 'TR',
      'Azerbaycan': 'AZ',
      'Kazakistan': 'KZ',
      'Özbekistan': 'UZ',
      'Kırgızistan': 'KG',
      'Türkmenistan': 'TM',
      'Kuzey Kıbrıs Türk Cumhuriyeti': 'CY'
    };

    const country = profile?.country || 'Türkiye';
    const prefix = prefixMap[country] || 'TD';
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const playerId = `TDA-${prefix}-${randomCode}`;
    const fullName = profile ? (`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Aylin Yılmaz') : `Öğrenci #${randomCode}`;

    state.me = {
      playerId,
      name: fullName,
      country
    };

    try {
      sessionStorage.setItem(SESSION_PLAYER_KEY, JSON.stringify(state.me));
    } catch (e) {}
  }

  function loadStats() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_STATS_KEY) || 'null');
      if (raw) {
        state.stats = {
          played: Number(raw.played || 0),
          won: Number(raw.won || 0),
          bestStreak: Number(raw.bestStreak || 0),
          earnedSkillPoints: Number(raw.earnedSkillPoints || 0)
        };
      }
    } catch (e) {}
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(state.stats));
    } catch (e) {}
  }

  function awardMiniTaskSkillPoints() {
    const today = new Date().toISOString().slice(0, 10);
    let lastRewardDate = '';
    try {
      lastRewardDate = localStorage.getItem(DAILY_REWARD_KEY) || '';
    } catch (e) {}

    if (lastRewardDate === today) {
      return { awarded: false, reason: 'daily_limit' };
    }

    try {
      localStorage.setItem(DAILY_REWARD_KEY, today);
      state.stats.earnedSkillPoints = Number((state.stats.earnedSkillPoints + 0.2).toFixed(1));
      saveStats();

      const profile = JSON.parse(localStorage.getItem('tda-demo-user') || 'null');
      if (profile) {
        profile.points = Number((Number(profile.points || 0) + 0.2).toFixed(1));
        localStorage.setItem('tda-demo-user', JSON.stringify(profile));
        window.dispatchEvent(new CustomEvent('tda:profileUpdated', { detail: profile }));
      }
      return { awarded: true, amount: 0.2 };
    } catch (e) {
      return { awarded: false };
    }
  }

  // --- 7. GERÇEK ZAMANLI (REALTIME) WEB-SOCKET / BROADCAST / SERVER HABERLEŞME KATMANI ---
  function initRealtimeTransport() {
    if ('BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('tda_word_game_ws_v1');
        broadcastChannel.onmessage = event => {
          if (event && event.data) handleRealtimePacket(event.data);
        };
      } catch (e) {}
    }

    window.addEventListener('storage', event => {
      if (event.key === STORAGE_PACKET_KEY && event.newValue) {
        try {
          const packet = JSON.parse(event.newValue);
          handleRealtimePacket(packet);
        } catch (e) {}
      }
    });
  }

  function sendRealtimePacket(type, payload = {}) {
    const packet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      senderId: state.me.playerId,
      timestamp: Date.now(),
      payload
    };

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(packet);
      } catch (e) {}
    }

    try {
      localStorage.setItem(STORAGE_PACKET_KEY, JSON.stringify(packet));
    } catch (e) {}
  }

  function readLocalRooms() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_ROOMS_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeLocalRoom(room) {
    if (!room || !room.roomId) return;
    try {
      const rooms = readLocalRooms();
      rooms[room.roomId.toUpperCase()] = { ...room, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(rooms));
    } catch (e) {}

    // Sunucu açıksa (/api/wordgame) odayı sunucuya da senkronize et
    fetch('/api/wordgame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_room', roomId: room.roomId, room })
    }).catch(() => {});
  }

  async function findRoomByCodeOrHostId(query) {
    const code = String(query || '').trim().toUpperCase();
    if (!code) return null;

    const rooms = readLocalRooms();
    if (rooms[code]) return rooms[code];

    const byHost = Object.values(rooms).find(
      r => r && r.host && String(r.host.playerId).toUpperCase() === code && r.status === 'waiting'
    );
    if (byHost) return byHost;

    // Sunucudan kontrol et
    try {
      const res1 = await fetch('/api/wordgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_room', roomId: code })
      });
      if (res1.ok) {
        const data1 = await res1.json();
        if (data1 && data1.status === 'ok' && data1.room) return data1.room;
      }

      const res2 = await fetch('/api/wordgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'find_by_host', hostId: code })
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.status === 'ok' && data2.room) return data2.room;
      }
    } catch (e) {}

    return null;
  }

  function handleRealtimePacket(packet) {
    if (!packet || packet.senderId === state.me.playerId) return;
    const { type, payload } = packet;

    // 1) Quick Match Arayan Başka Bir Gerçek Oyuncu Varsa Eşleş!
    if (type === 'QUICK_MATCH_SEEK' && state.view === 'QUICK_SEARCH') {
      if (quickSearchTimer) {
        clearTimeout(quickSearchTimer);
        quickSearchTimer = null;
      }
      const roomId = `QM-${Math.floor(100000 + Math.random() * 900000)}`;
      const seed = `${roomId}-${Date.now()}`;
      const questionIds = selectQuestionIdsForRoom(seed, state.settings.roundCount, state.settings.dialectFilter);
      const room = {
        roomId,
        mode: 'QUICK',
        status: 'starting',
        seed,
        roundCount: state.settings.roundCount,
        timePerQuestion: state.settings.timePerQuestion,
        dialectFilter: state.settings.dialectFilter,
        questionIds,
        host: { ...state.me },
        guest: { ...payload.seeker }
      };
      state.room = { ...room, isHost: true };
      state.match.isLiveHumanPeer = true;
      writeLocalRoom(room);
      sendRealtimePacket('QUICK_MATCH_ACCEPT', { targetId: payload.seeker.playerId, room });
      beginMatchCountdown(room);
      return;
    }

    // 2) Quick Match Kabul Edildi
    if (type === 'QUICK_MATCH_ACCEPT' && payload.targetId === state.me.playerId && state.view === 'QUICK_SEARCH') {
      if (quickSearchTimer) {
        clearTimeout(quickSearchTimer);
        quickSearchTimer = null;
      }
      state.room = { ...payload.room, isHost: false };
      state.match.isLiveHumanPeer = true;
      beginMatchCountdown(payload.room);
      return;
    }

    // 3) Özel Odaya Misafir Oyuncu Katıldı
    if (type === 'ROOM_JOINED' && state.room && state.room.roomId === payload.roomId) {
      state.room.guest = payload.guest;
      state.room.isLiveHumanGuest = true;
      writeLocalRoom(state.room);
      if (state.view === 'FRIEND_LOBBY') {
        render();
      }
      return;
    }

    // 4) Doğrudan Oyuncu ID ile Davet Geldi
    if (type === 'DIRECT_INVITE' && String(payload.targetPlayerId).toUpperCase() === state.me.playerId.toUpperCase()) {
      showIncomingInviteToast(payload.room);
      return;
    }

    // 5) Kurucu Oyunu Başlattı
    if (type === 'MATCH_START' && state.room && state.room.roomId === payload.room.roomId) {
      state.room = { ...payload.room, isHost: state.room.isHost };
      state.match.isLiveHumanPeer = true;
      beginMatchCountdown(payload.room);
      return;
    }

    // 6) Rakip Oyuncu Soruyu Yanıtladı
    if (type === 'PLAYER_ANSWER' && state.room && state.room.roomId === payload.roomId && state.view === 'PLAYING') {
      applyOpponentAnswer(payload);
      return;
    }

    // 7) Rövanş İstendi
    if (type === 'MATCH_REMATCH' && state.room && state.room.roomId === payload.room.roomId) {
      state.room = { ...payload.room, isHost: state.room.isHost };
      state.match.isLiveHumanPeer = true;
      beginMatchCountdown(payload.room);
    }
  }

  function showIncomingInviteToast(room) {
    const existing = document.getElementById('wgInviteToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'wgInviteToast';
    toast.className = 'wg-invite-toast';
    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div>
          <div style="font-size:11px;font-weight:800;color:#f5cf79;text-transform:uppercase;letter-spacing:0.6px;">
            🎮 Özel Kelime Maçı Daveti
          </div>
          <div style="font-size:15px;font-weight:850;margin-top:4px;">
            ${escapeHtml(room.host.name)} (${escapeHtml(room.host.country)})
          </div>
          <div style="font-size:12px;color:#cbd5e1;margin-top:2px;">
            Oda Kodu: <strong style="color:#f5cf79;">${escapeHtml(room.roomId)}</strong> • ${room.roundCount} Soru
          </div>
        </div>
        <button type="button" id="wgCloseInviteToast" style="background:transparent;border:0;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="button" id="wgAcceptInviteBtn" class="wg-btn-primary" style="padding:9px 14px;font-size:13px;">
          ✓ Odaya Katıl
        </button>
      </div>
    `;
    document.body.appendChild(toast);

    document.getElementById('wgCloseInviteToast')?.addEventListener('click', () => toast.remove());
    document.getElementById('wgAcceptInviteBtn')?.addEventListener('click', () => {
      toast.remove();
      if (window.TDATabs) window.TDATabs.setTab('wordgame');
      joinRoomObject(room);
    });
  }

  // --- 8. OYUN AKIŞI: QUICK MATCH & PLAY WITH FRIEND ---
  function startQuickMatchSearch() {
    clearMatchTimers();
    state.view = 'QUICK_SEARCH';
    render();

    // Diğer sekmelere/oyunculara Quick Match aradığımızı bildir
    sendRealtimePacket('QUICK_MATCH_SEEK', { seeker: { ...state.me } });

    // 2.4 saniye gerçek oyuncu ara, yoksa çevrim içi Türk Dünyası öğrenci havuzundan eşleştir
    quickSearchTimer = setTimeout(() => {
      if (state.view !== 'QUICK_SEARCH') return;
      const peer = ONLINE_PEERS[Math.floor(Math.random() * ONLINE_PEERS.length)];
      const roomId = `QM-${Math.floor(100000 + Math.random() * 900000)}`;
      const seed = `${roomId}-${Date.now()}`;
      const questionIds = selectQuestionIdsForRoom(seed, state.settings.roundCount, state.settings.dialectFilter);

      const room = {
        roomId,
        mode: 'QUICK',
        status: 'starting',
        seed,
        roundCount: state.settings.roundCount,
        timePerQuestion: state.settings.timePerQuestion,
        dialectFilter: state.settings.dialectFilter,
        questionIds,
        host: { ...state.me },
        guest: { ...peer }
      };

      state.room = { ...room, isHost: true };
      state.match.isLiveHumanPeer = false;
      beginMatchCountdown(room);
    }, 2300);
  }

  function createPrivateFriendRoom(preselectedFriend = null) {
    clearMatchTimers();
    const roomId = `TDA-${Math.floor(100 + Math.random() * 900)}`;
    const seed = `${roomId}-${Date.now()}`;
    const questionIds = selectQuestionIdsForRoom(seed, state.settings.roundCount, state.settings.dialectFilter);

    const room = {
      roomId,
      mode: 'FRIEND',
      status: 'waiting',
      seed,
      roundCount: state.settings.roundCount,
      timePerQuestion: state.settings.timePerQuestion,
      dialectFilter: state.settings.dialectFilter,
      questionIds,
      host: { ...state.me },
      guest: preselectedFriend ? { ...preselectedFriend } : null,
      isLiveHumanGuest: false
    };

    state.room = { ...room, isHost: true };
    state.view = 'FRIEND_LOBBY';
    writeLocalRoom(room);
    startServerLobbyPolling();
    render();
  }

  function joinRoomObject(room) {
    clearMatchTimers();
    const updatedRoom = {
      ...room,
      guest: { ...state.me },
      isLiveHumanGuest: true
    };
    state.room = { ...updatedRoom, isHost: false };
    state.match.isLiveHumanPeer = true;
    state.view = 'FRIEND_LOBBY';
    writeLocalRoom(updatedRoom);
    sendRealtimePacket('ROOM_JOINED', { roomId: room.roomId, guest: { ...state.me } });
    startServerLobbyPolling();
    render();
  }

  async function handleJoinByCodeOrFriendId(rawInput) {
    const code = String(rawInput || '').trim().toUpperCase();
    if (!code) {
      alert('Lütfen geçerli bir Oda Kodu (örn: TDA-482) veya Arkadaş Oyuncu ID\'si (örn: TDA-AZ-202) giriniz.');
      return;
    }

    if (code === state.me.playerId.toUpperCase()) {
      alert('Kendi Oyuncu ID\'nizi girdiniz. Lütfen arkadaşınızın Oyuncu ID\'sini veya Oda Kodunu giriniz.');
      return;
    }

    // 1. Önce aktif bir gerçek zamanlı oda veya kurucu ID'si var mı kontrol et
    const liveRoom = await findRoomByCodeOrHostId(code);
    if (liveRoom) {
      joinRoomObject(liveRoom);
      return;
    }

    // 2. Çevrim içi platform arkadaşlarından (veya demo kullanıcılardan) biri mi?
    const knownPeer = ONLINE_PEERS.find(
      p => p.playerId.toUpperCase() === code || p.studentId.toUpperCase() === code
    );
    if (knownPeer) {
      createPrivateFriendRoom(knownPeer);
      return;
    }

    // 3. Herhangi bir TDA-... Arkadaş ID'si girildiyse:
    // Hem diğer sekmelere canlı davet gönder hem de o arkadaşı özel odaya davet edilmiş olarak ekle
    const customFriend = {
      playerId: code,
      name: `Arkadaş (${code})`,
      country: 'Kazakistan',
      dialect: 'Kazakça',
      accuracy: 0.76,
      avgSpeed: 4.8
    };
    createPrivateFriendRoom(customFriend);
    sendRealtimePacket('DIRECT_INVITE', { targetPlayerId: code, room: state.room });
  }

  function inviteFriendInsideLobby(rawId) {
    const code = String(rawId || '').trim().toUpperCase();
    if (!code || !state.room) return;

    // Diğer sekmede bu ID ile açık bir oyuncu varsa canlı davet bildirimi gönder
    sendRealtimePacket('DIRECT_INVITE', { targetPlayerId: code, room: state.room });

    const knownPeer = ONLINE_PEERS.find(
      p => p.playerId.toUpperCase() === code || p.studentId.toUpperCase() === code
    ) || {
      playerId: code,
      name: `Davetli Arkadaş (${code})`,
      country: 'Azerbaycan',
      accuracy: 0.76,
      avgSpeed: 4.9
    };

    state.room.guest = { ...knownPeer };
    writeLocalRoom(state.room);
    render();
  }

  function startServerLobbyPolling() {
    if (serverPollInterval) clearInterval(serverPollInterval);
    serverPollInterval = setInterval(async () => {
      if (state.view !== 'FRIEND_LOBBY' || !state.room) {
        clearInterval(serverPollInterval);
        serverPollInterval = null;
        return;
      }
      const latest = await findRoomByCodeOrHostId(state.room.roomId);
      if (!latest) return;

      if (state.room.isHost && !state.room.guest && latest.guest) {
        state.room.guest = latest.guest;
        state.room.isLiveHumanGuest = true;
        render();
      } else if (!state.room.isHost && latest.status === 'playing') {
        state.room = { ...latest, isHost: false };
        state.match.isLiveHumanPeer = true;
        beginMatchCountdown(latest);
      }
    }, 1000);
  }

  function hostStartFriendMatch() {
    if (!state.room || !state.room.isHost) return;
    if (!state.room.guest) {
      alert('Oyunu başlatmak için önce arkadaşınızın odaya katılması veya aşağıdan bir arkadaş ID\'si davet etmeniz gerekmektedir.');
      return;
    }

    state.room.status = 'playing';
    state.room.seed = `${state.room.roomId}-${Date.now()}`;
    state.room.questionIds = selectQuestionIdsForRoom(
      state.room.seed,
      state.room.roundCount,
      state.room.dialectFilter
    );
    state.match.isLiveHumanPeer = Boolean(state.room.isLiveHumanGuest);

    writeLocalRoom(state.room);
    sendRealtimePacket('MATCH_START', { room: state.room });
    beginMatchCountdown(state.room);
  }

  // --- 9. ADİL PUANLAMA, MİLİSANİYELİK SÜRE VE KAZANAN BELİRLEME ALGORİTMASI ---
  const SCORING_CONFIG = {
    CORRECT_BASE_POINTS: 100,
    MAX_SPEED_BONUS: 30,
    STREAK_BONUS_STEP: 10,
    MAX_STREAK_BONUS: 30,
    WRONG_POINT_PENALTY: -35, // Rastgele tıkla-geç önleyici puan cezası
    WRONG_TIME_PENALTY_MS: 3000 // Yanlış yanıta eklenen +3.00 sn (3000 ms) süre cezası
  };

  function calculateFairAnswerScore(isCorrect, choiceIndex, responseTimeMs, maxQuestionMs, newStreak) {
    // Süre dolumu (Boş bırakıldı)
    if (choiceIndex === -1) {
      return {
        pointsEarned: 0,
        speedBonus: 0,
        streakBonus: 0,
        penaltyPoints: 0,
        penaltyTimeMs: 0,
        effectiveTimeMs: maxQuestionMs
      };
    }

    // Yanlış Cevap: Puan düşürülür (-35 puan) ve efektif süreye +3000 ms ceza eklenir
    if (!isCorrect) {
      return {
        pointsEarned: SCORING_CONFIG.WRONG_POINT_PENALTY,
        speedBonus: 0,
        streakBonus: 0,
        penaltyPoints: Math.abs(SCORING_CONFIG.WRONG_POINT_PENALTY),
        penaltyTimeMs: SCORING_CONFIG.WRONG_TIME_PENALTY_MS,
        effectiveTimeMs: responseTimeMs + SCORING_CONFIG.WRONG_TIME_PENALTY_MS
      };
    }

    // Doğru Cevap: 100 Baz Puan + Milisaniyelik Hız Bonusu (0..30) + Seri Bonusu (0..30)
    const clampedMs = Math.max(50, Math.min(maxQuestionMs, responseTimeMs));
    const speedRatio = Math.max(0, (maxQuestionMs - clampedMs) / maxQuestionMs);
    const speedBonus = Math.round(speedRatio * SCORING_CONFIG.MAX_SPEED_BONUS);
    const streakBonus = newStreak > 1
      ? Math.min(SCORING_CONFIG.MAX_STREAK_BONUS, (newStreak - 1) * SCORING_CONFIG.STREAK_BONUS_STEP)
      : 0;

    return {
      pointsEarned: SCORING_CONFIG.CORRECT_BASE_POINTS + speedBonus + streakBonus,
      speedBonus,
      streakBonus,
      penaltyPoints: 0,
      penaltyTimeMs: 0,
      effectiveTimeMs: clampedMs
    };
  }

  function computePlayerMatchMetrics(answers, totalQuestions, maxQuestionSec) {
    const maxQuestionMs = (maxQuestionSec || 15) * 1000;
    const validAnswers = (answers || []).filter(Boolean);
    const answeredCount = validAnswers.length;

    let correctCount = 0;
    let wrongCount = 0;
    let timeoutCount = 0;
    let totalRawTimeMs = 0;
    let totalEffectiveTimeMs = 0;
    let correctOnlyTimeMs = 0;
    let penaltyPointsTotal = 0;
    let penaltyTimeMsTotal = 0;

    validAnswers.forEach(a => {
      const rawMs = Number.isFinite(a.responseTimeMs)
        ? Math.round(a.responseTimeMs)
        : Math.round(Number(a.timeSpentSec || maxQuestionSec) * 1000);

      if (a.choiceIndex === -1) {
        timeoutCount += 1;
        totalRawTimeMs += maxQuestionMs;
        totalEffectiveTimeMs += maxQuestionMs;
      } else if (a.isCorrect) {
        correctCount += 1;
        totalRawTimeMs += rawMs;
        totalEffectiveTimeMs += rawMs;
        correctOnlyTimeMs += rawMs;
      } else {
        wrongCount += 1;
        const penMs = Number.isFinite(a.penaltyTimeMs) ? a.penaltyTimeMs : SCORING_CONFIG.WRONG_TIME_PENALTY_MS;
        totalRawTimeMs += rawMs;
        totalEffectiveTimeMs += (rawMs + penMs);
        penaltyTimeMsTotal += penMs;
        penaltyPointsTotal += Math.abs(SCORING_CONFIG.WRONG_POINT_PENALTY);
      }
    });

    const divisor = Math.max(1, answeredCount);
    const avgRawTimeMs = Math.round(totalRawTimeMs / divisor);
    const avgEffectiveTimeMs = Math.round(totalEffectiveTimeMs / divisor);

    return {
      answeredCount,
      correctCount,
      wrongCount,
      timeoutCount,
      totalRawTimeMs,
      totalEffectiveTimeMs,
      correctOnlyTimeMs,
      avgRawTimeMs,
      avgEffectiveTimeMs,
      totalRawTimeSec: (totalRawTimeMs / 1000).toFixed(2),
      totalEffectiveTimeSec: (totalEffectiveTimeMs / 1000).toFixed(2),
      avgRawTimeSec: (avgRawTimeMs / 1000).toFixed(2),
      avgEffectiveTimeSec: (avgEffectiveTimeMs / 1000).toFixed(2),
      penaltyPointsTotal,
      penaltyTimeSecTotal: (penaltyTimeMsTotal / 1000).toFixed(1)
    };
  }

  /**
   * ADİL KAZANAN BELİRLEME ALGORİTMASI:
   * 1. Öncelikli Kriter: Doğru Cevap Sayısı (En çok doğru yapan her zaman kazanır).
   * 2. İkinci Kriter (Doğru Sayıları Eşitse): Yanlış cezaları dahil Efektif Toplam Yanıt Süresi / Hız
   *    (Soruları daha kısa toplam sürede ve daha az yanlışla yanıtlayan kazanır).
   */
  function evaluateMatchOutcome() {
    const totalQ = state.match.questions.length || state.settings.roundCount || 5;
    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;

    const myMetrics = computePlayerMatchMetrics(state.match.myAnswers, totalQ, maxSec);
    const oppMetrics = computePlayerMatchMetrics(state.match.oppAnswers, totalQ, maxSec);

    let resultState = 'DRAW'; // 'WIN' | 'LOSS' | 'DRAW'
    let decisionCriterion = 'EQUAL';
    let decisionExplanation = '';

    // 1. ÖNCELİKLİ KRİTER: DOĞRU SAYISI
    if (myMetrics.correctCount > oppMetrics.correctCount) {
      resultState = 'WIN';
      decisionCriterion = 'CORRECT_COUNT';
      decisionExplanation = `1. Öncelikli Kriter (Doğru Sayısı Üstünlüğü): Sen ${myMetrics.correctCount} doğru yaptın, rakibin ${oppMetrics.correctCount} doğru yaptı.`;
    } else if (oppMetrics.correctCount > myMetrics.correctCount) {
      resultState = 'LOSS';
      decisionCriterion = 'CORRECT_COUNT';
      decisionExplanation = `1. Öncelikli Kriter (Doğru Sayısı Üstünlüğü): Rakibin ${oppMetrics.correctCount} doğru yaptı, sen ${myMetrics.correctCount} doğru yaptın.`;
    } else {
      // 2. KRİTER (EŞİTLİK BOZUCU): YANLIŞ CEZASI DAHİL TOPLAM YANIT SÜRESİ & ORTALAMA HIZ
      if (myMetrics.wrongCount < oppMetrics.wrongCount) {
        resultState = 'WIN';
        decisionCriterion = 'PENALTY_AND_SPEED';
        decisionExplanation = `Doğru sayıları eşit (${myMetrics.correctCount} - ${oppMetrics.correctCount}). Daha az yanlış cevap (${myMetrics.wrongCount} vs ${oppMetrics.wrongCount}) ve daha iyi efektif süre (${myMetrics.totalEffectiveTimeSec} sn vs ${oppMetrics.totalEffectiveTimeSec} sn) ile kazandın!`;
      } else if (oppMetrics.wrongCount < myMetrics.wrongCount) {
        resultState = 'LOSS';
        decisionCriterion = 'PENALTY_AND_SPEED';
        decisionExplanation = `Doğru sayıları eşit (${myMetrics.correctCount} - ${oppMetrics.correctCount}). Rakibin daha az yanlış cevap (${oppMetrics.wrongCount} vs ${myMetrics.wrongCount}) ve efektif süre avantajıyla kazandı.`;
      } else if (myMetrics.totalEffectiveTimeMs < oppMetrics.totalEffectiveTimeMs) {
        resultState = 'WIN';
        decisionCriterion = 'RESPONSE_SPEED';
        const diffSec = ((oppMetrics.totalEffectiveTimeMs - myMetrics.totalEffectiveTimeMs) / 1000).toFixed(2);
        decisionExplanation = `Doğru sayıları eşit (${myMetrics.correctCount} - ${oppMetrics.correctCount}). 2. Kriter (Yanıt Hızı): Soruları toplam ${myMetrics.totalRawTimeSec} sn (Ort. ${myMetrics.avgRawTimeSec} sn/soru) sürede yanıtlayarak rakibinden ${diffSec} sn daha hızlı oldun!`;
      } else if (oppMetrics.totalEffectiveTimeMs < myMetrics.totalEffectiveTimeMs) {
        resultState = 'LOSS';
        decisionCriterion = 'RESPONSE_SPEED';
        const diffSec = ((myMetrics.totalEffectiveTimeMs - oppMetrics.totalEffectiveTimeMs) / 1000).toFixed(2);
        decisionExplanation = `Doğru sayıları eşit (${myMetrics.correctCount} - ${oppMetrics.correctCount}). 2. Kriter (Yanıt Hızı): Rakibin toplam ${oppMetrics.totalRawTimeSec} sn (Ort. ${oppMetrics.avgRawTimeSec} sn/soru) ile senden ${diffSec} sn daha hızlı yanıtladı.`;
      } else {
        resultState = 'DRAW';
        decisionCriterion = 'EXACT_TIE';
        decisionExplanation = `Doğru sayıları (${myMetrics.correctCount} - ${oppMetrics.correctCount}) ve milisaniyelik yanıt süreleri birebir eşit!`;
      }
    }

    return {
      resultState,
      decisionCriterion,
      decisionExplanation,
      myMetrics,
      oppMetrics
    };
  }

  function createCleanMatchState(syncedQuestions, timePerQuestion, isLiveHumanPeer) {
    return {
      questions: syncedQuestions,
      currentIndex: 0,
      timeLeft: timePerQuestion || 15,
      questionStartTime: 0,
      timerId: null,
      botTimeoutId: null,
      nextQuestionTimeoutId: null,
      plannedBots: {},
      myScore: 0,
      myStreak: 0,
      myBestStreak: 0,
      myAnswers: [],
      oppScore: 0,
      oppStreak: 0,
      oppBestStreak: 0,
      oppAnswers: [],
      isLiveHumanPeer: Boolean(isLiveHumanPeer),
      rewardInfo: null
    };
  }

  function beginMatchCountdown(room) {
    clearMatchTimers();
    state.view = 'COUNTDOWN';
    state.countdownValue = 3;

    const syncedQuestions = prepareSynchronizedQuestions(room.questionIds, room.seed);
    state.match = createCleanMatchState(
      syncedQuestions,
      room.timePerQuestion || state.settings.timePerQuestion || 15,
      state.match?.isLiveHumanPeer
    );

    render();
    playSound('tick');

    state.match.timerId = setInterval(() => {
      state.countdownValue -= 1;
      if (state.countdownValue > 0) {
        playSound('tick');
        render();
      } else {
        clearInterval(state.match.timerId);
        state.match.timerId = null;
        startQuestionRound(0);
      }
    }, 850);
  }

  function startQuestionRound(qIndex) {
    clearMatchTimers();
    if (qIndex >= state.match.questions.length) {
      finishMatch();
      return;
    }

    state.view = 'PLAYING';
    state.match.currentIndex = qIndex;
    state.match.timeLeft = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    state.match.questionStartTime = performance.now();

    render();

    // 1 saniyelik görsel geri sayım sayacı
    state.match.timerId = setInterval(() => {
      state.match.timeLeft = Math.max(0, state.match.timeLeft - 1);
      updateTimerDOM();

      if (state.match.timeLeft <= 4 && state.match.timeLeft > 0) {
        playSound('tick');
      }

      if (state.match.timeLeft <= 0) {
        clearInterval(state.match.timerId);
        state.match.timerId = null;
        handleTimeExpired();
      }
    }, 1000);

    // Eğer rakip simüle çevrim içi öğrenci ise soru başında kendi bağımsız milisaniyelik yanıtını planla
    if (!state.match.isLiveHumanPeer) {
      scheduleSimulatedOpponentAnswer(qIndex);
    }
  }

  function buildPlannedBotDecision(qIndex) {
    if (state.match.plannedBots && state.match.plannedBots[qIndex]) {
      return state.match.plannedBots[qIndex];
    }
    const q = state.match.questions[qIndex];
    const opponent = getOpponentProfile();
    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const maxMs = maxSec * 1000;

    // Simüle rakip için soru başında bağımsız, adil milisaniyelik süre (2400 ms .. maxMs - 1400 ms)
    const minDelayMs = 2400;
    const maxDelayMs = Math.min(maxMs - 1400, 9600);
    const responseTimeMs = Math.floor(minDelayMs + Math.random() * Math.max(1000, maxDelayMs - minDelayMs));

    const acc = opponent.accuracy || 0.75;
    const isCorrect = Math.random() < acc;
    let choiceIndex = q ? q.correctIndex : 0;
    if (!isCorrect && q) {
      const wrongChoices = [0, 1, 2].filter(i => i !== q.correctIndex);
      choiceIndex = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    }

    const plan = {
      qIndex,
      choiceIndex,
      isCorrect,
      responseTimeMs,
      timeSpentSec: Number((responseTimeMs / 1000).toFixed(2))
    };
    if (!state.match.plannedBots) state.match.plannedBots = {};
    state.match.plannedBots[qIndex] = plan;
    return plan;
  }

  function scheduleSimulatedOpponentAnswer(qIndex) {
    const q = state.match.questions[qIndex];
    if (!q) return;
    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const maxMs = maxSec * 1000;
    const plan = buildPlannedBotDecision(qIndex);

    state.match.botTimeoutId = setTimeout(() => {
      if (state.view !== 'PLAYING' || state.match.currentIndex !== qIndex) return;
      if (state.match.oppAnswers[qIndex]) return;

      const newStreak = plan.isCorrect ? state.match.oppStreak + 1 : 0;
      const scoreInfo = calculateFairAnswerScore(plan.isCorrect, plan.choiceIndex, plan.responseTimeMs, maxMs, newStreak);

      applyOpponentAnswer({
        qIndex,
        choiceIndex: plan.choiceIndex,
        isCorrect: plan.isCorrect,
        pointsEarned: scoreInfo.pointsEarned,
        penaltyPoints: scoreInfo.penaltyPoints,
        penaltyTimeMs: scoreInfo.penaltyTimeMs,
        effectiveTimeMs: scoreInfo.effectiveTimeMs,
        streak: newStreak,
        responseTimeMs: plan.responseTimeMs,
        timeSpentSec: plan.timeSpentSec
      });
    }, plan.responseTimeMs);
  }

  function submitMyAnswer(choiceIndex) {
    const qIndex = state.match.currentIndex;
    if (state.view !== 'PLAYING' || state.match.myAnswers[qIndex]) return;

    const q = state.match.questions[qIndex];
    if (!q) return;

    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const maxMs = maxSec * 1000;
    const responseTimeMs = Math.max(50, Math.min(maxMs, Math.round(performance.now() - state.match.questionStartTime)));
    const elapsedSec = Number((responseTimeMs / 1000).toFixed(2));
    const isCorrect = choiceIndex === q.correctIndex;

    if (isCorrect) {
      state.match.myStreak += 1;
      if (state.match.myStreak > state.match.myBestStreak) {
        state.match.myBestStreak = state.match.myStreak;
      }
      playSound('correct');
    } else {
      state.match.myStreak = 0;
      playSound('wrong');
    }

    const scoreInfo = calculateFairAnswerScore(isCorrect, choiceIndex, responseTimeMs, maxMs, state.match.myStreak);
    state.match.myScore += scoreInfo.pointsEarned;

    const answerRecord = {
      qId: q.id,
      qIndex,
      choiceIndex,
      isCorrect,
      pointsEarned: scoreInfo.pointsEarned,
      speedBonus: scoreInfo.speedBonus,
      streakBonus: scoreInfo.streakBonus,
      penaltyPoints: scoreInfo.penaltyPoints,
      penaltyTimeMs: scoreInfo.penaltyTimeMs,
      effectiveTimeMs: scoreInfo.effectiveTimeMs,
      streak: state.match.myStreak,
      responseTimeMs,
      timeSpentSec: elapsedSec
    };

    state.match.myAnswers[qIndex] = answerRecord;

    if (state.room) {
      sendRealtimePacket('PLAYER_ANSWER', {
        roomId: state.room.roomId,
        ...answerRecord
      });
    }

    render();
    checkBothAnsweredOrAdvance(qIndex);
  }

  function applyOpponentAnswer(data) {
    const qIndex = data.qIndex;
    if (state.match.oppAnswers[qIndex]) return;

    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const maxMs = maxSec * 1000;
    const responseTimeMs = Number.isFinite(data.responseTimeMs)
      ? Math.round(data.responseTimeMs)
      : Math.round(Number(data.timeSpentSec || maxSec) * 1000);

    state.match.oppStreak = data.isCorrect ? Number(data.streak || (state.match.oppStreak + 1)) : 0;
    if (state.match.oppStreak > state.match.oppBestStreak) {
      state.match.oppBestStreak = state.match.oppStreak;
    }

    const scoreInfo = calculateFairAnswerScore(
      Boolean(data.isCorrect),
      Number(data.choiceIndex),
      responseTimeMs,
      maxMs,
      state.match.oppStreak
    );
    const pointsEarned = Number.isFinite(data.pointsEarned) ? Number(data.pointsEarned) : scoreInfo.pointsEarned;

    state.match.oppScore += pointsEarned;
    state.match.oppAnswers[qIndex] = {
      qIndex,
      choiceIndex: Number(data.choiceIndex),
      isCorrect: Boolean(data.isCorrect),
      pointsEarned,
      penaltyPoints: scoreInfo.penaltyPoints,
      penaltyTimeMs: scoreInfo.penaltyTimeMs,
      effectiveTimeMs: scoreInfo.effectiveTimeMs,
      responseTimeMs,
      timeSpentSec: Number((responseTimeMs / 1000).toFixed(2))
    };

    render();
    checkBothAnsweredOrAdvance(qIndex);
  }

  function handleTimeExpired() {
    const qIndex = state.match.currentIndex;
    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const maxMs = maxSec * 1000;

    if (!state.match.myAnswers[qIndex]) {
      state.match.myStreak = 0;
      const timeoutRecord = {
        qIndex,
        choiceIndex: -1, // Boş bırakıldı
        isCorrect: false,
        pointsEarned: 0,
        speedBonus: 0,
        streakBonus: 0,
        penaltyPoints: 0,
        penaltyTimeMs: 0,
        effectiveTimeMs: maxMs,
        streak: 0,
        responseTimeMs: maxMs,
        timeSpentSec: Number(maxSec.toFixed(2))
      };
      state.match.myAnswers[qIndex] = timeoutRecord;
      playSound('wrong');
      if (state.room) {
        sendRealtimePacket('PLAYER_ANSWER', {
          roomId: state.room.roomId,
          ...timeoutRecord
        });
      }
    }

    if (!state.match.oppAnswers[qIndex]) {
      state.match.oppStreak = 0;
      state.match.oppAnswers[qIndex] = {
        qIndex,
        choiceIndex: -1,
        isCorrect: false,
        pointsEarned: 0,
        penaltyPoints: 0,
        penaltyTimeMs: 0,
        effectiveTimeMs: maxMs,
        responseTimeMs: maxMs,
        timeSpentSec: Number(maxSec.toFixed(2))
      };
    }

    render();
    checkBothAnsweredOrAdvance(qIndex);
  }

  function checkBothAnsweredOrAdvance(qIndex) {
    const myAns = state.match.myAnswers[qIndex];
    const oppAns = state.match.oppAnswers[qIndex];

    // Ben cevapladıysam ve rakip simüle ise: rakibin kendi bağımsız planlanan yanıtını (kalan süreden bağımsız!) yansıt
    if (myAns && !oppAns && !state.match.isLiveHumanPeer) {
      if (state.match.botTimeoutId) clearTimeout(state.match.botTimeoutId);
      const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
      const maxMs = maxSec * 1000;
      const plan = buildPlannedBotDecision(qIndex);

      state.match.botTimeoutId = setTimeout(() => {
        if (state.view !== 'PLAYING' || state.match.currentIndex !== qIndex) return;
        if (state.match.oppAnswers[qIndex]) return;

        const newStreak = plan.isCorrect ? state.match.oppStreak + 1 : 0;
        const scoreInfo = calculateFairAnswerScore(plan.isCorrect, plan.choiceIndex, plan.responseTimeMs, maxMs, newStreak);

        applyOpponentAnswer({
          qIndex,
          choiceIndex: plan.choiceIndex,
          isCorrect: plan.isCorrect,
          pointsEarned: scoreInfo.pointsEarned,
          penaltyPoints: scoreInfo.penaltyPoints,
          penaltyTimeMs: scoreInfo.penaltyTimeMs,
          effectiveTimeMs: scoreInfo.effectiveTimeMs,
          streak: newStreak,
          responseTimeMs: plan.responseTimeMs,
          timeSpentSec: plan.timeSpentSec
        });
      }, 550);
      return;
    }

    if (myAns && oppAns) {
      if (state.match.timerId) {
        clearInterval(state.match.timerId);
        state.match.timerId = null;
      }
      if (state.match.nextQuestionTimeoutId) clearTimeout(state.match.nextQuestionTimeoutId);
      state.match.nextQuestionTimeoutId = setTimeout(() => {
        startQuestionRound(qIndex + 1);
      }, 2300);
    }
  }

  function finishMatch() {
    clearMatchTimers();
    state.view = 'RESULT';

    const outcome = evaluateMatchOutcome();
    const isWin = outcome.resultState === 'WIN';

    state.stats.played += 1;
    if (isWin) state.stats.won += 1;
    if (state.match.myBestStreak > state.stats.bestStreak) {
      state.stats.bestStreak = state.match.myBestStreak;
    }
    saveStats();

    if (isWin) playSound('win');
    state.match.rewardInfo = awardMiniTaskSkillPoints();

    render();
  }

  function getOpponentProfile() {
    if (!state.room) return ONLINE_PEERS[0];
    if (state.room.isHost) {
      return state.room.guest || ONLINE_PEERS[0];
    }
    return state.room.host || ONLINE_PEERS[0];
  }

  function clearMatchTimers() {
    if (quickSearchTimer) { clearTimeout(quickSearchTimer); quickSearchTimer = null; }
    if (serverPollInterval) { clearInterval(serverPollInterval); serverPollInterval = null; }
    if (state.match.timerId) { clearInterval(state.match.timerId); state.match.timerId = null; }
    if (state.match.botTimeoutId) { clearTimeout(state.match.botTimeoutId); state.match.botTimeoutId = null; }
    if (state.match.nextQuestionTimeoutId) { clearTimeout(state.match.nextQuestionTimeoutId); state.match.nextQuestionTimeoutId = null; }
  }

  function updateTimerDOM() {
    const numEl = document.getElementById('wgTimerNumber');
    const fgEl = document.getElementById('wgTimerCircleFg');
    if (!numEl || !fgEl) return;

    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const t = state.match.timeLeft;
    numEl.textContent = String(t);

    const circumference = 176;
    const ratio = Math.max(0, Math.min(1, t / maxSec));
    fgEl.style.strokeDashoffset = String(Math.round(circumference * (1 - ratio)));

    fgEl.classList.remove('warning', 'danger');
    numEl.classList.remove('danger');
    if (t <= 4) {
      fgEl.classList.add('danger');
      numEl.classList.add('danger');
    } else if (t <= 7) {
      fgEl.classList.add('warning');
    }
  }

  // --- 10. ARAYÜZ (UI) RENDER FONKSİYONLARI ---
  function render() {
    const container = document.getElementById('wordGameAppRoot');
    if (!container) return;

    container.innerHTML = `
      ${renderTopHeroBanner()}
      <div id="wgDynamicStage">
        ${renderCurrentStage()}
      </div>
    `;

    bindStageEvents();
  }

  function renderTopHeroBanner() {
    return `
      <div class="wg-hero-banner">
        <div class="wg-hero-top">
          <div>
            <div class="wg-hero-eyebrow">
              <span>🎮</span>
              <span>MİNİ GÖREVLER • TÜRK LEHÇELERİ ÇOK OYUNCULU KELİME DÜELLOSU</span>
            </div>
            <h2 class="wg-hero-title">Türk Dünyası <span>Online Kelime Oyunu</span></h2>
            <p class="wg-hero-desc">
              Kazakça, Kırgızca, Özbekçe, Türkmence, Azerbaycan Türkçesi ve Kıbrıs Türkçesi ortak kelime hazinesini 3 şıklı canlı düellolarla keşfet! Çevrim içi rakiplerle rastgele eşleş veya Arkadaş ID / Oda Kodu ile özel maç kur.
            </p>
          </div>

          <div class="wg-identity-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <span class="wg-net-status">
                <span class="wg-net-dot"></span>
                <span>Canlı Eşleşme Ağı Aktif</span>
              </span>
              <button type="button" id="wgToggleSoundBtn" class="wg-btn-ghost" style="padding:4px 9px;font-size:11.5px;background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.2);">
                ${state.soundEnabled ? '🔊 Ses Açık' : '🔇 Sessiz'}
              </button>
            </div>
            <div class="wg-player-id-row">
              <div>
                <span class="wg-player-id-label">Senin Benzersiz Oyuncu ID'n:</span>
                <strong class="wg-player-id-val" id="wgMyPlayerIdText">${escapeHtml(state.me.playerId)}</strong>
              </div>
              <button type="button" class="wg-btn-copy-id" id="wgCopyMyIdBtn">📋 ID Kopyala</button>
            </div>
          </div>
        </div>

        <div class="wg-stats-strip">
          <div class="wg-stat-pill">
            <div class="wg-stat-icon">⚔️</div>
            <div class="wg-stat-info">
              <strong>${state.stats.played}</strong>
              <small>Tamamlanan Maç</small>
            </div>
          </div>
          <div class="wg-stat-pill">
            <div class="wg-stat-icon">🏆</div>
            <div class="wg-stat-info">
              <strong>${state.stats.won}</strong>
              <small>Kazanılan Düello</small>
            </div>
          </div>
          <div class="wg-stat-pill">
            <div class="wg-stat-icon">🔥</div>
            <div class="wg-stat-info">
              <strong>${state.stats.bestStreak}x</strong>
              <small>En Yüksek Seri (Streak)</small>
            </div>
          </div>
          <div class="wg-stat-pill">
            <div class="wg-stat-icon">⭐</div>
            <div class="wg-stat-info">
              <strong>+${state.stats.earnedSkillPoints.toFixed(1)}</strong>
              <small>Kazanılan Beceri Puanı</small>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCurrentStage() {
    if (state.view === 'QUICK_SEARCH') return renderQuickSearchStage();
    if (state.view === 'FRIEND_LOBBY') return renderFriendLobbyStage();
    if (state.view === 'COUNTDOWN') return renderCountdownStage();
    if (state.view === 'PLAYING') return renderPlayingArenaStage();
    if (state.view === 'RESULT') return renderResultStage();
    return renderMainMenuStage();
  }

  function renderMainMenuStage() {
    const dialects = ['ALL', 'Kazakça', 'Azerbaycan Türkçesi', 'Özbekçe', 'Kırgızca', 'Türkmence', 'KKTC / Kıbrıs Ağzı'];
    return `
      <!-- Oyun Ayarları Çubuğu -->
      <div class="wg-settings-bar">
        <div class="wg-settings-group">
          <span class="wg-settings-label">🎯 Tur Soru Sayısı:</span>
          <div class="wg-segmented">
            <button type="button" class="wg-seg-btn ${state.settings.roundCount === 5 ? 'active' : ''}" data-round-count="5">5 Soru (Hızlı Tur)</button>
            <button type="button" class="wg-seg-btn ${state.settings.roundCount === 10 ? 'active' : ''}" data-round-count="10">10 Soru (Maraton)</button>
          </div>
        </div>

        <div class="wg-settings-group">
          <span class="wg-settings-label">⏱️ Soru Süresi:</span>
          <div class="wg-segmented">
            <button type="button" class="wg-seg-btn ${state.settings.timePerQuestion === 10 ? 'active' : ''}" data-time-sec="10">10 Saniye</button>
            <button type="button" class="wg-seg-btn ${state.settings.timePerQuestion === 15 ? 'active' : ''}" data-time-sec="15">15 Saniye</button>
          </div>
        </div>

        <div class="wg-settings-group">
          <label for="wgDialectSelect" class="wg-settings-label">🌍 Lehçe Havuzu:</label>
          <select id="wgDialectSelect" class="wg-dialect-select">
            ${dialects.map(d => `<option value="${escapeHtml(d)}" ${state.settings.dialectFilter === d ? 'selected' : ''}>${d === 'ALL' ? 'Tüm Türk Lehçeleri (Karışık 45 Kelime)' : escapeHtml(d)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- 2 Temel Oyun Modu -->
      <div class="wg-modes-grid">
        <!-- MOD A: Rastgele / Otomatik Eşleştirme (Quick Match) -->
        <article class="wg-mode-card wg-mode-card-quick">
          <div>
            <div class="wg-mode-badge-row">
              <div class="wg-mode-icon-box">⚡</div>
              <span class="wg-mode-tag">Otomatik Eşleştirme • Quick Match</span>
            </div>
            <h3>A) Rastgele / Otomatik Eşleştirme</h3>
            <p>
              Çevrim içi olan Türk Dünyası öğrencileriyle otomatik ve karışık bir havuzdan anında eşleş. Her iki oyuncuya da aynı anda aynı 3 şıklı sorular yansıtılır!
            </p>
            <ul class="wg-mode-features">
              <li><span>✓</span> <strong>1. Öncelikli Kriter (Doğru Sayısı):</strong> En çok doğru yanıt veren her zaman kazanır</li>
              <li><span>✓</span> <strong>2. Kriter (Yanıt Süresi):</strong> Doğru sayıları eşitse soruları en hızlı sürede yanıtlayan kazanır</li>
              <li><span>✓</span> <strong>Adil Ceza Kuralı:</strong> Yanlış yanıt <strong>-35 Puan</strong> düşürür ve <strong>+3,0 sn</strong> süre cezası ekler</li>
              <li><span>✓</span> Günlük mini görev tamamlama ödülü: <strong>+0,2 Beceri Puanı</strong></li>
            </ul>
          </div>
          <div>
            <button type="button" class="wg-btn-primary" id="wgBtnStartQuickMatch">
              <span>⚡</span>
              <span>Rastgele Rakip Bul ve Maça Başla</span>
            </button>
          </div>
        </article>

        <!-- MOD B: Arkadaş ID ile Özel Maç (Play with Friend) -->
        <article class="wg-mode-card wg-mode-card-friend">
          <div>
            <div class="wg-mode-badge-row">
              <div class="wg-mode-icon-box">🤝</div>
              <span class="wg-mode-tag">Özel Oda &amp; Oyuncu ID • Play with Friend</span>
            </div>
            <h3>B) Arkadaş ID ile Özel Maç</h3>
            <p>
              Özel bir maç odası kurarak <strong>Oda Kodunu</strong> arkadaşına gönder veya arkadaşının <strong>Oyuncu ID'sini / Oda Kodunu</strong> girerek doğrudan onunla yarış!
            </p>

            <div class="wg-friend-controls">
              <label for="wgFriendCodeInput" style="font-size:12.5px;font-weight:800;color:#102343;display:block;">
                🔑 Arkadaşının Oyuncu ID'si veya Oda Kodu ile Katıl:
              </label>
              <div class="wg-friend-input-row">
                <input
                  type="text"
                  id="wgFriendCodeInput"
                  class="wg-friend-input"
                  placeholder="Örn: TDA-482 veya TDA-AZ-202"
                  maxlength="24"
                  autocomplete="off"
                />
                <button type="button" class="wg-btn-navy" id="wgBtnJoinByCode">
                  Maça Bağlan →
                </button>
              </div>
              <div style="margin-top:10px;">
                <small style="color:#64748b;font-size:11.5px;display:block;margin-bottom:6px;">
                  Hızlı davet için çevrim içi bir arkadaş seçebilir veya ikinci bir sekme açıp kendi ID'nizi deneyebilirsiniz:
                </small>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${ONLINE_PEERS.slice(0, 4).map(p => `
                    <button type="button" class="wg-friend-chip" data-quick-friend-id="${escapeHtml(p.playerId)}" title="${escapeHtml(p.name)} (${escapeHtml(p.country)}) ile Özel Oda Kur">
                      <span>👤 ${escapeHtml(p.name.split(' ')[0])}</span>
                      <code style="font-size:11px;color:#b45309;">${escapeHtml(p.playerId)}</code>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div>
            <button type="button" class="wg-btn-navy" id="wgBtnCreatePrivateRoom">
              <span>🏠</span>
              <span>Yeni Özel Maç Odası Kur (Oda Kodu Üret)</span>
            </button>
          </div>
        </article>
      </div>
    `;
  }

  function renderQuickSearchStage() {
    return `
      <div class="wg-stage-panel">
        <div class="wg-radar-wrap">
          <div class="wg-radar-circle">🌍</div>
          <div class="eyebrow" style="color:#b45309;">OTOMATİK EŞLEŞTİRME HAVUZU (QUICK MATCH)</div>
          <h3 style="font-size:26px;color:#102343;margin:8px 0;">Çevrim İçi Rakip Aranıyor...</h3>
          <p class="muted" style="max-width:520px;margin:0 auto 20px;">
            Türk Dünyası Beceri Ağı'ndaki çevrim içi öğrenciler taranıyor. Eşleşme sağlandığında <strong>${state.settings.roundCount} soruluk</strong> kelime düellosu eşzamanlı olarak başlayacak.
          </p>
          <div style="display:inline-flex;gap:10px;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;padding:10px 18px;border-radius:999px;margin-bottom:22px;font-size:13px;font-weight:750;color:#102343;">
            <span>🎯 ${state.settings.roundCount} Soru</span>
            <span>•</span>
            <span>⏱️ ${state.settings.timePerQuestion} sn / soru</span>
            <span>•</span>
            <span>🌍 ${escapeHtml(state.settings.dialectFilter === 'ALL' ? 'Tüm Türk Lehçeleri' : state.settings.dialectFilter)}</span>
          </div>
          <div>
            <button type="button" class="wg-btn-ghost" id="wgBtnCancelSearch">✕ Aramayı İptal Et ve Menüye Dön</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFriendLobbyStage() {
    const room = state.room;
    if (!room) return renderMainMenuStage();

    const host = room.host;
    const guest = room.guest;
    const inviteUrl = `${location.origin}${location.pathname}#wordgame?room=${encodeURIComponent(room.roomId)}`;
    const hostFlag = COUNTRY_FLAGS[host.country] || COUNTRY_FLAGS['Türkiye'];
    const guestFlag = guest ? (COUNTRY_FLAGS[guest.country] || COUNTRY_FLAGS['Kazakistan']) : '';

    return `
      <div class="wg-stage-panel">
        <div class="wg-room-code-banner">
          <div>
            <span style="font-size:11.5px;font-weight:800;color:#f5cf79;text-transform:uppercase;letter-spacing:0.8px;">
              🤝 ARKADAŞ ID İLE ÖZEL MAÇ ODASI (${room.isHost ? 'KURUCU SENSİN' : 'MİSAFİR OYUNCU'})
            </span>
            <h3 style="margin:4px 0 2px;font-size:22px;color:#ffffff;">Özel Düello Lobisi</h3>
            <small style="color:#cbd5e1;">Arkadaşın bu Oda Kodunu veya senin Oyuncu ID'ni (${escapeHtml(host.playerId)}) girerek anında bağlanabilir.</small>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="wg-room-code-display" id="wgLobbyRoomCode">${escapeHtml(room.roomId)}</div>
            <button type="button" class="wg-btn-copy-id" id="wgCopyRoomCodeBtn">📋 Oda Kodunu Kopyala</button>
            <button type="button" class="wg-btn-copy-id" id="wgCopyInviteLinkBtn" style="background:#1e3a6d;color:#f5cf79;border:1px solid #f5b942;">🔗 Davet Linki</button>
          </div>
        </div>

        <!-- Oyuncu Slotları: Kurucu vs Misafir Arkadaş -->
        <div class="wg-vs-arena">
          <div class="wg-lobby-player-card ready">
            <div class="wg-lobby-avatar">
              <span>${escapeHtml((host.name || 'K')[0].toUpperCase())}</span>
              <span class="wg-lobby-flag"><img src="${hostFlag}" alt="${escapeHtml(host.country)}"></span>
            </div>
            <span style="font-size:11px;font-weight:800;color:#15803d;background:#dcfce7;padding:3px 10px;border-radius:999px;">
              👑 Oda Kurucusu • Hazır ✓
            </span>
            <h4 style="margin:10px 0 4px;font-size:18px;color:#102343;">${escapeHtml(host.name)}</h4>
            <div style="font-size:12.5px;color:#64748b;font-weight:700;">
              ${escapeHtml(host.country)} • ID: <code>${escapeHtml(host.playerId)}</code>
            </div>
          </div>

          <div class="wg-vs-badge">VS</div>

          ${guest ? `
            <div class="wg-lobby-player-card ready">
              <div class="wg-lobby-avatar">
                <span>${escapeHtml((guest.name || 'M')[0].toUpperCase())}</span>
                <span class="wg-lobby-flag"><img src="${guestFlag}" alt="${escapeHtml(guest.country)}"></span>
              </div>
              <span style="font-size:11px;font-weight:800;color:#15803d;background:#dcfce7;padding:3px 10px;border-radius:999px;">
                🤝 Rakip Arkadaş Bağlandı • Hazır ✓
              </span>
              <h4 style="margin:10px 0 4px;font-size:18px;color:#102343;">${escapeHtml(guest.name)}</h4>
              <div style="font-size:12.5px;color:#64748b;font-weight:700;">
                ${escapeHtml(guest.country)} • ID: <code>${escapeHtml(guest.playerId)}</code>
              </div>
            </div>
          ` : `
            <div class="wg-lobby-player-card">
              <div class="wg-lobby-avatar" style="background:#e2e8f0;color:#64748b;border-color:#cbd5e1;">
                <span>⏳</span>
              </div>
              <span style="font-size:11px;font-weight:800;color:#b45309;background:#fef3c7;padding:3px 10px;border-radius:999px;">
                Arkadaşın Bekleniyor...
              </span>
              <h4 style="margin:10px 0 4px;font-size:17px;color:#475569;">2. Oyuncu Slotu Boş</h4>
              <div style="font-size:12px;color:#64748b;">
                Diğer sekmeden <strong>${escapeHtml(room.roomId)}</strong> kodunu girin veya aşağıdan Arkadaş ID davet edin.
              </div>
            </div>
          `}
        </div>

        <!-- Oda İçi Arkadaş ID ile Doğrudan Davet Alanı -->
        ${room.isHost ? `
          <div class="wg-online-friends-box">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <strong style="font-size:13.5px;color:#102343;">⚡ Arkadaş ID'si ile Doğrudan Odaya Davet Et:</strong>
                <div style="font-size:12px;color:#64748b;">Arkadaşının Oyuncu ID'sini yazabilir veya çevrim içi arkadaş listesinden seçebilirsin.</div>
              </div>
              <div class="wg-lobby-invite-row" style="display:flex;gap:8px;flex:1;max-width:420px;">
                <input type="text" id="wgLobbyInviteIdInput" class="wg-friend-input" placeholder="Arkadaş ID gir (Örn: TDA-KZ-301)" style="padding:8px 12px;font-size:13px;" />
                <button type="button" class="wg-btn-navy" id="wgBtnLobbyInviteId">
                  + Odaya Davet Et
                </button>
              </div>
            </div>
            <div class="wg-online-friends-grid">
              ${ONLINE_PEERS.map(p => `
                <button type="button" class="wg-friend-chip" data-lobby-invite-peer="${escapeHtml(p.playerId)}">
                  <span>🟢 ${escapeHtml(p.name)} (${escapeHtml(p.country)})</span>
                  <code style="color:#b45309;font-weight:800;">${escapeHtml(p.playerId)}</code>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Alt Aksiyonlar: Kurucu "Oyunu Başlat" Butonu -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:24px;flex-wrap:wrap;">
          <button type="button" class="wg-btn-ghost" id="wgBtnLeaveLobby">← Odadan Ayrıl ve Ana Menüye Dön</button>
          ${room.isHost ? `
            <button type="button" class="wg-btn-primary" id="wgBtnHostStartGame" style="width:auto;min-width:260px;" ${guest ? '' : 'disabled style="width:auto;min-width:260px;opacity:0.55;cursor:not-allowed;"'}>
              <span>🚀</span>
              <span>${guest ? 'Oyunu Başlat (' + room.roundCount + ' Soru)' : 'Önce Arkadaşınızı Davet Edin'}</span>
            </button>
          ` : `
            <div style="font-size:14px;font-weight:800;color:#102343;background:#fef3c7;padding:12px 20px;border-radius:12px;border:1px solid #f5b942;">
              ⏳ Oda kurucusunun (${escapeHtml(host.name)}) "Oyunu Başlat" butonuna basması bekleniyor...
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderCountdownStage() {
    const opp = getOpponentProfile();
    const myFlag = COUNTRY_FLAGS[state.me.country] || COUNTRY_FLAGS['Türkiye'];
    const oppFlag = COUNTRY_FLAGS[opp.country] || COUNTRY_FLAGS['Kazakistan'];

    return `
      <div class="wg-stage-panel" style="background:linear-gradient(135deg,#0e1b33,#183159);color:#fff;text-align:center;border-color:#f5b942;">
        <div class="wg-hero-eyebrow" style="margin:0 auto 14px;">EŞLEŞME SAĞLANDI • SORULAR SENKRONİZE EDİLDİ</div>
        <h3 style="font-size:28px;margin:0 0 18px;color:#f5cf79;">Kelime Düellosu Başlıyor!</h3>

        <div class="wg-vs-arena" style="max-width:680px;margin:0 auto 24px;">
          <div class="wg-lobby-player-card" style="background:rgba(255,255,255,0.08);border-color:rgba(245,185,66,0.4);color:#fff;">
            <div class="wg-lobby-avatar">
              <span>${escapeHtml((state.me.name || 'S')[0].toUpperCase())}</span>
              <span class="wg-lobby-flag"><img src="${myFlag}" alt=""></span>
            </div>
            <strong style="font-size:17px;display:block;">${escapeHtml(state.me.name)} (Sen)</strong>
            <small style="color:#cbd5e1;">${escapeHtml(state.me.country)}</small>
          </div>

          <div class="wg-vs-badge" style="width:76px;height:76px;font-size:32px;background:#f5b942;color:#102343;">
            ${state.countdownValue}
          </div>

          <div class="wg-lobby-player-card" style="background:rgba(255,255,255,0.08);border-color:rgba(245,185,66,0.4);color:#fff;">
            <div class="wg-lobby-avatar">
              <span>${escapeHtml((opp.name || 'R')[0].toUpperCase())}</span>
              <span class="wg-lobby-flag"><img src="${oppFlag}" alt=""></span>
            </div>
            <strong style="font-size:17px;display:block;">${escapeHtml(opp.name)}</strong>
            <small style="color:#cbd5e1;">${escapeHtml(opp.country)}</small>
          </div>
        </div>

        <p style="color:#dce8f8;font-size:14px;margin:0;">
          Her iki oyuncuya da aynı <strong>${state.match.questions.length} soru</strong> eşzamanlı olarak yansıtılıyor...
        </p>
      </div>
    `;
  }

  function renderPlayingArenaStage() {
    const qIndex = state.match.currentIndex;
    const totalQ = state.match.questions.length;
    const q = state.match.questions[qIndex];
    if (!q) return '';

    const maxSec = state.room?.timePerQuestion || state.settings.timePerQuestion || 15;
    const opp = getOpponentProfile();
    const myAns = state.match.myAnswers[qIndex];
    const oppAns = state.match.oppAnswers[qIndex];
    const bothDone = Boolean(myAns && oppAns);

    const myLive = computePlayerMatchMetrics(state.match.myAnswers, totalQ, maxSec);
    const oppLive = computePlayerMatchMetrics(state.match.oppAnswers, totalQ, maxSec);

    const myFlag = COUNTRY_FLAGS[state.me.country] || COUNTRY_FLAGS['Türkiye'];
    const oppFlag = COUNTRY_FLAGS[opp.country] || COUNTRY_FLAGS['Kazakistan'];
    const qFlag = COUNTRY_FLAGS[q.country] || COUNTRY_FLAGS['Kazakistan'];

    const renderDots = (answers) => {
      return state.match.questions.map((_, i) => {
        const a = answers[i];
        if (!a) return `<span class="wg-dot"></span>`;
        if (a.choiceIndex === -1) return `<span class="wg-dot timeout" title="Süre Bitti (Boş)"></span>`;
        return `<span class="wg-dot ${a.isCorrect ? 'correct' : 'wrong'}"></span>`;
      }).join('');
    };

    const letters = ['A', 'B', 'C'];

    return `
      <div class="wg-arena-container">
        <!-- Adil Puanlama Kural Şeridi -->
        <div class="wg-fairness-rule-bar">
          <span>⚖️ <strong>Adil Kazanma Kuralı:</strong> 1. Kriter: En Çok Doğru Sayısı • 2. Kriter (Eşitlikte): En Düşük Toplam Yanıt Süresi</span>
          <span>⚠️ Yanlış Cevap Cezası: <strong>-35 Puan &amp; +3.00 sn Süre Cezası</strong></span>
        </div>

        <!-- Üst Canlı Skor, Doğru/Yanlış & Süre HUD Bar -->
        <div class="wg-hud-bar">
          <!-- Sol: Sen -->
          <div class="wg-hud-player">
            <div class="wg-hud-avatar">
              <span>${escapeHtml((state.me.name || 'S')[0].toUpperCase())}</span>
              <span class="wg-lobby-flag"><img src="${myFlag}" alt=""></span>
            </div>
            <div>
              <div class="wg-hud-name">
                <span>${escapeHtml(state.me.name)} (Sen)</span>
                ${state.match.myStreak >= 2 ? `<span class="wg-streak-pill">🔥 ${state.match.myStreak}x Seri</span>` : ''}
              </div>
              <div class="wg-hud-live-metrics">
                <span class="wg-hud-mini-pill correct" title="1. Öncelikli Kriter: Doğru Sayısı">✓ ${myLive.correctCount} Doğru</span>
                <span class="wg-hud-mini-pill wrong" title="Yanlış Sayısı">✕ ${myLive.wrongCount} Yanlış</span>
                <span class="wg-hud-mini-pill speed" title="2. Kriter: Toplam Yanıt Süresi">⏱️ ${myLive.totalRawTimeSec} sn</span>
                <span class="wg-hud-mini-pill">Skor: ${state.match.myScore}</span>
              </div>
              <div class="wg-progress-dots">${renderDots(state.match.myAnswers)}</div>
            </div>
          </div>

          <!-- Orta: Dairesel Süre Sayacı -->
          <div class="wg-timer-center">
            <span class="wg-round-pill">Soru ${qIndex + 1} / ${totalQ}</span>
            <div class="wg-timer-ring-box">
              <svg class="wg-timer-svg" viewBox="0 0 64 64">
                <circle class="wg-timer-bg" cx="32" cy="32" r="28"></circle>
                <circle class="wg-timer-fg" id="wgTimerCircleFg" cx="32" cy="32" r="28"></circle>
              </svg>
              <span class="wg-timer-number" id="wgTimerNumber">${state.match.timeLeft}</span>
            </div>
          </div>

          <!-- Sağ: Rakip -->
          <div class="wg-hud-player opponent">
            <div class="wg-hud-avatar">
              <span>${escapeHtml((opp.name || 'R')[0].toUpperCase())}</span>
              <span class="wg-lobby-flag"><img src="${oppFlag}" alt=""></span>
            </div>
            <div>
              <div class="wg-hud-name">
                ${state.match.oppStreak >= 2 ? `<span class="wg-streak-pill">🔥 ${state.match.oppStreak}x Seri</span>` : ''}
                <span>${escapeHtml(opp.name)}</span>
              </div>
              <div class="wg-hud-live-metrics">
                <span class="wg-hud-mini-pill correct" title="1. Öncelikli Kriter: Doğru Sayısı">✓ ${oppLive.correctCount} Doğru</span>
                <span class="wg-hud-mini-pill wrong" title="Yanlış Sayısı">✕ ${oppLive.wrongCount} Yanlış</span>
                <span class="wg-hud-mini-pill speed" title="2. Kriter: Toplam Yanıt Süresi">⏱️ ${oppLive.totalRawTimeSec} sn</span>
                <span class="wg-hud-mini-pill">Skor: ${state.match.oppScore}</span>
              </div>
              <div class="wg-hud-status-tag ${oppAns ? 'answered' : ''}">
                ${oppAns
                  ? (oppAns.choiceIndex === -1
                    ? '⌛ Süresi Doldu (Boş)'
                    : `⚡ Yanıtladı (${Number(oppAns.timeSpentSec).toFixed(2)} sn • ${oppAns.isCorrect ? '✓ Doğru' : '✕ Yanlış'})`)
                  : '🤔 Düşünüyor...'}
              </div>
              <div class="wg-progress-dots">${renderDots(state.match.oppAnswers)}</div>
            </div>
          </div>
        </div>

        <!-- Soru ve 3 Şık (A, B, C) Kartı -->
        <div class="wg-question-card">
          <div class="wg-question-meta">
            <span class="wg-dialect-badge">
              <img src="${qFlag}" alt="${escapeHtml(q.country)}">
              <span>${escapeHtml(q.dialect)} • ${escapeHtml(q.country)}</span>
            </span>
            <span class="wg-target-word-pill">
              🧩 Mini Görev Kelimesi: "${escapeHtml(q.word)}"
            </span>
          </div>

          <h3 class="wg-question-text">${escapeHtml(q.question)}</h3>

          <div class="wg-options-grid">
            ${q.options.map((optText, idx) => {
              let btnClass = 'wg-option-btn';
              if (myAns) {
                if (idx === q.correctIndex) {
                  btnClass += ' correct';
                } else if (myAns.choiceIndex === idx && !myAns.isCorrect) {
                  btnClass += ' wrong';
                }
              }
              const showOppChoice = bothDone && oppAns && oppAns.choiceIndex === idx;
              return `
                <button
                  type="button"
                  class="${btnClass}"
                  data-option-index="${idx}"
                  ${myAns ? 'disabled' : ''}
                >
                  <span class="wg-option-letter">${letters[idx]}</span>
                  <span class="wg-option-text">${escapeHtml(optText)}</span>
                  ${showOppChoice ? `<span class="wg-option-peer-tag">👤 ${escapeHtml(opp.name.split(' ')[0])} (${Number(oppAns.timeSpentSec).toFixed(2)} sn)</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Yanıt Sonrası Anlık Puan, Süre & Kültürel Köken Açıklaması -->
          ${myAns ? `
            <div class="wg-feedback-box ${myAns.isCorrect ? 'correct' : 'wrong'}">
              <div style="font-size:22px;line-height:1;">
                ${myAns.isCorrect ? '✅' : (myAns.choiceIndex === -1 ? '⏰' : '❌')}
              </div>
              <div style="flex:1;">
                <div style="font-weight:850;font-size:14.5px;margin-bottom:4px;">
                  ${myAns.isCorrect
                    ? `Doğru Yanıt! (${Number(myAns.timeSpentSec).toFixed(2)} sn / ${myAns.responseTimeMs} ms) • +${myAns.pointsEarned} Puan ${myAns.streakBonus > 0 ? `(🔥 +${myAns.streakBonus} Seri Bonusu)` : ''}`
                    : (myAns.choiceIndex === -1
                      ? `Süre Bitti! Boş bırakıldı (0 Puan, +${maxSec}.00 sn süre yazıldı). Doğru Cevap: "${escapeHtml(q.options[q.correctIndex])}"`
                      : `Yanlış Yanıt! (${Number(myAns.timeSpentSec).toFixed(2)} sn) • Ceza: ${myAns.pointsEarned} Puan ve +3.00 sn Süre Cezası. Doğru Cevap: "${escapeHtml(q.options[q.correctIndex])}"`)}
                </div>
                <div>
                  <strong>💡 Dil &amp; Kültür Notu:</strong> ${escapeHtml(q.hint)}
                </div>
              </div>
            </div>
          ` : `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;font-size:12px;color:#64748b;">
              <span>⌨️ İpucu: Fareyle tıklayabilir veya klavyeden <strong>1 (A), 2 (B), 3 (C)</strong> tuşlarını kullanabilirsiniz.</span>
              <button type="button" class="wg-btn-ghost" id="wgBtnAbortMatch" style="padding:5px 10px;font-size:11.5px;">Maçtan Çık</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderResultStage() {
    const opp = getOpponentProfile();
    const outcome = evaluateMatchOutcome();
    const { resultState, decisionExplanation, myMetrics, oppMetrics } = outcome;

    const myFlag = COUNTRY_FLAGS[state.me.country] || COUNTRY_FLAGS['Türkiye'];
    const oppFlag = COUNTRY_FLAGS[opp.country] || COUNTRY_FLAGS['Kazakistan'];

    return `
      <div class="wg-stage-panel">
        <!-- Zafer / Sonuç Banner'ı ve Şeffaf Kazanma Gerekçesi -->
        <div class="wg-result-banner">
          <div class="wg-result-trophy">
            ${resultState === 'WIN' ? '🏆' : (resultState === 'DRAW' ? '🤝' : '🎖️')}
          </div>
          <h3 class="wg-result-title">
            ${resultState === 'WIN'
              ? `Tebrikler ${escapeHtml(state.me.name)}, Maçı Kazandın!`
              : (resultState === 'DRAW'
                ? 'Dostluk Kazandı! Tam Beraberlik'
                : `${escapeHtml(opp.name)} Maçı Kazandı!`)}
          </h3>

          <div class="wg-decision-reason-box">
            <strong>⚖️ Kazanan Belirleme Kararı:</strong> ${escapeHtml(decisionExplanation)}
          </div>

          ${state.match.rewardInfo?.awarded ? `
            <div class="wg-reward-pill">
              <span>✨ Günlük Mini Görev Tamamlandı: Profiline <strong>+0,2 Beceri Puanı</strong> Eklendi!</span>
            </div>
          ` : `
            <div class="wg-reward-pill" style="background:rgba(245,185,66,0.18);border-color:#f5cf79;color:#f5cf79;">
              <span>🎯 Günlük Mini Görev Puanı (+0,2) bugün zaten alındı • Kelime Pratiği Tamamlandı</span>
            </div>
          `}
        </div>

        <!-- İki Oyuncu Karşılaştırmalı Özet Kartları -->
        <div class="wg-result-cards-grid">
          <!-- Sen -->
          <div class="wg-result-player-card ${resultState === 'WIN' ? 'winner' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="wg-hud-avatar">
                  <span>${escapeHtml((state.me.name || 'S')[0].toUpperCase())}</span>
                  <span class="wg-lobby-flag"><img src="${myFlag}" alt=""></span>
                </div>
                <div>
                  <strong style="font-size:18px;color:#102343;display:block;">${escapeHtml(state.me.name)} (Sen)</strong>
                  <small style="color:#64748b;font-weight:700;">${escapeHtml(state.me.country)} ${resultState === 'WIN' ? '• 👑 KAZANAN' : ''}</small>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:26px;font-weight:900;color:#16a34a;">${myMetrics.correctCount} Doğru</span>
                <small style="display:block;font-size:11.5px;color:#475569;font-weight:800;">Toplam Süre: ${myMetrics.totalRawTimeSec} sn</small>
              </div>
            </div>

            <div class="wg-result-metrics">
              <div class="wg-metric-box">
                <strong style="color:#16a34a;">${myMetrics.correctCount}</strong>
                <small>Doğru (1. Kriter)</small>
              </div>
              <div class="wg-metric-box">
                <strong style="color:#dc2626;">${myMetrics.wrongCount}</strong>
                <small>Yanlış (-${myMetrics.penaltyPointsTotal}p)</small>
              </div>
              <div class="wg-metric-box">
                <strong style="color:#d97706;">${myMetrics.avgRawTimeSec}s</strong>
                <small>Ort. Hız / Soru</small>
              </div>
              <div class="wg-metric-box">
                <strong style="color:#102343;">${state.match.myScore}</strong>
                <small>Net Puan</small>
              </div>
            </div>
          </div>

          <!-- Rakip -->
          <div class="wg-result-player-card ${resultState === 'LOSS' ? 'winner' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="wg-hud-avatar">
                  <span>${escapeHtml((opp.name || 'R')[0].toUpperCase())}</span>
                  <span class="wg-lobby-flag"><img src="${oppFlag}" alt=""></span>
                </div>
                <div>
                  <strong style="font-size:18px;color:#102343;display:block;">${escapeHtml(opp.name)}</strong>
                  <small style="color:#64748b;font-weight:700;">${escapeHtml(opp.country)} ${resultState === 'LOSS' ? '• 👑 KAZANAN' : ''}</small>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:26px;font-weight:900;color:#16a34a;">${oppMetrics.correctCount} Doğru</span>
                <small style="display:block;font-size:11.5px;color:#475569;font-weight:800;">Toplam Süre: ${oppMetrics.totalRawTimeSec} sn</small>
              </div>
            </div>

            <div class="wg-result-metrics">
              <div class="wg-metric-box">
                <strong style="color:#16a34a;">${oppMetrics.correctCount}</strong>
                <small>Doğru (1. Kriter)</small>
              </div>
              <div class="wg-metric-box">
                <strong style="color:#dc2626;">${oppMetrics.wrongCount}</strong>
                <small>Yanlış (-${oppMetrics.penaltyPointsTotal}p)</small>
              </div>
              <div class="wg-metric-box">
                <strong style="color:#d97706;">${oppMetrics.avgRawTimeSec}s</strong>
                <small>Ort. Hız / Soru</small>
              </div>
              <div class="wg-metric-box">
                <strong style="color:#102343;">${state.match.oppScore}</strong>
                <small>Net Puan</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Şeffaf Karşılaştırmalı Skor ve Süre Tablosu -->
        <div class="wg-comparison-table-wrap">
          <table class="wg-comparison-table">
            <thead>
              <tr>
                <th style="text-align:left;">Değerlendirme Kriteri</th>
                <th>${escapeHtml(state.me.name)} (Sen)</th>
                <th>${escapeHtml(opp.name)} (Rakip)</th>
                <th>Üstünlük</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="metric-label">1. Öncelikli Kriter: Doğru Sayısı</td>
                <td><strong style="color:#16a34a;font-size:15px;">${myMetrics.correctCount} Doğru</strong></td>
                <td><strong style="color:#16a34a;font-size:15px;">${oppMetrics.correctCount} Doğru</strong></td>
                <td>
                  ${myMetrics.correctCount > oppMetrics.correctCount
                    ? `<span style="color:#16a34a;font-weight:800;">✓ Sen (+${myMetrics.correctCount - oppMetrics.correctCount})</span>`
                    : (oppMetrics.correctCount > myMetrics.correctCount
                      ? `<span style="color:#dc2626;font-weight:800;">Rakip (+${oppMetrics.correctCount - myMetrics.correctCount})</span>`
                      : '<span style="color:#d97706;font-weight:800;">Eşit (2. Kritere Bakılır)</span>')}
                </td>
              </tr>
              <tr>
                <td class="metric-label">Yanlış Cevap &amp; Ceza Etkisi</td>
                <td><span style="color:#dc2626;font-weight:750;">${myMetrics.wrongCount} Yanlış</span> <small class="muted">(-${myMetrics.penaltyPointsTotal}p / +${myMetrics.penaltyTimeSecTotal}sn)</small></td>
                <td><span style="color:#dc2626;font-weight:750;">${oppMetrics.wrongCount} Yanlış</span> <small class="muted">(-${oppMetrics.penaltyPointsTotal}p / +${oppMetrics.penaltyTimeSecTotal}sn)</small></td>
                <td>
                  ${myMetrics.wrongCount < oppMetrics.wrongCount
                    ? '<span style="color:#16a34a;font-weight:800;">✓ Daha Az Hata</span>'
                    : (oppMetrics.wrongCount < myMetrics.wrongCount ? '<span style="color:#dc2626;font-weight:800;">Rakip Daha Az Hatalı</span>' : 'Eşit')}
                </td>
              </tr>
              <tr>
                <td class="metric-label">2. Kriter (Eşitlik Bozan): Toplam Yanıt Süresi</td>
                <td><strong>${myMetrics.totalRawTimeSec} sn</strong> <small class="muted">(${myMetrics.totalRawTimeMs} ms)</small></td>
                <td><strong>${oppMetrics.totalRawTimeSec} sn</strong> <small class="muted">(${oppMetrics.totalRawTimeMs} ms)</small></td>
                <td>
                  ${myMetrics.totalRawTimeMs < oppMetrics.totalRawTimeMs
                    ? `<span style="color:#16a34a;font-weight:800;">⚡ Sen Daha Hızlısın (-${((oppMetrics.totalRawTimeMs - myMetrics.totalRawTimeMs) / 1000).toFixed(2)} sn)</span>`
                    : (oppMetrics.totalRawTimeMs < myMetrics.totalRawTimeMs
                      ? `<span style="color:#dc2626;font-weight:800;">Rakip Daha Hızlı (-${((myMetrics.totalRawTimeMs - oppMetrics.totalRawTimeMs) / 1000).toFixed(2)} sn)</span>`
                      : 'Eşit')}
                </td>
              </tr>
              <tr>
                <td class="metric-label">Ortalama Yanıt Hızı (Soru Başına)</td>
                <td><strong>${myMetrics.avgRawTimeSec} sn / soru</strong></td>
                <td><strong>${oppMetrics.avgRawTimeSec} sn / soru</strong></td>
                <td>${Number(myMetrics.avgRawTimeSec) <= Number(oppMetrics.avgRawTimeSec) ? '⚡ Sen' : 'Rakip'}</td>
              </tr>
              <tr>
                <td class="metric-label">Efektif Süre (Yanlış Cezaları Dahil)</td>
                <td><strong>${myMetrics.totalEffectiveTimeSec} sn</strong></td>
                <td><strong>${oppMetrics.totalEffectiveTimeSec} sn</strong></td>
                <td>${myMetrics.totalEffectiveTimeMs <= oppMetrics.totalEffectiveTimeMs ? '✓ Sen Avantajlısın' : 'Rakip Avantajlı'}</td>
              </tr>
              <tr>
                <td class="metric-label">Net Maç Puanı &amp; En Yüksek Seri</td>
                <td><strong>${state.match.myScore} Puan</strong> <small class="muted">(🔥 ${state.match.myBestStreak}x)</small></td>
                <td><strong>${state.match.oppScore} Puan</strong> <small class="muted">(🔥 ${state.match.oppBestStreak}x)</small></td>
                <td>${state.match.myScore >= state.match.oppScore ? '✓ Sen' : 'Rakip'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Maçta Sorulan Kelimelerin Soru Bazlı Süre & Doğruluk İncelemesi -->
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:20px;margin-bottom:24px;">
          <h4 style="margin:0 0 12px;color:#102343;font-size:16px;">📚 Soru Bazlı Yanıt Süresi ve Doğruluk Karşılaştırması</h4>
          <div class="wg-review-list">
            ${state.match.questions.map((q, i) => {
              const myA = state.match.myAnswers[i];
              const oppA = state.match.oppAnswers[i];
              const myChoiceText = myA && myA.choiceIndex >= 0 ? q.options[myA.choiceIndex] : 'Boş (Süre Doldu)';
              const oppChoiceText = oppA && oppA.choiceIndex >= 0 ? q.options[oppA.choiceIndex] : 'Boş (Süre Doldu)';
              const myTimeStr = myA ? `${Number(myA.timeSpentSec).toFixed(2)} sn` : '-';
              const oppTimeStr = oppA ? `${Number(oppA.timeSpentSec).toFixed(2)} sn` : '-';
              return `
                <div class="wg-review-item">
                  <div style="flex:1;min-width:240px;">
                    <span style="font-size:11px;font-weight:800;color:#1d4ed8;background:#eff6ff;padding:3px 8px;border-radius:6px;">
                      Soru ${i + 1} • ${escapeHtml(q.dialect)}
                    </span>
                    <strong style="font-size:14.5px;color:#102343;margin-left:6px;">
                      "${escapeHtml(q.word)}" → <span style="color:#15803d;">${escapeHtml(q.options[q.correctIndex])}</span>
                    </strong>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">${escapeHtml(q.hint)}</div>
                  </div>
                  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:12px;font-weight:800;">
                    <div style="background:${myA?.isCorrect ? '#f0fdf4' : '#fef2f2'};border:1px solid ${myA?.isCorrect ? '#bbf7d0' : '#fecaca'};padding:6px 10px;border-radius:10px;color:${myA?.isCorrect ? '#166534' : '#991b1b'};">
                      Sen: ${myA?.isCorrect ? '✓' : '✕'} ${escapeHtml(myChoiceText)} (${myTimeStr})
                    </div>
                    <div style="background:${oppA?.isCorrect ? '#f0fdf4' : '#fef2f2'};border:1px solid ${oppA?.isCorrect ? '#bbf7d0' : '#fecaca'};padding:6px 10px;border-radius:10px;color:${oppA?.isCorrect ? '#166534' : '#991b1b'};">
                      ${escapeHtml(opp.name.split(' ')[0])}: ${oppA?.isCorrect ? '✓' : '✕'} ${escapeHtml(oppChoiceText)} (${oppTimeStr})
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Alt Butonlar: Rövanş & Ana Menüye Dön -->
        <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
          <button type="button" class="wg-btn-ghost" id="wgBtnReturnMenu" style="padding:14px 24px;font-size:14.5px;">
            🏠 Oyun Ana Menüsüne Dön
          </button>
          <button type="button" class="wg-btn-primary" id="wgBtnRematch" style="width:auto;min-width:240px;">
            <span>🔄</span>
            <span>Rövanş / Sıfırdan Yeni Maç Başlat</span>
          </button>
        </div>
      </div>
    `;
  }

  // --- 11. DOM ETKİLEŞİMLERİ VE EVENT LISTENER BAĞLANTILARI ---
  function bindStageEvents() {
    // Ses Aç / Kapat
    document.getElementById('wgToggleSoundBtn')?.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      render();
    });

    // Oyuncu ID Kopyala
    document.getElementById('wgCopyMyIdBtn')?.addEventListener('click', e => {
      const btn = e.currentTarget;
      navigator.clipboard?.writeText(state.me.playerId).catch(() => {});
      btn.textContent = '✓ Kopyalandı!';
      setTimeout(() => { btn.textContent = '📋 ID Kopyala'; }, 1800);
    });

    // Tur Soru Sayısı Seçimi (5 / 10)
    document.querySelectorAll('[data-round-count]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.roundCount = Number(btn.dataset.roundCount || 5);
        render();
      });
    });

    // Soru Süresi Seçimi (10 / 15 sn)
    document.querySelectorAll('[data-time-sec]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.timePerQuestion = Number(btn.dataset.timeSec || 15);
        render();
      });
    });

    // Lehçe Filtresi
    document.getElementById('wgDialectSelect')?.addEventListener('change', e => {
      state.settings.dialectFilter = e.target.value;
    });

    // Mod A: Quick Match Başlat
    document.getElementById('wgBtnStartQuickMatch')?.addEventListener('click', startQuickMatchSearch);

    // Quick Match İptal
    document.getElementById('wgBtnCancelSearch')?.addEventListener('click', () => {
      clearMatchTimers();
      state.view = 'MENU';
      render();
    });

    // Mod B: Yeni Özel Oda Kur
    document.getElementById('wgBtnCreatePrivateRoom')?.addEventListener('click', () => {
      createPrivateFriendRoom(null);
    });

    // Mod B: Arkadaş ID veya Oda Kodu ile Katıl
    document.getElementById('wgBtnJoinByCode')?.addEventListener('click', () => {
      const val = document.getElementById('wgFriendCodeInput')?.value;
      handleJoinByCodeOrFriendId(val);
    });

    document.getElementById('wgFriendCodeInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleJoinByCodeOrFriendId(e.target.value);
      }
    });

    // Hızlı Çevrim İçi Arkadaş Çipleri (Ana Menü)
    document.querySelectorAll('[data-quick-friend-id]').forEach(chip => {
      chip.addEventListener('click', () => {
        const friendId = chip.dataset.quickFriendId;
        const peer = ONLINE_PEERS.find(p => p.playerId === friendId);
        createPrivateFriendRoom(peer || null);
      });
    });

    // Özel Lobi: Oda Kodu & Davet Bağlantısı Kopyala
    document.getElementById('wgCopyRoomCodeBtn')?.addEventListener('click', e => {
      if (!state.room) return;
      const btn = e.currentTarget;
      navigator.clipboard?.writeText(state.room.roomId).catch(() => {});
      btn.textContent = '✓ Oda Kodu Kopyalandı!';
      setTimeout(() => { btn.textContent = '📋 Oda Kodunu Kopyala'; }, 1800);
    });

    document.getElementById('wgCopyInviteLinkBtn')?.addEventListener('click', e => {
      if (!state.room) return;
      const btn = e.currentTarget;
      const url = `${location.origin}${location.pathname}#wordgame?room=${encodeURIComponent(state.room.roomId)}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      btn.textContent = '✓ Link Kopyalandı!';
      setTimeout(() => { btn.textContent = '🔗 Davet Linki'; }, 1800);
    });

    // Özel Lobi: Arkadaş ID ile Davet Et
    document.getElementById('wgBtnLobbyInviteId')?.addEventListener('click', () => {
      const val = document.getElementById('wgLobbyInviteIdInput')?.value;
      inviteFriendInsideLobby(val);
    });

    document.querySelectorAll('[data-lobby-invite-peer]').forEach(chip => {
      chip.addEventListener('click', () => {
        inviteFriendInsideLobby(chip.dataset.lobbyInvitePeer);
      });
    });

    // Özel Lobi: Odadan Ayrıl
    document.getElementById('wgBtnLeaveLobby')?.addEventListener('click', () => {
      clearMatchTimers();
      state.room = null;
      state.view = 'MENU';
      render();
    });

    // Özel Lobi: Kurucu "Oyunu Başlat"
    document.getElementById('wgBtnHostStartGame')?.addEventListener('click', hostStartFriendMatch);

    // Oyun Ekranı: Şık Seçimi (A, B, C)
    document.querySelectorAll('[data-option-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.optionIndex);
        submitMyAnswer(idx);
      });
    });

    // Oyun Ekranı: Maçtan Çık
    document.getElementById('wgBtnAbortMatch')?.addEventListener('click', () => {
      clearMatchTimers();
      state.view = 'MENU';
      render();
    });

    // Sonuç Ekranı: Ana Menüye Dön
    document.getElementById('wgBtnReturnMenu')?.addEventListener('click', () => {
      clearMatchTimers();
      state.view = 'MENU';
      render();
    });

    // Sonuç Ekranı: Rövanş / Tekrar Oyna
    document.getElementById('wgBtnRematch')?.addEventListener('click', () => {
      if (!state.room) {
        startQuickMatchSearch();
        return;
      }
      const newSeed = `${state.room.roomId}-${Date.now()}`;
      const newQuestionIds = selectQuestionIdsForRoom(
        newSeed,
        state.room.roundCount || state.settings.roundCount,
        state.room.dialectFilter || state.settings.dialectFilter
      );
      state.room.seed = newSeed;
      state.room.questionIds = newQuestionIds;
      state.room.status = 'playing';

      if (state.match.isLiveHumanPeer) {
        writeLocalRoom(state.room);
        sendRealtimePacket('MATCH_REMATCH', { room: state.room });
      }
      beginMatchCountdown(state.room);
    });
  }

  // Klavye Kısayolları (1/A, 2/B, 3/C)
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (state.view !== 'PLAYING') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const key = e.key.toUpperCase();
      if (key === '1' || key === 'A') submitMyAnswer(0);
      else if (key === '2' || key === 'B') submitMyAnswer(1);
      else if (key === '3' || key === 'C') submitMyAnswer(2);
    });
  }

  // --- 12. VERİTABANI (JSON) YÜKLEME VE BAŞLATMA ---
  async function loadQuestionBank() {
    try {
      const res = await fetch('./data/word-game-questions.json?v=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
          state.questions = data.questions;
        }
      }
    } catch (e) {
      // file:// protokolünde veya çevrimdışı modda FALLBACK_QUESTIONS otomatik devreye girer
    }
  }

  function checkUrlInviteRoom() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#wordgame?room=')) {
      const roomCode = decodeURIComponent(hash.split('=')[1] || '').trim();
      if (roomCode) {
        setTimeout(() => {
          if (window.TDATabs) window.TDATabs.setTab('wordgame');
          handleJoinByCodeOrFriendId(roomCode);
        }, 300);
      }
    }
  }

  function init() {
    initPlayerIdentity();
    loadStats();
    initRealtimeTransport();
    initKeyboardShortcuts();
    loadQuestionBank().then(() => {
      render();
      checkUrlInviteRoom();
    });

    window.addEventListener('tda:profileUpdated', () => {
      initPlayerIdentity();
      if (state.view === 'MENU') render();
    });

    window.addEventListener('tda:languageChanged', () => {
      if (state.view === 'MENU') render();
    });
  }

  function openGameTab() {
    if (window.TDATabs) {
      window.TDATabs.setTab('wordgame');
    } else {
      const el = document.getElementById('kelime-oyunu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return {
    init,
    openGameTab,
    startQuickMatchSearch,
    createPrivateFriendRoom
  };
})();
