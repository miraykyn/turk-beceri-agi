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
    const isMobile = window.innerWidth <= 768;
    const names = getUILanguageNames(lang);
    Array.from(select.options).forEach(opt => {
      if (isMobile) {
        opt.textContent = opt.value.toUpperCase();
      } else {
        if (names[opt.value]) opt.textContent = names[opt.value];
      }
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

    setTimeout(() => translateTree(document.body, lang, { online: false }), 0);
    if (queuedLanguage) {
      const next = queuedLanguage;
      queuedLanguage = null;
      applyLanguage(next);
    }
  }

  function init() {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('tda:v3:')).forEach(k => localStorage.removeItem(k));
    } catch (e) {}

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
      window.addEventListener('resize', () => updateTopLanguageLabels(currentLanguage));
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
        setTimeout(() => added.filter(n => !isExcluded(n)).forEach(n => translateTree(n, currentLanguage, { online: false })), 0);
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
    translate: (text) => Promise.resolve(text),
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
