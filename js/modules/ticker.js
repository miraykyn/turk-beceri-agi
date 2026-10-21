/**
 * Türk Dünyası Beceri Ağı - Biliyor muydunuz? (Fact Ticker) & 3D Bayrak Kartları Modülü
 */

window.TDATicker = (function() {
  let timerId = null;
  let previous = -1;

  function initFlagCards() {
    document.querySelectorAll('.flag-card').forEach(card => {
      const toggleCard = () => {
        const isFlipped = card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', String(isFlipped));
      };
      card.addEventListener('click', toggleCard);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleCard();
        }
      });
    });
  }

  function fitMessage() {
    const message = document.getElementById('factTickerMessage');
    if (!message) return;
    const isMobile = window.matchMedia('(max-width:600px)').matches;
    const maximum = isMobile ? 15 : 18;
    const minimum = isMobile ? 11 : 13;
    message.style.fontSize = maximum + 'px';
    while (message.scrollHeight > message.clientHeight && parseFloat(message.style.fontSize) > minimum) {
      message.style.fontSize = (parseFloat(message.style.fontSize) - 0.5) + 'px';
    }
  }

  function showFact() {
    const facts = window.TDAConfig?.FACTS || [];
    const countryBackgrounds = window.TDAConfig?.COUNTRY_BACKGROUNDS || {};
    const ticker = document.getElementById('factTicker');
    const message = document.getElementById('factTickerMessage');
    const countryEl = document.getElementById('factTickerCountry');
    const textEl = document.getElementById('factTickerText');
    const sourceEl = document.getElementById('factTickerSource');

    if (!ticker || !message || !countryEl || !textEl || !sourceEl || !facts.length) return;

    let index = Math.floor(Math.random() * facts.length);
    while (facts.length > 1 && index === previous) {
      index = Math.floor(Math.random() * facts.length);
    }
    previous = index;
    const fact = facts[index];

    message.classList.remove('is-changing');
    void message.offsetWidth;

    const lang = window.TDAI18n?.language || 'tr';
    const translate = value => {
      if (!value) return Promise.resolve('');
      if (lang === 'tr') return Promise.resolve(value);
      const localVal = window.TDAI18n?.t ? window.TDAI18n.t(value, { fallback: null }) : null;
      if (localVal && localVal !== value && !localVal.startsWith('⟦MISSING:')) {
        return Promise.resolve(localVal);
      }
      return window.TDAI18n?.translate ? window.TDAI18n.translate(value, lang, 'tr') : Promise.resolve(value);
    };

    Promise.all([
      translate(fact.country),
      translate(fact.text),
      translate(fact.source)
    ]).then(([translatedCountry, translatedText, translatedSource]) => {
      if (index !== previous) return;
      countryEl.textContent = translatedCountry;
      textEl.textContent = translatedText;
      const srcPrefix = window.TDAI18n ? window.TDAI18n.t('factTickerSource') : (lang === 'tr' ? 'Kaynak: ' : 'Source: ');
      sourceEl.textContent = srcPrefix + translatedSource;
      window.requestAnimationFrame(fitMessage);
    });

    ticker.style.background = countryBackgrounds[fact.country] || '#18233b';
    message.classList.add('is-changing');
    window.requestAnimationFrame(fitMessage);
  }

  function init() {
    initFlagCards();

    showFact();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(showFact, 7500);

    window.addEventListener('resize', fitMessage);
    window.addEventListener('tda:languageChanged', () => showFact());
  }

  return {
    init,
    showFact
  };
})();
