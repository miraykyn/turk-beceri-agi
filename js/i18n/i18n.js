/**
 * Türk Dünyası Beceri Ağı - Çoklu Dil (i18n) Çekirdek Motoru
 * data-i18n etiketleri, dinamik DOM çevirisi, form ve erişilebilirlik yerelleştirmesi
 */

window.TDAI18n = (function() {
  const supportedLanguages = ['tr', 'az', 'uz', 'kk', 'tk', 'ky', 'en'];
  let currentLanguage = 'tr';
  let applying = false;
  let queuedLanguage = null;

  const nodeRecords = new WeakMap();
  const attrRecords = new WeakMap();
  const translationCache = new Map();
  const translatableAttributes = ['placeholder', 'title', 'aria-label', 'alt', 'data-tooltip'];
  const excludedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const missingTranslations = new Map();

  const I18N = {};
  const translationRegistry = {};

  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function preserveWhitespace(original, translated) {
    const s = String(original);
    const lead = (s.match(/^\s*/) || [''])[0];
    const trail = (s.match(/\s*$/) || [''])[0];
    return lead + translated + trail;
  }

  function stableKey(text) {
    const s = cleanText(text);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'auto_' + (h >>> 0).toString(16).padStart(8, '0');
  }

  const STUDY_ROOM_I18N = {
    tabStudy: { tr: "Çalışma Odası", az: "İş Otağı", uz: "O‘qish Xonasi", kk: "Оқу Бөлмесі", tk: "Okuw Otagy", ky: "Окуу Бөлмөсү", en: "Study Room" },
    navStudy: { tr: "Çalışma Odası", az: "İş Otağı", uz: "O‘qish Xonasi", kk: "Оқу Бөлмесі", tk: "Okuw Otagy", ky: "Окуу Бөлмөсү", en: "Study Room" },
    quickStudyTitle: { tr: "Çalışma Odası", az: "İş Otağı", uz: "O‘qish Xonasi", kk: "Оқу Бөлмесі", tk: "Okuw Otagy", ky: "Окуу Бөлмөсү", en: "Study Room" },
    quickStudySub: { tr: "Pomodoro & Ortam Sesleri", az: "Pomodoro & Ətraf Səsləri", uz: "Pomodoro & Muhit Ovozlar", kk: "Помодоро & Фондық Дыбыстар", tk: "Pomodoro & Gurşaw Sesleri", ky: "Помодоро & Айлана Дыбыстары", en: "Pomodoro & Ambient Audio" },
    quickTuranSub: { tr: "Yapay Zekâ Desteği & Rehberlik", az: "Süni İntellekt Dəstəyi & Bələdçilik", uz: "Sun’iy Intellekt Yordami & Yo‘riqnoma", kk: "Жасанды Интеллект Қолдауы & Нұсқаулық", tk: "Emeli Aň Goldawy & Ýolbeletlik", ky: "Жасалма Интеллект Колдоосу & Багыттоо", en: "AI Support & Guidance" },
    profileNotice: { tr: "Beceri doğrulaması; sertifika ve öğrenci değerlendirmeleri ile yapılabilir.", az: "Bacarıq doğrulaması; sertifikat və tələbə qiymətləndirmələri ilə edilə bilər.", uz: "Ko‘nikmani tasdiqlash; sertifikat va talabalar baholashlari orqali amalga oshirilishi mumkin.", kk: "Дағдыны растау; сертификат және студенттердің бағалауы арқылы жүзеге асырылуы мүмкін.", tk: "Başarnygy tassyklamak; şahadatnama we talyp baha bermeleri arkaly amala aşyrylyp bilner.", ky: "Көндүмдү тастыктоо; сертификат жана студенттердин баалоосу аркылуу жүргүзүлүшү мүмкүн.", en: "Skill verification can be performed through certificates and student reviews." },
    articlePrototypeNotice: { tr: "Bu bir prototip olduğu için yazının içeriği şu an görüntülenememektedir.", az: "Bu bir prototip olduğu üçün yazının məzmunu hazırda göstərilə bilmir.", uz: "Bu prototip bo‘lgani uchun maqola matni hozircha ko‘rsatilmaydi.", kk: "Бұл прототип болғандықтан, мақаланың мазмұны қазір көрсетілмейді.", tk: "Bu prototip bolandygy üçin makalanyň mazmuny häzirlikçe görkezilmeýär.", ky: "Бул прототип болгондуктан, макаланын мазмуну азырынча көрсөтүлбөйт.", en: "Since this is a prototype, the content of the article cannot be displayed at the moment." },
    studyEyebrow: { tr: "DİJİTAL KÜTÜPHANE • ODAKLANMA ALANI", az: "RƏQƏMSAL KİTABXANA • DİQQƏT MƏRKƏZİ", uz: "RAQAMLI KUTUBXONA • DIQQAT MARKAZI", kk: "САНДЫҚ КІТАПХАНА • ЗЕЙІН ҚОЮ АЛАНЫ", tk: "SANLY KITAPHANA • ÜNS MERKEZI", ky: "САНАРИП КИТЕПКАНА • КӨҢҮЛ БУРУУ АЙМАГЫ", en: "DIGITAL LIBRARY • FOCUS SPACE" },
    studyTitle: { tr: "Sanal Çalışma Odası", az: "Virtual İş Otağı", uz: "Virtual O‘qish Xonasi", kk: "Виртуалды Оқу Бөлмесі", tk: "Wirtual Okuw Otagy", ky: "Виртуалдуу Окуу Бөлмөсү", en: "Virtual Study Room" },
    studySubtitle: { tr: "Kendi oluşturduğun Bitmoji avatarınla çalışma masana geç, Pomodoro zamanlayıcı, yapılacak hedefler ve rahatlatıcı ortam sesleriyle odaklan.", az: "Öz yaratdığın Bitmoji avatarınla iş masana keç, Pomodoro sayğacı və sakitləşdirici fon səsləri ilə diqqətini topla.", uz: "O‘zingiz yaratgan Bitmoji avatar bilan ish stolingizga o‘tiring, Pomodoro taymeri va tinchlantiruvchi ovozlar bilan diqqatni jamlang.", kk: "Өзің жасаған Bitmoji аватарыңмен оқу үстеліңе отыр, Помодоро таймері және фондық дыбыстармен зейін қой.", tk: "Öz döreden Bitmoji awataryň bilen okuw stoluňa geç, Pomodoro wagty we dynç alyş sesleri bilen ünsüňi jemle.", ky: "Өзүң жараткан Bitmoji аватарың менен окуу столуңа отур, Помодоро таймери жана айлана дабыштары менен көңүл бур.", en: "Sit at your study desk with your personalized Bitmoji avatar, focus with Pomodoro timer, goals and soothing ambient sounds." },
    pomodoroWork: { tr: "Odaklanma", az: "Diqqət", uz: "Fokus", kk: "Зейін", tk: "Üns", ky: "Көңүл", en: "Focus" },
    pomodoroShortBreak: { tr: "Kısa Mola", az: "Qısa Fasilə", uz: "Qisqa Tanaffus", kk: "Қысқа Үзіліс", tk: "Gysga Arakesme", ky: "Кыска Тыныгуу", en: "Short Break" },
    pomodoroLongBreak: { tr: "Uzun Mola", az: "Uzun Fasilə", uz: "Uzoq Tanaffus", kk: "Ұзақ Үзіліс", tk: "Uzak Arakesme", ky: "Узак Тыныгуу", en: "Long Break" },
    todosTitle: { tr: "Günlük Hedefler ve Görevler", az: "Gündəlik Hədəflər və Tapşırıqlar", uz: "Kunlik Maqsadlar va Vazifalar", kk: "Күнделікті Мақсаттар мен Тапсырмалар", tk: "Gündelik Maksatlar we Tabşyryklar", ky: "Күндөлүк Максаттар жана Тапшырмалар", en: "Daily Goals & Tasks" },
    ambientTitle: { tr: "Ortam Sesleri Mikseri", az: "Ətraf Səsləri Mikseri", uz: "Muhit Ovozlar Mikseri", kk: "Фондық Дыбыс Миксері", tk: "Gurşaw Sesleri Mikseri", ky: "Айлана Үндөр Миксери", en: "Ambient Audio Mixer" },
    editAvatarTooltip: { tr: "Bitmoji Avatarımı Özelleştir", az: "Bitmoji Avatarımı Fərdiləşdir", uz: "Bitmoji Avatarimni O‘zgartirish", kk: "Bitmoji Аватарымды Баптау", tk: "Bitmoji Awatarymy Sazla", ky: "Bitmoji Аватарымды Ырастоо", en: "Customize My Bitmoji Avatar" }
  };

  const MESSAGING_I18N = {
    tabMessages: { tr: "Mektuplar", az: "Məktublar", uz: "Maktublar", kk: "Хаттар", tk: "Hatlar", ky: "Каттар", en: "Letters" },
    navLetters: { tr: "Mektuplar", az: "Məktublar", uz: "Maktublar", kk: "Хаттар", tk: "Hatlar", ky: "Каттар", en: "Letters" },
    messagingEyebrow: { tr: "DİJİTAL MEKTUPLAŞMA • SINIR ÖTESİ HABERLEŞME", az: "RƏQƏMSAL MƏKTUBLAŞMA • SƏRHƏDLƏRARASI XƏBƏRLƏŞMƏ", uz: "RAQAMLI MAKTUBLASHUV • CHEGARALARARO ALOQA", kk: "САНДЫҚ ХАТ АЛМАСУ • ШЕКАРААРАЛЫҚ БАЙЛАНЫС", tk: "SANLY HAT ALYŞYGY • SERHETARA HABARLAŞYK", ky: "САНАРИП КАТ АЛЫШУУ • ЧЕК АРАСЫЗ БАЙЛАНЫШ", en: "DIGITAL CORRESPONDENCE • CROSS-BORDER COMMUNICATION" },
    messagingTitle: { tr: "Sınır Ötesi Mektuplaşma", az: "Sərhədlərarası Məktublaşma", uz: "Chegaralararo Maktublashuv", kk: "Шекарааралық Хат Алмасу", tk: "Serhetara Hat Alyşygy", ky: "Чек Арасыз Кат Алмашуу", en: "Cross-Border Letter Exchange" },
    messagingSubtitle: { tr: "Türk Dünyası'ndaki 7 bağımsız devletin öğrencileri arasında dostluk, beceri takası ve kültürel miras mektuplaşması. Mektubunu yaz, seçtiğin Türk devletinin hatıra pulu ve dostluk mührüyle sınırları aş.", az: "Türk Dünyasındakı 7 müstəqil dövlətin tələbələri arasında dostluq, bacarıq mübadiləsi və mədəni irs məktublaşması.", uz: "Turk Dunyosidagi 7 ta mustaqil davlat talabalari o‘rtasida do‘stlik, ko‘nikmalar almashinuvi va madaniy meros maktublashuvi.", kk: "Түркі Әлеміндегі 7 тәуелсіз мемлекет студенттері арасындағы достық, дағды алмасу және мәдени мұра хат алмасуы.", tk: "Türk Dünýäsindäki 7 garaşsyz döwletiň talyplarynyň arasynda dostluk, başarnyk alyş-çalşygy we medeni miras hat alyşygy.", ky: "Түрк Дүйнөсүндөгү 7 көз карандысыз мамлекеттин студенттеринин ортосундагы достук, көндүм алмашуу жана маданий мурас кат алышуусу.", en: "Friendship, skill exchange, and cultural heritage correspondence among students across the 7 independent Turkic states." },
    inbox: { tr: "Gelen Kutusu", az: "Gələnlər Qutusu", uz: "Kiruvchi Xatlar", kk: "Кіріс Қорабы", tk: "Gelen Hatlar", ky: "Кирүүчү Куту", en: "Inbox" },
    sent: { tr: "Gönderilenler", az: "Göndərilənlər", uz: "Yuborilgan Xatlar", kk: "Жіберілгендер", tk: "Ugradylan Hatlar", ky: "Жөнөтүлгөндөр", en: "Sent" },
    newLetter: { tr: "Yeni Mektup Yaz", az: "Yeni Məktub Yaz", uz: "Yangi Maktub Yozish", kk: "Жаңа Хат Жазу", tk: "Täze Hat Ýaz", ky: "Жаңы Кат Жазуу", en: "Write New Letter" },
    recipientStudentId: { tr: "Alıcı Öğrenci ID veya E-posta", az: "Qəbul edən Tələbə ID və ya E-poçt", uz: "Qabul qiluvchi Talaba ID yoki Elektron pochta", kk: "Алушы Студент ID немесе Электрондық пошта", tk: "Alyjy Talyp ID ýa-da E-poçta", ky: "Алуучу Студент ID же Электрондук почта", en: "Recipient Student ID or Email" },
    letterSubject: { tr: "Mektup Konusu", az: "Məktubun Mövzusu", uz: "Maktub Mavzusi", kk: "Хат Тақырыбы", tk: "Hatyň Temasy", ky: "Каттын Темасы", en: "Letter Subject" },
    letterBody: { tr: "Mektubunuz (Hitap, Düşünceleriniz ve Beceri Talebiniz)", az: "Məktubunuz (Müraciət, Fikirləriniz və Bacarıq Tələbiniz)", uz: "Maktubingiz (Murojaat, Fikrlaringiz va Ko‘nikma Talabingiz)", kk: "Хатыңыз (Қарату, Ойларыңыз және Дағды Тілегіңіз)", tk: "Hatyňyz (Ýüzlenme, Pikirleriňiz we Başarnyk Islegiňiz)", ky: "Катыңыз (Кайрылуу, Ойлоруңуз жана Көндүм Талабыңыз)", en: "Your Letter (Salutation, Thoughts & Skill Request)" },
    selectStamp: { tr: "Devlet Pulu & Kültür Mührü Seç", az: "Dövlət Markası & Mədəniyyət Möhürü Seç", uz: "Davlat Markasi & Madaniyat Muhrini Tanlash", kk: "Мемлекеттік Марка & Мәдениет Мөрін Таңдау", tk: "Döwlet Markasy & Medeniýet Möhrüni Saýla", ky: "Мамлекеттик Марка & Маданият Мөөрүн Тандоо", en: "Select State Stamp & Cultural Seal" },
    sendLetterBtn: { tr: "Mektubu Mühürle ve Gönder", az: "Məktubu Möhürlə və Göndər", uz: "Maktubni Muhrlab Yuborish", kk: "Хатты Мөрлеп Жіберу", tk: "Haty Möhürläp Ugrat", ky: "Катты Мөөр басып Жөнөтүү", en: "Seal and Send Letter" }
  };

  function initRegistries() {
    supportedLanguages.forEach(lang => {
      I18N[lang] = I18N[lang] || {};
      const dict = (window.TDA_I18N_DATA?.resources && window.TDA_I18N_DATA.resources[lang])
        || (window.TDA_TRANSLATIONS && window.TDA_TRANSLATIONS[lang])
        || {};
      for (const [source, value] of Object.entries(dict)) {
        const k = stableKey(source);
        I18N[lang][k] = value;
        I18N[lang][source] = value;
        translationRegistry[source] = k;
      }
    });

    for (const [key, trans] of Object.entries(MESSAGING_I18N)) {
      supportedLanguages.forEach(lang => {
        const v = trans[lang] || trans['tr'];
        const sk = stableKey(key);
        I18N[lang][key] = v;
        I18N[lang][sk] = v;
        translationRegistry[key] = sk;
      });
    }

    for (const [key, trans] of Object.entries(STUDY_ROOM_I18N)) {
      supportedLanguages.forEach(lang => {
        const v = trans[lang] || trans['tr'];
        const sk = stableKey(key);
        I18N[lang][key] = v;
        I18N[lang][sk] = v;
        translationRegistry[key] = sk;
      });
    }
  }

  function t(key, vars = {}) {
    const lang = currentLanguage || 'tr';
    let val = I18N[lang]?.[key];
    if (val == null) {
      const hashed = translationRegistry[key];
      if (hashed && I18N[lang]?.[hashed] != null) {
        val = I18N[lang][hashed];
      }
    }
    if (val == null) {
      const cleaned = cleanText(key);
      val = I18N[lang]?.[cleaned]
        || (translationRegistry[cleaned] && I18N[lang]?.[translationRegistry[cleaned]])
        || I18N[lang]?.[cleaned.toLowerCase()]
        || (translationRegistry[cleaned.toLowerCase()] && I18N[lang]?.[translationRegistry[cleaned.toLowerCase()]]);
    }
    if (val == null) {
      // Check Turkish dictionary as ultimate fallback
      val = I18N.tr?.[key] || (translationRegistry[key] && I18N.tr?.[translationRegistry[key]]);
      if (val == null) {
        const cleaned = cleanText(key);
        val = I18N.tr?.[cleaned] || (translationRegistry[cleaned] && I18N.tr?.[translationRegistry[cleaned]]);
      }
      if (val == null) {
        missingTranslations.set(`${lang}:${key}`, true);
        return vars.fallback != null ? vars.fallback : key;
      }
    }
    return String(val).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  }

  function getDictionaryTranslation(text, lang) {
    const exact = cleanText(text);
    if (lang === 'tr') return text;
    const key = translationRegistry[exact] || stableKey(exact);
    let val = I18N[lang]?.[key] || I18N[lang]?.[exact];
    if (val == null) {
      const lower = exact.toLowerCase();
      const lowerKey = translationRegistry[lower] || stableKey(lower);
      val = I18N[lang]?.[lowerKey] || I18N[lang]?.[lower];
    }
    if (val != null) return preserveWhitespace(text, val);
    return null;
  }

  function cacheKey(sl, tl, text) {
    return `tda:v3:${sl}:${tl}:${text}`;
  }

  function loadCached(sl, tl, text) {
    const k = cacheKey(sl, tl, text);
    if (translationCache.has(k)) return translationCache.get(k);
    try {
      const v = localStorage.getItem(k);
      if (v) {
        translationCache.set(k, v);
        return v;
      }
    } catch (e) {}
    return null;
  }

  function saveCached(sl, tl, text, value) {
    const k = cacheKey(sl, tl, text);
    translationCache.set(k, value);
    try { localStorage.setItem(k, value); } catch (e) {}
  }

  async function onlineTranslate(text, targetLang, sourceLang = 'auto') {
    text = cleanText(text);
    if (!text || targetLang === sourceLang) return text;
    const cached = loadCached(sourceLang, targetLang, text);
    if (cached) return cached;
    const sl = (sourceLang || 'auto').split('-')[0];
    const tl = (targetLang || 'tr').split('-')[0];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + encodeURIComponent(sl) + '&tl=' + encodeURIComponent(tl) + '&dt=t&q=' + encodeURIComponent(text);
      const r = await fetch(url, { cache: 'force-cache', signal: controller.signal, headers: { 'Accept': 'application/json; charset=utf-8' } });
      if (!r.ok) throw new Error('translate error');
      const data = await r.json();
      const parts = data?.[0] || [];
      const out = parts.map(x => x?.[0] || '').join('').trim();
      if (out) {
        saveCached(sourceLang, targetLang, text, out);
        return out;
      }
    } catch (e) {} finally {
      clearTimeout(timer);
    }
    return text;
  }

  function rememberTextNode(node) {
    if (!nodeRecords.has(node)) nodeRecords.set(node, { source: node.nodeValue });
    return nodeRecords.get(node).source;
  }

  function rememberAttribute(el, attr) {
    let r = attrRecords.get(el);
    if (!r) { r = {}; attrRecords.set(el, r); }
    if (!(attr in r)) r[attr] = el.getAttribute(attr);
    return r[attr];
  }

  function isExcluded(el) {
    return !el || excludedTags.has(el.tagName) || !!el.closest('[data-no-translate]');
  }

  async function translateTextNode(node, lang, allowOnline = false) {
    if (!node?.parentElement || isExcluded(node.parentElement) || node.parentElement.hasAttribute('data-i18n')) return;
    const source = rememberTextNode(node);
    if (!cleanText(source)) return;
    if (lang === 'tr') {
      if (node.nodeValue !== source) node.nodeValue = source;
      return;
    }
    const dict = getDictionaryTranslation(source, lang);
    if (dict !== null) {
      if (node.nodeValue !== dict) node.nodeValue = dict;
      return;
    }
    if (!allowOnline) return;
    const sourceLang = node.parentElement.closest('[data-source-lang]')?.dataset.sourceLang || 'auto';
    const out = await onlineTranslate(source, lang, sourceLang);
    if (out !== source && node.isConnected) node.nodeValue = preserveWhitespace(source, out);
  }

  async function translateElementAttributes(el, lang, allowOnline = false) {
    if (!el || isExcluded(el)) return;
    for (const attr of translatableAttributes) {
      if (!el.hasAttribute(attr)) continue;
      const source = rememberAttribute(el, attr);
      if (source == null) continue;
      if (lang === 'tr') {
        if (el.getAttribute(attr) !== source) el.setAttribute(attr, source);
        continue;
      }
      const dict = getDictionaryTranslation(source, lang);
      if (dict !== null) {
        if (el.getAttribute(attr) !== dict.trim()) el.setAttribute(attr, dict.trim());
      } else if (allowOnline) {
        const sourceLang = el.dataset.sourceLang || 'auto';
        const out = await onlineTranslate(source, lang, sourceLang);
        if (out !== source && el.isConnected) el.setAttribute(attr, out);
      }
    }
  }

  function updateDataI18nElements(root = document.body, lang = currentLanguage) {
    if (!root) return;
    root.querySelectorAll?.('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (!key) return;
      if (!el.dataset.i18nOriginal) el.dataset.i18nOriginal = el.textContent;
      el.textContent = t(key, { fallback: el.dataset.i18nOriginal });
    });

    root.querySelectorAll?.('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (!key) return;
      if (!el.dataset.i18nOriginalPlaceholder) el.dataset.i18nOriginalPlaceholder = el.getAttribute('placeholder') || '';
      el.setAttribute('placeholder', t(key, { fallback: el.dataset.i18nOriginalPlaceholder }));
    });

    root.querySelectorAll?.('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      if (!key) return;
      if (!el.dataset.i18nOriginalAria) el.dataset.i18nOriginalAria = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', t(key, { fallback: el.dataset.i18nOriginalAria }));
    });

    root.querySelectorAll?.('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (!key) return;
      if (!el.dataset.i18nOriginalTitle) el.dataset.i18nOriginalTitle = el.getAttribute('title') || '';
      el.setAttribute('title', t(key, { fallback: el.dataset.i18nOriginalTitle }));
    });
  }

  function translateBuiltInTree(root = document.body, lang = currentLanguage) {
    if (!root) return;
    updateDataI18nElements(root, lang);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => !n.nodeValue.trim() || isExcluded(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { try { translateTextNode(n, lang, false); } catch (e) {} });

    const elements = [...(root.querySelectorAll ? root.querySelectorAll('*') : [])];
    elements.forEach(e => { try { translateElementAttributes(e, lang, false); } catch (e) {} });
  }

  async function translateTree(root = document.body, lang = currentLanguage, options = {}) {
    if (!root) return;
    const online = options.online !== false;
    translateBuiltInTree(root, lang);
    if (!online || lang === 'tr') return;

    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => !n.nodeValue.trim() || isExcluded(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);

    const elements = [...(root.querySelectorAll ? root.querySelectorAll('*') : [])];
    const jobs = [];
    nodes.forEach(n => {
      if (getDictionaryTranslation(rememberTextNode(n), lang) === null) {
        jobs.push(() => translateTextNode(n, lang, true));
      }
    });
    elements.forEach(e => translatableAttributes.forEach(attr => {
      if (e.hasAttribute(attr) && getDictionaryTranslation(rememberAttribute(e, attr), lang) === null) {
        jobs.push(() => translateElementAttributes(e, lang, true));
      }
    }));

    let cursor = 0;
    async function worker() {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        try { await job(); } catch (e) {}
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  function getUILanguageNames(lang = currentLanguage) {
    const data = window.TDA_I18N_DATA?.uiLanguageNames || window.TDAConfig?.UI_LANGUAGE_NAMES || {};
    return data[lang] || data.tr || {};
  }

  function updateTopLanguageLabels(lang = currentLanguage) {
    const select = document.getElementById('languageSelect');
    if (!select) return;
    const names = getUILanguageNames(lang);
    Array.from(select.options).forEach(opt => {
      if (names[opt.value]) opt.textContent = names[opt.value];
    });
    select.setAttribute('aria-label', t('Dil seçimi', { fallback: (lang === 'tr' ? 'Dil seçimi' : 'Language selection') }));
  }

  function updateRuntimeUI(root, lang) {
    root.querySelectorAll?.('[data-i18n-key]').forEach(el => {
      const key = el.dataset.i18nKey;
      if (lang === 'tr') el.textContent = el.dataset.i18nTr || key;
      else el.textContent = t(key);
    });
  }

  async function applyLanguage(lang) {
    if (!supportedLanguages.includes(lang)) lang = 'tr';
    if (applying) {
      queuedLanguage = lang;
      return;
    }
    applying = true;
    currentLanguage = lang;
    document.documentElement.lang = lang;
    document.documentElement.dataset.language = lang;

    const sel = document.getElementById('languageSelect');
    if (sel) sel.value = lang;
    updateTopLanguageLabels(lang);

    translateBuiltInTree(document.body, lang);
    document.querySelectorAll('[data-runtime-ui]').forEach(el => updateRuntimeUI(el, lang));

    applying = false;
    try { localStorage.setItem('tda-language', lang); } catch (e) {}
    window.dispatchEvent(new CustomEvent('tda:languageChanged', { detail: { language: lang } }));

    setTimeout(() => translateTree(document.body, lang, { online: true }), 0);
    if (queuedLanguage) {
      const next = queuedLanguage;
      queuedLanguage = null;
      applyLanguage(next);
    }
  }

  function init() {
    initRegistries();
    let saved = 'tr';
    try { saved = localStorage.getItem('tda-language') || 'tr'; } catch (e) {}
    if (!supportedLanguages.includes(saved)) saved = 'tr';
    currentLanguage = saved;
    document.documentElement.lang = currentLanguage;

    const sel = document.getElementById('languageSelect');
    if (sel) {
      sel.value = currentLanguage;
      updateTopLanguageLabels(currentLanguage);
      sel.addEventListener('change', () => applyLanguage(sel.value));
    }

    const observer = new MutationObserver(mutations => {
      if (applying) return;
      const added = [];
      for (const m of mutations) {
        for (const n of m.addedNodes || []) {
          if (n.nodeType === 1) added.push(n);
        }
      }
      if (added.length) {
        setTimeout(() => added.filter(n => !isExcluded(n)).forEach(n => translateTree(n, currentLanguage, { online: true })), 0);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => translateBuiltInTree(document.body, currentLanguage), 0);
  }

  return {
    init,
    get language() { return currentLanguage; },
    get languages() { return supportedLanguages.slice(); },
    t,
    setLanguage: applyLanguage,
    translate: (text, target, source = 'auto') => onlineTranslate(text, target, source),
    addUserContent: async (el, sourceLang = 'auto') => {
      if (!el) return;
      el.dataset.sourceLang = sourceLang;
      el.dataset.userContent = '1';
      await translateTree(el, currentLanguage);
    },
    register: async (el, sourceLang = 'auto') => {
      if (!el) return;
      el.dataset.sourceLang = sourceLang;
      el.dataset.userContent = '1';
      await translateTree(el, currentLanguage);
    }
  };
})();
