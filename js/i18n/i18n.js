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
        const fb = (vars && typeof vars === 'object' && vars.fallback != null)
          ? vars.fallback
          : (typeof vars === 'string' ? vars : null);
        if (fb != null) {
          return String(fb).replace(/\{(\w+)\}/g, (_, k) => (vars && typeof vars === 'object' ? vars[k] ?? '' : ''));
        }
        return key;
      }
    }
    return String(val).replace(/\{(\w+)\}/g, (_, k) => (vars && typeof vars === 'object' ? vars[k] ?? '' : ''));
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

  function translateTextNode(node, lang) {
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
    }
  }

  function translateElementAttributes(el, lang) {
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
    nodes.forEach(n => { try { translateTextNode(n, lang); } catch (e) {} });

    const elements = [...(root.querySelectorAll ? root.querySelectorAll('*') : [])];
    elements.forEach(e => { try { translateElementAttributes(e, lang); } catch (e) {} });
  }

  function translateTree(root = document.body, lang = currentLanguage) {
    if (!root) return;
    translateBuiltInTree(root, lang);
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
      else el.textContent = t(key, { fallback: el.dataset.i18nTr || key });
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

    setTimeout(() => translateTree(document.body, lang), 0);
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
        setTimeout(() => added.filter(n => !isExcluded(n)).forEach(n => translateTree(n, currentLanguage)), 0);
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
    addUserContent: async (el) => {
      if (!el) return;
      el.dataset.userContent = '1';
      translateTree(el, currentLanguage);
    },
    register: async (el) => {
      if (!el) return;
      el.dataset.userContent = '1';
      translateTree(el, currentLanguage);
    }
  };
})();
