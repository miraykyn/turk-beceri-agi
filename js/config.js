/**
 * Türk Dünyası Beceri Ağı - Konfigürasyon ve Veri Modelleri
 * 7 Türk Devleti, diller, beceriler, demo kullanıcılar ve başlangıç verileri
 */

window.TDAConfig = (function() {
  const COUNTRIES = [
 {name:'Türkiye',flag:'assets/flags/tr.svg'},
 {name:'Azerbaycan',flag:'assets/flags/az.svg'},
 {name:'Kazakistan',flag:'assets/flags/kz.svg'},
 {name:'Özbekistan',flag:'assets/flags/uz.svg'},
 {name:'Kırgızistan',flag:'assets/flags/kg.svg'},
 {name:'Türkmenistan',flag:'assets/flags/tm.svg'},
 {name:'Kuzey Kıbrıs Türk Cumhuriyeti',flag:'assets/flags/kktc.svg'}
];

  const DEMO_USERS = [
 {id:'u1',studentId:'TDA-DEMO-001',name:'Aylin Yılmaz',country:'Türkiye',languages:['Türkçe','İngilizce'],teach:['Excel','Ekonomi','Türkçe','Sunum ve hitabet'],learn:['Kazakça','Python','Grafik tasarım'],level:'İleri',availability:'Hafta içi',points:2.5,verified:true},
 {id:'u2',studentId:'TDA-DEMO-002',name:'Leyla Məmmədova',country:'Azerbaycan',languages:['Azərbaycanca','Türkçe','İngilizce'],teach:['Grafik tasarım','UI/UX tasarım','Türkçe'],learn:['Excel','Kodlama ve yazılım'],level:'İleri',availability:'Akşam',points:1.4,verified:true},
 {id:'u3',studentId:'TDA-DEMO-003',name:'Aruzhan Sarsenova',country:'Kazakistan',languages:['Қазақша','Türkçe','İngilizce'],teach:['Kodlama ve yazılım','Veri analizi','Matematik'],learn:['Kazakça','Ekonomi','Sunum ve hitabet'],level:'Orta',availability:'Hafta içi',points:1.1,verified:true},
 {id:'u4',studentId:'TDA-DEMO-004',name:'Dilnoza Karimova',country:'Özbekistan',languages:['O‘zbekcha','Türkçe'],teach:['Girişimcilik','Pazarlama','İngilizce'],learn:['Grafik tasarım','Türkçe'],level:'Orta',availability:'Hafta sonu',points:0,verified:true},
 {id:'u5',studentId:'TDA-DEMO-005',name:'Aizada Turgunbaeva',country:'Kırgızistan',languages:['Кыргызча','Türkçe'],teach:['Medya','Fotoğrafçılık','Türkçe'],learn:['Video düzenleme','İngilizce'],level:'Başlangıç',availability:'Akşam',points:0,verified:true},
 {id:'u6',studentId:'TDA-DEMO-006',name:'Mähri Orazowa',country:'Türkmenistan',languages:['Türkmençe','Türkçe'],teach:['Yaratıcı yazarlık','Akademik yazım','Dil'],learn:['Pazarlama','Sunum ve hitabet'],level:'İleri',availability:'Hafta sonu',points:1.8,verified:true},
 {id:'u7',studentId:'TDA-DEMO-007',name:'Elif Demir',country:'Kuzey Kıbrıs Türk Cumhuriyeti',languages:['Türkçe','İngilizce'],teach:['Kültür','Araştırma','Sunum ve hitabet'],learn:['Kodlama ve yazılım','Veri analizi'],level:'Orta',availability:'Hafta içi',points:0,verified:true}
];

  const ARTICLES_DEFAULT = [
 {id:'a1',title:'Türk Dünyasında Öğrenci Becerilerinin Dijital Paylaşımı',country:'Türkiye',author:'Aylin Yılmaz',category:'Akademik',body:'Beceri paylaşımı, öğrencilerin yalnızca bilgi edinmesini değil, sahip oldukları bilgiyi başka bir öğrencinin öğrenme sürecine aktarmasını da mümkün kılar. Dijital ağlar bu süreci sınırlar ötesine taşıyabilir.'},
 {id:'a2',title:'Azerbaycanlı Öğrencilerde Tasarım Öğrenme Kültürü',country:'Azerbaycan',author:'Leyla Məmmədova',category:'Kültür',body:'Tasarım becerilerinin akranlar arasında paylaşılması, farklı eğitim deneyimlerinin karşılaştırılmasına ve ortak üretim kültürünün gelişmesine katkı sağlayabilir.'},
 {id:'a3',title:'Kazakistan ve Veri Okuryazarlığı Üzerine Öğrenci Notları',country:'Kazakistan',author:'Aruzhan Sarsenova',category:'Eğitim',body:'Veri analizi öğrenirken temel kavramları küçük uygulamalarla pekiştirmek, öğrencilerin teknik becerileri daha sürdürülebilir biçimde geliştirmesine yardımcı olabilir.'},
 {id:'a4',title:'Özbekistan’da Girişimcilik Öğrenmenin Öğrenci Boyutu',country:'Özbekistan',author:'Dilnoza Karimova',category:'Öğrenci Deneyimi',body:'Girişimcilik eğitimi yalnızca iş fikri üretmekten ibaret değildir. Öğrencinin problem tanımlama, iletişim ve küçük denemeler yapma becerileri de sürecin parçasıdır.'},
 {id:'a5',title:'Kırgızistan ile Medya Becerilerinde Akran Öğrenimi',country:'Kırgızistan',author:'Aizada Turgunbaeva',category:'Medya',body:'Medya becerileri üzerinde çalışan öğrenciler, kısa video ve fotoğraf projeleri üzerinden birbirlerine geri bildirim vererek öğrenme sürecini uygulamalı hâle getirebilir.'},
 {id:'a6',title:'Türkmenistanlı Öğrenciler İçin Akademik Yazım Deneyimi',country:'Türkmenistan',author:'Mähri Orazowa',category:'Akademik',body:'Akademik yazımda kaynak düzeni, açık anlatım ve argüman kurma gibi temel becerilerin küçük geri bildirim döngüleriyle geliştirilmesi öğrencinin özgüvenini destekleyebilir.'},
 {id:'a7',title:'Kuzey Kıbrıs’ta Kültürlerarası Öğrenci Bağları',country:'Kuzey Kıbrıs Türk Cumhuriyeti',author:'Elif Demir',category:'Kültür',body:'Öğrenciler arasında kültür ve eğitim deneyimlerinin paylaşılması, farklı ülkelerden gelen katılımcıların birbirlerini daha yakından tanımasına ve ortak öğrenme alanları oluşturmasına yardımcı olabilir.'}
];

  const worldLanguageCatalog = [
    {c:'tur',a2:'tr',n:{tr:'Türkçe',az:'Türkcə',uz:'Turk tili',kk:'Түрік тілі',tk:'Türk dili',ky:'Түрк тили',en:'Turkish',tg:'забони туркӣ'}},
    {c:'aze',a2:'az',n:{tr:'Azerbaycanca',az:'Azərbaycan dili',uz:'Ozarbayjon tili',kk:'Әзербайжан тілі',tk:'Azerbaýjan dili',ky:'Азербайжан тили',en:'Azerbaijani',tg:'забони озарӣ'}},
    {c:'uzb',a2:'uz',n:{tr:'Özbekçe',az:'Özbək dili',uz:'O‘zbek tili',kk:'Өзбек тілі',tk:'Özbek dili',ky:'Өзбек тили',en:'Uzbek',tg:'забони ӯзбекӣ'}},
    {c:'kaz',a2:'kk',n:{tr:'Kazakça',az:'Qazax dili',uz:'Qozoq tili',kk:'Қазақ тілі',tk:'Gazak dili',ky:'Казак тили',en:'Kazakh',tg:'забони қазоқӣ'}},
    {c:'tuk',a2:'tk',n:{tr:'Türkmence',az:'Türkmən dili',uz:'Turkman tili',kk:'Түрікмен тілі',tk:'Türkmen dili',ky:'Түркмөн тили',en:'Turkmen',tg:'забони туркманӣ'}},
    {c:'kir',a2:'ky',n:{tr:'Kırgızca',az:'Qırğız dili',uz:'Qirg‘iz tili',kk:'Қырғыз тілі',tk:'Кыргыз тили',ky:'Кыргыз тили',en:'Kyrgyz',tg:'забони қирғизӣ'}},
    {c:'eng',a2:'en',n:{tr:'İngilizce',az:'İngilis dili',uz:'Ingliz tili',kk:'Ағылшын тілі',tk:'Iňlis dili',ky:'Англис тили',en:'English',tg:'забони англисӣ'}},
    {c:'rus',a2:'ru',n:{tr:'Rusça',az:'Rus dili',uz:'Rus tili',kk:'Орыс тілі',tk:'Rus dili',ky:'Орус тили',tg:'забони русӣ'}},
    {c:'kor',a2:'ko',n:{tr:'Korece',az:'Koreya dili',uz:'Koreys tili',kk:'Корей тілі',tk:'Koreý dili',ky:'Корей тили',tg:'забони кореягӣ'}},
    {c:'jpn',a2:'ja',n:{tr:'Japonca',az:'Yapon dili',uz:'Yapon tili',kk:'Жапон тілі',tk:'Ýapon dili',ky:'Жапон тили',tg:'забони ҷопонӣ'}},
    {c:'ita',a2:'it',n:{tr:'İtalyanca',az:'İtalyan dili',uz:'Italyan tili',kk:'Итальян тілі',tk:'Italýan dili',ky:'Италиян тили',tg:'забони итолиёвӣ'}},
    {c:'fra',a2:'fr',n:{tr:'Fransızca',az:'Fransız dili',uz:'Fransuz tili',kk:'Француз тілі',tk:'Fransuz dili',ky:'Француз тили',tg:'забони фаронсавӣ'}},
    {c:'spa',a2:'es',n:{tr:'İspanyolca',az:'İspan dili',uz:'Ispan tili',kk:'Испан тілі',tk:'Ispan dili',ky:'Испан тили',tg:'забони испанӣ'}},
    {c:'deu',a2:'de',n:{tr:'Almanca',az:'Alman dili',uz:'Nemis tili',kk:'Неміс тілі',tk:'Nemes dili',ky:'Немис тили',tg:'забони олмонӣ'}},
    {c:'por',a2:'pt',n:{tr:'Portekizce',az:'Portuqal dili',uz:'Portugal tili',kk:'Португал тілі',tk:'Portugaliýa dili',ky:'Португал тили',tg:'забони португалӣ'}},
    {c:'ara',a2:'ar',n:{tr:'Arapça',az:'Ərəb dili',uz:'Arab tili',kk:'Араб тілі',tk:'Arap dili',ky:'Араб тили',tg:'забони арабӣ'}},
    {c:'fas',a2:'fa',n:{tr:'Farsça',az:'Fars dili',uz:'Fors tili',kk:'Парсы тілі',tk:'Pars dili',ky:'Парсы тили',tg:'забони форсӣ'}},
    {c:'zho',a2:'zh',n:{tr:'Çince',az:'Çin dili',uz:'Xitoy tili',kk:'Қытай тілі',tk:'Hytaý dili',ky:'Кытай тили',tg:'забони чинӣ'}},
    {c:'hin',a2:'hi',n:{tr:'Hintçe',az:'Hind dili',uz:'Hind tili',kk:'Хинди тілі',tk:'Hindi dili',ky:'Хинди тили',tg:'забони ҳиндӣ'}},
    {c:'urd',a2:'ur',n:{tr:'Urduca',az:'Urdu dili',uz:'Urdu tili',kk:'Урду тілі',tk:'Urdu dili',ky:'Урду тили',tg:'забони урду'}},
    {c:'ben',a2:'bn',n:{tr:'Bengalce',az:'Benqal dili',uz:'Bengal tili',kk:'Бенгал тілі',tk:'Bengal dili',ky:'Бенгал тили',tg:'забони банголӣ'}},
    {c:'ind',a2:'id',n:{tr:'Endonezce',az:'İndoneziya dili',uz:'Indonez tili',kk:'Индонез тілі',tk:'Indonez dili',ky:'Индонез тили',tg:'забони индонезӣ'}},
    {c:'msa',a2:'ms',n:{tr:'Malayca',az:'Malay dili',uz:'Malay tili',kk:'Малай тілі',tk:'Malaý dili',ky:'Малай тили',tg:'забони малайӣ'}},
    {c:'vie',a2:'vi',n:{tr:'Vietnamca',az:'Vyetnam dili',uz:'Vetnam tili',kk:'Вьетнам тілі',tk:'Wýetnam dili',ky:'Вьетнам тили',tg:'забони ветнамӣ'}},
    {c:'tha',a2:'th',n:{tr:'Tayca',az:'Tay dili',uz:'Tay tili',kk:'Тай тілі',tk:'Taý dili',ky:'Тай тили',tg:'забони тайӣ'}},
    {c:'ell',a2:'el',n:{tr:'Yunanca',az:'Yunan dili',uz:'Yunon tili',kk:'Грек тілі',tk:'Grek dili',ky:'Грек тили',tg:'забони юнонӣ'}},
    {c:'heb',a2:'he',n:{tr:'İbranice',az:'İvrit dili',uz:'Ibroniy tili',kk:'Иврит тілі',tk:'Ýewreý dili',ky:'Иврит тили',tg:'забони ибронӣ'}},
    {c:'nld',a2:'nl',n:{tr:'Felemenkçe',az:'Niderland dili',uz:'Niderland tili',kk:'Нидерланд тілі',tk:'Niderland dili',ky:'Нидерланд тили',tg:'забони нидерландӣ'}},
    {c:'swe',a2:'sv',n:{tr:'İsveççe',az:'İsveç dili',uz:'Shved tili',kk:'Швед тілі',tk:'Şwed dili',ky:'Швед тили',tg:'забони шведӣ'}},
    {c:'nor',a2:'no',n:{tr:'Norveççe',az:'Norveç dili',uz:'Norveg tili',kk:'Норвег тілі',tk:'Norweg dili',ky:'Норвег тили',tg:'забони норвегӣ'}},
    {c:'dan',a2:'da',n:{tr:'Danca',az:'Danimarka dili',uz:'Daniya tili',kk:'Дат тілі',tk:'Daniýa dili',ky:'Дат тили',tg:'забони даниягӣ'}},
    {c:'fin',a2:'fi',n:{tr:'Fince',az:'Fin dili',uz:'Fin tili',kk:'Фин тілі',tk:'Fin dili',ky:'Фин тили',tg:'забони финӣ'}},
    {c:'pol',a2:'pl',n:{tr:'Lehçe',az:'Polyak dili',uz:'Polyak tili',kk:'Поляк тілі',tk:'Polýak dili',ky:'Поляк тили',tg:'забони полякӣ'}},
    {c:'ces',a2:'cs',n:{tr:'Çekçe',az:'Çex dili',uz:'Chex tili',kk:'Чех тілі',tk:'Çeh dili',ky:'Чех тили',tg:'забони чехӣ'}},
    {c:'ukr',a2:'uk',n:{tr:'Ukraynaca',az:'Ukrayna dili',uz:'Ukrain tili',kk:'Украин тілі',tk:'Ukrain dili',ky:'Украин тили',tg:'забони украинӣ'}},
    {c:'ron',a2:'ro',n:{tr:'Romence',az:'Rumın dili',uz:'Rumin tili',kk:'Румын тілі',tk:'Rumyn dili',ky:'Румын тили',tg:'забони руминӣ'}},
    {c:'bul',a2:'bg',n:{tr:'Bulgarca',az:'Bolqar dili',uz:'Bolgar tili',kk:'Болгар тілі',tk:'Bolgar dili',ky:'Болгар тили',tg:'забони булғорӣ'}},
    {c:'srp',a2:'sr',n:{tr:'Sırpça',az:'Serb dili',uz:'Serb tili',kk:'Серб тілі',tk:'Serb dili',ky:'Серб тили',tg:'забони сербӣ'}},
    {c:'hrv',a2:'hr',n:{tr:'Hırvatça',az:'Xorvat dili',uz:'Xorvat tili',kk:'Хорват тілі',tk:'Horwat dili',ky:'Хорват тили',tg:'забони хорватӣ'}},
    {c:'hun',a2:'hu',n:{tr:'Macarca',az:'Macar dili',uz:'Venger tili',kk:'Венгр тілі',tk:'Wenger dili',ky:'Венгр тили',tg:'забони венгерӣ'}},
    {c:'kat',a2:'ka',n:{tr:'Gürcüce',az:'Gürcü dili',uz:'Gruzin tili',kk:'Грузин тілі',tk:'Gruzin dili',ky:'Грузин тили',tg:'забони гурҷӣ'}},
    {c:'lat',a2:'la',n:{tr:'Latince',az:'Latın dili',uz:'Lotin tili',kk:'Латын тілі',tk:'Latyn dili',ky:'Латын тили'}}
  ];

  const skillCatalog = [
    ['Kodlama ve yazılım','Kodlama'],['Web geliştirme','Web geliştirme'],['Mobil uygulama geliştirme','Mobil uygulama'],['Veri analizi','Veri analizi'],['Yapay zekâ','Yapay zekâ'],['Siber güvenlik','Siber güvenlik'],['Robotik','Robotik'],['Elektronik','Elektronik'],
    ['Ekonomi','Ekonomi'],['Finans','Finans'],['Muhasebe','Muhasebe'],['Girişimcilik','Girişimcilik'],['Pazarlama','Pazarlama'],['İş geliştirme','İş geliştirme'],['Proje yönetimi','Proje yönetimi'],['Hukuk','Hukuk'],
    ['Fotoğrafçılık','Fotoğrafçılık'],['Video çekimi','Video çekimi'],['Video düzenleme','Video düzenleme'],['Grafik tasarım','Grafik tasarım'],['UI/UX tasarım','UI/UX tasarım'],['İllüstrasyon','İllüstrasyon'],['Animasyon','Animasyon'],['Müzik','Müzik'],['Enstrüman','Enstrüman'],['Şarkı söyleme','Şarkı söyleme'],
    ['Medya','Medya'],['Gazetecilik','Gazetecilik'],['Sosyal medya','Sosyal medya'],['İçerik üretimi','İçerik üretimi'],['Sunum ve hitabet','Sunum ve hitabet'],['Yaratıcı yazarlık','Yaratıcı yazarlık'],['Akademik yazım','Akademik yazım'],
    ['Öğretmenlik / eğitim','Eğitim'],['Araştırma','Araştırma'],['Matematik','Matematik'],['Fen bilimleri','Fen bilimleri'],['Tarih','Tarih'],['Coğrafya','Coğrafya'],['Psikoloji','Psikoloji'],['Sosyoloji','Sosyoloji'],
    ['Çizim','Çizim'],['El sanatları','El sanatları'],['Dikiş','Dikiş'],['Örgü','Örgü'],['Yemek yapma','Yemek yapma'],['Dans','Dans'],['Spor','Spor'],['Fitness','Fitness'],['Satranç','Satranç'],['Oyun geliştirme','Oyun geliştirme'],
    ['Kişisel finans','Kişisel finans'],['Kariyer planlama','Kariyer planlama'],['CV hazırlama','CV hazırlama'],['Mülakat becerileri','Mülakat becerileri'],['İletişim','İletişim'],['Takım çalışması','Takım çalışması'],['Liderlik','Liderlik'],['Zaman yönetimi','Zaman yönetimi']
  ];

  const UI_LANGUAGE_NAMES = window.TDA_I18N_DATA?.uiLanguageNames || {
    tr:{tr:'Türkçe',az:'Azerbaycanca',uz:'Özbekçe',kk:'Kazakça',tk:'Türkmence',ky:'Kırgızca',en:'İngilizce'},
    az:{tr:'Türkcə',az:'Azərbaycanca',uz:'Özbəkcə',kk:'Qazaxca',tk:'Türkməncə',ky:'Qırğızca',en:'İngiliscə'},
    uz:{tr:'Turk tili',az:'Ozarbayjon tili',uz:'O‘zbek tili',kk:'Qozoq tili',tk:'Turkman tili',ky:'Qirg‘iz tili',en:'Ingliz tili'},
    kk:{tr:'Түрік тілі',az:'Әзербайжан тілі',uz:'Өзбек тілі',kk:'Қазақ тілі',tk:'Түрікмен тілі',ky:'Қырғыз тілі',en:'Ағылшын тілі'},
    tk:{tr:'Türk dili',az:'Azerbaýjan dili',uz:'Özbek dili',kk:'Gazak dili',tk:'Türkmen dili',ky:'Gyrgyz dili',en:'Iňlis dili'},
    ky:{tr:'Түрк тили',az:'Азербайжан тили',uz:'Өзбек тили',kk:'Казак тили',tk:'Түркмөн тили',ky:'Кыргыз тили',en:'Англис тили'},
    en:{tr:'Turkish',az:'Azerbaijani',uz:'Uzbek',kk:'Kazakh',tk:'Turkmen',ky:'Kyrgyz',en:'English'}
  };

  const FACTS = [
    {country:'Türkiye',text:'Göbekli Tepe, UNESCO Dünya Mirası Listesi’ne 2018’de alındı.',source:'UNESCO'},
    {country:'Türkiye',text:'Türkiye Büyük Millet Meclisi 23 Nisan 1920’de açıldı.',source:'TBMM Başkanlığı'},
    {country:'Türkiye',text:'Türk alfabesinin kabulünü düzenleyen kanun 1 Kasım 1928’de yayımlandı.',source:'Atatürk Araştırma Merkezi'},
    {country:'Türkiye',text:'Anıtkabir’in inşası 1953’te tamamlandı.',source:'Anıtkabir Komutanlığı'},
    {country:'Türkiye',text:'İstanbul, 2010 Avrupa Kültür Başkentlerinden biri oldu.',source:'Avrupa Komisyonu'},
    {country:'Türkiye',text:'Hattuşa, UNESCO Dünya Mirası Listesi’ne 1986’da girdi.',source:'UNESCO'},
    {country:'Azerbaycan',text:'Azerbaycan Demokratik Cumhuriyeti 1918’de kuruldu ve Müslüman Doğu’nun ilk parlamenter cumhuriyeti oldu.',source:'Azerbaycan Cumhurbaşkanlığı'},
    {country:'Azerbaycan',text:'Bakü’nün İçerişehir bölgesi UNESCO listesine 2000’de alındı.',source:'UNESCO'},
    {country:'Azerbaycan',text:'Gobustan Kaya Sanatı Kültürel Peyzajı UNESCO listesine 2007’de girdi.',source:'UNESCO'},
    {country:'Azerbaycan',text:'Azerbaycan mugamı, UNESCO Somut Olmayan Kültürel Miras Listesi’ndedir.',source:'UNESCO'},
    {country:'Azerbaycan',text:'Kız Kalesi, Bakü’nün İçerişehir tarihî merkezinin bir parçasıdır.',source:'UNESCO'},
    {country:'Azerbaycan',text:'Nahçıvan Özerk Cumhuriyeti 9 Şubat 1924’te kuruldu.',source:'Nahçıvan Özerk Cumhuriyeti'},
    {country:'Kazakistan',text:'Baikonur’dan 4 Ekim 1957’de Sputnik 1, dünyanın ilk yapay uydusu olarak fırlatıldı.',source:'NASA'},
    {country:'Kazakistan',text:'Saryarka bozkır ve gölleri UNESCO Dünya Mirası Listesi’ne 2008’de alındı.',source:'UNESCO'},
    {country:'Kazakistan',text:'Kazakistan bağımsızlığını 16 Aralık 1991’de ilan etti.',source:'Kazakistan Cumhurbaşkanlığı'},
    {country:'Kazakistan',text:'Astana, Kazakistan’ın başkenti olarak 1997’de ilan edildi.',source:'Kazakistan Cumhurbaşkanlığı'},
    {country:'Kazakistan',text:'Almatı, 1997’ye kadar Kazakistan’ın başkentiydi.',source:'Kazakistan Cumhurbaşkanlığı'},
    {country:'Kazakistan',text:'Hoca Ahmed Yesevî Türbesi UNESCO Dünya Mirası Listesi’ne 2003’te girdi.',source:'UNESCO'},
    {country:'Özbekistan',text:'Semerkant, Kültürler Kavşağı olarak UNESCO listesine 2001’de alındı.',source:'UNESCO'},
    {country:'Özbekistan',text:'İçan-Kale, UNESCO Dünya Mirası Listesi’ne 1990’da girdi.',source:'UNESCO'},
    {country:'Özbekistan',text:'Buhara’nın tarihî merkezi UNESCO listesine 1993’te alındı.',source:'UNESCO'},
    {country:'Özbekistan',text:'Taşkent Metrosu 1977’de açıldı ve Orta Asya’nın ilk metrosu oldu.',source:'Taşkent Metrosu'},
    {country:'Özbekistan',text:'Uluğ Bey, Semerkant’ta 15. yüzyılda önemli bir gözlemevi kurdu.',source:'UNESCO'},
    {country:'Özbekistan',text:'Timur, 1336’da Keş yakınlarında doğdu.',source:'Encyclopaedia Britannica'},
    {country:'Kırgızistan',text:'Kırgızların Manas destanı, UNESCO Somut Olmayan Kültürel Miras Listesi’ndedir.',source:'UNESCO'},
    {country:'Kırgızistan',text:'Süleyman Dağı, UNESCO Dünya Mirası Listesi’ne 2009’da alındı.',source:'UNESCO'},
    {country:'Kırgızistan',text:'Issık Göl, dünyanın en büyük yüksek rakımlı göllerinden biridir.',source:'Britannica'},
    {country:'Kırgızistan',text:'Kırgızistan bağımsızlığını 31 Ağustos 1991’de ilan etti.',source:'Kırgızistan Cumhurbaşkanlığı'},
    {country:'Kırgızistan',text:'Burana Kulesi, 11. yüzyıldan kalma tarihî bir minaredir.',source:'Kırgızistan Kültür Bakanlığı'},
    {country:'Kırgızistan',text:'Ala-Arça Millî Parkı 1976’da kuruldu.',source:'Kırgızistan Hükümeti'},
    {country:'Türkmenistan',text:'Antik Nisa, UNESCO Dünya Mirası Listesi’ne 2007’de alındı.',source:'UNESCO'},
    {country:'Türkmenistan',text:'Merv tarihî ve kültürel parkı UNESCO listesine 1999’da girdi.',source:'UNESCO'},
    {country:'Türkmenistan',text:'Türkmenistan, daimî tarafsızlık statüsünü 1995’te Birleşmiş Milletler kararıyla aldı.',source:'Birleşmiş Milletler'},
    {country:'Türkmenistan',text:'Aşkabat şehri 1881’de kuruldu.',source:'Türkmenistan Dışişleri Bakanlığı'},
    {country:'Türkmenistan',text:'Karakum Kanalı’nın yapımına 1954’te başlandı.',source:'Britannica'},
    {country:'Türkmenistan',text:'Ahal-Teke atı, Türkmenistan’ın ulusal mirasının önemli bir simgesidir.',source:'Türkmenistan Hükümeti'}
  ];

  const COUNTRY_BACKGROUNDS = {
    'Türkiye':'#4b1723',
    'Azerbaycan':'linear-gradient(115deg,#123d4b 0%,#16485a 48%,#4a3048 100%)',
    'Kazakistan':'linear-gradient(115deg,#173d51 0%,#1d5262 52%,#25415d 100%)',
    'Özbekistan':'linear-gradient(115deg,#243b56 0%,#31506a 48%,#493b59 100%)',
    'Kırgızistan':'#4b241f',
    'Türkmenistan':'linear-gradient(115deg,#174238 0%,#20564b 52%,#3d3f37 100%)'
  };

  const SKILL_OPTIONS = [...new Set(DEMO_USERS.flatMap(u => [...u.teach, ...u.learn]))].sort((a, b) => a.localeCompare(b, 'tr'));
  const LANG_OPTIONS = [...new Set(DEMO_USERS.flatMap(u => u.languages))];

  return {
    COUNTRIES,
    DEMO_USERS,
    ARTICLES_DEFAULT,
    worldLanguageCatalog,
    skillCatalog,
    UI_LANGUAGE_NAMES,
    FACTS,
    COUNTRY_BACKGROUNDS,
    SKILL_OPTIONS,
    LANG_OPTIONS,
    AI_CONFIG: { endpoint: '/api/ai' }
  };
})();
