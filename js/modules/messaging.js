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
  const STORAGE_KEY = 'tda-penpal-letters-v4';
  const CONSENT_STORAGE_KEY = 'tda-penpal-consent';
  const MY_AVATAR_KEY = 'tda-my-avatar-config';

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

  // --- 2. ÜLKE LİSTESİ ---
  const COUNTRIES = [
    { id: 'tr', name: 'Türkiye', flag: '🇹🇷', capital: 'Ankara', penpalCount: 88, motto: 'Anadolu ve Boğazlar' },
    { id: 'az', name: 'Azerbaycan', flag: '🇦🇿', capital: 'Bakü', penpalCount: 76, motto: 'Hazar Kıyısı ve Odlar Yurdu' },
    { id: 'kz', name: 'Kazakistan', flag: '🇰🇿', capital: 'Astana', penpalCount: 82, motto: 'Ulu Bozkır ve Altaylar' },
    { id: 'uz', name: 'Özbekistan', flag: '🇺🇿', capital: 'Taşkent', penpalCount: 72, motto: 'İpek Yolu, Semerkant ve mavi çiniler' },
    { id: 'kg', name: 'Kırgızistan', flag: '🇰🇬', capital: 'Bişkek', penpalCount: 64, motto: 'Tanrı Dağları ve Manas mirası' },
    { id: 'tm', name: 'Türkmenistan', flag: '🇹🇲', capital: 'Aşkabat', penpalCount: 51, motto: 'Ahal-Teke zarafeti ve beyaz mermerler' },
    { id: 'kktc', name: 'Kuzey Kıbrıs Türk Cumhuriyeti', flag: '🇹🇷', capital: 'Lefkoşa', penpalCount: 43, motto: 'Akdeniz’in kalbinde barış ve kardeşlik' }
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
        flag: '🇹🇷', 
        name: 'Girne Kalesi & Limanı Pulu', 
        landmark: 'Girne • Akdeniz Muhafızı', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Kyrenia_01-2017_img02_Castle_exterior.jpg/500px-Kyrenia_01-2017_img02_Castle_exterior.jpg' 
      },
      { 
        id: 'cy_bellapais', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flag: '🇹🇷', 
        name: 'Bellapais Manastırı Pulu', 
        landmark: 'Girne • Beşparmak Dağları Eteği', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Kyrenia_-_Girne_Kloster_Bellapa%C3%ADs_Kirche_7.jpg/500px-Kyrenia_-_Girne_Kloster_Bellapa%C3%ADs_Kirche_7.jpg' 
      },
      { 
        id: 'cy_salamis', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flag: '🇹🇷', 
        name: 'Salamis Antik Harabeleri Pulu', 
        landmark: 'Gazimağusa • Antik Sütunlar', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Gymnasion_und_Therme_aus_S%C3%BCdwest.jpg/500px-Gymnasion_und_Therme_aus_S%C3%BCdwest.jpg' 
      },
      { 
        id: 'cy_karpaz', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flag: '🇹🇷', 
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
      status: 'delivered',
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

  // --- 8. KULLANICI BİTMOJİ / AVATAR MODELİ ---
  const DEFAULT_AVATAR_CONFIG = {
    skinColor: 'f2d3b1', // Buğday Ten
    hair: 'long01',     // Uzun Düz Saç
    hairColor: '0e0e0e', // Kuzuni Siyah Saç
    mood: 'variant01',   // Samimi Tebessüm
    eyes: 'variant01',   // Işıltılı Güleç Gözler
    accessories: 'none', // Aksesuarsız
    outfitColor: 'ffdfbf'// Parşömen Beji Fon
  };

  function getMyAvatarConfig() {
    try {
      const c = JSON.parse(localStorage.getItem(MY_AVATAR_KEY));
      return Object.assign({}, DEFAULT_AVATAR_CONFIG, c);
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
    const skin = c.skinColor || 'f2d3b1';
    const hair = c.hair || 'long01';
    const hairColor = c.hairColor || '0e0e0e';
    const eyes = c.eyes || 'variant01';
    const mouth = c.mood || 'variant01';
    const bg = c.outfitColor || c.backgroundColor || 'ffdfbf';

    let url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&skinColor=${encodeURIComponent(skin)}&hair=${encodeURIComponent(hair)}&hairColor=${encodeURIComponent(hairColor)}&eyes=${encodeURIComponent(eyes)}&mouth=${encodeURIComponent(mouth)}&backgroundColor=${encodeURIComponent(bg)}`;

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
    return getStoredLetters().filter(l => l.folder !== 'sent');
  }

  function getSent() {
    return getStoredLetters().filter(l => l.folder === 'sent');
  }

  function getUnreadCount() {
    return getInbox().filter(l => !l.read && l.status === 'delivered').length;
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

  // --- 12. AŞAMA 1: ÜLKE SEÇİMİ (STEP 1) ---
  function renderStep1Countries() {
    const container = document.getElementById('countrySelectionGrid');
    if (!container) return;

    container.innerHTML = COUNTRIES.map(c => `
      <div class="country-select-card" data-country-id="${c.id}">
        <span class="country-card-flag">${c.flag}</span>
        <div class="country-card-name">${c.name}</div>
        <div class="country-card-sub">${c.capital} • ${c.motto}</div>
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
        <span>${activeSelectedCountry.flag} ${activeSelectedCountry.name} Mektup Arkadaşları</span>
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
          ${c.flag} ${c.name}
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
      return `
        <button type="button" 
                class="avatar-visual-btn ${isSel ? 'active' : ''}" 
                data-val="${opt.id}" 
                data-tooltip="${opt.label}" 
                aria-label="${opt.label}">
          ${opt.svg}
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

  function renderAvatarCustomizerControls() {
    // 1. Ten Rengi (Color Swatches - data-tooltip ile zarif ipucu)
    renderColorSwatches('optSkinColor', [
      { id: 'f9c9b6', label: 'Porselen / Açık Ten' },
      { id: 'f2d3b1', label: 'Doğal Buğday Ten' },
      { id: 'ecad80', label: 'Sıcak Şeftali Ten' },
      { id: 'd4976a', label: 'Doğal Kumral Ten' },
      { id: '9e5622', label: 'Bronz Esmer Ten' },
      { id: '763900', label: 'Koyu Esmer Ten' }
    ], currentEditingAvatarConfig.skinColor, val => {
      currentEditingAvatarConfig.skinColor = val;
      updateLiveAvatarPreview();
    });

    // 2. Saç Modeli (Saf Vektörel SVG Silüetleri - 16 Model)
    renderVisualButtons('optHairStyle', [
      {
        id: 'short01',
        label: 'Klasik Kısa Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 16c0-6.5 4-11 9-11s9 4.5 9 11c-1.5-1.5-3.5-3-9-3s-7.5 1.5-9 3z" fill="currentColor"/></svg>`
      },
      {
        id: 'short02',
        label: 'Modern Katlı Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 16c-.5-6 3.5-11.5 9-11.5 4 0 7.5 3 8.5 7.5-1.5-.5-3.5 0-5 1.5-1.2-2.5-3.5-3.5-5.5-3-2 .5-3.5 2.5-4 4.5-.8-.2-1.8.2-3 1z" fill="currentColor"/></svg>`
      },
      {
        id: 'short03',
        label: 'Yanlar Kısa & Fade',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M9 14c.5-5.5 3.5-9.5 7-9.5s6.5 4 7 9.5c-1-1.5-2.5-3-7-3s-6 1.5-7 3z" fill="currentColor"/><path d="M7 17v-3c0-1 1-2 2-2m14 0c1 0 2 1 2 2v3" stroke="currentColor" stroke-width="1.2" opacity="0.4" fill="none"/></svg>`
      },
      {
        id: 'short04',
        label: 'Doğal Kıvırcık Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 16c-1-2 0-5 2-6.5 1-2 4-3.5 7-3.5s6 1.5 7 3.5c2 1.5 3 4.5 2 6.5-1.5-1-3.5-2-9-2s-7.5 1-9 2z" fill="currentColor"/><circle cx="10" cy="8.5" r="2.5" fill="currentColor"/><circle cx="15" cy="6" r="2.8" fill="currentColor"/><circle cx="20" cy="7.5" r="2.6" fill="currentColor"/><circle cx="23" cy="11" r="2.3" fill="currentColor"/><circle cx="8" cy="12" r="2.2" fill="currentColor"/></svg>`
      },
      {
        id: 'short05',
        label: 'Dalgalı Kısa Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 16c0-6 4-11 9-11 4.5 0 8 3.5 8.5 8.5-2-1-4.5-1-6.5.5-2-2-4.5-2-7 0-.8.7-2 1.5-4 2z" fill="currentColor"/></svg>`
      },
      {
        id: 'short06',
        label: 'Hafif Dağınık Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 16c0-5 2.5-9 6-10.5l1.5 2.5 2.5-4 2 3.5 2.5-2 2 4c.5 2.5.5 4.5-.5 6.5-2-1.5-4.5-2-8-2s-6 1-8 2z" fill="currentColor"/></svg>`
      },
      {
        id: 'short08',
        label: 'Tepe Topuz / Man Bun',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><circle cx="16" cy="4.5" r="3" fill="currentColor"/><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M8 16c0-5.5 3.5-10 8-10s8 4.5 8 10c-1.5-1.5-4-3-8-3s-6.5 1.5-8 3z" fill="currentColor"/></svg>`
      },
      {
        id: 'short12',
        label: 'Geriye Taranmış Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M8 15c0-6 3.5-10 8-10s8 4 8 10c-1-2-2.5-4-8-4s-7 2-8 4z" fill="currentColor"/><path d="M11 7c2-1 4-1.5 5-1.5s3 .5 5 1.5m-9 3c1.5-.8 3-1 4-1s2.5.2 4 1" stroke="#fff" stroke-width="0.9" fill="none" opacity="0.6"/></svg>`
      },
      {
        id: 'long01',
        label: 'Uzun Düz Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 14c0-7 4-9.5 9-9.5s9 2.5 9 9.5v11c0 1-1 2-2 2s-1.5-1-2-3v-8c0-2-1.5-3-5-3s-5 1-5 3v8c-.5 2-1 3-2 3s-2-1-2-2v-11z" fill="currentColor"/></svg>`
      },
      {
        id: 'long02',
        label: 'Hacimli Uzun Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M6 15c0-7 4.5-10.5 10-10.5s10 3.5 10 10.5c1.5 4 1 8-1 11-1.5 2-3 1-3.5-1v-8c0-3-2-4.5-5.5-4.5s-5.5 1.5-5.5 4.5v8c-.5 2-2 3-3.5 1-2-3-2.5-7-1-11z" fill="currentColor"/></svg>`
      },
      {
        id: 'long03',
        label: 'Uzun Dalgalı Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M6 14c0-6.5 4.5-9.5 10-9.5s10 3 10 9.5c1 3 .5 6 1.5 8.5.8 2-.5 3.5-2 3.5s-2-1.5-2-3.5c0-3-.5-5-2-6-1.5-1-3.5-1-5.5-1s-4 0-5.5 1c-1.5 1-2 3-2 6 0 2-.5 3.5-2 3.5s-2.8-1.5-2-3.5c1-2.5.5-5.5 1.5-8.5z" fill="currentColor"/></svg>`
      },
      {
        id: 'long04',
        label: 'Ortadan Ayrık Uzun Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 15c0-6.5 4-10 9-10s9 3.5 9 10v9c0 1-1 2-2 2s-1.5-1-2-3v-7c0-2-1.5-3-5-4.5-3.5 1.5-5 2.5-5 4.5v7c-.5 2-1 3-2 3s-2-1-2-2v-9z" fill="currentColor"/><path d="M16 5v6" stroke="#fff" stroke-width="1.2" opacity="0.6"/></svg>`
      },
      {
        id: 'long05',
        label: 'Tek Örgülü Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M8 15c0-6 3.5-10 8-10s8 4 8 10c-1.5-1.5-3.5-3-8-3s-6.5 1.5-8 3z" fill="currentColor"/><path d="M20 18c1 2 2 4 1.5 6s-2 3-1.5 5c.5 1-1 2-2 1.5-.5-1.5.5-3 0-5s-2-2.5-1.5-4.5c.5-1.5 1.5-2.5 3.5-3z" fill="currentColor"/></svg>`
      },
      {
        id: 'long06',
        label: 'Çift Örgülü Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M8 15c0-6 3.5-10 8-10s8 4 8 10c-1.5-1.5-3.5-3-8-3s-6.5 1.5-8 3z" fill="currentColor"/><path d="M7 17c-1 2-2.5 3.5-2 5.5.5 2 2 3 1.5 5-.5 1.5-2 1-2.5 0-.5-2 1-3.5.5-5.5-.5-2 1-3.5 2.5-5zm18 0c1 2 2.5 3.5 2 5.5-.5 2-2 3-1.5 5 .5 1.5 2 1 2.5 0 .5-2-1-3.5-.5-5.5.5-2-1-3.5-2.5-5z" fill="currentColor"/></svg>`
      },
      {
        id: 'long10',
        label: 'Kâküllü Uzun Saç',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M7 14c0-7 4-9.5 9-9.5s9 2.5 9 9.5v11c0 1-1 2-2 2s-1.5-1-2-3v-7c-1 .5-3 1-5 1s-4-.5-5-1v7c-.5 2-1 3-2 3s-2-1-2-2v-11z" fill="currentColor"/><path d="M9 13.5h14v2.5H9z" fill="currentColor"/></svg>`
      },
      {
        id: 'long26',
        label: 'Modern Bob Kesim',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.25"/><path d="M6.5 14c0-6.5 4.5-9.5 9.5-9.5s9.5 3 9.5 9.5c0 3-1 6-2.5 7.5-1.5 1.5-3 .5-3.5-1.5-.5-2-.5-4.5-3.5-4.5s-3 2.5-3.5 4.5c-.5 2-2 3-3.5 1.5C7.5 20 6.5 17 6.5 14z" fill="currentColor"/></svg>`
      }
    ], currentEditingAvatarConfig.hair, val => {
      currentEditingAvatarConfig.hair = val;
      updateLiveAvatarPreview();
    });

    // 3. Saç Renk Tonu (Color Swatches - data-tooltip ile)
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

    // 4. Yüz İfadesi & Gülümseme (Saf Vektörel SVG Çizimleri - 10 İfade)
    renderVisualButtons('optMood', [
      {
        id: 'variant01',
        label: 'Samimi Tebessüm',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M9 14c2 6 12 6 14 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="8" cy="13.5" r="1.5" fill="currentColor"/><circle cx="24" cy="13.5" r="1.5" fill="currentColor"/></svg>`
      },
      {
        id: 'variant02',
        label: 'Geniş Gülüş',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M8 13c1 7 15 7 16 0H8z" fill="currentColor"/><path d="M9 14.5h14" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant03',
        label: 'Neşeli Açık Gülüş',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M7 12c1 9 17 9 18 0H7z" fill="currentColor"/><path d="M12 17c1.5 2 6.5 2 8 0" stroke="#ff7675" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`
      },
      {
        id: 'variant04',
        label: 'Sakin ve Huzurlu',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M10 16c2 2.5 10 2.5 12 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant05',
        label: 'Coşkulu Kahkaha',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M7 11c1.5 11 16.5 11 18 0H7z" fill="currentColor"/><path d="M9.5 13.5h13" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant06',
        label: 'Sempatik / Dil Dışarıda',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M8 13c1 6 15 6 16 0H8z" fill="currentColor"/><path d="M13 16c0 3 2 4.5 3 4.5s3-1.5 3-4.5h-6z" fill="#ff7675"/><path d="M16 16v3" stroke="#d63031" stroke-width="1" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant07',
        label: 'Çapkın Tebessüm',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M9 17c4 1 8 0 14-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="23.5" cy="13" r="1.5" fill="currentColor"/></svg>`
      },
      {
        id: 'variant08',
        label: 'Sıcak ve Sevecen',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M9 14c2 5.5 12 5.5 14 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="7" cy="11.5" rx="2.5" ry="1.5" fill="#ff7675" opacity="0.7"/><ellipse cx="25" cy="11.5" rx="2.5" ry="1.5" fill="#ff7675" opacity="0.7"/></svg>`
      },
      {
        id: 'variant09',
        label: 'Zeki / Düşünceli',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M10 17h12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M19 13l3 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant10',
        label: 'Nezaketli Tebessüm',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M10 15c2 3.5 10 3.5 12 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="9.5" cy="14" r="1" fill="currentColor"/><circle cx="22.5" cy="14" r="1" fill="currentColor"/></svg>`
      }
    ], currentEditingAvatarConfig.mood, val => {
      currentEditingAvatarConfig.mood = val;
      updateLiveAvatarPreview();
    });

    // 5. Göz Şekli & Bakış (Saf Vektörel SVG Çizimleri - 8 Bakış)
    renderVisualButtons('optEyes', [
      {
        id: 'variant01',
        label: 'Işıltılı Güleç Gözler',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><ellipse cx="10" cy="16" rx="4" ry="4.5" fill="currentColor"/><circle cx="8.5" cy="14.5" r="1.6" fill="#fff"/><ellipse cx="22" cy="16" rx="4" ry="4.5" fill="currentColor"/><circle cx="20.5" cy="14.5" r="1.6" fill="#fff"/></svg>`
      },
      {
        id: 'variant02',
        label: 'Canlı Badem Gözler',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M5 16c2.5-3.5 6-3.5 9 0-3 3.5-6.5 3.5-9 0zm13 0c2.5-3.5 6-3.5 9 0-3 3.5-6.5 3.5-9 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9.5" cy="16" r="2.4" fill="currentColor"/><circle cx="22.5" cy="16" r="2.4" fill="currentColor"/><circle cx="8.8" cy="15.2" r="0.8" fill="#fff"/><circle cx="21.8" cy="15.2" r="0.8" fill="#fff"/></svg>`
      },
      {
        id: 'variant03',
        label: 'Derin ve Sakin Bakış',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M6 15c2 4 6 4 8 0m4 0c2 4 6 4 8 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M14 16l2 2m6-2l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant04',
        label: 'Zeki ve Dikkatli Gözler',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M6 11l7-1m6 1l7-1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><ellipse cx="9.5" cy="17" rx="3.5" ry="3.8" fill="currentColor"/><circle cx="8.5" cy="15.8" r="1.2" fill="#fff"/><ellipse cx="22.5" cy="17" rx="3.5" ry="3.8" fill="currentColor"/><circle cx="21.5" cy="15.8" r="1.2" fill="#fff"/></svg>`
      },
      {
        id: 'variant05',
        label: 'Gülümseyen Mutlu Gözler',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M6 18c1.5-5 6.5-5 8 0m4 0c1.5-5 6.5-5 8 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`
      },
      {
        id: 'variant06',
        label: 'Heyecanlı & Parıltılı',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><circle cx="10" cy="16" r="5" fill="currentColor"/><polygon points="9,13 10,15 12,15 10.5,16.5 11,18.5 9.5,17 8,18.5 8.5,16.5 7,15 9,15" fill="#fff"/><circle cx="22" cy="16" r="5" fill="currentColor"/><polygon points="21,13 22,15 24,15 22.5,16.5 23,18.5 21.5,17 20,18.5 20.5,16.5 19,15 21,15" fill="#fff"/></svg>`
      },
      {
        id: 'variant07',
        label: 'Masum ve Sevecen Gözler',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><circle cx="10" cy="16" r="4.2" fill="currentColor"/><circle cx="8.8" cy="14.8" r="1.8" fill="#fff"/><circle cx="11.5" cy="17.2" r="0.9" fill="#fff"/><circle cx="22" cy="16" r="4.2" fill="currentColor"/><circle cx="20.8" cy="14.8" r="1.8" fill="#fff"/><circle cx="23.5" cy="17.2" r="0.9" fill="#fff"/></svg>`
      },
      {
        id: 'variant08',
        label: 'Dingin ve Huzurlu Bakış',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M6 14h8m4 0h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 14c.5 3 3 5 5 5s4.5-2 5-5m2 0c.5 3 3 5 5 5s4.5-2 5-5" fill="currentColor" opacity="0.6"/></svg>`
      }
    ], currentEditingAvatarConfig.eyes, val => {
      currentEditingAvatarConfig.eyes = val;
      updateLiveAvatarPreview();
    });

    // 6. Gözlük & Aksesuar (Saf Vektörel SVG Çizimleri - 6 Seçenek)
    renderVisualButtons('optAccessories', [
      {
        id: 'none',
        label: 'Aksesuarsız / Sade',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/><line x1="8" y1="8" x2="24" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>`
      },
      {
        id: 'variant01',
        label: 'Klasik Dikdörtgen Çerçeve',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><rect x="4" y="11" width="10" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="18" y="11" width="10" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="15" x2="18" y2="15" stroke="currentColor" stroke-width="2"/><line x1="2" y1="14" x2="4" y2="14" stroke="currentColor" stroke-width="2"/><line x1="28" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="2"/></svg>`
      },
      {
        id: 'variant02',
        label: 'Zarif Yuvarlak Gözlük',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><circle cx="9.5" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="22.5" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14.5" y1="16" x2="17.5" y2="16" stroke="currentColor" stroke-width="2"/><line x1="2" y1="15" x2="4.5" y2="15" stroke="currentColor" stroke-width="2"/><line x1="27.5" y1="15" x2="30" y2="15" stroke="currentColor" stroke-width="2"/></svg>`
      },
      {
        id: 'variant03',
        label: 'Havalı Güneş Gözlüğü',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M4 11h10l-1.5 8c-.5 2-2 3-4 3-2.5 0-4-1.5-4.5-3.5L4 11zm14 0h10l-.5 7.5c-.5 2-2 3.5-4.5 3.5-2 0-3.5-1-4-3L18 11z" fill="currentColor"/><line x1="14" y1="13" x2="18" y2="13" stroke="currentColor" stroke-width="2.5"/><path d="M6 13l2.5 5m14-5l2.5 5" stroke="#fff" stroke-width="1.2" opacity="0.6"/></svg>`
      },
      {
        id: 'variant04',
        label: 'Modern Kalın Çerçeve',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><rect x="4" y="10" width="10" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="18" y="10" width="10" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><line x1="14" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="3.5"/><line x1="2" y1="13" x2="4" y2="13" stroke="currentColor" stroke-width="3"/><line x1="28" y1="13" x2="30" y2="13" stroke="currentColor" stroke-width="3"/></svg>`
      },
      {
        id: 'variant05',
        label: 'Retro Vintage Gözlük',
        svg: `<svg class="avatar-svg-glyph" viewBox="0 0 32 32"><path d="M4 11c3 0 9 0 10 3v4c0 2-2 3.5-4.5 3.5C7 21.5 5 19.5 4 17l0-6zm14 3c1-3 7-3 10-3l0 6c-1 2.5-3 4.5-5.5 4.5-2.5 0-4.5-1.5-4.5-3.5v-4z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="2"/><path d="M3 11h11m4 0h11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
      }
    ], currentEditingAvatarConfig.accessories, val => {
      currentEditingAvatarConfig.accessories = val;
      updateLiveAvatarPreview();
    });

    // 7. Arka Plan & Fon Rengi (Color Swatches - 8 Kültürel Renk)
    renderColorSwatches('optOutfitColor', [
      { id: 'ffdfbf', label: 'Parşömen Beji' },
      { id: 'b6e3f4', label: 'Gök Mavisi' },
      { id: 'c0aede', label: 'Lavanta Moru' },
      { id: 'bbf7d0', label: 'Bozkır Yeşili' },
      { id: 'fed7aa', label: 'Kayısı Turuncusu' },
      { id: 'fef08a', label: 'Güneş Sarısı' },
      { id: 'fbcfe8', label: 'Gül Kurusu' },
      { id: 'e2e8f0', label: 'Buzul Grisi' }
    ], currentEditingAvatarConfig.outfitColor || currentEditingAvatarConfig.backgroundColor || 'ffdfbf', val => {
      currentEditingAvatarConfig.outfitColor = val;
      currentEditingAvatarConfig.backgroundColor = val;
      updateLiveAvatarPreview();
    });
  }

  function updateLiveAvatarPreview() {
    const img = document.getElementById('liveAvatarPreviewImg');
    if (img) {
      img.src = generateAvatarUrl(currentEditingAvatarConfig);
    }
  }

  function randomizeAvatar() {
    const skins = ['f9c9b6', 'f2d3b1', 'ecad80', 'd4976a', '9e5622', '763900'];
    const hairs = ['short01', 'short02', 'short03', 'short04', 'short05', 'short06', 'short08', 'short12', 'long01', 'long02', 'long03', 'long04', 'long05', 'long06', 'long10', 'long26'];
    const hairColors = ['0e0e0e', '562306', '6a4e35', '796a45', 'b9a05f', 'e5d7a3', 'ab2a18', 'cb6820', 'afafaf', '3eac2c', '592454'];
    const moods = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08', 'variant09', 'variant10'];
    const eyes = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08'];
    const accs = ['none', 'variant01', 'variant02', 'variant03', 'variant04', 'variant05'];
    const backgrounds = ['ffdfbf', 'b6e3f4', 'c0aede', 'bbf7d0', 'fed7aa', 'fef08a', 'fbcfe8', 'e2e8f0'];

    currentEditingAvatarConfig = {
      skinColor: skins[Math.floor(Math.random() * skins.length)],
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

    listEl.innerHTML = items.map(l => {
      const isUnread = !l.read && l.status === 'delivered';
      const isTransit = l.status === 'in_transit';
      const stamp = l.stamp || CULTURAL_STAMPS.tr[0];
      const stampImg = getStampImageSrc(stamp);

      return `
        <div class="letter-card ${isUnread ? 'unread' : ''}" data-letter-id="${l.id}">
          <div class="letter-card-left">
            <div class="letter-stamp-badge" title="${stamp.name || 'Posta Pulu'}">
              <img src="${stampImg}" alt="${stamp.name || 'Pul'}" onerror="this.src='assets/images/mektup-ikon.png'">
            </div>
            <div class="letter-card-details">
              <div class="letter-card-meta">
                <span class="letter-sender-name">${l.fromName}</span>
                <span class="letter-country-tag">${l.fromCountry} (${l.fromCity || ''})</span>
                ${isTransit ? '<span style="font-size:10.5px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-weight:800;">🦅 Kartal Taşıyor</span>' : ''}
                ${l.photos && l.photos.length ? `<span style="font-size:11px;color:#15803d;font-weight:750;">📷 ${l.photos.length} Fotoğraf</span>` : ''}
              </div>
              <div class="letter-card-subject">${l.subject}</div>
              <div class="letter-card-snippet">${(l.body || '').slice(0, 95)}...</div>
            </div>
          </div>
          <div class="letter-card-right">
            <span class="letter-date-time">${new Date(l.createdAt).toLocaleDateString('tr-TR', { day:'numeric', month:'short' })}</span>
            ${isUnread ? '<span class="unread-wax-dot" title="Okunmamış Mektup"></span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.letter-card').forEach(card => {
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

    listEl.innerHTML = items.map(l => {
      const isTransit = l.status === 'in_transit';
      const stamp = l.stamp || CULTURAL_STAMPS.tr[0];
      const stampImg = getStampImageSrc(stamp);

      return `
        <div class="letter-card" data-letter-id="${l.id}">
          <div class="letter-card-left">
            <div class="letter-stamp-badge" title="${stamp.name || 'Posta Pulu'}">
              <img src="${stampImg}" alt="${stamp.name || 'Pul'}" onerror="this.src='assets/images/mektup-ikon.png'">
            </div>
            <div class="letter-card-details">
              <div class="letter-card-meta">
                <span class="letter-sender-name">Alıcı: ${l.toName}</span>
                <span class="letter-country-tag">${l.toCountry} (${l.toCity || ''})</span>
                ${isTransit ? '<span style="font-size:10.5px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-weight:800;">🦅 Kartal Uçuşta</span>' : '<span style="font-size:10.5px;background:#f0fdf4;color:#166534;padding:1px 6px;border-radius:4px;font-weight:800;">✓ Teslim Edildi</span>'}
              </div>
              <div class="letter-card-subject">${l.subject}</div>
              <div class="letter-card-snippet">${(l.body || '').slice(0, 95)}...</div>
            </div>
          </div>
          <div class="letter-card-right">
            <span class="letter-date-time">${new Date(l.createdAt).toLocaleDateString('tr-TR', { day:'numeric', month:'short' })}</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.letter-card').forEach(card => {
      card.addEventListener('click', () => {
        openLetter(card.dataset.letterId);
      });
    });
  }

  // --- 20. MEKTUP DETAY GÖRÜNTÜLEYİCİ ---
  function openLetter(letterId) {
    const letters = getStoredLetters();
    const letter = letters.find(l => l.id === letterId);
    if (!letter) return;

    activeViewingLetter = letter;
    if (!letter.read) {
      letter.read = true;
      saveLetters(letters);
      renderInbox();
    }

    const readerContainer = document.getElementById('letterPaperView');
    if (!readerContainer) return;

    const stamp = letter.stamp || CULTURAL_STAMPS.tr[0];
    const stampImg = getStampImageSrc(stamp);
    const themeClass = letter.paperTheme || 'paper-minimal';
    const isTransit = letter.status === 'in_transit';

    readerContainer.className = `reader-letter-container ${themeClass}`;
    readerContainer.innerHTML = `
      <div class="reader-header">
        <div class="reader-penpal-info">
          <img src="${letter.fromAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Penpal'}" alt="Avatar" class="reader-avatar-big">
          <div>
            <h3 style="margin:0 0 4px 0;font-size:18px;color:#102343;">${letter.fromName}</h3>
            <div style="font-size:12.5px;color:#64748b;">
              ${letter.fromCity || ''}, ${letter.fromCountry} ➔ ${letter.toCity || ''}, ${letter.toCountry}
            </div>
            <small class="muted">Tarih: ${new Date(letter.createdAt).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}</small>
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
          <h5>📷 Mektuba Eklenen Fotoğraflar (${letter.photos.length} Adet - Karşılıklı Güven Doğrulanmış)</h5>
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

    switchPane('paneReader');
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
