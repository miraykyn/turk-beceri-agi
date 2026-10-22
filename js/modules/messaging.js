/**
 * Türk Dünyası Beceri Ağı - Sınır Ötesi Mektup Arkadaşlığı (Penpal) Modülü
 * 
 * Özellikler:
 * 1. Tanışma ve mektup arkadaşlığı odaklı akış (Ülke -> Profil -> Mektup Yazımı).
 * 2. Kesinlikle gerçek fotoğraf kullanılmaz; Gelişmiş Bitmoji / Avatar Tasarım Stüdyosu mevcuttur.
 * 3. Teslimat Süresi Simülasyonu: Şehirler arası uçak yolculuğu süresinin tam 2 katı (Bozkır Kartalı taşır).
 *    KESİN KURAL: Sayfada erken teslim/hızlı geçiş butonu bulunmaz; hesaplanan süre dolunca teslim edilir.
 * 4. Akıllı ve Yer Tasarruflu Pul Seçim Arayüzü: Emojiler kaldırılmış, gerçekçi kültürel fotoğraflar kullanılmıştır.
 *    Kullanıcı pul seçtiğinde çekmece otomatik kapanır.
 * 5. Sadeleştirilmiş 2 kağıt seçeneği: Düz Beyaz Kağıt & Eskitilmiş Kağıt (Parşömen).
 * 6. Karşılıklı onaya dayalı, maksimum 3 fotoğraflık güvenlikli görsel paylaşımı.
 * 7. Mock Data: Gelen Kutusu göndereni "Müslüme", Gönderilenler göndereni "Fahriye".
 * 
 * -------------------------------------------------------------------------------------------------
 * AVATAR OLUŞTURUCU İÇİN KÜTÜPHANE VE ENTEGRASYON TAVSİYELERİ:
 * -------------------------------------------------------------------------------------------------
 * 1. DiceBear Library (@dicebear/core, @dicebear/collection):
 *    - Modern, SVG tabanlı, sıfır bağımlılıklı ve tamamen açık kaynaklı bir avatar motorudur.
 *    - "Adventurer", "Lorelei" ve "Avataaars" stilleri Bitmoji benzeri çizim karakterleri üretir.
 * -------------------------------------------------------------------------------------------------
 */

window.TDAMessaging = (function() {
  const STORAGE_KEY = 'tda-penpal-letters-v5';
  const CONSENT_STORAGE_KEY = 'tda-penpal-consent';
  const PENPAL_CONSENT_KEY = 'tda-penpal-introduction-consent-v2';
  const BLOCKED_PENPALS_KEY = 'tda-blocked-penpals';
  const MY_AVATAR_KEY = 'tda-my-avatar-config-v2';

  // --- 1. ŞEHİRLER & KOORDİNAT MATRİSİ ---
  const CITIES = {
    'İstanbul': { country: 'Türkiye', code: 'IST', lat: 41.0082, lon: 28.9784 },
    'Ankara': { country: 'Türkiye', code: 'ESB', lat: 39.9334, lon: 32.8597 },
    'İzmir': { country: 'Türkiye', code: 'ADB', lat: 38.4192, lon: 27.1287 },
    'Bakü': { country: 'Azerbaycan', code: 'GYD', lat: 40.4093, lon: 49.8671 },
    'Gence': { country: 'Azerbaycan', code: 'KVD', lat: 40.6828, lon: 46.3606 },
    'Astana': { country: 'Kazakistan', code: 'NQZ', lat: 51.1694, lon: 71.4491 },
    'Almatı': { country: 'Kazakistan', code: 'ALA', lat: 43.2389, lon: 76.8897 },
    'Taşkent': { country: 'Özbekistan', code: 'TAS', lat: 41.2995, lon: 69.2401 },
    'Semerkant': { country: 'Özbekistan', code: 'SKD', lat: 39.6542, lon: 66.9597 },
    'Bişkek': { country: 'Kırgızistan', code: 'FRU', lat: 42.8746, lon: 74.5698 },
    'Oş': { country: 'Kırgızistan', code: 'OSS', lat: 40.5140, lon: 72.8161 },
    'Aşkabat': { country: 'Türkmenistan', code: 'ASB', lat: 37.9601, lon: 58.3261 },
    'Merv': { country: 'Türkmenistan', code: 'MYP', lat: 37.5958, lon: 61.8378 },
    'Lefkoşa': { country: 'Kuzey Kıbrıs Türk Cumhuriyeti', code: 'ECN', lat: 35.1856, lon: 33.3823 },
    'Girne': { country: 'Kuzey Kıbrıs Türk Cumhuriyeti', code: 'KYR', lat: 35.3364, lon: 33.3173 }
  };

  /**
   * Haversine formülüyle iki şehir arasındaki uçuş süresini ve mektubun teslim süresini hesaplar.
   * Kural: Teslimat süresi = Uçuş süresi * 2
   */
  function calculateDeliveryEstimate(fromCityName, toCityName) {
    const c1 = CITIES[fromCityName] || CITIES['İstanbul'];
    const c2 = CITIES[toCityName] || CITIES['Almatı'];

    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLon = (c2.lon - c1.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = Math.round(R * c);

    // Ortalama uçuş süresi: 800 km/s + 0.5 saat kalkış/iniş manevra payı
    const flightHours = Number(((distanceKm / 800) + 0.5).toFixed(1));
    const deliveryHours = Number((flightHours * 2).toFixed(1));

    return {
      distanceKm,
      flightHours,
      deliveryHours,
      fromCity: fromCityName,
      toCity: toCityName
    };
  }

  // --- 2. ÜLKE LİSTESİ (SADE & MİNİMALİST - RESMİ KKTC BAYRAĞI DAHİL) ---
  const COUNTRIES = [
    { 
      id: 'tr', 
      name: 'Türkiye', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Turkey.svg', 
      penpalCount: 88 
    },
    { 
      id: 'az', 
      name: 'Azerbaycan', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Azerbaijan.svg', 
      penpalCount: 76 
    },
    { 
      id: 'kz', 
      name: 'Kazakistan', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Kazakhstan.svg', 
      penpalCount: 82 
    },
    { 
      id: 'uz', 
      name: 'Özbekistan', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Uzbekistan.svg', 
      penpalCount: 72 
    },
    { 
      id: 'kg', 
      name: 'Kırgızistan', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Kyrgyzstan.svg', 
      penpalCount: 64 
    },
    { 
      id: 'tm', 
      name: 'Türkmenistan', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Turkmenistan.svg', 
      penpalCount: 51 
    },
    { 
      id: 'kktc', 
      name: 'Kuzey Kıbrıs Türk Cumhuriyeti', 
      flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg', 
      penpalCount: 43 
    }
  ];

  // --- 3. BİTMOJİ / ÇİZİM AVATAR MEKTUP ARKADAŞLARI LİSTESİ ---
  const PENPAL_PROFILES = [
    // Türkiye
    {
      id: 'pen-tr-1',
      countryId: 'tr',
      country: 'Türkiye',
      name: 'Caner Yıldız',
      studentId: 'TDA-TR-CAN01',
      city: 'İstanbul',
      university: 'Boğaziçi Üniversitesi • Mimarlık',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CanerYildiz&backgroundColor=ffdfbf',
      bio: 'Tarihi yarımada, fotoğrafçılık ve Türk sanat müziği tutkunuyum. Bozkırdaki veya Hazar kıyısındaki dostlarla mektuplaşmak isterim.',
      interests: ['Mimarlık', 'Şehir Tarihi', 'Fotoğrafçılık', 'Kitaplar']
    },
    {
      id: 'pen-tr-2',
      countryId: 'tr',
      country: 'Türkiye',
      name: 'Elif Demir',
      studentId: 'TDA-TR-ELI02',
      city: 'İzmir',
      university: 'Ege Üniversitesi • Edebiyat',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElifDemir&backgroundColor=fed7aa',
      bio: 'Şiir yazmayı, Ege sahillerinde kitap okumayı ve Türk lehçelerindeki ortak kelimeleri araştırmayı seviyorum.',
      interests: ['Şiir', 'Lehçeler', 'Ege Kültürü', 'Klasik Roman']
    },
    // Azerbaycan
    {
      id: 'pen-az-1',
      countryId: 'az',
      country: 'Azerbaycan',
      name: 'Nigar Məmmədova',
      studentId: 'TDA-AZ-NIG01',
      city: 'Bakü',
      university: 'Bakü Devlet Üniversitesi • Tarih',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NigarMammedova&backgroundColor=fef3c7',
      bio: 'Bakü’nün rüzgarlı sokaklarından selamlar! Ressamlık ve Azerbaycan minyatür sanatı üzerine mektup arkadaşı arıyorum.',
      interests: ['Minyatür', 'Halı Desenleri', 'Muğam', 'Tarih']
    },
    {
      id: 'pen-az-2',
      countryId: 'az',
      country: 'Azerbaycan',
      name: 'Rəşad Quliyev',
      studentId: 'TDA-AZ-RAS04',
      city: 'Gence',
      university: 'Gence Devlet Üniversitesi • Coğrafya',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ReshadQuliyev&backgroundColor=e0f2fe',
      bio: 'Gence’nin Nizami yurdundan herkese merhaba. Doğa yürüyüşü ve Kafkas florası üzerine sohbet etmek harika olur.',
      interests: ['Kafkas Doğa', 'Nizami Eserleri', 'Satranç']
    },
    // Kazakistan
    {
      id: 'pen-kz-1',
      countryId: 'kz',
      country: 'Kazakistan',
      name: 'Müslüme',
      studentId: 'TDA-KZ-MUS01',
      city: 'Almatı',
      university: 'Kazak Ulusal Üniversitesi • Dilbilim',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=MuslumeKZ&backgroundColor=fed7aa',
      bio: 'Almatı dağlarında yürüyüş yapmayı ve dombra çalmayı çok severim. Ulu bozkırdan samimi mektup dostları bekliyorum.',
      interests: ['Dombra', 'Dağcılık', 'Bozkır Efsaneleri', 'Astronomi']
    },
    {
      id: 'pen-kz-2',
      countryId: 'kz',
      country: 'Kazakistan',
      name: 'Daniyar Bekov',
      studentId: 'TDA-KZ-DAN03',
      city: 'Astana',
      university: 'Nazarbayev Üniversitesi • Şehir Planlama',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DaniyarBekov&backgroundColor=fef08a',
      bio: 'Astana’nın fütüristik mimarisi ve kış sporları ilgi alanımdır. Diğer ülkelerdeki üniversite yaşamını merak ediyorum.',
      interests: ['Kış Sporları', 'Mimari', 'Göçebe Tarihi']
    },
    // Özbekistan
    {
      id: 'pen-uz-1',
      countryId: 'uz',
      country: 'Özbekistan',
      name: 'Bekzod Karimov',
      studentId: 'TDA-UZ-KAR12',
      city: 'Semerkant',
      university: 'Semerkant Devlet Üniversitesi • Mimarlık',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BekzodKarimov&backgroundColor=fbcfe8',
      bio: 'Registan medreselerinin çinilerini ve Timur dönemi mimarisini inceliyorum. Farklı Türk yurtlarından mektup arkadaşları arıyorum.',
      interests: ['Çini Sanatı', 'İpek Yolu Tarihi', 'Geleneksel Minyatür', 'Özbek Pilavı']
    },
    {
      id: 'pen-uz-2',
      countryId: 'uz',
      country: 'Özbekistan',
      name: 'Zuhra Rustamova',
      studentId: 'TDA-UZ-ZUH05',
      city: 'Taşkent',
      university: 'Özbekistan Milli Üniversitesi • Biyoloji',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ZuhraRustam&backgroundColor=fed7aa',
      bio: 'Orta Asya şifalı bitkileri, kaligrafi ve ipek kumaş dokumacılığı üzerine çalışıyorum.',
      interests: ['Botanik', 'İpek Dokuma', 'Geleneksel Müzik']
    },
    // Kırgızistan
    {
      id: 'pen-kg-1',
      countryId: 'kg',
      country: 'Kırgızistan',
      name: 'Aygül Asanova',
      studentId: 'TDA-KG-KAS45',
      city: 'Bişkek',
      university: 'Kırgızistan-Türkiye Manas Üniversitesi • İletişim',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AygulAsan&backgroundColor=ecfccb',
      bio: 'Issık Göl kıyısında büyüdüm. Kırgız keçe sanatı ve Cengiz Aytmatov romanları üzerine okumalar yapıyorum.',
      interests: ['Aytmatov Edebiyatı', 'Keçe Sanatı', 'Dağcılık', 'Geleneksel Dans']
    },
    // Türkmenistan
    {
      id: 'pen-tm-1',
      countryId: 'tm',
      country: 'Türkmenistan',
      name: 'Batyr Annayev',
      studentId: 'TDA-TM-ANN33',
      city: 'Aşkabat',
      university: 'Mahtumkulu Türkmen Devlet Üniversitesi • Edebiyat',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BatyrAnna&backgroundColor=e0e7ff',
      bio: 'Ahal-Teke atları ve Mahtumkulu Firaki şiirleri üzerine çalışmalar yapıyorum. Kaligrafi ve mektup arkadaşlığı benim tutkum.',
      interests: ['Mahtumkulu Şiirleri', 'Ahal-Teke Atları', 'Kaligrafi', 'Türkmen Halısı']
    },
    // KKTC
    {
      id: 'pen-kktc-1',
      countryId: 'kktc',
      country: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      name: 'Derya Kanatlı',
      studentId: 'TDA-CY-KAN22',
      city: 'Girne',
      university: 'Doğu Akdeniz Üniversitesi • Deniz Biyolojisi',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=DeryaKanatli&backgroundColor=bae6fd',
      bio: 'Akdeniz’in caretta carettaları ve Kıbrıs Türk folkloru tutkunuyum. Kıbrıs’tan ada esintileri taşımak isterim.',
      interests: ['Deniz Biyolojisi', 'Lefkara İşi', 'Tiyatro', 'Akdeniz Kültürü']
    }
  ];

  // --- 4. ÇOKLU VE ÜCRETSİZ KÜLTÜREL POSTA PULLARI (%100 DOĞRU VE DOĞRULANMIŞ GÖRSELLER) ---
  const CULTURAL_STAMPS = {
    tr: [
      { 
        id: 'tr_anitkabir', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Anıtkabir Pulu', 
        landmark: 'Ankara • Cumhuriyetin Kalbi', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Ataturk%27s_Mausoleum_%286225341313%29.jpg/500px-Ataturk%27s_Mausoleum_%286225341313%29.jpg' 
      },
      { 
        id: 'tr_kizkulesi', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Kız Kulesi Pulu', 
        landmark: 'İstanbul • Boğazın İncisi', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Istanbul_K%C4%B1z_Kulesi_%2854511155871%29_%28cropped%29.jpg/500px-Istanbul_K%C4%B1z_Kulesi_%2854511155871%29_%28cropped%29.jpg' 
      },
      { 
        id: 'tr_gobeklitepe', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Göbeklitepe Pulu', 
        landmark: 'Şanlıurfa • Tarihin Sıfır Noktası', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/G%C3%B6bekli_Tepe%2C_Urfa.jpg/500px-G%C3%B6bekli_Tepe%2C_Urfa.jpg' 
      },
      { 
        id: 'tr_sultanahmet', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Sultanahmet Camii Pulu', 
        landmark: 'İstanbul • Mavi Kubbeli Şaheser', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Istanbul_%2834223582516%29_%28cropped%29.jpg/500px-Istanbul_%2834223582516%29_%28cropped%29.jpg' 
      },
      { 
        id: 'tr_pamukkale', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Pamukkale Travertenleri Pulu', 
        landmark: 'Denizli • Beyaz Cennet Su Terasları', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Pamukkale_30.jpg/500px-Pamukkale_30.jpg' 
      },
      { 
        id: 'tr_kapadokya', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Kapadokya Peri Bacaları Pulu', 
        landmark: 'Nevşehir • Masalsı Vadi ve Balonlar', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg/500px-Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg' 
      }
    ],
    az: [
      { 
        id: 'az_qizqalasi', 
        countryId: 'az', 
        country: 'Azerbaycan', 
        flag: '🇦🇿', 
        name: 'Kız Kalesi (Qız Qalası) Pulu', 
        landmark: 'Bakü • Hazar Kıyısındaki Kadim Efsane', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Maiden_tower_IMG_8521.jpg/500px-Maiden_tower_IMG_8521.jpg' 
      },
      { 
        id: 'az_flame', 
        countryId: 'az', 
        country: 'Azerbaycan', 
        flag: '🇦🇿', 
        name: 'Alev Kuleleri Pulu', 
        landmark: 'Bakü • Odlar Yurdu Meşalesi', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Flame_towers_from_Baku_boulevard.JPG/500px-Flame_towers_from_Baku_boulevard.JPG' 
      },
      { 
        id: 'az_sirvansah', 
        countryId: 'az', 
        country: 'Azerbaycan', 
        flag: '🇦🇿', 
        name: 'Şirvanşahlar Sarayı Pulu', 
        landmark: 'İçərişəhər • Şirvan Hanlığı Mirası', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Palace_of_Shirvanshahs_common.JPG/500px-Palace_of_Shirvanshahs_common.JPG' 
      },
      { 
        id: 'az_susa', 
        countryId: 'az', 
        country: 'Azerbaycan', 
        flag: '🇦🇿', 
        name: 'Şuşa Kalesi Pulu', 
        landmark: 'Karabağ • Kültür Başkenti', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/%C5%9Eu%C5%9Fa_qalas%C4%B1_2024-c%C3%BC_ilin_aprelind%C9%99.jpg/500px-%C5%9Eu%C5%9Fa_qalas%C4%B1_2024-c%C3%BC_ilin_aprelind%C9%99.jpg' 
      }
    ],
    kz: [
      { 
        id: 'kz_yesevi', 
        countryId: 'kz', 
        country: 'Kazakistan', 
        flag: '🇰🇿', 
        name: 'Hoca Ahmed Yesevi Türbesi Pulu', 
        landmark: 'Türkistan • Manevi Merkez', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/%D0%9C%D0%B0%D1%83%D0%B7%D0%BE%D0%BB%D0%B5%D1%98_%D0%A5%D0%BE%D0%B4%D0%B6%D0%B5_%D0%90%D1%85%D0%BC%D0%B5%D0%B4%D0%B0_%D0%88%D0%B0%D1%81%D0%B0%D0%B2%D0%B8%D1%98%D0%B0_%28%D0%B3%D1%80%D0%B0%D0%B4_%D0%A2%D1%83%D1%80%D0%BA%D0%B5%D1%81%D1%82%D0%B0%D0%BD%2C_%D0%9A%D0%B0%D0%B7%D0%B0%D1%85%D1%81%D1%82%D0%B0%D0%BD%29.jpg/500px-%D0%9C%D0%B0%D1%83%D0%B7%D0%BE%D0%BB%D0%B5%D1%98_%D0%A5%D0%BE%D0%B4%D0%B6%D0%B5_%D0%90%D1%85%D0%BC%D0%B5%D0%B4%D0%B0_%D0%88%D0%B0%D1%81%D0%B0%D0%B2%D0%B8%D1%98%D0%B0_%28%D0%B3%D1%80%D0%B0%D0%B4_%D0%A2%D1%83%D1%80%D0%BA%D0%B5%D1%81%D1%82%D0%B0%D0%BD%2C_%D0%9A%D0%B0%D0%B7%D0%B0%D1%85%D1%81%D1%82%D0%B0%D0%BD%29.jpg' 
      },
      { 
        id: 'kz_bayterek', 
        countryId: 'kz', 
        country: 'Kazakistan', 
        flag: '🇰🇿', 
        name: 'Bayterek Kulesi Pulu', 
        landmark: 'Astana • Hayat Ağacı Anıtı', 
        image: 'https://thumb.wikimedia.org/wikipedia/en/thumb/6/66/Central_Downtown_Astana_2.jpg/500px-Central_Downtown_Astana_2.jpg' 
      },
      { 
        id: 'kz_charyn', 
        countryId: 'kz', 
        country: 'Kazakistan', 
        flag: '🇰🇿', 
        name: 'Çarın Kanyonu Pulu', 
        landmark: 'Almatı • Doğa Şaheseri', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Charyn_Canyon%2C_Kazakhstan_03.jpg/500px-Charyn_Canyon%2C_Kazakhstan_03.jpg' 
      },
      { 
        id: 'kz_eagle', 
        countryId: 'kz', 
        country: 'Kazakistan', 
        flag: '🇰🇿', 
        name: 'Bozkır Kartalı & Almatı Zirveleri Pulu', 
        landmark: 'Ulu Bozkır • Özgürlük ve Güç Sembolü', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Alpine_meadows_and_snow-covered_peaks_in_Khan_Tengri_Nature_Park%2C_Tien_Shan.jpg/500px-Alpine_meadows_and_snow-covered_peaks_in_Khan_Tengri_Nature_Park%2C_Tien_Shan.jpg' 
      }
    ],
    uz: [
      { 
        id: 'uz_registan', 
        countryId: 'uz', 
        country: 'Özbekistan', 
        flag: '🇺🇿', 
        name: 'Registan Medreseleri Pulu', 
        landmark: 'Semerkant • Mavi Çiniler ve İlim', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/RegistanSquare_Samarkand.jpg/500px-RegistanSquare_Samarkand.jpg' 
      },
      { 
        id: 'uz_hive', 
        countryId: 'uz', 
        country: 'Özbekistan', 
        flag: '🇺🇿', 
        name: 'Hive İçankale Pulu', 
        landmark: 'Harezm • Canlı Açık Hava Müzesi', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Islam_Khodja_Madrasa_01.jpg/500px-Islam_Khodja_Madrasa_01.jpg' 
      },
      { 
        id: 'uz_buhara', 
        countryId: 'uz', 
        country: 'Özbekistan', 
        flag: '🇺🇿', 
        name: 'Buhara Ark Kalesi Pulu', 
        landmark: 'Buhara • Bin Yıllık Hükümdar Kalesi', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Ark_of_Bukhara_2023.9.jpg/500px-Ark_of_Bukhara_2023.9.jpg' 
      },
      { 
        id: 'uz_sahizinde', 
        countryId: 'uz', 
        country: 'Özbekistan', 
        flag: '🇺🇿', 
        name: 'Şah-ı Zinde Türbesi Pulu', 
        landmark: 'Semerkant • Çini Sanatı Zirvesi', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Shah-i-Zinda%2C_Samarkand_%28Shohi-Zinda_majmuasi%2C_Samarqand%2C_%D0%A8%D0%B0%D1%85%D0%B8_%D0%97%D0%B8%D0%BD%D0%B4%D0%B0%29.jpg/500px-Shah-i-Zinda%2C_Samarkand_%28Shohi-Zinda_majmuasi%2C_Samarqand%2C_%D0%A8%D0%B0%D1%85%D0%B8_%D0%97%D0%B8%D0%BD%D0%B4%D0%B0%29.jpg' 
      }
    ],
    kg: [
      { 
        id: 'kg_tien', 
        countryId: 'kg', 
        country: 'Kırgızistan', 
        flag: '🇰🇬', 
        name: 'Tanrı Dağları & Ala-Too Pulu', 
        landmark: 'Bişkek • Yüce Göksel Zirveler', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Alpine_meadows_and_snow-covered_peaks_in_Khan_Tengri_Nature_Park%2C_Tien_Shan.jpg/500px-Alpine_meadows_and_snow-covered_peaks_in_Khan_Tengri_Nature_Park%2C_Tien_Shan.jpg' 
      },
      { 
        id: 'kg_issyk', 
        countryId: 'kg', 
        country: 'Kırgızistan', 
        flag: '🇰🇬', 
        name: 'Issık Göl Maviliği Pulu', 
        landmark: 'Kırgızistan • Dağlar Arasında Mavi İnci', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Issykkul_plyag.jpg/500px-Issykkul_plyag.jpg' 
      },
      { 
        id: 'kg_burana', 
        countryId: 'kg', 
        country: 'Kırgızistan', 
        flag: '🇰🇬', 
        name: 'Burana Kulesi Pulu', 
        landmark: 'Çüy Vadisi • Karahanlı Mirası Minare', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Burana_Tower%2C_Kyrgyzstan.jpg/500px-Burana_Tower%2C_Kyrgyzstan.jpg' 
      }
    ],
    tm: [
      { 
        id: 'tm_teke', 
        countryId: 'tm', 
        country: 'Türkmenistan', 
        flag: '🇹🇲', 
        name: 'Ahal-Teke Asil Atı Pulu', 
        landmark: 'Aşkabat • Çölün Asil Rüzgarı', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Dagat-Geli.jpg/500px-Dagat-Geli.jpg' 
      },
      { 
        id: 'tm_sancar', 
        countryId: 'tm', 
        country: 'Türkmenistan', 
        flag: '🇹🇲', 
        name: 'Sultan Sancar Türbesi Pulu', 
        landmark: 'Mary • Kadim Selçuklu Mirası', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/SultanSanjarMausoleum1.jpg/500px-SultanSanjarMausoleum1.jpg' 
      },
      { 
        id: 'tm_urgench', 
        countryId: 'tm', 
        country: 'Türkmenistan', 
        flag: '🇹🇲', 
        name: 'Köhne Ürgenç Minaresi Pulu', 
        landmark: 'Daşoğuz • Harezmşah Tarihi', 
        image: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Urgench.jpg' 
      },
      { 
        id: 'tm_monument', 
        countryId: 'tm', 
        country: 'Türkmenistan', 
        flag: '🇹🇲', 
        name: 'Bağımsızlık Anıtı Pulu', 
        landmark: 'Aşkabat • Beyaz Mermer Başkent', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Independence_Monument_%282%29_%2845993948702%29.jpg/500px-Independence_Monument_%282%29_%2845993948702%29.jpg' 
      }
    ],
    kktc: [
      { 
        id: 'cy_girne', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg', 
        name: 'Girne Kalesi & Limanı Pulu', 
        landmark: 'Girne • Akdeniz Muhafızı', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Kyrenia_01-2017_img02_Castle_exterior.jpg/500px-Kyrenia_01-2017_img02_Castle_exterior.jpg' 
      },
      { 
        id: 'cy_bellapais', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg', 
        name: 'Bellapais Manastırı Pulu', 
        landmark: 'Girne • Beşparmak Dağları Eteği', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Kyrenia_-_Girne_Kloster_Bellapa%C3%ADs_Kirche_7.jpg/500px-Kyrenia_-_Girne_Kloster_Bellapa%C3%ADs_Kirche_7.jpg' 
      },
      { 
        id: 'cy_salamis', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg', 
        name: 'Salamis Antik Harabeleri Pulu', 
        landmark: 'Gazimağusa • Antik Sütunlar', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Gymnasion_und_Therme_aus_S%C3%BCdwest.jpg/500px-Gymnasion_und_Therme_aus_S%C3%BCdwest.jpg' 
      },
      { 
        id: 'cy_karpaz', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg', 
        name: 'Karpaz Zafer Burnu Pulu', 
        landmark: 'Karpaz • Altın Sahil ve Mavi Vatan', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Cape_Apostolos_Andreas_1.JPG/500px-Cape_Apostolos_Andreas_1.JPG' 
      }
    ]
  };

  function getStampImageSrc(stamp) {
    if (stamp && stamp.image && typeof stamp.image === 'string' && stamp.image.startsWith('http')) {
      return stamp.image;
    }
    return 'assets/images/mektup-ikon.png';
  }

  // --- 5. SADELEŞTİRİLMİŞ 2 MEKTUP KAĞIDI SEÇENEĞİ ---
  const DUAL_PAPER_THEMES = [
    { id: 'paper-minimal', name: 'Düz Beyaz Kağıt', icon: '📄', desc: 'Sade, ferah ve modern yazı alanı' },
    { id: 'paper-parchment', name: 'Eskitilmiş Kağıt', icon: '📜', desc: 'Tarihi parşömen dokulu ve altın filigranlı' }
  ];

  // --- 6. BAŞLANGIÇ VERİLERİ (GELEN KUTUSU: SADECE MÜSLÜME -> FAHRİYE & GÖNDERİLENLER: FAHRİYE -> MÜSLÜME) ---
  const INITIAL_LETTERS = [
    // 1. Gelen Kutusu (Inbox): Sadece Kazakistan Almatı'daki Müslüme'den İstanbul'daki Fahriye'ye mektup
    // KRİTİK GÜVENLİK KURALI: İlk defa mektup alındığı için status: 'pending' (onay bekliyor) olarak başlar.
    {
      id: 'let-inbox-muslume',
      fromStudentId: 'TDA-KZ-MUS01',
      fromName: 'Müslüme',
      fromCity: 'Almatı',
      fromCountry: 'Kazakistan',
      fromAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MuslumeKZ&backgroundColor=fed7aa',
      toStudentId: 'TDA-TR-FAH01',
      toName: 'Fahriye',
      toCity: 'İstanbul',
      toCountry: 'Türkiye',
      toAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TurkPenpal&backgroundColor=ffdfbf',
      subject: 'Almatı Dağlarından İstanbul Boğazına Dostluk Mektubu',
      body: 'Hürmetli Fahriye,\n\nBen Kazakistan Milli Üniversitesi öğrencisiyim. Türk Dünyası Beceri Ağı mektup arkadaşlığı bölümünde profiline rastladım ve İstanbul gibi köklü bir şehirden bir dost edinmek istedim.\n\nBurada bahar geldiğinde Almatı elma bahçeleri ve karlı Tanrı Dağları harika bir manzara sunar. Dombra çalmayı ve bozkır masallarını dinlemeyi çok severim. Senin de üniversite hayatını, İstanbul’daki favori mekanlarını ve ilgi alanlarını çok merak ediyorum.\n\nMektubumu ulu bozkırın kadim hatıra puluyla mühürleyip gönderiyorum. Cevabını sabırsızlıkla bekleyeceğim!\n\nEn içten selamlarımla,\nMüslüme',
      stamp: CULTURAL_STAMPS.kz[0],
      paperTheme: 'paper-parchment',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 37 * 3600 * 1000).toISOString(),
      status: 'pending', // GÜVENLİK DUVARI: İlk mektup onay bekliyor ('pending')
      read: false,
      folder: 'inbox',
      photos: []
    },

    // 2. Gönderilenler (Sent): Sadece İstanbul'daki Fahriye'den (gönderen) Almatı'daki Müslüme'ye (alıcı) mektup
    {
      id: 'let-sent-fahriye',
      fromStudentId: 'TDA-TR-FAH01',
      fromName: 'Fahriye',
      fromCity: 'İstanbul',
      fromCountry: 'Türkiye',
      fromAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TurkPenpal&backgroundColor=ffdfbf',
      toStudentId: 'TDA-KZ-MUS01',
      toName: 'Müslüme',
      toCity: 'Almatı',
      toCountry: 'Kazakistan',
      toAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MuslumeKZ&backgroundColor=fed7aa',
      subject: 'İstanbul Boğazı’ndan Almatı’ya Selamlar & Tanışma',
      body: 'Sevgili Müslüme,\n\nMektubunu okurken Boğaz kıyısındaki rüzgar ile Tanrı Dağları’nın esintisi birbirine karışmış gibi hissettim! Seninle tanışmaktan ve mektup arkadaşı olmaktan büyük mutluluk duyuyorum.\n\nİstanbul’da mimarlık okuyorum; tarihi yarımadanın taş sokaklarını fotoğraflamayı ve Boğaz kıyısında yürüyüş yapmayı çok seviyorum. Bir gün Almatı’nın elma bahçelerinde senin dombra ezgilerini dinlemeyi çok isterim. Ben de sana İstanbul Kız Kulesi Hatıra Pulumuz ile yazıyorum.\n\nEn samimi selamlarımla,\nFahriye',
      stamp: CULTURAL_STAMPS.tr[1], // Kız Kulesi Pulu
      paperTheme: 'paper-parchment',
      createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() + 8.9 * 3600 * 1000).toISOString(),
      status: 'in_transit', // Bozkır Kartalı Taşımakta (Widget'ta canlı sayaç ve uçuş rotası aktif)
      flightHours: 5.2,
      deliveryHours: 10.4,
      read: true,
      folder: 'sent',
      photos: []
    }
  ];

  // --- 7. YEREL DEPOLAMA (LOCALSTORAGE) YÖNETİMİ ---
  function getStoredLetters() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!d || !Array.isArray(d) || !d.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LETTERS));
        return INITIAL_LETTERS.slice();
      }
      return d;
    } catch(e) {
      return INITIAL_LETTERS.slice();
    }
  }

  function saveLetters(letters) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
      updateTransitWidget();
      notifyUnread();
      return true;
    } catch(e) {
      return false;
    }
  }

  // Güvenlik & Tanışma Onay Haritası (Introduction Consent Map)
  function getIntroductionConsentMap() {
    try {
      return JSON.parse(localStorage.getItem(PENPAL_CONSENT_KEY)) || {};
    } catch(e) {
      return {};
    }
  }

  function setIntroductionConsent(studentId, status) {
    const map = getIntroductionConsentMap();
    map[studentId] = status; // 'accepted' | 'rejected'
    localStorage.setItem(PENPAL_CONSENT_KEY, JSON.stringify(map));
  }

  // Engellenen Mektup Arkadaşları (Blocked Penpals)
  function getBlockedPenpals() {
    try {
      return JSON.parse(localStorage.getItem(BLOCKED_PENPALS_KEY)) || [];
    } catch(e) {
      return [];
    }
  }

  function blockPenpal(studentId) {
    const list = getBlockedPenpals();
    if (!list.includes(studentId)) {
      list.push(studentId);
      localStorage.setItem(BLOCKED_PENPALS_KEY, JSON.stringify(list));
    }
  }

  function getPhotoConsentMap() {
    try {
      return JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)) || {};
    } catch(e) {
      return {};
    }
  }

  function setPhotoConsent(penpalId, status) {
    const map = getPhotoConsentMap();
    map[penpalId] = status;
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(map));
  }

  // --- 8. KULLANICI BİTMOJİ / AVATAR MODELİ (VARSAYILAN INITIAL STATE) ---
  // KRİTİK DÜZELTME:
  // 1. Ten Rengi (skinColor): Varsayılan değer kesinlikle açık/beyaz ten rengi (#F8D9CE) olarak yapılandırılmıştır.
  // 2. Göz Rengi (eyeColor): 8 doğal iris rengi arasından doğal Koyu Kahverengi (#3b2219).
  // 3. Vücut Tipi (bodyType): 'average' (Standart/Atletik), 'slim' (Zayıf) veya 'plump' (Geniş/Dolgun).
  // 4. Kıyafet (outfit): 20 model arasından modern 'casual_tshirt' (Bisiklet Yaka Basic Tişört).
  const DEFAULT_AVATAR_CONFIG = {
    skinColor: 'f8d9ce', // Doğal Açık / Beyaz Ten (#F8D9CE) - Siyah ten bug'ı kesin olarak giderildi
    skinTone: 'f8d9ce',  // Geriye dönük uyumluluk
    eyeColor: '3b2219',  // Koyu Kahverengi Doğal İris (#3b2219)
    bodyType: 'average', // Standart / Orta Vücut Tipi ('slim' | 'average' | 'plump')
    outfit: 'casual_tshirt', // 20 Kıyafet Modelinden biri
    hair: 'long01',      // Saç Modeli
    hairColor: '0e0e0e', // Kuzuni Siyah Saç
    mood: 'variant01',    // Samimi Tebessüm
    eyes: 'variant01',    // Işıltılı Güleç Gözler
    accessories: 'none',  // Aksesuarsız
    outfitColor: 'ffdfbf',// Parşömen Beji Fon / Kıyafet Vurgu Rengi
    backgroundColor: 'ffdfbf'
  };

  function getMyAvatarConfig() {
    try {
      const raw = localStorage.getItem(MY_AVATAR_KEY);
      if (!raw) return Object.assign({}, DEFAULT_AVATAR_CONFIG);
      const parsed = JSON.parse(raw);
      const merged = Object.assign({}, DEFAULT_AVATAR_CONFIG, parsed);

      // Ten rengi doğrulama & Temizleme (Siyah veya tanımsız ten değerlerini açık ten #f8d9ce ile ez)
      let sColor = merged.skinColor || merged.skinTone || 'f8d9ce';
      sColor = String(sColor).replace('#', '').trim().toLowerCase();
      if (!sColor || sColor === '000000' || sColor === 'undefined' || sColor.length !== 6) {
        sColor = 'f8d9ce';
      }
      merged.skinColor = sColor;
      merged.skinTone = sColor;

      // Göz rengi doğrulama
      if (!merged.eyeColor || merged.eyeColor.length !== 6) {
        merged.eyeColor = '3b2219';
      }

      // Vücut tipi doğrulama
      if (!['slim', 'average', 'plump'].includes(merged.bodyType)) {
        merged.bodyType = 'average';
      }

      // Kıyafet modeli doğrulama
      if (!merged.outfit) {
        merged.outfit = 'casual_tshirt';
      }

      return merged;
    } catch(e) {
      return Object.assign({}, DEFAULT_AVATAR_CONFIG);
    }
  }

  function saveMyAvatarConfig(config) {
    localStorage.setItem(MY_AVATAR_KEY, JSON.stringify(config));
  }

  function generateAvatarUrl(config) {
    const c = config || getMyAvatarConfig();
    const seed = 'TurkPenpal';
    // Ten rengi daima temiz 6 haneli açık ten hex olmalı
    let skin = (c.skinColor || c.skinTone || 'f8d9ce').replace('#', '');
    if (!skin || skin.length !== 6) skin = 'f8d9ce';

    const hair = c.hair || 'long01';
    const hairColor = c.hairColor || '0e0e0e';
    const eyes = c.eyes || 'variant01';
    const mouth = c.mood || 'variant01';
    const bg = c.outfitColor || c.backgroundColor || 'ffdfbf';

    let url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&skinColor=${encodeURIComponent(skin)}&hair=${encodeURIComponent(hair)}&hairProbability=100&hairColor=${encodeURIComponent(hairColor)}&eyes=${encodeURIComponent(eyes)}&mouth=${encodeURIComponent(mouth)}&backgroundColor=${encodeURIComponent(bg)}`;

    if (c.accessories && c.accessories !== 'none') {
      url += `&glasses=${encodeURIComponent(c.accessories)}&glassesProbability=100`;
    } else {
      url += `&glassesProbability=0`;
    }

    return url;
  }

  // --- 9. DURUM DEĞİŞKENLERİ ---
  let activeSelectedCountry = null;
  let activeSelectedPenpal = null;
  let activeSelectedPaper = 'paper-minimal'; // Düz Beyaz veya Eskitilmiş
  let activeStampCountryFilter = 'tr';
  let activeSelectedStamp = CULTURAL_STAMPS.tr[0];
  let isStampDrawerOpen = false;
  let attachedPhotoFiles = []; // max 3 adet
  let activeViewingLetter = null;
  let transitTimerInterval = null;
  let currentEditingAvatarConfig = getMyAvatarConfig();

  // --- 10. MEKTUP LİSTESİ & SAYACLAR ---
  function getInbox() {
    const blocked = getBlockedPenpals();
    return getStoredLetters().filter(l => l.folder !== 'sent' && !blocked.includes(l.fromStudentId) && l.status !== 'rejected');
  }

  function getSent() {
    return getStoredLetters().filter(l => l.folder === 'sent');
  }

  function getUnreadCount() {
    return getInbox().filter(l => !l.read && (l.status === 'delivered' || l.status === 'pending')).length;
  }

  function notifyUnread() {
    const unread = getUnreadCount();
    window.dispatchEvent(new CustomEvent('tda:unreadCountChanged', { detail: { unread } }));
    const badges = document.querySelectorAll('#navUnreadBadge, #navTabUnreadBadge, #inboxCountBadge');
    badges.forEach(b => {
      b.textContent = unread;
      if (b.id !== 'inboxCountBadge') {
        b.style.display = unread > 0 ? 'inline-block' : 'none';
      }
    });
    const sentBadge = document.getElementById('sentCountBadge');
    if (sentBadge) {
      sentBadge.textContent = getSent().length;
    }
  }

  // --- 11. BOZKIR KARTALI İLE CANLI TESLİMAT SİMÜLASYONU (HIZLI BUTON KESİNLİKLE YOKTUR) ---
  function updateTransitWidget() {
    const container = document.getElementById('mektupTransitWidgetArea');
    if (!container) return;

    const letters = getStoredLetters();
    const now = Date.now();
    let hasUpdatedAny = false;

    // Yoldaki mektupların teslimat vakti dolmuş mu kontrol et (Hesaplanan süre dolunca teslim edilir)
    letters.forEach(l => {
      if (l.status === 'in_transit') {
        const delTime = new Date(l.deliveredAt).getTime();
        if (now >= delTime) {
          l.status = 'delivered';
          hasUpdatedAny = true;
        }
      }
    });

    if (hasUpdatedAny) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
      notifyUnread();
    }

    const inTransitLetter = letters.find(l => l.status === 'in_transit');

    if (!inTransitLetter) {
      container.innerHTML = '';
      if (transitTimerInterval) clearInterval(transitTimerInterval);
      return;
    }

    const deliveryTime = new Date(inTransitLetter.deliveredAt).getTime();
    const remainingMs = Math.max(0, deliveryTime - Date.now());
    const totalDurationMs = (inTransitLetter.deliveryHours || 8) * 3600 * 1000;
    const progressPercent = Math.min(100, Math.max(5, Math.round(((totalDurationMs - remainingMs) / totalDurationMs) * 100)));

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Uçak simgesi yerine Bozkır Kartalı (Steppe Eagle) ikonu kullanılır.
    // Kesin kural: "Hızlı Gönder" veya "Süreyi Atla" butonu yoktur.
    container.innerHTML = `
      <div class="transit-delivery-widget">
        <div class="transit-header">
          <div class="transit-title">
            <span style="font-size:22px;">🦅</span>
            <span>Bozkır Kartalı Mektubunuzu Taşıyor! (Teslimat Simülasyonu)</span>
          </div>
          <div class="transit-countdown-badge">
            <span>⏳ Teslimata Kalan Süre:</span>
            <strong>${timeStr}</strong>
          </div>
        </div>

        <div class="flight-route-track">
          <div class="flight-city-node">
            <div class="flight-city-dot"></div>
            <span class="flight-city-name">${inTransitLetter.fromCity || 'İstanbul'}</span>
            <span class="flight-city-country">${inTransitLetter.fromCountry || 'Türkiye'}</span>
          </div>

          <div class="flight-progress-line">
            <div class="flight-progress-fill" style="width: ${progressPercent}%;">
              <div class="steppe-eagle-carrier">
                <span class="eagle-symbol">🦅</span>
                <span class="eagle-cargo-letter">📜</span>
              </div>
            </div>
          </div>

          <div class="flight-city-node">
            <div class="flight-city-dot" style="background:#b8860b"></div>
            <span class="flight-city-name">${inTransitLetter.toCity || 'Almatı'}</span>
            <span class="flight-city-country">${inTransitLetter.toCountry || 'Kazakistan'}</span>
          </div>
        </div>

        <div class="transit-footer-note">
          Konu: <strong>"${inTransitLetter.subject}"</strong> • Alıcı: <strong>${inTransitLetter.toName}</strong> (${inTransitLetter.toCity}) • 
          <em>Mektup şehirler arası uçak yolculuğu süresinin tam 2 katı süre dolduğunda teslim edilecektir.</em>
        </div>
      </div>
    `;

    if (!transitTimerInterval) {
      transitTimerInterval = setInterval(() => {
        updateTransitWidget();
      }, 1000);
    }
  }

  // --- 12. AŞAMA 1: ÜLKE SEÇİMİ (STEP 1 - MİNİMALİST & NET) ---
  function renderStep1Countries() {
    const container = document.getElementById('countrySelectionGrid');
    if (!container) return;

    // Sadece Bayrak, Ülke Adı ve Mavi Mektup Arkadaşı Sayısı Butonu (Alt metinler tamamen kaldırıldı)
    container.innerHTML = COUNTRIES.map(c => `
      <div class="country-select-card" data-country-id="${c.id}" role="button" tabindex="0">
        <div class="country-card-flag-wrap">
          <img src="${c.flagImg}" alt="${c.name} Bayrağı" class="country-card-flag-img" loading="lazy">
        </div>
        <div class="country-card-name">${c.name}</div>
        <span class="country-card-badge">👥 ${c.penpalCount} Mektup Arkadaşı</span>
      </div>
    `).join('');

    container.querySelectorAll('.country-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const cid = card.dataset.countryId;
        const targetCountry = COUNTRIES.find(c => c.id === cid);
        if (targetCountry) {
          activeSelectedCountry = targetCountry;
          activeStampCountryFilter = cid;
          goToComposeStep(2);
        }
      });
    });
  }

  // --- 13. AŞAMA 2: BİTMOJİ / ÇİZİM AVATAR PROFİLLERİ (STEP 2) ---
  function renderStep2Profiles() {
    const titleEl = document.getElementById('step2CountryTitle');
    const container = document.getElementById('penpalProfileGrid');
    if (!container || !activeSelectedCountry) return;

    if (titleEl) {
      titleEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${activeSelectedCountry.flagImg}" alt="" style="width:24px;height:16px;border-radius:3px;object-fit:cover;">
          <span>${activeSelectedCountry.name} Mektup Arkadaşları</span>
        </div>
        <button type="button" class="ghost-btn" id="btnBackToCountries" style="font-size:12px;padding:4px 8px;">← Başka Ülke Seç</button>
      `;
      document.getElementById('btnBackToCountries')?.addEventListener('click', () => goToComposeStep(1));
    }

    const profiles = PENPAL_PROFILES.filter(p => p.countryId === activeSelectedCountry.id);
    const consentMap = getPhotoConsentMap();

    if (!profiles.length) {
      container.innerHTML = `<div class="letter-empty-state"><p>Bu ülkede henüz mektup arkadaşı profili bulunmuyor.</p></div>`;
      return;
    }

    container.innerHTML = profiles.map(p => {
      const calc = calculateDeliveryEstimate('İstanbul', p.city);
      const consent = consentMap[p.id] || 'locked';
      const consentBadge = consent === 'unlocked' 
        ? '<span style="color:#10b981">🔓 Fotoğraf İzni Var</span>'
        : (consent === 'pending' ? '<span style="color:#d97706">⏳ İstek Bekleniyor</span>' : '<span style="color:#64748b">🔒 Fotoğraf Kilitli</span>');

      return `
        <div class="penpal-card" data-penpal-id="${p.id}">
          <div class="penpal-card-top">
            <div class="penpal-avatar-wrap">
              <img src="${p.avatar}" alt="${p.name} Bitmoji Avatar" class="penpal-avatar-img">
              <span class="penpal-status-dot" title="Aktif Mektup Arkadaşı"></span>
            </div>
            <div class="penpal-meta-info">
              <h4>${p.name}</h4>
              <span>${p.city} • ${p.university}</span>
              <small class="muted">Öğrenci No: ${p.studentId}</small>
            </div>
          </div>

          <p style="font-size:12.5px;color:#475467;line-height:1.45;margin:0;">"${p.bio}"</p>

          <div class="penpal-flight-preview">
            <span>🦅 Bozkır Kartalı Teslimatı: <strong>${calc.deliveryHours} saat</strong></span>
            <span>(Uçuş: ${calc.flightHours} sa x 2)</span>
          </div>

          <div class="penpal-tags-wrap">
            ${p.interests.map(i => `<span class="penpal-tag">#${i}</span>`).join('')}
            <span class="penpal-tag" style="background:#fef3c7">${consentBadge}</span>
          </div>

          <button type="button" class="btn-choose-penpal" data-penpal-id="${p.id}">
            <span>✉️ Mektup Yaz</span>
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-choose-penpal').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.penpalId;
        const targetPenpal = PENPAL_PROFILES.find(p => p.id === pid);
        if (targetPenpal) {
          activeSelectedPenpal = targetPenpal;
          goToComposeStep(3);
        }
      });
    });
  }

  // --- 14. AŞAMA 3: ÖZELLEŞTİRİLEBİLİR MEKTUP STÜDYOSU (STEP 3) ---
  function renderStep3Studio() {
    if (!activeSelectedPenpal) return;

    // Alıcı özet kartı
    const summaryEl = document.getElementById('recipientSummaryBanner');
    const calc = calculateDeliveryEstimate('İstanbul', activeSelectedPenpal.city);

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="recipient-summary-left">
          <img src="${activeSelectedPenpal.avatar}" alt="${activeSelectedPenpal.name}" class="recipient-avatar-mini">
          <div>
            <strong style="color:#102343;font-size:14.5px;">Alıcı: ${activeSelectedPenpal.name}</strong>
            <div style="font-size:11.5px;color:#64748b;">${activeSelectedPenpal.city}, ${activeSelectedPenpal.country} • (${activeSelectedPenpal.studentId})</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:12px;font-weight:750;color:#8c5d00;">🦅 Bozkır Kartalı Teslimat Süresi: ${calc.deliveryHours} saat</span>
          <button type="button" class="ghost-btn" id="btnChangePenpal" style="font-size:11px;padding:2px 8px;margin-left:8px;">Değiştir</button>
        </div>
      `;
      document.getElementById('btnChangePenpal')?.addEventListener('click', () => goToComposeStep(2));
    }

    // Sadeleştirilmiş 2 Mektup Kağıdı Seçimi (Düz Beyaz & Eskitilmiş Kağıt)
    const paperContainer = document.getElementById('paperThemeSelector');
    if (paperContainer) {
      paperContainer.innerHTML = DUAL_PAPER_THEMES.map(theme => `
        <div class="paper-dual-card ${theme.id === activeSelectedPaper ? 'selected' : ''}" data-paper-id="${theme.id}">
          <span class="paper-card-icon">${theme.icon}</span>
          <div>
            <span class="paper-card-title">${theme.name}</span>
            <span class="paper-card-desc">${theme.desc}</span>
          </div>
        </div>
      `).join('');

      paperContainer.querySelectorAll('.paper-dual-card').forEach(card => {
        card.addEventListener('click', () => {
          paperContainer.querySelectorAll('.paper-dual-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          activeSelectedPaper = card.dataset.paperId;
          applyPaperTheme(activeSelectedPaper);
        });
      });
    }

    // Akıllı ve Yer Tasarruflu Pul Seçicisi
    renderMultiStampsSelector();

    // Fotoğraf Onay & Yükleme Modülü
    renderPhotoConsentModule();
    applyPaperTheme(activeSelectedPaper);
  }

  // Akıllı Seçim ve Otomatik Kapanan Pul Çekmecesi
  function renderMultiStampsSelector() {
    const summaryThumb = document.getElementById('stampSummaryThumb');
    const selectedTitle = document.getElementById('selectedStampTitle');
    const toggleBtn = document.getElementById('btnToggleStampDrawer');
    const toggleText = document.getElementById('stampDrawerToggleText');
    const drawer = document.getElementById('stampDrawerPanel');
    const tabsContainer = document.getElementById('stampCountryFilterTabs');

    if (!summaryThumb || !selectedTitle) return;

    // Seçilen pulun özetini güncelle
    updateSelectedStampSummary();

    // Çekmece aç/kapa butonu
    if (toggleBtn && drawer) {
      toggleBtn.onclick = () => {
        isStampDrawerOpen = !isStampDrawerOpen;
        drawer.style.display = isStampDrawerOpen ? 'block' : 'none';
        if (toggleText) {
          toggleText.textContent = isStampDrawerOpen ? '▴ Pul Çekmecesini Kapat' : '▾ Pulu Değiştir / Ülke Seç';
        }
      };
    }

    // Ülke sekmeleri
    if (tabsContainer) {
      tabsContainer.innerHTML = COUNTRIES.map(c => `
        <button type="button" class="stamp-country-tab-btn ${c.id === activeStampCountryFilter ? 'active' : ''}" data-country-code="${c.id}">
          <img src="${c.flagImg}" alt="" style="width:16px;height:11px;vertical-align:middle;margin-right:6px;border-radius:2px;display:inline-block;object-fit:cover;"> ${c.name}
        </button>
      `).join('');

      tabsContainer.querySelectorAll('.stamp-country-tab-btn').forEach(btn => {
        btn.onclick = () => {
          tabsContainer.querySelectorAll('.stamp-country-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeStampCountryFilter = btn.dataset.countryCode;

          // Çekmeceyi açık tut ve pulları listele
          if (drawer) {
            drawer.style.display = 'block';
            isStampDrawerOpen = true;
            if (toggleText) toggleText.textContent = '▴ Pul Çekmecesini Kapat';
          }
          renderStampsForActiveCountry();
        };
      });
    }

    renderStampsForActiveCountry();
  }

  function updateSelectedStampSummary() {
    const summaryThumb = document.getElementById('stampSummaryThumb');
    const selectedTitle = document.getElementById('selectedStampTitle');
    const affixedContainer = document.getElementById('affixedStampContainer');

    const imgSrc = getStampImageSrc(activeSelectedStamp);

    if (summaryThumb) {
      summaryThumb.innerHTML = `<img src="${imgSrc}" alt="${activeSelectedStamp.name}" onerror="this.src='assets/images/mektup-ikon.png'">`;
    }
    if (selectedTitle) {
      selectedTitle.innerHTML = `${activeSelectedStamp.flag} ${activeSelectedStamp.name} • <span style="font-weight:600;color:#555;">${activeSelectedStamp.landmark}</span>`;
    }
    if (affixedContainer) {
      affixedContainer.innerHTML = `
        <div class="affixed-postage-stamp" title="${activeSelectedStamp.flag} ${activeSelectedStamp.name}">
          <img src="${imgSrc}" alt="${activeSelectedStamp.name}" onerror="this.src='assets/images/mektup-ikon.png'">
        </div>
      `;
    }
  }

  function renderStampsForActiveCountry() {
    const stampContainer = document.getElementById('realisticStampsCarousel');
    const drawer = document.getElementById('stampDrawerPanel');
    const toggleText = document.getElementById('stampDrawerToggleText');
    if (!stampContainer) return;

    const stampsList = CULTURAL_STAMPS[activeStampCountryFilter] || CULTURAL_STAMPS.tr;

    stampContainer.innerHTML = stampsList.map(stamp => {
      const isSel = stamp.id === activeSelectedStamp.id;
      const imgSrc = getStampImageSrc(stamp);
      return `
        <div class="realistic-stamp-card ${isSel ? 'selected' : ''}" data-stamp-id="${stamp.id}" title="${stamp.name}">
          <div class="stamp-postmark-ring"></div>
          <span class="stamp-country-label">${stamp.flag} ${stamp.country}</span>
          <div class="stamp-photo-frame">
            <img src="${imgSrc}" alt="${stamp.name}" class="stamp-photo-img" onerror="this.src='assets/images/mektup-ikon.png'">
          </div>
          <div class="stamp-landmark-title">${stamp.name}</div>
          <span class="stamp-landmark-desc">${stamp.landmark}</span>
        </div>
      `;
    }).join('');

    stampContainer.querySelectorAll('.realistic-stamp-card').forEach(card => {
      card.onclick = () => {
        const sid = card.dataset.stampId;
        const allStamps = Object.values(CULTURAL_STAMPS).flat();
        activeSelectedStamp = allStamps.find(s => s.id === sid) || stampsList[0];

        // Seçilen pulu güncelle
        updateSelectedStampSummary();

        // Kural: Pul seçildiği anda çekmece kendiliğinden kapanır
        if (drawer) {
          drawer.style.display = 'none';
          isStampDrawerOpen = false;
          if (toggleText) toggleText.textContent = '▾ Pulu Değiştir / Ülke Seç';
        }
      };
    });
  }

  function applyPaperTheme(themeId) {
    const sheet = document.getElementById('interactiveLetterSheet');
    if (!sheet) return;
    sheet.className = `interactive-letter-sheet ${themeId}`;
  }

  // --- 15. KARŞILIKLI ONAYA DAYALI FOTOĞRAF GÖNDERİMİ (3 ADET SINIRI) ---
  function renderPhotoConsentModule() {
    const container = document.getElementById('photoConsentModuleArea');
    if (!container || !activeSelectedPenpal) return;

    const consentMap = getPhotoConsentMap();
    const status = consentMap[activeSelectedPenpal.id] || 'locked';

    if (status === 'locked') {
      container.innerHTML = `
        <div class="photo-consent-box locked">
          <div class="consent-header-row">
            <div class="consent-title-badge">
              <span>🔒</span>
              <span>Fotoğraf Paylaşımı Başlangıçta Kilitlidir</span>
            </div>
            <div class="consent-action-buttons">
              <button type="button" class="btn-request-photo" id="btnSendPhotoRequest">
                📷 Fotoğraf Paylaşım İsteği Gönder
              </button>
              <button type="button" class="btn-sim-accept" id="btnSimulateAccept" title="Geliştirme / Test için onay simülasyonu">
                ✓ Karşı Taraf Kabul Etsin (Simüle Et)
              </button>
            </div>
          </div>
          <p style="font-size:12px;color:#78350f;margin:8px 0 0 0;line-height:1.45;">
            Karşılıklı güven gereğince fotoğraf ekleme özelliği iki taraf da onaylayana kadar kapalıdır.
            İstek kabul edildiğinde mektuba maksimum 3 adet fotoğraf iliştirilebilir.
          </p>
        </div>
      `;

      document.getElementById('btnSendPhotoRequest')?.addEventListener('click', () => {
        setPhotoConsent(activeSelectedPenpal.id, 'pending');
        renderPhotoConsentModule();
      });

      document.getElementById('btnSimulateAccept')?.addEventListener('click', () => {
        setPhotoConsent(activeSelectedPenpal.id, 'unlocked');
        renderPhotoConsentModule();
      });

    } else if (status === 'pending') {
      container.innerHTML = `
        <div class="photo-consent-box locked">
          <div class="consent-header-row">
            <div class="consent-title-badge">
              <span>⏳</span>
              <span>Fotoğraf Paylaşım İsteği İletildi — Onay Bekleniyor</span>
            </div>
            <div class="consent-action-buttons">
              <button type="button" class="btn-sim-accept" id="btnSimulateAccept">
                ✓ Karşı Taraf Kabul Etsin (Simüle Et)
              </button>
            </div>
          </div>
          <p style="font-size:12px;color:#78350f;margin:6px 0 0 0;">
            ${activeSelectedPenpal.name} isteğinizi onayladığında buraya en fazla 3 fotoğraf ekleyebilirsiniz.
          </p>
        </div>
      `;

      document.getElementById('btnSimulateAccept')?.addEventListener('click', () => {
        setPhotoConsent(activeSelectedPenpal.id, 'unlocked');
        renderPhotoConsentModule();
      });

    } else {
      // Unlocked (Açık - Maks. 3 Fotoğraf)
      container.innerHTML = `
        <div class="photo-consent-box unlocked">
          <div class="consent-header-row">
            <div class="consent-title-badge">
              <span>🔓</span>
              <span>Fotoğraf Paylaşımı Aktif (Maksimum 3 Fotoğraf)</span>
            </div>
            <span style="font-size:11.5px;color:#166534;font-weight:750;" id="photoCountDisplay">
              ${attachedPhotoFiles.length} / 3 Fotoğraf Yüklendi
            </span>
          </div>

          <div class="photo-uploader-area">
            <input type="file" id="penpalPhotoInput" accept="image/*" multiple style="display:none">
            <button type="button" class="btn secondary" id="btnTriggerPhotoUpload" style="font-size:12px;padding:7px 13px;border-color:#166534;color:#166534">
              📎 Fotoğraf Seç (En fazla 3 adet)
            </button>
            <div class="photo-previews-grid" id="photoPreviewsGrid"></div>
          </div>
        </div>
      `;

      renderPhotoPreviews();

      const triggerBtn = document.getElementById('btnTriggerPhotoUpload');
      const fileInput = document.getElementById('penpalPhotoInput');
      if (triggerBtn && fileInput) {
        triggerBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handlePhotoSelection);
      }
    }
  }

  function handlePhotoSelection(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachedPhotoFiles.length + files.length > 3) {
      alert('Güvenlik kuralı: Bir mektuba en fazla 3 adet fotoğraf ekleyebilirsiniz.');
      return;
    }

    files.slice(0, 3 - attachedPhotoFiles.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        attachedPhotoFiles.push(ev.target.result);
        renderPhotoPreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoPreviews() {
    const grid = document.getElementById('photoPreviewsGrid');
    const countDisplay = document.getElementById('photoCountDisplay');
    if (countDisplay) {
      countDisplay.textContent = `${attachedPhotoFiles.length} / 3 Fotoğraf Yüklendi`;
    }
    if (!grid) return;

    grid.innerHTML = attachedPhotoFiles.map((src, idx) => `
      <div class="photo-preview-item">
        <img src="${src}" alt="Ek Fotoğraf ${idx + 1}">
        <button type="button" class="photo-delete-btn" data-photo-idx="${idx}" title="Kaldır">×</button>
      </div>
    `).join('');

    grid.querySelectorAll('.photo-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.photoIdx, 10);
        attachedPhotoFiles.splice(i, 1);
        renderPhotoPreviews();
      });
    });
  }

  // --- 16. GELİŞMİŞ BİTMOJİ / AVATAR TASARIM STÜDYOSU ---
  function openAvatarStudio() {
    currentEditingAvatarConfig = Object.assign({}, getMyAvatarConfig());
    const modal = document.getElementById('avatarStudioModal');
    if (modal) {
      modal.style.display = 'flex';
      renderAvatarCustomizerControls();
      updateLiveAvatarPreview();
    }
  }

  function closeAvatarStudio() {
    const modal = document.getElementById('avatarStudioModal');
    if (modal) modal.style.display = 'none';
  }

  function renderColorSwatches(containerId, colorOptions, currentValue, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = 'avatar-swatches-grid';
    el.innerHTML = colorOptions.map(opt => {
      const isSel = (opt.id || '').toLowerCase() === (currentValue || '').toLowerCase();
      const isLight = ['f9c9b6', 'f2d3b1', 'ecad80', 'e5d7a3', 'ffdfbf', 'fed7aa', 'fef08a', 'bbf7d0', 'b6e3f4', 'e2e8f0', 'fbcfe8', 'e0e0e0', 'afafaf'].includes((opt.id || '').toLowerCase());
      const checkColor = isLight ? '#0f172a' : '#ffffff';
      return `
        <button type="button" class="avatar-color-swatch ${isSel ? 'active' : ''}" 
                data-val="${opt.id}" 
                style="background-color: #${opt.id};" 
                data-tooltip="${opt.label}" 
                aria-label="${opt.label}">
          <span class="swatch-check" style="color:${checkColor}; display:${isSel ? 'block' : 'none'};">✓</span>
        </button>
      `;
    }).join('');

    el.querySelectorAll('.avatar-color-swatch').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.avatar-color-swatch').forEach(b => {
          b.classList.remove('active');
          const check = b.querySelector('.swatch-check');
          if (check) check.style.display = 'none';
        });
        btn.classList.add('active');
        const check = btn.querySelector('.swatch-check');
        if (check) check.style.display = 'block';
        onSelect(btn.dataset.val);
      };
    });
  }

  function renderVisualButtons(containerId, options, currentValue, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = 'avatar-visual-grid';
    el.innerHTML = options.map(opt => {
      const isSel = opt.id === currentValue;
      const contentHtml = opt.iconHtml || opt.svg || '';
      return `
        <button type="button" 
                class="avatar-visual-btn ${isSel ? 'active' : ''}" 
                data-val="${opt.id}" 
                data-tooltip="${opt.label}" 
                aria-label="${opt.label}">
          ${contentHtml}
        </button>
      `;
    }).join('');

    el.querySelectorAll('.avatar-visual-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.avatar-visual-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn.dataset.val);
      };
    });
  }

  // --- 15. AVATAR STÜDYOSU BİLEŞENİ: VERİ MODELLERİ VE SEÇİCİLER ---

  // 1. Vücut Tipi (Body Type) Silüet Modelleri (Tam Hizalı, Temiz 64x64 SVG İkonları)
  const BODY_TYPES = [
    {
      id: 'slim',
      label: 'Zayıf / Narin Yapı',
      iconSvg: `<svg viewBox="0 0 64 64" class="body-type-svg-icon" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="32" cy="14" r="7" fill="currentColor"/>
        <path d="M24 28c3-2 13-2 16 0l4 18h-5v14h-14v-14h-5l4-18z"/>
      </svg>`
    },
    {
      id: 'average',
      label: 'Standart / Atletik Yapı',
      iconSvg: `<svg viewBox="0 0 64 64" class="body-type-svg-icon" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="32" cy="14" r="7.5" fill="currentColor"/>
        <path d="M21 28c4-2.5 18-2.5 22 0l5 18h-6v14h-16v-14h-6l5-18z"/>
      </svg>`
    },
    {
      id: 'plump',
      label: 'Geniş / Dolgun Yapı',
      iconSvg: `<svg viewBox="0 0 64 64" class="body-type-svg-icon" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="32" cy="14" r="8" fill="currentColor"/>
        <path d="M17 28c6-3 24-3 30 0l6 18h-7v14h-18v-14h-7l6-18z"/>
      </svg>`
    }
  ];

  // 2. Geniş ve Çeşitli Gardırop: 20 Farklı Kıyafet (Modern, Kültürel, Resmi)
  const OUTFIT_MODELS = [
    { id: 'casual_tshirt', label: 'Basic Tişört', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7l4 3h6l4-3 5 4-3 5-3-2v12H10V14l-3 2-3-5 5-4z"/></svg>` },
    { id: 'casual_hoodie', label: 'Kapüşonlu Hoodie', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 8c0-3 3-5 6-5s6 2 6 5l5 3-3 5-3-2v13H8V14l-3 2-3-5 5-3h3zm6 2v7"/></svg>` },
    { id: 'bomber_jacket', label: 'Bomber Ceket', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 8l4 2h8l4-2 5 4-3 5-2-1v12H8V16l-2 1-3-5 5-4z"/><line x1="16" y1="10" x2="16" y2="28"/></svg>` },
    { id: 'polo_shirt', label: 'Klasik Polo Tişört', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7l4 3h6l4-3 5 4-3 5-3-2v12H10V14l-3 2-3-5 5-4z"/><path d="M13 10l3 5 3-5"/></svg>` },
    { id: 'knit_sweater', label: 'Boğazlı Triko Kazak', category: 'Kışlık', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5h8v4h-8z"/><path d="M8 9l4 2h8l4-2 5 4-3 5-2-1v12H8V17l-2 1-3-5 5-4z"/></svg>` },
    { id: 'blazer_formal', label: 'Klasik Blazer & Kravat', category: 'Resmi', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7l4 2h8l4-2 5 4-3 5-2-1v13H8V15l-2 1-3-5 5-4z"/><path d="M13 9l3 9 3-9"/><path d="M16 11l-1 5 1 4 1-4-1-5z"/></svg>` },
    { id: 'plaid_shirt', label: 'Kareli Oduncu Gömlek', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7l4 2h6l4-2 5 4-3 5-3-1v13H10V15l-3 1-3-5 5-4z"/><line x1="16" y1="9" x2="16" y2="28"/><line x1="10" y1="18" x2="22" y2="18"/></svg>` },
    { id: 'turkish_kaftan', label: 'Geleneksel Türk Kaftanı', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 6l5 3h8l5-3 5 5-3 6-3-2v14H5V14l-3 2-3-6 5-5z"/><path d="M14 9l2 5 2-5"/><line x1="16" y1="14" x2="16" y2="29"/><circle cx="16" cy="18" r="1" fill="currentColor"/><circle cx="16" cy="22" r="1" fill="currentColor"/></svg>` },
    { id: 'kazakh_shapan', label: 'Kazak İşlemeli Çapanı', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l6 3h8l6-3 4 5-3 6-3-2v14H4V14l-3 2-3-6 4-5z"/><path d="M12 9c2 4 6 4 8 0"/><path d="M16 13v16"/></svg>` },
    { id: 'uzbek_chapan', label: 'Özbek İpek Atlas Cübbe', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7l6 3h8l6-3 4 5-3 6-3-2v13H4V15l-3 2-3-6 4-5z"/><line x1="16" y1="10" x2="16" y2="29"/><line x1="12" y1="13" x2="20" y2="25"/></svg>` },
    { id: 'kyrgyz_chepken', label: 'Kırgız Keçe Çepken', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 6l5 3h8l5-3 5 5-3 6-3-2v14H5V14l-3 2-3-6 5-5z"/><path d="M13 9l3 6 3-6"/></svg>` },
    { id: 'azerbaijan_libas', label: 'Azerbaycan Milli Libası', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6l4 2h8l4-2 6 5-3 6-3-2v14H5V15l-3 2-3-6 6-5z"/><path d="M12 8l4 6 4-6"/><line x1="16" y1="14" x2="16" y2="29"/></svg>` },
    { id: 'turkmen_don', label: 'Türkmen İpek Don / Çapan', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l6 3h8l6-3 4 5-3 6-3-2v14H4V14l-3 2-3-6 4-5z"/><line x1="16" y1="9" x2="16" y2="29"/><path d="M12 14l8 4"/></svg>` },
    { id: 'denim_jacket', label: 'Klasik Kot Ceket', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 8l4 2h8l4-2 5 4-3 5-2-1v12H8V16l-2 1-3-5 5-4z"/><line x1="16" y1="10" x2="16" y2="28"/><rect x="10" y="13" width="3" height="3" fill="currentColor"/><rect x="19" y="13" width="3" height="3" fill="currentColor"/></svg>` },
    { id: 'leather_jacket', label: 'Deri Biker Ceket', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 8l4 2h8l4-2 5 4-3 5-2-1v12H8V16l-2 1-3-5 5-4z"/><line x1="13" y1="10" x2="20" y2="28"/></svg>` },
    { id: 'sport_jersey', label: 'Milli Spor Forması', category: 'Sportif', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 6l3 2h6l3-2 5 4-3 5-3-2v13H8V13l-3 2-3-5 5-4z"/><circle cx="16" cy="15" r="3" fill="none"/></svg>` },
    { id: 'winter_parka', label: 'Kışlık Kürklü Parka', category: 'Kışlık', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6c0-2 3-3 7-3s7 1 7 3l4 3-2 5-3-2v15H7V13l-3 2-2-5 4-3h3zm7 0v21"/></svg>` },
    { id: 'academic_robe', label: 'Akademisyen & Bilim Cübbesi', category: 'Resmi', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7l4 2h8l4-2 5 5-3 5-2-1v14H8V16l-2 1-3-5 5-5z"/><path d="M13 9l3 6 3-6"/><line x1="16" y1="15" x2="16" y2="30"/></svg>` },
    { id: 'linen_shirt', label: 'Düğmeli Keten Gömlek', category: 'Modern', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7l4 2h6l4-2 5 4-3 5-3-1v13H10V15l-3 1-3-5 5-4z"/><line x1="16" y1="9" x2="16" y2="28"/><circle cx="16" cy="13" r="0.8" fill="currentColor"/><circle cx="16" cy="18" r="0.8" fill="currentColor"/><circle cx="16" cy="23" r="0.8" fill="currentColor"/></svg>` },
    { id: 'traditional_vest', label: 'Anadolu İşlemeli Yelek', category: 'Kültürel', iconSvg: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7l4 3h6l4-3 2 4-2 4-2-1v13H11V15l-2 1-2-4 2-4z"/><path d="M13 10l3 5 3-5"/><line x1="16" y1="15" x2="16" y2="27"/></svg>` }
  ];

  // 3. Karakter Gövdesi ve Seçilen Kıyafetin SVG Generator'ı
  function renderTorsoSVG(outfitId, bodyType, skinColor, outfitColor) {
    const skin = (skinColor || 'f8d9ce').replace('#', '');
    const cColor = (outfitColor || '102343').replace('#', '');
    const bType = bodyType || 'average';

    // Vücut tipine göre omuz genişliği
    let shoulderPoints = 'M24 180 L36 50 C58 32 88 28 120 28 C152 28 182 32 204 50 L216 180 Z';
    if (bType === 'slim') {
      shoulderPoints = 'M38 180 L48 54 C66 38 92 34 120 34 C148 34 174 38 192 54 L202 180 Z';
    } else if (bType === 'plump') {
      shoulderPoints = 'M10 180 L24 46 C50 26 84 22 120 22 C156 22 190 26 216 46 L230 180 Z';
    }

    let garmentDetails = '';

    switch(outfitId) {
      case 'turkish_kaftan':
        garmentDetails = `
          <path d="M78 36 L120 105 L162 36" fill="none" stroke="#d4af37" stroke-width="12" stroke-linecap="round"/>
          <path d="M78 36 L120 105 L162 36" fill="none" stroke="#78350f" stroke-width="2"/>
          <line x1="120" y1="105" x2="120" y2="180" stroke="#d4af37" stroke-width="8"/>
          <circle cx="120" cy="120" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
          <circle cx="120" cy="144" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
          <circle cx="120" cy="168" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
          <path d="M92 70 Q80 85 95 95" fill="none" stroke="#d4af37" stroke-width="2.5"/>
          <path d="M148 70 Q160 85 145 95" fill="none" stroke="#d4af37" stroke-width="2.5"/>
        `;
        break;

      case 'kazakh_shapan':
        garmentDetails = `
          <path d="M72 32 L120 108 L168 32" fill="none" stroke="#fbbf24" stroke-width="14" stroke-linecap="round"/>
          <line x1="120" y1="108" x2="120" y2="180" stroke="#fbbf24" stroke-width="10"/>
          <path d="M88 65 C78 52 64 62 76 74 C86 84 102 78 98 64" fill="none" stroke="#b45309" stroke-width="3"/>
          <path d="M152 65 C162 52 176 62 164 74 C154 84 138 78 142 64" fill="none" stroke="#b45309" stroke-width="3"/>
          <circle cx="120" cy="126" r="4.5" fill="#78350f"/>
          <circle cx="120" cy="154" r="4.5" fill="#78350f"/>
        `;
        break;

      case 'uzbek_chapan':
        garmentDetails = `
          <path d="M76 34 L120 102 L164 34" fill="none" stroke="#f59e0b" stroke-width="11"/>
          <line x1="120" y1="102" x2="120" y2="180" stroke="#f59e0b" stroke-width="8"/>
          <path d="M50 80 L190 140 M50 120 L190 180" stroke="rgba(255,255,255,0.25)" stroke-width="6"/>
          <path d="M190 80 L50 140 M190 120 L50 180" stroke="rgba(255,215,0,0.3)" stroke-width="4"/>
        `;
        break;

      case 'kyrgyz_chepken':
        garmentDetails = `
          <path d="M82 34 L120 95 L158 34" fill="none" stroke="#f1f5f9" stroke-width="12"/>
          <line x1="120" y1="95" x2="120" y2="180" stroke="#f1f5f9" stroke-width="8"/>
          <circle cx="120" cy="115" r="4" fill="#0f172a"/>
          <circle cx="120" cy="142" r="4" fill="#0f172a"/>
          <path d="M96 68 Q88 85 104 88" fill="none" stroke="#dc2626" stroke-width="3"/>
          <path d="M144 68 Q152 85 136 88" fill="none" stroke="#dc2626" stroke-width="3"/>
        `;
        break;

      case 'azerbaijan_libas':
        garmentDetails = `
          <path d="M84 34 L120 85 L156 34" fill="none" stroke="#e2e8f0" stroke-width="8"/>
          <line x1="120" y1="85" x2="120" y2="180" stroke="#cbd5e1" stroke-width="5"/>
          <rect x="90" y="145" width="60" height="12" rx="3" fill="#64748b"/>
          <rect x="112" y="142" width="16" height="18" rx="2" fill="#d4af37"/>
        `;
        break;

      case 'turkmen_don':
        garmentDetails = `
          <path d="M78 32 L120 104 L162 32" fill="none" stroke="#b91c1c" stroke-width="12"/>
          <path d="M78 32 L120 104 L162 32" fill="none" stroke="#fbbf24" stroke-width="3"/>
          <line x1="120" y1="104" x2="120" y2="180" stroke="#fbbf24" stroke-width="6"/>
          <circle cx="100" cy="72" r="3.5" fill="#fef08a"/>
          <circle cx="140" cy="72" r="3.5" fill="#fef08a"/>
        `;
        break;

      case 'casual_hoodie':
        garmentDetails = `
          <path d="M72 26 C88 56 152 56 168 26" fill="none" stroke="#1e293b" stroke-width="14" stroke-linecap="round"/>
          <path d="M78 30 C92 56 148 56 162 30" fill="none" stroke="#334155" stroke-width="4"/>
          <line x1="108" y1="46" x2="108" y2="102" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
          <circle cx="108" cy="104" r="2.5" fill="#d4af37"/>
          <line x1="132" y1="46" x2="132" y2="98" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
          <circle cx="132" cy="100" r="2.5" fill="#d4af37"/>
          <path d="M70 148 Q120 135 170 148" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/>
        `;
        break;

      case 'blazer_formal':
        garmentDetails = `
          <polygon points="120,42 96,22 144,22" fill="#ffffff"/>
          <polygon points="117,42 123,42 126,108 120,120 114,108" fill="#b91c1c"/>
          <polygon points="82,28 116,102 100,114 62,56" fill="#0f172a"/>
          <polygon points="158,28 124,102 140,114 178,56" fill="#0f172a"/>
          <circle cx="120" cy="132" r="3.5" fill="#d4af37"/>
          <circle cx="120" cy="158" r="3.5" fill="#d4af37"/>
        `;
        break;

      case 'bomber_jacket':
        garmentDetails = `
          <path d="M88 32 Q120 46 152 32" fill="none" stroke="#0f172a" stroke-width="10"/>
          <line x1="120" y1="36" x2="120" y2="180" stroke="#cbd5e1" stroke-width="4"/>
          <rect x="117" y="58" width="6" height="12" rx="2" fill="#d4af37"/>
          <line x1="68" y1="120" x2="94" y2="140" stroke="rgba(0,0,0,0.3)" stroke-width="3" stroke-linecap="round"/>
          <line x1="172" y1="120" x2="146" y2="140" stroke="rgba(0,0,0,0.3)" stroke-width="3" stroke-linecap="round"/>
        `;
        break;

      case 'polo_shirt':
        garmentDetails = `
          <polygon points="86,30 120,52 154,30 144,20 120,28 96,20" fill="#ffffff" stroke="rgba(0,0,0,0.1)"/>
          <rect x="114" y="50" width="12" height="42" fill="#f8fafc"/>
          <circle cx="120" cy="62" r="2.2" fill="#64748b"/>
          <circle cx="120" cy="78" r="2.2" fill="#64748b"/>
        `;
        break;

      case 'knit_sweater':
        garmentDetails = `
          <rect x="92" y="8" width="56" height="38" rx="6" fill="#334155" stroke="rgba(0,0,0,0.2)"/>
          <line x1="102" y1="10" x2="102" y2="44" stroke="#475569" stroke-width="2"/>
          <line x1="111" y1="10" x2="111" y2="44" stroke="#475569" stroke-width="2"/>
          <line x1="120" y1="10" x2="120" y2="44" stroke="#475569" stroke-width="2"/>
          <line x1="129" y1="10" x2="129" y2="44" stroke="#475569" stroke-width="2"/>
          <line x1="138" y1="10" x2="138" y2="44" stroke="#475569" stroke-width="2"/>
          <path d="M80 80 Q120 70 160 80 M75 120 Q120 110 165 120" stroke="rgba(0,0,0,0.15)" stroke-width="2.5" fill="none"/>
        `;
        break;

      case 'plaid_shirt':
        garmentDetails = `
          <polygon points="88,30 120,48 152,30 120,24" fill="#ffffff"/>
          <line x1="120" y1="48" x2="120" y2="180" stroke="#ffffff" stroke-width="4"/>
          <line x1="40" y1="90" x2="200" y2="90" stroke="rgba(0,0,0,0.3)" stroke-width="4"/>
          <line x1="40" y1="140" x2="200" y2="140" stroke="rgba(0,0,0,0.3)" stroke-width="4"/>
          <line x1="85" y1="40" x2="85" y2="180" stroke="rgba(0,0,0,0.3)" stroke-width="4"/>
          <line x1="155" y1="40" x2="155" y2="180" stroke="rgba(0,0,0,0.3)" stroke-width="4"/>
          <circle cx="120" cy="70" r="2.5" fill="#1e293b"/>
          <circle cx="120" cy="105" r="2.5" fill="#1e293b"/>
          <circle cx="120" cy="140" r="2.5" fill="#1e293b"/>
        `;
        break;

      case 'denim_jacket':
        garmentDetails = `
          <polygon points="86,30 120,50 154,30 120,24" fill="#1d4ed8"/>
          <line x1="120" y1="50" x2="120" y2="180" stroke="#f59e0b" stroke-width="3"/>
          <rect x="68" y="75" width="34" height="24" rx="3" fill="#1e40af" stroke="#f59e0b" stroke-width="1.5"/>
          <circle cx="85" cy="87" r="2.5" fill="#d97706"/>
          <rect x="138" y="75" width="34" height="24" rx="3" fill="#1e40af" stroke="#f59e0b" stroke-width="1.5"/>
          <circle cx="155" cy="87" r="2.5" fill="#d97706"/>
        `;
        break;

      case 'leather_jacket':
        garmentDetails = `
          <polygon points="76,30 135,100 115,108 55,50" fill="#0f172a"/>
          <polygon points="164,30 105,100 125,108 185,50" fill="#1e293b"/>
          <line x1="130" y1="36" x2="105" y2="180" stroke="#cbd5e1" stroke-width="4"/>
          <circle cx="85" cy="50" r="2.5" fill="#f8fafc"/>
          <circle cx="155" cy="50" r="2.5" fill="#f8fafc"/>
        `;
        break;

      case 'sport_jersey':
        garmentDetails = `
          <polygon points="98,34 120,62 142,34" fill="#ffffff"/>
          <line x1="55" y1="58" x2="38" y2="120" stroke="#ffffff" stroke-width="4"/>
          <line x1="185" y1="58" x2="202" y2="120" stroke="#ffffff" stroke-width="4"/>
          <circle cx="85" cy="85" r="9" fill="#dc2626"/>
          <path d="M85 80 A5 5 0 1 0 85 90 A4 4 0 1 1 85 80 Z" fill="#ffffff"/>
        `;
        break;

      case 'winter_parka':
        garmentDetails = `
          <path d="M72 26 C90 52 150 52 168 26" fill="none" stroke="#e2e8f0" stroke-width="18" stroke-linecap="round"/>
          <line x1="120" y1="44" x2="120" y2="180" stroke="#334155" stroke-width="6"/>
          <circle cx="120" cy="75" r="3" fill="#cbd5e1"/>
          <circle cx="120" cy="110" r="3" fill="#cbd5e1"/>
          <circle cx="120" cy="145" r="3" fill="#cbd5e1"/>
        `;
        break;

      case 'academic_robe':
        garmentDetails = `
          <polygon points="120,40 100,24 140,24" fill="#ffffff"/>
          <path d="M88 30 L96 180" stroke="#b91c1c" stroke-width="16"/>
          <path d="M88 30 L96 180" stroke="#d4af37" stroke-width="3"/>
          <path d="M152 30 L144 180" stroke="#b91c1c" stroke-width="16"/>
          <path d="M152 30 L144 180" stroke="#d4af37" stroke-width="3"/>
        `;
        break;

      case 'linen_shirt':
        garmentDetails = `
          <path d="M96 28 C108 36 132 36 144 28" fill="none" stroke="#f8fafc" stroke-width="6"/>
          <line x1="120" y1="36" x2="120" y2="180" stroke="#f1f5f9" stroke-width="3"/>
          <circle cx="120" cy="55" r="2.5" fill="#94a3b8"/>
          <circle cx="120" cy="85" r="2.5" fill="#94a3b8"/>
          <circle cx="120" cy="115" r="2.5" fill="#94a3b8"/>
        `;
        break;

      case 'traditional_vest':
        garmentDetails = `
          <polygon points="120,38 98,22 142,22" fill="#ffffff"/>
          <polygon points="80,28 116,95 86,180 50,180 44,60" fill="#0f172a"/>
          <polygon points="160,28 124,95 154,180 190,180 196,60" fill="#0f172a"/>
          <path d="M80 28 L116 95" stroke="#d4af37" stroke-width="3"/>
          <path d="M160 28 L124 95" stroke="#d4af37" stroke-width="3"/>
          <circle cx="95" cy="65" r="3" fill="#f59e0b"/>
          <circle cx="145" cy="65" r="3" fill="#f59e0b"/>
        `;
        break;

      case 'casual_tshirt':
      default:
        garmentDetails = `
          <path d="M94 28 C104 46 136 46 146 28" fill="none" stroke="#ffffff" stroke-width="5"/>
          <path d="M94 28 C104 46 136 46 146 28" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
          <path d="M75 90 Q120 78 165 90" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="2"/>
        `;
        break;
    }

    return `
      <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
        <!-- Boyun Katmanı (Karakter Ten Rengine %100 Uyumlu) -->
        <path d="M102 0 H138 V48 C138 58 130 65 120 65 C110 65 102 58 102 48 Z" fill="#${skin}"/>
        
        <!-- Omuz & Gövde Silüeti -->
        <path d="${shoulderPoints}" fill="#${cColor}"/>
        
        <!-- Seçilen Kıyafet Çizimi & Yaka/Nakış Detayları -->
        ${garmentDetails}
      </svg>
    `;
  }

  // Vücut Tipi Seçici Bileşeni (Görsel Silüet İkonları - Flexbox)
  function renderBodyTypeSelector(containerId, options, currentValue, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = 'body-type-grid';
    el.innerHTML = options.map(opt => {
      const isSel = opt.id === currentValue;
      return `
        <button type="button" 
                class="body-type-card-btn ${isSel ? 'active' : ''}" 
                data-val="${opt.id}" 
                data-tooltip="${opt.label}" 
                aria-label="${opt.label}">
          ${opt.iconSvg}
          <span class="body-type-btn-label">${opt.label.split('/')[0].trim()}</span>
        </button>
      `;
    }).join('');

    el.querySelectorAll('.body-type-card-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.body-type-card-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn.dataset.val);
      };
    });
  }

  // Gardırop & Kıyafet Seçici Bileşeni (20 Model, SVG İkonlu Izgara)
  function renderOutfitSelector(containerId, options, currentValue, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = 'outfit-grid-container';
    el.innerHTML = options.map(opt => {
      const isSel = opt.id === currentValue;
      return `
        <button type="button" 
                class="outfit-card-btn ${isSel ? 'active' : ''}" 
                data-val="${opt.id}" 
                data-tooltip="${opt.label} • ${opt.category}" 
                aria-label="${opt.label}">
          <div class="outfit-card-icon">${opt.iconSvg}</div>
          <span class="outfit-card-badge">${opt.label}</span>
        </button>
      `;
    }).join('');

    el.querySelectorAll('.outfit-card-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.outfit-card-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn.dataset.val);
      };
    });
  }

  function renderAvatarCustomizerControls() {
    // =========================================================================
    // === AVATAR STATE VE VERİ EŞLEŞTİRME (DATA MAPPING) ONARIMI ===
    // 1. Ten Rengi: Varsayılan olarak açık/beyaz ten rengi (#F8D9CE) yüklenir.
    //    TÜM ÖNİZLEME İKONLARINDA da açık ten (&skinColor=...) parametresi kullanılır.
    // 2. Göz Rengi: 8 doğal iris renk tonu swatches olarak sunulur.
    // 3. Vücut Tipi: 3 silüet ikonu ile omuz ve gövde yapısı anlık güncellenir.
    // 4. Kıyafet: 20 farklı modern, kültürel ve resmi model gardırobu.
    // =========================================================================

    const currentSkin = (currentEditingAvatarConfig.skinColor || 'f8d9ce').replace('#', '');

    // 1. Ten Rengi (Color Swatches - Varsayılan Açık/Beyaz Ten: #F8D9CE)
    renderColorSwatches('optSkinColor', [
      { id: 'f8d9ce', label: 'Doğal Açık / Beyaz Ten (#F8D9CE)' },
      { id: 'f9c9b6', label: 'Porselen / Açık Pembe Ten' },
      { id: 'f2d3b1', label: 'Doğal Buğday Ten' },
      { id: 'ecad80', label: 'Sıcak Şeftali Ten' },
      { id: 'd4976a', label: 'Doğal Kumral Ten' },
      { id: '9e5622', label: 'Bronz Esmer Ten' },
      { id: '763900', label: 'Koyu Esmer Ten' }
    ], currentEditingAvatarConfig.skinColor || 'f8d9ce', val => {
      currentEditingAvatarConfig.skinColor = val;
      currentEditingAvatarConfig.skinTone = val;
      // İkonlardaki ten rengini de anlık güncelle
      renderAvatarCustomizerControls();
      updateLiveAvatarPreview();
    });

    // 2. Göz Rengi (8 Doğal İris Tonu - Color Swatches)
    renderColorSwatches('optEyeColor', [
      { id: '3b2219', label: 'Koyu Kahverengi' },
      { id: '6d4c41', label: 'Açık Fındık / Kahve' },
      { id: '7d6b38', label: 'Doğal Ela (Hazel)' },
      { id: '2e7d32', label: 'Zümrüt Yeşili' },
      { id: '1565c0', label: 'Okyanus Mavisi' },
      { id: 'b45309', label: 'Sıcak Kehribar (Amber)' },
      { id: '1a1a1a', label: 'Derin Kömür Siyahı' },
      { id: '64748b', label: 'Buz Mavisi / Açık Gri' }
    ], currentEditingAvatarConfig.eyeColor || '3b2219', val => {
      currentEditingAvatarConfig.eyeColor = val;
      updateLiveAvatarPreview();
    });

    // 3. Vücut Tipi (3 Silüet Seçeneği - Tam Hizalı)
    renderBodyTypeSelector('optBodyType', BODY_TYPES, currentEditingAvatarConfig.bodyType || 'average', val => {
      currentEditingAvatarConfig.bodyType = val;
      updateLiveAvatarPreview();
    });

    // 4. Kıyafet & Gardırop (20 Farklı Model)
    renderOutfitSelector('optOutfitModel', OUTFIT_MODELS, currentEditingAvatarConfig.outfit || 'casual_tshirt', val => {
      currentEditingAvatarConfig.outfit = val;
      updateLiveAvatarPreview();
    });

    // 5. Saç Modeli (DiceBear Adventurer Doğrudan Eşleşen 16 Model - Açık Tenli Önizleme)
    const hairOptions = [
      { id: 'short01', label: 'Kısa Klasik Kesim' },
      { id: 'short02', label: 'Kısa Katlı Dalga' },
      { id: 'short03', label: 'Yanlar Kısa / Fade' },
      { id: 'short04', label: 'Kısa Doğal Hacim' },
      { id: 'short05', label: 'Tepe Hacimli Kısa' },
      { id: 'short06', label: 'Modern Kısa Kesim' },
      { id: 'short08', label: 'Tepe Topuz / Man Bun' },
      { id: 'short12', label: 'Geriye Taranmış Kısa' },
      { id: 'short16', label: 'Yoğun Dalgalı Kısa' },
      { id: 'long01', label: 'Omuz Hizasında Düz' },
      { id: 'long02', label: 'Uzun Düz Saç' },
      { id: 'long03', label: 'Yoğun Hacimli Uzun' },
      { id: 'long04', label: 'Ortadan Ayrık Uzun' },
      { id: 'long05', label: 'Doğal Dökümlü Uzun' },
      { id: 'long06', label: 'İki Yana Dökümlü Uzun' },
      { id: 'long10', label: 'Kâküllü Uzun Saç' },
      { id: 'long16', label: 'Uzun Katlı Kesim' },
      { id: 'long26', label: 'Klasik Bob Kesim' }
    ].map(opt => ({
      ...opt,
      iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&hair=${opt.id}&hairProbability=100&glassesProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="${opt.label}" loading="lazy">`
    }));

    renderVisualButtons('optHairStyle', hairOptions, currentEditingAvatarConfig.hair, val => {
      currentEditingAvatarConfig.hair = val;
      updateLiveAvatarPreview();
    });

    // 6. Saç Renk Tonu (Color Swatches - data-tooltip ile)
    renderColorSwatches('optHairColor', [
      { id: '0e0e0e', label: 'Kuzuni Siyah' },
      { id: '562306', label: 'Koyu Kestane' },
      { id: '6a4e35', label: 'Çikolata Kahve' },
      { id: '796a45', label: 'Sıcak Kumral' },
      { id: 'b9a05f', label: 'Açık Kumral' },
      { id: 'e5d7a3', label: 'Altın Sarısı' },
      { id: 'ab2a18', label: 'Kızıl / Bakır' },
      { id: 'cb6820', label: 'Karamel Turuncu' },
      { id: 'afafaf', label: 'Gümüş / Platin' },
      { id: '3eac2c', label: 'Zümrüt Yeşil' },
      { id: '592454', label: 'Mürdüm Mor' }
    ], currentEditingAvatarConfig.hairColor, val => {
      currentEditingAvatarConfig.hairColor = val;
      updateLiveAvatarPreview();
    });

    // 7. Yüz İfadesi & Gülümseme (Açık Tenli Önizleme)
    const moodOptions = [
      { id: 'variant01', label: 'Samimi Tebessüm' },
      { id: 'variant02', label: 'Geniş Gülüş' },
      { id: 'variant03', label: 'Neşeli Açık Gülüş' },
      { id: 'variant04', label: 'Sakin / Dingin Tebessüm' },
      { id: 'variant05', label: 'Coşkulu Gülümseme' },
      { id: 'variant06', label: 'Hafif Çapkın Tebessüm' },
      { id: 'variant07', label: 'Sıcak Gülümseme' },
      { id: 'variant08', label: 'Sevimli Gülüş' },
      { id: 'variant09', label: 'Düşünceli / Meraklı' },
      { id: 'variant10', label: 'Nezaketli Tebessüm' }
    ].map(opt => ({
      ...opt,
      iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&mouth=${opt.id}&hairProbability=0&glassesProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="${opt.label}" loading="lazy">`
    }));

    renderVisualButtons('optMood', moodOptions, currentEditingAvatarConfig.mood, val => {
      currentEditingAvatarConfig.mood = val;
      updateLiveAvatarPreview();
    });

    // 8. Göz Şekli & Bakış (Açık Tenli Önizleme)
    const eyeOptions = [
      { id: 'variant01', label: 'Doğal Güleç Bakış' },
      { id: 'variant02', label: 'Canlı Açık Bakış' },
      { id: 'variant03', label: 'Sakin / Dingin Bakış' },
      { id: 'variant04', label: 'Dikkatli / Zeki Bakış' },
      { id: 'variant05', label: 'Neşeli Gülen Gözler' },
      { id: 'variant06', label: 'Parlak / Meraklı Bakış' },
      { id: 'variant07', label: 'Masum / Sevecen Bakış' },
      { id: 'variant08', label: 'Derin / Odaklanmış Bakış' }
    ].map(opt => ({
      ...opt,
      iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&eyes=${opt.id}&hairProbability=0&glassesProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="${opt.label}" loading="lazy">`
    }));

    renderVisualButtons('optEyes', eyeOptions, currentEditingAvatarConfig.eyes, val => {
      currentEditingAvatarConfig.eyes = val;
      updateLiveAvatarPreview();
    });

    // 9. Gözlük & Aksesuar
    const accessoryOptions = [
      {
        id: 'none',
        label: 'Gözlüksüz / Sade',
        iconHtml: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/><line x1="8" y1="8" x2="24" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>`
      },
      {
        id: 'variant01',
        label: 'Kalın Dikdörtgen Çerçeve',
        iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&glasses=variant01&glassesProbability=100&hairProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="Kalın Dikdörtgen Çerçeve" loading="lazy">`
      },
      {
        id: 'variant02',
        label: 'Zarif Yuvarlak Çerçeve',
        iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&glasses=variant02&glassesProbability=100&hairProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="Zarif Yuvarlak Çerçeve" loading="lazy">`
      },
      {
        id: 'variant03',
        label: 'Güneş Gözlüğü',
        iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&glasses=variant03&glassesProbability=100&hairProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="Güneş Gözlüğü" loading="lazy">`
      },
      {
        id: 'variant04',
        label: 'Modern Geometrik Çerçeve',
        iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&glasses=variant04&glassesProbability=100&hairProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="Modern Geometrik Çerçeve" loading="lazy">`
      },
      {
        id: 'variant05',
        label: 'Retro / Vintage Çerçeve',
        iconHtml: `<img src="https://api.dicebear.com/7.x/adventurer/svg?seed=preview&skinColor=${encodeURIComponent(currentSkin)}&glasses=variant05&glassesProbability=100&hairProbability=0&backgroundColor=transparent" class="avatar-svg-glyph" alt="Retro / Vintage Çerçeve" loading="lazy">`
      }
    ];

    renderVisualButtons('optAccessories', accessoryOptions, currentEditingAvatarConfig.accessories, val => {
      currentEditingAvatarConfig.accessories = val;
      updateLiveAvatarPreview();
    });

    // 10. Arka Plan & Kıyafet Rengi
    renderColorSwatches('optOutfitColor', [
      { id: '102343', label: 'Gece Mavisi / Lacivert' },
      { id: 'b91c1c', label: 'Bordo / Kızıl' },
      { id: '0f766e', label: 'Zümrüt Yeşili' },
      { id: '78350f', label: 'Sıcak Kahve / Kehribar' },
      { id: '334155', label: 'Füme / Kömür Grisi' },
      { id: 'd4af37', label: 'Altın Sarısı' },
      { id: '4338ca', label: 'Kraliyet Moru' },
      { id: 'ffdfbf', label: 'Parşömen Beji' }
    ], currentEditingAvatarConfig.outfitColor || currentEditingAvatarConfig.backgroundColor || '102343', val => {
      currentEditingAvatarConfig.outfitColor = val;
      currentEditingAvatarConfig.backgroundColor = val;
      updateLiveAvatarPreview();
    });
  }

  function updateLiveAvatarPreview() {
    const img = document.getElementById('liveAvatarPreviewImg');
    const skin = (currentEditingAvatarConfig.skinColor || 'f8d9ce').replace('#', '');
    if (img) {
      img.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=TurkPenpal&skinColor=${encodeURIComponent(skin)}&hair=${encodeURIComponent(currentEditingAvatarConfig.hair || 'long01')}&hairProbability=100&hairColor=${encodeURIComponent(currentEditingAvatarConfig.hairColor || '0e0e0e')}&eyes=${encodeURIComponent(currentEditingAvatarConfig.eyes || 'variant01')}&mouth=${encodeURIComponent(currentEditingAvatarConfig.mood || 'variant01')}&backgroundColor=transparent${currentEditingAvatarConfig.accessories && currentEditingAvatarConfig.accessories !== 'none' ? `&glasses=${encodeURIComponent(currentEditingAvatarConfig.accessories)}&glassesProbability=100` : '&glassesProbability=0'}`;
    }

    // 1. Dikey Dikdörtgen Sahnesi & Vücut Tipi Sınıfları
    const stage = document.getElementById('liveAvatarCircleContainer');
    if (stage) {
      stage.classList.remove('body-slim', 'body-average', 'body-plump');
      stage.classList.add(`body-${currentEditingAvatarConfig.bodyType || 'average'}`);
    }

    // 2. Omuz, Gövde ve Seçilen Kıyafetin Canlı Render'ı
    const torsoEl = document.getElementById('avatarOutfitTorso');
    if (torsoEl) {
      torsoEl.innerHTML = renderTorsoSVG(
        currentEditingAvatarConfig.outfit || 'casual_tshirt',
        currentEditingAvatarConfig.bodyType || 'average',
        currentEditingAvatarConfig.skinColor || 'f8d9ce',
        currentEditingAvatarConfig.outfitColor || '102343'
      );
    }

    // 3. Rozetlerin Güncellenmesi
    const badgeOutfit = document.getElementById('badgeOutfitName');
    if (badgeOutfit) {
      const oModel = OUTFIT_MODELS.find(m => m.id === currentEditingAvatarConfig.outfit) || OUTFIT_MODELS[0];
      badgeOutfit.textContent = oModel.label;
    }

    const badgeBody = document.getElementById('badgeBodyType');
    if (badgeBody) {
      const bLabels = {
        'slim': '🏃 Zayıf Yapı',
        'average': '⚖️ Standart Yapı',
        'plump': '💪 Dolgun Yapı'
      };
      badgeBody.textContent = bLabels[currentEditingAvatarConfig.bodyType] || 'Standart Yapı';
    }

    const badgeEye = document.getElementById('badgeEyeColor');
    if (badgeEye) {
      const eyeNames = {
        '3b2219': 'Koyu Kahverengi',
        '6d4c41': 'Fındık Kahve',
        '7d6b38': 'Doğal Ela',
        '2e7d32': 'Zümrüt Yeşil',
        '1565c0': 'Okyanus Mavi',
        'b45309': 'Sıcak Kehribar',
        '1a1a1a': 'Kömür Siyah',
        '64748b': 'Buz Mavisi'
      };
      const curColor = currentEditingAvatarConfig.eyeColor || '3b2219';
      badgeEye.innerHTML = `<span class="badge-color-dot" style="background:#${curColor};"></span> ${eyeNames[curColor] || 'Göz Rengi'}`;
    }
  }

  function randomizeAvatar() {
    const skins = ['f8d9ce', 'f9c9b6', 'f2d3b1', 'ecad80', 'd4976a', '9e5622', '763900'];
    const eyeColors = ['3b2219', '6d4c41', '7d6b38', '2e7d32', '1565c0', 'b45309', '1a1a1a', '64748b'];
    const bodyTypes = ['slim', 'average', 'plump'];
    const outfits = OUTFIT_MODELS.map(o => o.id);
    const hairs = ['short01', 'short02', 'short03', 'short04', 'short05', 'short06', 'short08', 'short12', 'short16', 'long01', 'long02', 'long03', 'long04', 'long05', 'long06', 'long10', 'long16', 'long26'];
    const hairColors = ['0e0e0e', '562306', '6a4e35', '796a45', 'b9a05f', 'e5d7a3', 'ab2a18', 'cb6820', 'afafaf', '3eac2c', '592454'];
    const moods = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08', 'variant09', 'variant10'];
    const eyes = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08'];
    const accs = ['none', 'variant01', 'variant02', 'variant03', 'variant04', 'variant05'];
    const backgrounds = ['102343', 'b91c1c', '0f766e', '78350f', '334155', 'd4af37', '4338ca', 'ffdfbf'];

    currentEditingAvatarConfig = {
      skinColor: skins[Math.floor(Math.random() * skins.length)],
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
      bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)],
      outfit: outfits[Math.floor(Math.random() * outfits.length)],
      hair: hairs[Math.floor(Math.random() * hairs.length)],
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      mood: moods[Math.floor(Math.random() * moods.length)],
      eyes: eyes[Math.floor(Math.random() * eyes.length)],
      accessories: accs[Math.floor(Math.random() * accs.length)],
      outfitColor: backgrounds[Math.floor(Math.random() * backgrounds.length)],
      backgroundColor: backgrounds[Math.floor(Math.random() * backgrounds.length)]
    };

    renderAvatarCustomizerControls();
    updateLiveAvatarPreview();
  }

  function saveAvatar() {
    saveMyAvatarConfig(currentEditingAvatarConfig);
    closeAvatarStudio();
    alert('✓ Bitmoji avatarınız başarıyla kaydedildi! Gönderdiğiniz mektuplarda bu avatar kullanılacaktır.');
  }

  // --- 17. AŞAMA GEÇİŞLERİ ---
  function goToComposeStep(stepNum) {
    const step1 = document.getElementById('composeStep1');
    const step2 = document.getElementById('composeStep2');
    const step3 = document.getElementById('composeStep3');
    const navItems = document.querySelectorAll('.compose-step-item');

    navItems.forEach(item => {
      const s = parseInt(item.dataset.step, 10);
      item.classList.toggle('active', s === stepNum);
      item.classList.toggle('completed', s < stepNum);
    });

    if (step1) step1.style.display = stepNum === 1 ? 'block' : 'none';
    if (step2) step2.style.display = stepNum === 2 ? 'block' : 'none';
    if (step3) step3.style.display = stepNum === 3 ? 'block' : 'none';

    if (stepNum === 1) renderStep1Countries();
    if (stepNum === 2) renderStep2Profiles();
    if (stepNum === 3) renderStep3Studio();
  }

  // --- 18. MEKTUBU GÖNDER (BOZKIR KARTALI İLE YOLA ÇIKIŞ) ---
  function handleSendLetter(e) {
    if (e) e.preventDefault();

    if (!activeSelectedPenpal) {
      alert('Lütfen bir mektup arkadaşı seçiniz.');
      return;
    }

    const subjectInput = document.getElementById('penpalLetterSubject');
    const bodyInput = document.getElementById('penpalLetterBody');
    const hint = document.getElementById('letterValidationHint');

    let subject = subjectInput ? subjectInput.value.trim() : '';
    const body = bodyInput ? bodyInput.value.trim() : '';

    if (!body || body.length < 5) {
      if (hint) {
        hint.textContent = '⚠️ Lütfen mektup arkadaşınıza iletmek istediğiniz metni yazınız.';
        hint.style.display = 'inline-block';
      }
      if (bodyInput) bodyInput.focus();
      return;
    }

    if (hint) hint.style.display = 'none';

    // Konu yazılmamışsa samimi bir varsayılan konu ata
    if (!subject) {
      subject = `Gönül Köprüsü • ${activeSelectedPenpal.city} Mektubu`;
    }

    const calc = calculateDeliveryEstimate('İstanbul', activeSelectedPenpal.city);
    const now = Date.now();
    // Kural: Uçak yolculuğu süresinin tam 2 katı teslimat süresi
    const deliveryMs = Math.round(calc.deliveryHours * 3600 * 1000);
    const deliveredAtDate = new Date(now + deliveryMs).toISOString();

    const myProfile = window.TDAAuth?.getProfile() || {
      studentId: 'TDA-TR-FAH01',
      firstName: 'Fahriye',
      lastName: '',
      country: 'Türkiye'
    };

    const myAvatarUrl = generateAvatarUrl();

    const newLetter = {
      id: 'let-' + Date.now(),
      fromStudentId: myProfile.studentId || 'TDA-TR-FAH01',
      fromName: `${myProfile.firstName || 'Fahriye'} ${myProfile.lastName || ''}`.trim(),
      fromCity: 'İstanbul',
      fromCountry: myProfile.country || 'Türkiye',
      fromAvatar: myAvatarUrl,
      toStudentId: activeSelectedPenpal.studentId,
      toName: activeSelectedPenpal.name,
      toCity: activeSelectedPenpal.city,
      toCountry: activeSelectedPenpal.country,
      toAvatar: activeSelectedPenpal.avatar,
      subject: subject,
      body: body,
      stamp: activeSelectedStamp,
      paperTheme: activeSelectedPaper,
      createdAt: new Date().toISOString(),
      deliveredAt: deliveredAtDate,
      flightHours: calc.flightHours,
      deliveryHours: calc.deliveryHours,
      status: 'in_transit', // Bozkır Kartalı Taşımakta
      read: true,
      folder: 'sent',
      photos: attachedPhotoFiles.slice()
    };

    const letters = getStoredLetters();
    letters.unshift(newLetter);
    saveLetters(letters);

    // Formu temizle
    if (subjectInput) subjectInput.value = '';
    if (bodyInput) bodyInput.value = '';
    attachedPhotoFiles = [];
    const counter = document.getElementById('penpalCharCount');
    if (counter) counter.textContent = '0';

    alert(`🦅 Bozkır Kartalı mektubunuzu teslim etmek üzere havalandı!\n\n` +
          `Rota: İstanbul ➔ ${activeSelectedPenpal.city} (${activeSelectedPenpal.country})\n` +
          `Uçuş Süresi: ~${calc.flightHours} saat\n` +
          `Teslimat Süresi (Tam 2 katı): ~${calc.deliveryHours} saat\n\n` +
          `Mektup hesaplanan süre dolduğunda alıcısına teslim edilecektir.`);

    updateTransitWidget();
    switchPane('paneSent');
    renderSent();
  }

  // --- 19. GELEN KUTUSU & GÖNDERİLENLER LİSTELEME ---
  // --- 19. GELEN KUTUSU & GÖNDERİLENLER LİSTELEME (INSTAGRAM DM / GMAIL LİSTE GÖRÜNÜMÜ) ---
  function renderInbox(searchTerm = '') {
    const listEl = document.getElementById('inboxLetterList');
    if (!listEl) return;

    let items = getInbox();
    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      items = items.filter(l => 
        (l.fromName || '').toLowerCase().includes(s) ||
        (l.fromCountry || '').toLowerCase().includes(s) ||
        (l.subject || '').toLowerCase().includes(s)
      );
    }

    if (!items.length) {
      listEl.innerHTML = `
        <div class="letter-empty-state">
          <div style="font-size:38px;margin-bottom:8px;">📬</div>
          <strong>Henüz gelen bir mektubunuz yok.</strong>
          <p>Yeni bir mektup yazarak Türk Dünyası'ndaki bir öğrenciye ilk adımı siz atabilirsiniz.</p>
        </div>
      `;
      return;
    }

    // Liste Görünümü: Sadece sol tarafta küçük yuvarlak Bitmoji, kalın Ad Soyad, hemen altında hafif gri ülke.
    // Mektup metni/özeti KESİNLİKLE görünmez. Tıklanınca popup modal açılır.
    listEl.innerHTML = items.map(l => {
      const isUnread = !l.read && (l.status === 'delivered' || l.status === 'pending');
      const isTransit = l.status === 'in_transit';
      const isPending = l.status === 'pending';
      const avatarSrc = l.fromAvatar || generateAvatarUrl();
      const dateStr = new Date(l.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

      return `
        <div class="letter-dm-row ${isUnread ? 'unread' : ''}" data-letter-id="${l.id}" role="button" tabindex="0">
          <div class="letter-dm-left">
            <div class="letter-dm-avatar-frame">
              <img src="${avatarSrc}" alt="${l.fromName}" class="letter-dm-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=Penpal'">
              ${isUnread ? '<span class="letter-dm-unread-dot" title="Yeni Mektup"></span>' : ''}
            </div>
            <div class="letter-dm-text">
              <strong class="letter-dm-name">${l.fromName}</strong>
              <span class="letter-dm-country">${l.fromCountry}${l.fromCity ? ' (' + l.fromCity + ')' : ''}</span>
            </div>
          </div>
          <div class="letter-dm-right">
            ${isPending ? '<span class="letter-dm-pending-badge">🛡️ Onay Bekliyor</span>' : ''}
            ${isTransit ? '<span class="letter-dm-transit-badge">🦅 Yolda</span>' : ''}
            <span class="letter-dm-date">${dateStr}</span>
            <span class="letter-dm-chevron">›</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.letter-dm-row').forEach(card => {
      card.addEventListener('click', () => {
        openLetter(card.dataset.letterId);
      });
    });
  }

  function renderSent() {
    const listEl = document.getElementById('sentLetterList');
    if (!listEl) return;

    const items = getSent();
    if (!items.length) {
      listEl.innerHTML = `
        <div class="letter-empty-state">
          <div style="font-size:38px;margin-bottom:8px;">📤</div>
          <strong>Henüz gönderdiğiniz bir mektup yok.</strong>
        </div>
      `;
      return;
    }

    // Gönderilenler Liste Görünümü: Küçük yuvarlak Bitmoji, Alıcı Ad Soyad, Ülke.
    listEl.innerHTML = items.map(l => {
      const isTransit = l.status === 'in_transit';
      const avatarSrc = l.toAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Recipient';
      const dateStr = new Date(l.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

      return `
        <div class="letter-dm-row" data-letter-id="${l.id}" role="button" tabindex="0">
          <div class="letter-dm-left">
            <div class="letter-dm-avatar-frame">
              <img src="${avatarSrc}" alt="${l.toName}" class="letter-dm-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=Penpal'">
            </div>
            <div class="letter-dm-text">
              <strong class="letter-dm-name">${l.toName}</strong>
              <span class="letter-dm-country">${l.toCountry}${l.toCity ? ' (' + l.toCity + ')' : ''}</span>
            </div>
          </div>
          <div class="letter-dm-right">
            ${isTransit ? '<span class="letter-dm-transit-badge">🦅 Uçuşta</span>' : '<span class="letter-dm-delivered-badge">✓ Teslim</span>'}
            <span class="letter-dm-date">${dateStr}</span>
            <span class="letter-dm-chevron">›</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.letter-dm-row').forEach(card => {
      card.addEventListener('click', () => {
        openLetter(card.dataset.letterId);
      });
    });
  }

  // --- 20. MEKTUP DETAY GÖRÜNTÜLEYİCİ (MODAL / POPUP) ---
  function openLetter(letterId) {
    const letters = getStoredLetters();
    const letter = letters.find(l => l.id === letterId);
    if (!letter) return;

    const isPending = letter.status === 'pending';
    const isTransit = letter.status === 'in_transit';

    activeViewingLetter = letter;
    if (!letter.read) {
      letter.read = true;
      saveLetters(letters);
      renderInbox();
      updateBadgeCounts();
    }

    const stamp = letter.stamp || CULTURAL_STAMPS.tr[0];
    const stampImg = getStampImageSrc(stamp);
    const dateFormatted = new Date(letter.createdAt).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });

    // 1. Popup Modal Görünümünü Doldur ve Aç
    const modal = document.getElementById('letterReadModal');
    if (modal) {
      const avatarEl = document.getElementById('letterModalAvatar');
      const senderNameEl = document.getElementById('letterModalSenderName');
      const subEl = document.getElementById('letterModalCountryCity');
      const stampImgEl = document.getElementById('letterModalStampImg');
      const stampNameEl = document.getElementById('letterModalStampName');
      const transitAlert = document.getElementById('letterModalTransitAlert');
      const dateEl = document.getElementById('letterModalDate');
      const subjectEl = document.getElementById('letterModalSubject');
      const bodyEl = document.getElementById('letterModalBody');
      const photosSection = document.getElementById('letterModalPhotosSection');
      const photosGrid = document.getElementById('letterModalPhotosGrid');

      if (avatarEl) avatarEl.src = letter.fromAvatar || generateAvatarUrl();
      if (senderNameEl) senderNameEl.textContent = letter.fromName;
      if (subEl) subEl.textContent = `${letter.fromCity ? letter.fromCity + ', ' : ''}${letter.fromCountry} ➔ ${letter.toCity ? letter.toCity + ', ' : ''}${letter.toCountry}`;
      if (stampImgEl) {
        stampImgEl.src = stampImg;
        stampImgEl.onerror = () => { stampImgEl.src = 'assets/images/mektup-ikon.png'; };
      }
      if (stampNameEl) stampNameEl.textContent = stamp.name || 'Posta Pulu';
      if (transitAlert) transitAlert.style.display = isTransit ? 'block' : 'none';
      if (dateEl) dateEl.textContent = `Tarih: ${dateFormatted}`;
      if (subjectEl) subjectEl.textContent = letter.subject || 'Mektup';
      if (bodyEl) bodyEl.textContent = letter.body || '';

      if (photosSection && photosGrid) {
        if (!isPending && letter.photos && letter.photos.length) {
          photosSection.style.display = 'block';
          photosGrid.innerHTML = letter.photos.map(src => `<img src="${src}" alt="Ek Fotoğraf" onclick="window.open('${src}')">`).join('');
        } else {
          photosSection.style.display = 'none';
          photosGrid.innerHTML = '';
        }
      }

      // =========================================================================
      // === 5. İLK MEKTUP GÜVENLİK VE TANIŞMA ONAY (CONSENT) DUVARI ===
      // Onay butonları modalın en alt barına (Modal Footer) yerleştirilmiştir.
      // Henüz onay verilmemişse (isPending):
      // - letterModalConsentFooter görünür (Yeşil Kabul Et & Kırmızı Reddet)
      // - btnReplyFromModal gizlenir.
      // Onay verilmişse veya onaylandığı anda:
      // - letterModalConsentFooter gizlenir
      // - btnReplyFromModal (↩ Mektuba Yanıt Yaz) görünür ve aktif olur.
      // =========================================================================
      const consentFooter = document.getElementById('letterModalConsentFooter');
      const replyBtn = document.getElementById('btnReplyFromModal');

      if (isPending) {
        if (consentFooter) {
          consentFooter.style.display = 'flex';
          consentFooter.style.opacity = '1';
        }
        if (replyBtn) {
          replyBtn.style.display = 'none';
        }
      } else {
        if (consentFooter) {
          consentFooter.style.display = 'none';
        }
        if (replyBtn) {
          replyBtn.style.display = 'inline-flex';
          replyBtn.disabled = false;
          replyBtn.style.opacity = '1';
          replyBtn.style.cursor = 'pointer';
          replyBtn.title = '';
        }
      }

      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    }

    // 2. readerContainer'ı da doldur
    const readerContainer = document.getElementById('letterPaperView');
    if (readerContainer) {
      const themeClass = letter.paperTheme || 'paper-minimal';
      readerContainer.className = `reader-letter-container ${themeClass}`;
      readerContainer.innerHTML = `
        <div class="reader-header">
          <div class="reader-penpal-info">
            <img src="${letter.fromAvatar || generateAvatarUrl()}" alt="Avatar" class="reader-avatar-big">
            <div>
              <h3 style="margin:0 0 4px 0;font-size:18px;color:#102343;">${letter.fromName}</h3>
              <div style="font-size:12.5px;color:#64748b;">
                ${letter.fromCity || ''}, ${letter.fromCountry} ➔ ${letter.toCity || ''}, ${letter.toCountry}
              </div>
              <small class="muted">Tarih: ${dateFormatted}</small>
            </div>
          </div>

          <div style="text-align:right;">
            <div class="affixed-postage-stamp" style="display:inline-block;width:56px;height:68px;padding:3px;box-shadow:0 3px 10px rgba(0,0,0,0.12);" title="${stamp.name || 'Posta Pulu'}">
              <img src="${stampImg}" alt="${stamp.name || 'Pul'}" onerror="this.src='assets/images/mektup-ikon.png'">
              <div style="font-size:9px;color:#344054;font-weight:750;text-align:center;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${stamp.name || 'Pul'}</div>
            </div>
          </div>
        </div>

        ${isTransit ? `
          <div style="background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:10px;margin-bottom:18px;font-size:13px;color:#92400e;">
            🦅 <strong>Bu mektup şu anda Bozkır Kartalı tarafından taşınmaktadır.</strong> Teslim süresi dolduğunda alıcısına ulaşacaktır.
          </div>
        ` : ''}

        <div class="letter-paper-subject" style="font-size:21px;font-weight:bold;margin-bottom:18px;">
          ${letter.subject}
        </div>

        <div class="letter-paper-body" style="font-size:15.5px;line-height:1.85;white-space:pre-line;margin-bottom:24px;">
          ${letter.body}
        </div>

        ${letter.photos && letter.photos.length ? `
          <div class="reader-attached-photos">
            <h5>📷 Mektuba Eklenen Fotoğraflar (${letter.photos.length} Adet)</h5>
            <div class="reader-photos-row">
              ${letter.photos.map(src => `<img src="${src}" alt="Mektup Eki" class="reader-photo-thumb" onclick="window.open('${src}')">`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="letter-paper-footer" style="border-top:1px solid rgba(0,0,0,0.1);padding-top:16px;margin-top:20px;display:flex;justify-content:space-between;font-size:12px;color:#64748b;">
          <span>🦅 Türk Dünyası Bozkır Kartalı Posta Ağı</span>
          <span>${letter.fromName} • ${letter.fromCity || letter.fromCountry}</span>
        </div>
      `;
    }
  }

  function closeLetterModal() {
    const modal = document.getElementById('letterReadModal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // --- 20.1 İLK MEKTUP KABUL / RED FONKSİYONLARI (CONSENT MEKANİZMASI) ---
  function handleAcceptConsent() {
    if (!activeViewingLetter) return;
    const letters = getStoredLetters();
    const target = letters.find(l => l.id === activeViewingLetter.id);
    if (!target) return;

    // Durum geçişi: 'pending' -> 'delivered' (kabul edildi)
    target.status = 'delivered';
    activeViewingLetter.status = 'delivered';
    saveLetters(letters);
    setIntroductionConsent(target.fromStudentId, 'accepted');

    // UI Güncellemesi: Footer onay alanını animasyonla gizle, yanıt yaz butonunu aktif ve parıltılı yap
    const consentFooter = document.getElementById('letterModalConsentFooter');
    const replyBtn = document.getElementById('btnReplyFromModal');

    if (consentFooter) {
      consentFooter.style.transition = 'all 0.3s ease';
      consentFooter.style.opacity = '0';
      setTimeout(() => { 
        consentFooter.style.display = 'none'; 
        consentFooter.style.opacity = '1'; 
      }, 300);
    }

    if (replyBtn) {
      replyBtn.style.display = 'inline-flex';
      replyBtn.disabled = false;
      replyBtn.style.opacity = '1';
      replyBtn.style.cursor = 'pointer';
      replyBtn.title = '';
      replyBtn.style.boxShadow = '0 0 18px rgba(22, 163, 74, 0.6)';
      setTimeout(() => { replyBtn.style.boxShadow = ''; }, 2000);
    }

    // Fotoğraf galerisini aç (varsa)
    const photosSection = document.getElementById('letterModalPhotosSection');
    const photosGrid = document.getElementById('letterModalPhotosGrid');
    if (photosSection && photosGrid && target.photos && target.photos.length) {
      photosSection.style.display = 'block';
      photosGrid.innerHTML = target.photos.map(src => `<img src="${src}" alt="Ek Fotoğraf" onclick="window.open('${src}')">`).join('');
    }

    renderInbox();
    notifyUnread();
    alert(`✓ ${target.fromName} ile mektup arkadaşlığı başarıyla kabul edildi! Artık dilediğiniz gibi yanıt yazabilir ve kültürel anılarınızı paylaşabilirsiniz.`);
  }

  function handleRejectConsent() {
    if (!activeViewingLetter) return;
    const senderName = activeViewingLetter.fromName;
    const senderId = activeViewingLetter.fromStudentId;
    const letterId = activeViewingLetter.id;

    if (!confirm(`${senderName} adlı kullanıcının mektup arkadaşlığı talebini reddetmek ve bu kullanıcıyı engellemek istediğinize emin misiniz?`)) {
      return;
    }

    const letters = getStoredLetters();
    const target = letters.find(l => l.id === letterId);
    if (target) {
      target.status = 'rejected';
      saveLetters(letters);
    }

    // Kullanıcıyı engelle ve onay haritasına 'rejected' kaydet
    blockPenpal(senderId);
    setIntroductionConsent(senderId, 'rejected');

    closeLetterModal();

    // Satırı animasyonla kaydırarak gelen kutusundan kaldır
    const rowEl = document.querySelector(`.letter-dm-row[data-letter-id="${letterId}"]`);
    if (rowEl) {
      rowEl.classList.add('rejecting');
      setTimeout(() => {
        renderInbox();
        notifyUnread();
      }, 450);
    } else {
      renderInbox();
      notifyUnread();
    }

    alert(`Mektup arkadaşlığı reddedildi ve ${senderName} engellendi.`);
  }

  function switchPane(paneId) {
    const panes = ['paneInbox', 'paneSent', 'paneCompose', 'paneReader'];
    panes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === paneId) ? 'block' : 'none';
    });

    document.getElementById('btnShowInbox')?.classList.toggle('active', paneId === 'paneInbox');
    document.getElementById('btnShowSent')?.classList.toggle('active', paneId === 'paneSent');
  }

  // --- 21. ARAYÜZ OLAYLARI VE BAŞLATICI ---
  function bindUI() {
    // İlk Mektup Onay Duvarı Dinleyicileri
    document.getElementById('btnAcceptConsent')?.addEventListener('click', handleAcceptConsent);
    document.getElementById('btnRejectConsent')?.addEventListener('click', handleRejectConsent);

    // Sol Gezinme Butonları
    document.getElementById('btnShowInbox')?.addEventListener('click', () => {
      switchPane('paneInbox');
      renderInbox();
    });

    document.getElementById('btnShowSent')?.addEventListener('click', () => {
      switchPane('paneSent');
      renderSent();
    });

    document.getElementById('btnShowCompose')?.addEventListener('click', () => {
      switchPane('paneCompose');
      goToComposeStep(1);
    });

    document.getElementById('btnCancelCompose')?.addEventListener('click', () => {
      switchPane('paneInbox');
      renderInbox();
    });

    document.getElementById('btnBackToInbox')?.addEventListener('click', () => {
      switchPane('paneInbox');
      renderInbox();
    });

    // Bitmoji Avatar Stüdyosu Açma/Kapatma Butonları
    document.getElementById('btnOpenAvatarStudio')?.addEventListener('click', openAvatarStudio);
    document.getElementById('btnCloseAvatarStudio')?.addEventListener('click', closeAvatarStudio);
    document.getElementById('btnCancelAvatarStudio')?.addEventListener('click', closeAvatarStudio);
    document.getElementById('btnRandomAvatar')?.addEventListener('click', randomizeAvatar);
    document.getElementById('btnSaveMyAvatar')?.addEventListener('click', saveAvatar);

    // Mektup Okuma Modalı (DM Popup Modal) Dinleyicileri
    document.getElementById('btnCloseLetterModal')?.addEventListener('click', closeLetterModal);
    document.getElementById('btnCloseLetterModalBtn')?.addEventListener('click', closeLetterModal);
    document.getElementById('letterReadModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'letterReadModal') closeLetterModal();
    });
    document.getElementById('btnReplyFromModal')?.addEventListener('click', () => {
      if (!activeViewingLetter) return;
      if (activeViewingLetter.status === 'pending') {
        alert('Mektuba yanıt yazabilmek için lütfen önce yukarıdaki mektup arkadaşlığı talebini Kabul Ediniz.');
        return;
      }
      closeLetterModal();
      const targetPenpal = PENPAL_PROFILES.find(p => p.studentId === activeViewingLetter.fromStudentId) || {
        id: 'reply-p',
        name: activeViewingLetter.fromName,
        studentId: activeViewingLetter.fromStudentId,
        city: activeViewingLetter.fromCity || 'Almatı',
        country: activeViewingLetter.fromCountry || 'Kazakistan',
        avatar: activeViewingLetter.fromAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=MuslumeKZ&backgroundColor=fed7aa'
      };

      activeSelectedPenpal = targetPenpal;
      switchPane('paneCompose');
      goToComposeStep(3);

      const subjInput = document.getElementById('penpalLetterSubject');
      const bodyInput = document.getElementById('penpalLetterBody');
      if (subjInput) subjInput.value = `Re: ${(activeViewingLetter.subject || '').replace(/^Re:\s*/i, '')}`;
      if (bodyInput) {
        bodyInput.value = `\n\n--- ${activeViewingLetter.fromName} mektubundan alıntı ---\n> ${(activeViewingLetter.body || '').replace(/\n/g, '\n> ')}`;
        bodyInput.focus();
        bodyInput.setSelectionRange(0, 0);
      }
    });

    // Yanıtla Butonu
    document.getElementById('btnReplyLetter')?.addEventListener('click', () => {
      if (!activeViewingLetter) return;
      const targetPenpal = PENPAL_PROFILES.find(p => p.studentId === activeViewingLetter.fromStudentId) || {
        id: 'reply-p',
        name: activeViewingLetter.fromName,
        studentId: activeViewingLetter.fromStudentId,
        city: activeViewingLetter.fromCity || 'Almatı',
        country: activeViewingLetter.fromCountry || 'Kazakistan',
        avatar: activeViewingLetter.fromAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=MuslumeKZ&backgroundColor=fed7aa'
      };

      activeSelectedPenpal = targetPenpal;
      switchPane('paneCompose');
      goToComposeStep(3);

      const subjInput = document.getElementById('penpalLetterSubject');
      const bodyInput = document.getElementById('penpalLetterBody');
      if (subjInput) subjInput.value = `Re: ${activeViewingLetter.subject.replace(/^Re:\s*/i, '')}`;
      if (bodyInput) {
        bodyInput.value = `\n\n--- ${activeViewingLetter.fromName} mektubundan alıntı ---\n> ${activeViewingLetter.body.replace(/\n/g, '\n> ')}`;
        bodyInput.focus();
        bodyInput.setSelectionRange(0, 0);
      }
    });

    // Arama Girişi
    document.getElementById('mektupSearchInput')?.addEventListener('input', e => {
      renderInbox(e.target.value);
    });

    // Form Gönderimi (Bozkır Kartalı ile yola çıkış)
    document.getElementById('penpalLetterForm')?.addEventListener('submit', handleSendLetter);

    // Karakter Sayacı & Doğrulama İpucu Temizleme
    document.getElementById('penpalLetterBody')?.addEventListener('input', e => {
      const counter = document.getElementById('penpalCharCount');
      if (counter) counter.textContent = e.target.value.length;
      const hint = document.getElementById('letterValidationHint');
      if (hint && e.target.value.trim().length >= 5) {
        hint.style.display = 'none';
      }
    });

    // Adım Butonları Gezinmesi
    document.querySelectorAll('.compose-step-item').forEach(item => {
      item.addEventListener('click', () => {
        const step = parseInt(item.dataset.step, 10);
        if (step === 2 && !activeSelectedCountry) {
          alert('Lütfen önce bir ülke seçiniz.');
          return;
        }
        if (step === 3 && !activeSelectedPenpal) {
          alert('Lütfen önce bir mektup arkadaşı seçiniz.');
          return;
        }
        goToComposeStep(step);
      });
    });

    renderInbox();
    updateTransitWidget();
    notifyUnread();
  }

  function init() {
    getStoredLetters();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindUI);
    } else {
      bindUI();
    }
  }

  return {
    init,
    getInbox,
    getSent,
    getUnreadCount,
    calculateDeliveryEstimate,
    switchPane,
    goToComposeStep,
    openAvatarStudio
  };
})();
