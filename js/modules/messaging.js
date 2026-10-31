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

  function escapeHtml(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function downscaleImage(file, maxDimension = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(ev.target.result);
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });
  }

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
      flagImg: 'assets/flags/tr.svg', 
      penpalCount: 88 
    },
    { 
      id: 'az', 
      name: 'Azerbaycan', 
      flagImg: 'assets/flags/az.svg', 
      penpalCount: 76 
    },
    { 
      id: 'kz', 
      name: 'Kazakistan', 
      flagImg: 'assets/flags/kz.svg', 
      penpalCount: 82 
    },
    { 
      id: 'uz', 
      name: 'Özbekistan', 
      flagImg: 'assets/flags/uz.svg', 
      penpalCount: 72 
    },
    { 
      id: 'kg', 
      name: 'Kırgızistan', 
      flagImg: 'assets/flags/kg.svg', 
      penpalCount: 64 
    },
    { 
      id: 'tm', 
      name: 'Türkmenistan', 
      flagImg: 'assets/flags/tm.svg', 
      penpalCount: 51 
    },
    { 
      id: 'kktc', 
      name: 'Kuzey Kıbrıs Türk Cumhuriyeti', 
      flagImg: 'assets/flags/kktc.svg', 
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
        id: 'tr_ataturk', 
        countryId: 'tr', 
        country: 'Türkiye', 
        flag: '🇹🇷', 
        name: 'Gazi Mustafa Kemal Atatürk Pulu', 
        landmark: 'Cumhuriyetimizin Kurucusu • Ebedi Başkomutan', 
        image: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kemal_Ataturk_on_Turkish_Stamp%2C_1940.jpg' 
      },
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
        flagImg: 'assets/flags/kktc.svg', 
        name: 'Girne Kalesi & Limanı Pulu', 
        landmark: 'Girne • Akdeniz Muhafızı', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Kyrenia_01-2017_img02_Castle_exterior.jpg/500px-Kyrenia_01-2017_img02_Castle_exterior.jpg' 
      },
      { 
        id: 'cy_bellapais', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'assets/flags/kktc.svg', 
        name: 'Bellapais Manastırı Pulu', 
        landmark: 'Girne • Beşparmak Dağları Eteği', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Kyrenia_-_Girne_Kloster_Bellapa%C3%ADs_Kirche_7.jpg/500px-Kyrenia_-_Girne_Kloster_Bellapa%C3%ADs_Kirche_7.jpg' 
      },
      { 
        id: 'cy_salamis', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'assets/flags/kktc.svg', 
        name: 'Salamis Antik Harabeleri Pulu', 
        landmark: 'Gazimağusa • Antik Sütunlar', 
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Gymnasion_und_Therme_aus_S%C3%BCdwest.jpg/500px-Gymnasion_und_Therme_aus_S%C3%BCdwest.jpg' 
      },
      { 
        id: 'cy_karpaz', 
        countryId: 'kktc', 
        country: 'KKTC', 
        flagImg: 'assets/flags/kktc.svg', 
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
  const DEFAULT_AVATAR_CONFIG = {
    skinColor: 'f8d9ce', // Doğal Açık / Beyaz Ten (#F8D9CE)
    skinTone: 'f8d9ce',  // Geriye dönük uyumluluk
    eyeColor: '3b2219',  // Koyu Kahverengi Doğal İris (#3b2219)
    hairColor: '0e0e0e', // Kuzuni Siyah Saç (Kaşlar da bu renkle senkronize)
    hair: 'long01',      // Saç Modeli
    mood: 'variant01',    // Samimi Tebessüm
    eyes: 'variant01',    // Işıltılı Güleç Gözler
    accessories: 'none',  // Aksesuarsız
    backgroundColor: 'ffdfbf' // Parşömen Beji Sahne Fonu
  };

  function getMyAvatarConfig() {
    try {
      const raw = localStorage.getItem(MY_AVATAR_KEY);
      if (!raw) return Object.assign({}, DEFAULT_AVATAR_CONFIG);
      const parsed = JSON.parse(raw);
      const merged = Object.assign({}, DEFAULT_AVATAR_CONFIG, parsed);

      // Ten rengi doğrulama & Temizleme
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

      // Saç rengi doğrulama
      if (!merged.hairColor || merged.hairColor.length !== 6) {
        merged.hairColor = '0e0e0e';
      }

      // Arka plan rengi doğrulama
      if (!merged.backgroundColor || merged.backgroundColor.length !== 6) {
        merged.backgroundColor = 'ffdfbf';
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
    // Arka plan rengi kesinlikle kıyafet rengiyle karışmaz
    const bg = (c.backgroundColor || 'ffdfbf').replace('#', '');

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
    const badges = document.querySelectorAll('#navUnreadBadge, #navTabUnreadBadge, #mobileMailUnreadBadge, #inboxCountBadge');
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
    const widgetTitle = window.TDAI18n ? window.TDAI18n.t('transitWidgetTitle', { fallback: 'Bozkır Kartalı Mektubunuzu Taşıyor! (Teslimat Simülasyonu)' }) : 'Bozkır Kartalı Mektubunuzu Taşıyor! (Teslimat Simülasyonu)';
    const remainingTitle = window.TDAI18n ? window.TDAI18n.t('transitRemaining', { fallback: '⏳ Teslimata Kalan Süre:' }) : '⏳ Teslimata Kalan Süre:';
    container.innerHTML = `
      <div class="transit-delivery-widget">
        <div class="transit-header">
          <div class="transit-title">
            <span style="font-size:22px;">🦅</span>
            <span>${escapeHtml(widgetTitle)}</span>
          </div>
          <div class="transit-countdown-badge">
            <span>${escapeHtml(remainingTitle)}</span>
            <strong data-no-translate>${timeStr}</strong>
          </div>
        </div>

        <div class="flight-route-track">
          <div class="flight-city-node">
            <div class="flight-city-dot"></div>
            <span class="flight-city-name" data-no-translate>${escapeHtml(inTransitLetter.fromCity || 'İstanbul')}</span>
            <span class="flight-city-country" data-no-translate>${escapeHtml(inTransitLetter.fromCountry || 'Türkiye')}</span>
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
            <span class="flight-city-name" data-no-translate>${escapeHtml(inTransitLetter.toCity || 'Almatı')}</span>
            <span class="flight-city-country" data-no-translate>${escapeHtml(inTransitLetter.toCountry || 'Kazakistan')}</span>
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
        <div class="penpal-card" data-penpal-id="${escapeHtml(p.id)}">
          <div class="penpal-card-top">
            <div class="penpal-avatar-wrap">
              <img src="${p.avatar}" alt="${escapeHtml(p.name)} Bitmoji Avatar" class="penpal-avatar-img">
              <span class="penpal-status-dot" title="Aktif Mektup Arkadaşı"></span>
            </div>
            <div class="penpal-meta-info">
              <h4 data-no-translate>${escapeHtml(p.name)}</h4>
              <span data-no-translate>${escapeHtml(p.city)} • ${escapeHtml(p.university)}</span>
              <small class="muted" data-no-translate>Öğrenci No: ${escapeHtml(p.studentId)}</small>
            </div>
          </div>

          <p data-no-translate style="font-size:12.5px;color:#475467;line-height:1.45;margin:0;">"${escapeHtml(p.bio)}"</p>

          <div class="penpal-flight-preview">
            <span>🦅 Bozkır Kartalı Teslimatı: <strong>${calc.deliveryHours} saat</strong></span>
            <span>(Uçuş: ${calc.flightHours} sa x 2)</span>
          </div>

          <div class="penpal-tags-wrap">
            ${p.interests.map(i => `<span class="penpal-tag">#${escapeHtml(i)}</span>`).join('')}
            <span class="penpal-tag" style="background:#fef3c7">${consentBadge}</span>
          </div>

          <button type="button" class="btn-choose-penpal" data-penpal-id="${escapeHtml(p.id)}">
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
          <img src="${activeSelectedPenpal.avatar}" alt="${escapeHtml(activeSelectedPenpal.name)}" class="recipient-avatar-mini">
          <div>
            <strong style="color:#102343;font-size:14.5px;">Alıcı: ${escapeHtml(activeSelectedPenpal.name)}</strong>
            <div style="font-size:11.5px;color:#64748b;">${escapeHtml(activeSelectedPenpal.city)}, ${escapeHtml(activeSelectedPenpal.country)} • (${escapeHtml(activeSelectedPenpal.studentId)})</div>
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

  async function handlePhotoSelection(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachedPhotoFiles.length + files.length > 3) {
      alert(window.TDAI18n ? window.TDAI18n.t('alertMax3Photos', { fallback: 'Güvenlik kuralı: Bir mektuba en fazla 3 adet fotoğraf ekleyebilirsiniz.' }) : 'Güvenlik kuralı: Bir mektuba en fazla 3 adet fotoğraf ekleyebilirsiniz.');
      return;
    }

    for (const file of files.slice(0, 3 - attachedPhotoFiles.length)) {
      try {
        const scaled = await downscaleImage(file, 1280, 0.82);
        attachedPhotoFiles.push(scaled);
      } catch (err) {
        console.warn('Görsel küçültülemedi:', err);
      }
    }
    renderPhotoPreviews();
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
    currentAvatarStudioTab = 'face';
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

  // --- 15. AVATAR STÜDYOSU: SABİT MİNECRAFT TARZI GÖVDE & RENDER MOTORU ---
  function renderMinecraftBodySVG(skinColorHex) {
    const skin = (skinColorHex || 'f8d9ce').replace('#', '');
    return `
      <svg viewBox="0 0 220 380" xmlns="http://www.w3.org/2000/svg" class="minecraft-body-svg">
        <defs>
          <!-- Blok Gölgelendirme Gradyanları -->
          <linearGradient id="mcTealTorso" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#008080"/>
            <stop offset="25%" stop-color="#00a8a8"/>
            <stop offset="85%" stop-color="#009999"/>
            <stop offset="100%" stop-color="#006666"/>
          </linearGradient>
          <linearGradient id="mcArmLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#009999"/>
            <stop offset="100%" stop-color="#007373"/>
          </linearGradient>
          <linearGradient id="mcArmRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#007373"/>
            <stop offset="100%" stop-color="#005555"/>
          </linearGradient>
          <linearGradient id="mcIndigoPants" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#2a3b8f"/>
            <stop offset="50%" stop-color="#3347b0"/>
            <stop offset="100%" stop-color="#202c6c"/>
          </linearGradient>
          <linearGradient id="mcBoots" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4a4a4a"/>
            <stop offset="100%" stop-color="#262626"/>
          </linearGradient>
        </defs>

        <!-- 1. BOYUN BLOĞU (Adventurer kafa çenesinin arkasından gövdeye bağlanır) -->
        <rect x="94" y="96" width="32" height="24" fill="#${skin}" stroke="#000000" stroke-width="2"/>
        <rect x="94" y="112" width="32" height="6" fill="rgba(0,0,0,0.18)"/>

        <!-- 2. SOL KOL (İzleyiciye göre Sol Kol: x=36, y=116, w=32, h=150) -->
        <rect x="36" y="116" width="32" height="56" fill="url(#mcArmLeft)" stroke="#000000" stroke-width="2.5"/>
        <line x1="36" y1="172" x2="68" y2="172" stroke="#004d4d" stroke-width="2"/>
        <rect x="36" y="172" width="32" height="94" fill="#${skin}" stroke="#000000" stroke-width="2.5"/>
        <line x1="36" y1="236" x2="68" y2="236" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>

        <!-- 3. SAĞ KOL (İzleyiciye göre Sağ Kol: x=152, y=116, w=32, h=150) -->
        <rect x="152" y="116" width="32" height="56" fill="url(#mcArmRight)" stroke="#000000" stroke-width="2.5"/>
        <line x1="152" y1="172" x2="184" y2="172" stroke="#004d4d" stroke-width="2"/>
        <rect x="152" y="172" width="32" height="94" fill="#${skin}" stroke="#000000" stroke-width="2.5"/>
        <line x1="152" y1="236" x2="184" y2="236" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>

        <!-- 4. GÖVDE (TORSO: x=68, y=116, w=84, h=102) - Klasik Steve Turkuazı -->
        <rect x="68" y="116" width="84" height="102" fill="url(#mcTealTorso)" stroke="#000000" stroke-width="2.5"/>

        <!-- Steve V-Neck Yaka Açıklığı -->
        <polygon points="98,116 122,116 116,134 104,134" fill="#${skin}" stroke="#000000" stroke-width="1.8"/>
        <polygon points="98,116 122,116 116,122 104,122" fill="rgba(0,0,0,0.15)"/>

        <!-- Tişört Etek Çizgisi -->
        <line x1="68" y1="214" x2="152" y2="214" stroke="#004d4d" stroke-width="2"/>

        <!-- 5. KEMER BLOĞU (x=68, y=218, w=84, h=10) -->
        <rect x="68" y="218" width="84" height="10" fill="#3b2712" stroke="#000000" stroke-width="2"/>
        <rect x="103" y="219" width="14" height="8" fill="#d4af37" stroke="#78350f" stroke-width="1.2"/>

        <!-- 6. PANTOLON (Steve Klasik İndigo Blok Kot: x=68, y=228, w=84, h=96) -->
        <rect x="68" y="228" width="40" height="96" fill="url(#mcIndigoPants)" stroke="#000000" stroke-width="2.5"/>
        <rect x="112" y="228" width="40" height="96" fill="url(#mcIndigoPants)" stroke="#000000" stroke-width="2.5"/>
        <rect x="108" y="228" width="4" height="50" fill="#151b40"/>

        <!-- 7. BOTLAR (Koyu Gri Blok Botlar: y=324..352, h=28) -->
        <rect x="66" y="324" width="44" height="28" fill="url(#mcBoots)" stroke="#000000" stroke-width="2.5"/>
        <line x1="66" y1="344" x2="110" y2="344" stroke="#1a1a1a" stroke-width="2.5"/>
        <rect x="110" y="324" width="44" height="28" fill="url(#mcBoots)" stroke="#000000" stroke-width="2.5"/>
        <line x1="110" y1="344" x2="154" y2="344" stroke="#1a1a1a" stroke-width="2.5"/>
      </svg>
    `;
  }

  function renderAvatarCustomizerControls() {
    const currentSkin = (currentEditingAvatarConfig.skinColor || 'f8d9ce').replace('#', '');

    // 1. Ten Rengi (Color Swatches)
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
      renderAvatarCustomizerControls();
      updateLiveAvatarPreview();
    });

    // 2. Saç Modeli
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

    // 3. Saç Rengi (Kaşlar da bu renkle senkronize boyanır)
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

    // 4. Göz Şekli
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

    // 5. Göz Rengi (Her iki göz irisi eşzamanlı ve eksiksiz boyanır)
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

    // 6. Yüz İfadesi & Gülümseme
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

    // 7. Gözlük & Aksesuar
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

    // 8. Arka Plan Rengi (Sahne Fonu)
    renderColorSwatches('optBackgroundColor', [
      { id: 'ffdfbf', label: 'Parşömen Beji' },
      { id: 'b6e3f4', label: 'Buz / Gökyüzü Mavisi' },
      { id: 'c0aede', label: 'Lavanta / Leylak' },
      { id: 'bbf7d0', label: 'Nane Yeşili' },
      { id: 'fed7aa', label: 'Sıcak Şeftali' },
      { id: 'fef08a', label: 'Açık Güneş Sarısı' },
      { id: 'fbcfe8', label: 'Pudra Pembe' },
      { id: 'e2e8f0', label: 'Modern Açık Gri' },
      { id: '102343', label: 'Gece Laciverti' },
      { id: '450a0a', label: 'Derin Bordo' }
    ], currentEditingAvatarConfig.backgroundColor || 'ffdfbf', val => {
      currentEditingAvatarConfig.backgroundColor = val;
      updateLiveAvatarPreview();
    });
  }

  // Canlı SVG Önbelleği (Hızlı 60 FPS Geçişler)
  const adventurerSvgCache = new Map();

  // Adventurer Göz İrisini ve Kaşlarını Doğrudan SVG İçinde Yeniden Renklendirme
  // KRİTİK 1: Kaşlar SADECE hairColor ile boyanır, kesinlikle göz renginden etkilenmez!
  // KRİTİK 2: "Dikkatli" (variant04), "Neşeli" (variant05) ve "Derin/Odaklanmış" (variant08)
  // modellerinde iris katmanları tam anatomik koordinatlarına göre milimetrik hizalanır ve boyanır.
  function recolorAdventurerSvg(svgText, eyeColorHex, hairColorHex) {
    if (!svgText) return svgText;
    const eyeHex = (eyeColorHex || '3b2219').replace('#', '');
    const hairHex = (hairColorHex || '0e0e0e').replace('#', '');

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const featureGroups = doc.querySelectorAll('g[transform*="-161"]');

      featureGroups.forEach(group => {
        const paths = Array.from(group.querySelectorAll('path'));
        if (!paths.length) return;

        // 1. GÖZ GRUBU KONTROLÜ: Beyaz göz akı (fill="#fff" veya #ffffff) içerir
        const whitePaths = paths.filter(p => {
          const f = (p.getAttribute('fill') || '').toLowerCase();
          return f === '#fff' || f === '#ffffff';
        });

        if (whitePaths.length > 0) {
          // Göz grubu tespit edildi:
          // A. VARIANT04 (Dikkatli / Zeki Bakış): 2 path (0: #000, 1: #fff). Cutout iris delikli sklera
          // Sağ göz merkezi: cx=530, cy=492 | Sol göz merkezi: cx=409, cy=504
          if (paths.length === 2 && whitePaths.length === 1) {
            const circleRight = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleRight.setAttribute('cx', '530');
            circleRight.setAttribute('cy', '492');
            circleRight.setAttribute('r', '26');
            circleRight.setAttribute('fill', '#' + eyeHex);

            const circleLeft = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleLeft.setAttribute('cx', '409');
            circleLeft.setAttribute('cy', '504');
            circleLeft.setAttribute('r', '24');
            circleLeft.setAttribute('fill', '#' + eyeHex);

            group.insertBefore(circleLeft, paths[1]);
            group.insertBefore(circleRight, paths[1]);
          }
          // B. VARIANT05 (Neşeli Gülen Gözler): 4 path (2 ayrı sklera)
          // Sağ göz merkezi: cx=526, cy=488 | Sol göz merkezi: cx=410, cy=496
          else if (paths.length === 4 && whitePaths.length === 2) {
            // Sağ göz irisi: Path 1'in hemen öncesine
            const circleRight = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleRight.setAttribute('cx', '526');
            circleRight.setAttribute('cy', '488');
            circleRight.setAttribute('r', '26');
            circleRight.setAttribute('fill', '#' + eyeHex);
            group.insertBefore(circleRight, paths[1]);

            // Sol göz irisi: Path 3'ün hemen öncesine
            const circleLeft = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleLeft.setAttribute('cx', '410');
            circleLeft.setAttribute('cy', '496');
            circleLeft.setAttribute('r', '24');
            circleLeft.setAttribute('fill', '#' + eyeHex);
            group.insertBefore(circleLeft, paths[3]);
          }
          // C. VARIANT08 (Derin / Odaklanmış Bakış): 9 path
          // Path 4: Sağ iris, Path 5: Sağ parıltı, Path 6: Sağ kirpik + Sol iris, Path 7: Sol parıltı, Path 8: Sol kirpik
          else if (paths.length === 9 && whitePaths.length === 4) {
            // Sağ göz irisi: Path 4 (#000 -> eyeHex)
            paths[4].setAttribute('fill', '#' + eyeHex);

            // Sol göz irisi: Path 6 içinde 'M380.4 488.5' ile başlar; sağ kirpik 'M618.7' siyah kalır
            const d6 = paths[6].getAttribute('d') || '';
            const parts = d6.split(/Z(?=M)/i);
            if (parts.length === 2) {
              paths[6].setAttribute('d', parts[0] + 'Z');
              paths[6].setAttribute('fill', '#000000');

              const leftIris = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
              leftIris.setAttribute('d', parts[1]);
              leftIris.setAttribute('fill', '#' + eyeHex);
              group.insertBefore(leftIris, paths[7]);
            } else {
              paths[6].setAttribute('fill', '#' + eyeHex);
            }
            // Path 5 ve 7 beyaz parıltı olarak (#fff), Path 8 ise siyah sol kirpik olarak (#000) korunur.
          }
          // D. STANDART VARYANTLAR (variant01, variant02, variant03, variant06, variant07):
          // En son beyaz sclera yolundan sonra gelen siyah yollar dedicated iris katmanıdır!
          else {
            let lastWhiteIndex = -1;
            paths.forEach((p, idx) => {
              const f = (p.getAttribute('fill') || '').toLowerCase();
              if (f === '#fff' || f === '#ffffff') {
                lastWhiteIndex = idx;
              }
            });

            if (lastWhiteIndex !== -1) {
              for (let i = lastWhiteIndex + 1; i < paths.length; i++) {
                const f = (paths[i].getAttribute('fill') || '').toLowerCase();
                if (f === '#000' || f === '#000000' || f === 'black') {
                  paths[i].setAttribute('fill', '#' + eyeHex);
                }
              }
            }
          }
        } else {
          // 2. KAŞ GRUBU KONTROLÜ: Göz grubunun hemen ardında, koordinatları 370-440 aralığında
          // ve kırmızı/bordo dudak tonu (#8f2e45) içermeyen kaş katmanı
          const hasEyebrowCoords = paths.some(p => {
            const d = p.getAttribute('d') || '';
            return /3[7-9]\d|4[0-3]\d/.test(d) && !/5[5-9]\d|6\d{2}/.test(d);
          });
          const isMouth = paths.some(p => {
            const f = (p.getAttribute('fill') || '').toLowerCase();
            return f.includes('8f2e45') || f.includes('mouth') || /5[5-9]\d|6\d{2}/.test(p.getAttribute('d') || '');
          });

          if (hasEyebrowCoords && !isMouth) {
            // Kaşlar SADECE ve HER ZAMAN saç rengi (hairColor) state'ine bağlıdır!
            paths.forEach(p => {
              const f = (p.getAttribute('fill') || '').toLowerCase();
              if (f === '#000' || f === '#000000' || f === 'black') {
                p.setAttribute('fill', '#' + hairHex);
              }
            });
          }
        }
      });

      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc.documentElement);
    } catch(err) {
      console.warn("DOMParser recolor fallback", err);
      return svgText;
    }
  }

  function updateLiveAvatarPreview() {
    const skin = (currentEditingAvatarConfig.skinColor || 'f8d9ce').replace('#', '');
    const seed = 'TurkPenpal';
    const headUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&skinColor=${encodeURIComponent(skin)}&hair=${encodeURIComponent(currentEditingAvatarConfig.hair || 'long01')}&hairProbability=100&hairColor=${encodeURIComponent(currentEditingAvatarConfig.hairColor || '0e0e0e')}&eyes=${encodeURIComponent(currentEditingAvatarConfig.eyes || 'variant01')}&mouth=${encodeURIComponent(currentEditingAvatarConfig.mood || 'variant01')}&backgroundColor=transparent${currentEditingAvatarConfig.accessories && currentEditingAvatarConfig.accessories !== 'none' ? `&glasses=${encodeURIComponent(currentEditingAvatarConfig.accessories)}&glassesProbability=100` : '&glassesProbability=0'}`;

    // 1. Canlı Baş Bölgesi, Göz İrisi ve Kaş Senkronizasyonu (SVG İris & Kaş Katmanı)
    const headContainer = document.querySelector('.avatar-head-stage');
    if (adventurerSvgCache.has(headUrl)) {
      const rawSvg = adventurerSvgCache.get(headUrl);
      if (headContainer) {
        headContainer.innerHTML = recolorAdventurerSvg(rawSvg, currentEditingAvatarConfig.eyeColor, currentEditingAvatarConfig.hairColor);
      }
    } else {
      if (headContainer && !headContainer.querySelector('img')) {
        headContainer.innerHTML = `<img src="${headUrl}" id="liveAvatarPreviewImg" alt="Avatar Başı" class="live-avatar-head-img">`;
      } else {
        const existingImg = document.getElementById('liveAvatarPreviewImg');
        if (existingImg) existingImg.src = headUrl;
      }
      fetch(headUrl)
        .then(res => res.text())
        .then(rawSvg => {
          adventurerSvgCache.set(headUrl, rawSvg);
          if (headContainer) {
            headContainer.innerHTML = recolorAdventurerSvg(rawSvg, currentEditingAvatarConfig.eyeColor, currentEditingAvatarConfig.hairColor);
          }
        })
        .catch(err => {
          console.warn('DiceBear SVG live fetch fallback', err);
        });
    }

    // 2. Dikey Dikdörtgen Sahnesi, Arka Plan Rengi
    const stage = document.getElementById('liveAvatarCircleContainer');
    if (stage) {
      const bg = (currentEditingAvatarConfig.backgroundColor || 'ffdfbf').replace('#', '');
      stage.style.background = `radial-gradient(circle at 50% 25%, #${bg} 0%, #${bg}ee 65%, #${bg}cc 100%)`;
    }

    // 3. Sabit Minecraft Steve Gövdesi
    const torsoEl = document.getElementById('avatarOutfitTorso');
    if (torsoEl) {
      torsoEl.innerHTML = renderMinecraftBodySVG(currentEditingAvatarConfig.skinColor);
    }

    // 4. Rozetlerin Güncellenmesi
    const badgeEye = document.getElementById('badgeEyeColor');
    if (badgeEye) {
      const eyeNames = {
        '3b2219': 'Koyu Kahve',
        '6d4c41': 'Fındık Kahve',
        '7d6b38': 'Doğal Ela',
        '2e7d32': 'Zümrüt Yeşil',
        '1565c0': 'Okyanus Mavi',
        'b45309': 'Kehribar',
        '1a1a1a': 'Kömür Siyah',
        '64748b': 'Buz Mavisi'
      };
      const curColor = (currentEditingAvatarConfig.eyeColor || '3b2219').replace('#', '');
      badgeEye.innerHTML = `<span class="badge-color-dot" style="background:#${curColor};"></span> ${eyeNames[curColor] || 'Göz Rengi'}`;
    }
  }

  function randomizeAvatar() {
    const skins = ['f8d9ce', 'f9c9b6', 'f2d3b1', 'ecad80', 'd4976a', '9e5622', '763900'];
    const eyeColors = ['3b2219', '6d4c41', '7d6b38', '2e7d32', '1565c0', 'b45309', '1a1a1a', '64748b'];
    const backgroundColors = ['ffdfbf', 'b6e3f4', 'c0aede', 'bbf7d0', 'fed7aa', 'fef08a', 'fbcfe8', 'e2e8f0', '102343'];
    const hairs = ['short01', 'short02', 'short03', 'short04', 'short05', 'short06', 'short08', 'short12', 'short16', 'long01', 'long02', 'long03', 'long04', 'long05', 'long06', 'long10', 'long16', 'long26'];
    const hairColors = ['0e0e0e', '562306', '6a4e35', '796a45', 'b9a05f', 'e5d7a3', 'ab2a18', 'cb6820', 'afafaf', '3eac2c', '592454'];
    const moods = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08', 'variant09', 'variant10'];
    const eyes = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08'];
    const accs = ['none', 'variant01', 'variant02', 'variant03', 'variant04', 'variant05'];

    currentEditingAvatarConfig = {
      skinColor: skins[Math.floor(Math.random() * skins.length)],
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
      backgroundColor: backgroundColors[Math.floor(Math.random() * backgroundColors.length)],
      hair: hairs[Math.floor(Math.random() * hairs.length)],
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      mood: moods[Math.floor(Math.random() * moods.length)],
      eyes: eyes[Math.floor(Math.random() * eyes.length)],
      accessories: accs[Math.floor(Math.random() * accs.length)]
    };

    renderAvatarCustomizerControls();
    updateLiveAvatarPreview();
  }

  function saveAvatar() {
    saveMyAvatarConfig(currentEditingAvatarConfig);
    // Sanal Çalışma Odası ve diğer reaktif bileşenleri anında bilgilendir
    try {
      window.dispatchEvent(new CustomEvent('tda:avatar-changed', {
        detail: Object.assign({}, currentEditingAvatarConfig)
      }));
    } catch (e) {
      console.warn('Avatar event tetiklenemedi:', e);
    }
    closeAvatarStudio();
    alert(window.TDAI18n ? window.TDAI18n.t('alertAvatarSaved', { fallback: '✓ Bitmoji avatarınız başarıyla kaydedildi! Gönderdiğiniz mektuplarda ve Sanal Çalışma Odası\'nda bu avatar kullanılacaktır.' }) : '✓ Bitmoji avatarınız başarıyla kaydedildi! Gönderdiğiniz mektuplarda ve Sanal Çalışma Odası\'nda bu avatar kullanılacaktır.');
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
      alert(window.TDAI18n ? window.TDAI18n.t('alertSelectPenpal', { fallback: 'Lütfen bir mektup arkadaşı seçiniz.' }) : 'Lütfen bir mektup arkadaşı seçiniz.');
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
    const saved = saveLetters(letters);
    if (!saved) {
      alert(window.TDAI18n ? window.TDAI18n.t('alertStorageError', { fallback: 'Depolama alanı yetersiz olduğu için mektup kaydedilemedi. Lütfen ekli fotoğrafları azaltın veya daha küçük bir görsel seçin.' }) : 'Depolama alanı yetersiz olduğu için mektup kaydedilemedi. Lütfen ekli fotoğrafları azaltın veya daha küçük bir görsel seçin.');
      return;
    }

    // Formu temizle
    if (subjectInput) subjectInput.value = '';
    if (bodyInput) bodyInput.value = '';
    attachedPhotoFiles = [];
    const counter = document.getElementById('penpalCharCount');
    if (counter) counter.textContent = '0';

    const eagleMsg = window.TDAI18n
      ? window.TDAI18n.t('alertEagleDeparted', {
          from: 'İstanbul',
          to: activeSelectedPenpal.city,
          country: activeSelectedPenpal.country,
          time: `~${calc.deliveryHours} sa`,
          fallback: "🦅 Bozkır Kartalı mektubunuzu ulaştırmak üzere havalandı!\n\nGüzergâh: {from} ➔ {to} ({country})\nTahmini Teslim Süresi: {time}"
        })
      : `🦅 Bozkır Kartalı mektubunuzu teslim etmek üzere havalandı!\n\n` +
        `Rota: İstanbul ➔ ${activeSelectedPenpal.city} (${activeSelectedPenpal.country})\n` +
        `Uçuş Süresi: ~${calc.flightHours} saat\n` +
        `Teslimat Süresi (Tam 2 katı): ~${calc.deliveryHours} saat\n\n` +
        `Mektup hesaplanan süre dolduğunda alıcısına teslim edilecektir.`;
    alert(eagleMsg);

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
        <div class="letter-dm-row ${isUnread ? 'unread' : ''}" data-letter-id="${escapeHtml(l.id)}" role="button" tabindex="0">
          <div class="letter-dm-left">
            <div class="letter-dm-avatar-frame">
              <img src="${avatarSrc}" alt="${escapeHtml(l.fromName)}" class="letter-dm-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=Penpal'">
              ${isUnread ? '<span class="letter-dm-unread-dot" title="Yeni Mektup"></span>' : ''}
            </div>
            <div class="letter-dm-text">
              <strong class="letter-dm-name" data-no-translate>${escapeHtml(l.fromName)}</strong>
              <span class="letter-dm-country" data-no-translate>${escapeHtml(l.fromCountry)}${l.fromCity ? ' (' + escapeHtml(l.fromCity) + ')' : ''}</span>
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
        <div class="letter-dm-row" data-letter-id="${escapeHtml(l.id)}" role="button" tabindex="0">
          <div class="letter-dm-left">
            <div class="letter-dm-avatar-frame">
              <img src="${avatarSrc}" alt="${escapeHtml(l.toName)}" class="letter-dm-avatar" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=Penpal'">
            </div>
            <div class="letter-dm-text">
              <strong class="letter-dm-name" data-no-translate>${escapeHtml(l.toName)}</strong>
              <span class="letter-dm-country" data-no-translate>${escapeHtml(l.toCountry)}${l.toCity ? ' (' + escapeHtml(l.toCity) + ')' : ''}</span>
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
      notifyUnread();
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
      if (senderNameEl) {
        senderNameEl.textContent = letter.fromName;
        senderNameEl.setAttribute('data-no-translate', '');
      }
      if (subEl) {
        subEl.textContent = `${letter.fromCity ? letter.fromCity + ', ' : ''}${letter.fromCountry} ➔ ${letter.toCity ? letter.toCity + ', ' : ''}${letter.toCountry}`;
        subEl.setAttribute('data-no-translate', '');
      }
      if (stampImgEl) {
        stampImgEl.src = stampImg;
        stampImgEl.onerror = () => { stampImgEl.src = 'assets/images/mektup-ikon.png'; };
      }
      if (stampNameEl) stampNameEl.textContent = stamp.name || 'Posta Pulu';
      if (transitAlert) transitAlert.style.display = isTransit ? 'block' : 'none';
      if (dateEl) dateEl.textContent = `Tarih: ${dateFormatted}`;
      if (subjectEl) {
        subjectEl.textContent = letter.subject || 'Mektup';
        subjectEl.setAttribute('data-no-translate', '');
      }
      if (bodyEl) {
        bodyEl.textContent = letter.body || '';
        bodyEl.setAttribute('data-no-translate', '');
      }

      if (photosSection && photosGrid) {
        if (!isPending && letter.photos && letter.photos.length) {
          photosSection.style.display = 'block';
          photosGrid.innerHTML = letter.photos.map(src => `<img src="${escapeHtml(src)}" alt="Ek Fotoğraf" class="reader-photo-thumb" data-photo-src="${escapeHtml(src)}">`).join('');
          photosGrid.querySelectorAll('img[data-photo-src]').forEach(img => {
            img.addEventListener('click', () => window.open(img.dataset.photoSrc));
          });
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
              <h3 data-no-translate style="margin:0 0 4px 0;font-size:18px;color:#102343;">${escapeHtml(letter.fromName)}</h3>
              <div data-no-translate style="font-size:12.5px;color:#64748b;">
                ${escapeHtml(letter.fromCity || '')}, ${escapeHtml(letter.fromCountry)} ➔ ${escapeHtml(letter.toCity || '')}, ${escapeHtml(letter.toCountry)}
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

        <div class="letter-paper-subject" data-no-translate style="font-size:21px;font-weight:bold;margin-bottom:18px;">
          ${escapeHtml(letter.subject)}
        </div>

        <div class="letter-paper-body" data-no-translate style="font-size:15.5px;line-height:1.85;white-space:pre-line;margin-bottom:24px;">
          ${escapeHtml(letter.body)}
        </div>

        ${letter.photos && letter.photos.length ? `
          <div class="reader-attached-photos">
            <h5>${window.TDAI18n ? window.TDAI18n.t('attachedPhotosLabel', { n: letter.photos.length, fallback: `📷 Mektuba Eklenen Fotoğraflar (${letter.photos.length} Adet)` }) : `📷 Mektuba Eklenen Fotoğraflar (${letter.photos.length} Adet)`}</h5>
            <div class="reader-photos-row">
              ${letter.photos.map(src => `<img src="${escapeHtml(src)}" alt="Mektup Eki" class="reader-photo-thumb" data-photo-src="${escapeHtml(src)}">`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="letter-paper-footer" style="border-top:1px solid rgba(0,0,0,0.1);padding-top:16px;margin-top:20px;display:flex;justify-content:space-between;font-size:12px;color:#64748b;">
          <span>${window.TDAI18n ? window.TDAI18n.t('letterPostalNetwork', { fallback: '🦅 Türk Dünyası Bozkır Kartalı Posta Ağı' }) : '🦅 Türk Dünyası Bozkır Kartalı Posta Ağı'}</span>
          <span data-no-translate>${escapeHtml(letter.fromName)} • ${escapeHtml(letter.fromCity || letter.fromCountry)}</span>
        </div>
      `;
      readerContainer.querySelectorAll('.reader-photo-thumb[data-photo-src]').forEach(img => {
        img.addEventListener('click', () => window.open(img.dataset.photoSrc));
      });
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
      photosGrid.innerHTML = target.photos.map(src => `<img src="${escapeHtml(src)}" alt="Ek Fotoğraf" class="reader-photo-thumb" data-photo-src="${escapeHtml(src)}">`).join('');
      photosGrid.querySelectorAll('img[data-photo-src]').forEach(img => {
        img.addEventListener('click', () => window.open(img.dataset.photoSrc));
      });
    }

    renderInbox();
    notifyUnread();
    alert(window.TDAI18n ? window.TDAI18n.t('alertPenpalAccepted', { name: target.fromName, fallback: `✓ ${target.fromName} ile mektup arkadaşlığı başarıyla kabul edildi! Artık dilediğiniz gibi yanıt yazabilir ve kültürel anılarınızı paylaşabilirsiniz.` }) : `✓ ${target.fromName} ile mektup arkadaşlığı başarıyla kabul edildi! Artık dilediğiniz gibi yanıt yazabilir ve kültürel anılarınızı paylaşabilirsiniz.`);
  }

  function handleRejectConsent() {
    if (!activeViewingLetter) return;
    const senderName = activeViewingLetter.fromName;
    const senderId = activeViewingLetter.fromStudentId;
    const letterId = activeViewingLetter.id;

    const confirmMsg = window.TDAI18n ? window.TDAI18n.t('confirmRejectPenpal', { name: senderName, fallback: `${senderName} adlı kullanıcının mektup arkadaşlığı talebini reddetmek ve bu kullanıcıyı engellemek istediğinize emin misiniz?` }) : `${senderName} adlı kullanıcının mektup arkadaşlığı talebini reddetmek ve bu kullanıcıyı engellemek istediğinize emin misiniz?`;
    if (!confirm(confirmMsg)) {
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

    alert(window.TDAI18n ? window.TDAI18n.t('alertPenpalRejected', { name: senderName, fallback: `Mektup arkadaşlığı reddedildi ve ${senderName} engellendi.` }) : `Mektup arkadaşlığı reddedildi ve ${senderName} engellendi.`);
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
        alert(window.TDAI18n ? window.TDAI18n.t('alertAcceptFirst', { fallback: 'Mektuba yanıt yazabilmek için lütfen önce yukarıdaki mektup arkadaşlığı talebini Kabul Ediniz.' }) : 'Mektuba yanıt yazabilmek için lütfen önce yukarıdaki mektup arkadaşlığı talebini Kabul Ediniz.');
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
          alert(window.TDAI18n ? window.TDAI18n.t('alertSelectCountry', { fallback: 'Lütfen önce bir ülke seçiniz.' }) : 'Lütfen önce bir ülke seçiniz.');
          return;
        }
        if (step === 3 && !activeSelectedPenpal) {
          alert(window.TDAI18n ? window.TDAI18n.t('alertSelectPenpal', { fallback: 'Lütfen önce bir mektup arkadaşı seçiniz.' }) : 'Lütfen önce bir mektup arkadaşı seçiniz.');
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
    openAvatarStudio,
    getMyAvatarConfig,
    saveMyAvatarConfig,
    generateAvatarUrl,
    DEFAULT_AVATAR_CONFIG
  };
})();
