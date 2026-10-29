/**
 * Türk Dünyası Beceri Ağı - Sekmeli Uygulama Mimarisi (Tabs & Shell)
 */

window.TDATabs = (function() {
  const tabKeys = ['tabHome', 'tabJourney', 'tabMatching', 'tabCommunity', 'tabArticles', 'tabMessages', 'tabStudy', 'tabProfile', 'tabTuran'];
  const quickItems = [
    { id: 'journey', titleKey: 'quickJourneyTitle', descKey: 'quickJourneySub' },
    { id: 'matching', titleKey: 'quickMatchingTitle', descKey: 'quickMatchingSub' },
    { id: 'study', titleKey: 'quickStudyTitle', descKey: 'quickStudySub' },
    { id: 'turan', titleKey: 'quickTuranTitle', descKey: 'quickTuranSub' }
  ];

  const tabIds = ['home', 'journey', 'matching', 'community', 'articles', 'messages', 'study', 'profile', 'turan'];
  let buttons = [];
  let panels = {};
  let quickContainer = null;
  let tabNav = null;

  function setLabels(lang = window.TDAI18n?.language || 'tr') {
    buttons.forEach((button, index) => {
      const k = tabKeys[index];
      const text = (window.TDAI18n ? window.TDAI18n.t(k) : '') || (k === 'tabMessages' ? 'Mektuplar' : button.textContent || '');
      if (button.dataset.tab === 'messages') {
        const unreadCount = window.TDAMessaging ? window.TDAMessaging.getUnreadCount() : 0;
        button.className = 'tab-button tab-button-mektuplar' + (button.classList.contains('active') ? ' active' : '');
        button.innerHTML = `
          <img src="assets/images/mektup-ikon.png" alt="" class="nav-mektup-icon">
          <span class="tab-btn-text">${text}</span>
          <span class="nav-mektup-badge" id="navTabUnreadBadge" style="${unreadCount > 0 ? '' : 'display:none'}">${unreadCount}</span>
        `;
      } else if (button.dataset.tab === 'study') {
        button.className = 'tab-button tab-button-study' + (button.classList.contains('active') ? ' active' : '');
        button.innerHTML = `
          <span class="nav-study-icon" aria-hidden="true">🎧</span>
          <span class="tab-btn-text">${text}</span>
        `;
      } else {
        button.textContent = text;
      }
    });
    if (tabNav) tabNav.setAttribute('aria-label', window.TDAI18n ? window.TDAI18n.t('tabAriaMain') : 'Ana bölümler');
    const toggle = document.getElementById('menuToggle');
    if (toggle) {
      const open = document.getElementById('mainNav')?.classList.contains('open');
      toggle.setAttribute('aria-label', open 
        ? (window.TDAI18n ? window.TDAI18n.t('menuCloseAria') : 'Menüyü kapat') 
        : (window.TDAI18n ? window.TDAI18n.t('menuOpenAria') : 'Menüyü aç'));
    }
  }

  function setQuickLabels(lang = window.TDAI18n?.language || 'tr') {
    if (!quickContainer) return;
    quickContainer.innerHTML = quickItems.map(item => {
      const title = window.TDAI18n ? window.TDAI18n.t(item.titleKey) : item.id;
      const desc = window.TDAI18n ? window.TDAI18n.t(item.descKey) : '';
      return `<button type="button" data-quick-tab="${item.id}">${title}<small>${desc}</small></button>`;
    }).join('');
    quickContainer.setAttribute('aria-label', window.TDAI18n ? window.TDAI18n.t('quickAria') : 'Hızlı erişim');
    quickContainer.querySelectorAll('[data-quick-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(button.dataset.quickTab));
    });
  }

  function setTab(id, updateHash = true) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!panels[id]) id = 'home';

    if (id === 'turan') {
      const originalPanel = document.getElementById('turanPanel');
      if (originalPanel) {
        originalPanel.classList.add('open');
        originalPanel.setAttribute('aria-hidden', 'false');
      }
    }

    buttons.forEach(button => {
      const active = button.dataset.tab === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      button.setAttribute('id', 'tab-button-' + button.dataset.tab);
      if (panels[button.dataset.tab]) {
        panels[button.dataset.tab].classList.toggle('active', active);
        panels[button.dataset.tab].setAttribute('aria-hidden', String(!active));
        panels[button.dataset.tab].setAttribute('aria-labelledby', 'tab-button-' + button.dataset.tab);
      }
    });

    const turanPanel = document.getElementById('turanPanel');
    if (turanPanel && id === 'turan') {
      turanPanel.classList.add('open');
      turanPanel.setAttribute('aria-hidden', 'false');
    }

    if (updateHash && history.replaceState) {
      history.replaceState(null, '', '#' + id);
    }

    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.remove('open');

    window.dispatchEvent(new CustomEvent('tda:tab-changed', { detail: { tab: id } }));
  }

  function initMobileNav() {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;

    const setMenuState = open => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open 
        ? (window.TDAI18n ? window.TDAI18n.t('menuCloseAria') : 'Menüyü kapat') 
        : (window.TDAI18n ? window.TDAI18n.t('menuOpenAria') : 'Menüyü aç'));
      toggle.textContent = open ? '×' : '☰';
    };

    toggle.addEventListener('click', e => {
      e.preventDefault();
      setMenuState(!nav.classList.contains('open'));
    });

    nav.addEventListener('click', event => {
      if (event.target.closest('a')) setMenuState(false);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('header')) setMenuState(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMenuState(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) setMenuState(false);
    });
  }

  function init() {
    if (document.body.dataset.tabShellReady === 'true') return;
    document.body.dataset.tabShellReady = 'true';

    const nav = document.getElementById('mainNav');
    const header = document.querySelector('header');
    if (!nav || !header) return;

    initMobileNav();

    const auth = nav.querySelector('.auth-actions');
    tabNav = document.createElement('div');
    tabNav.className = 'tab-nav';
    tabNav.setAttribute('role', 'tablist');
    tabNav.setAttribute('aria-label', 'Content sections');

    buttons = tabIds.map(id => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'tab-' + id);
      button.className = 'tab-button';
      button.addEventListener('click', () => setTab(id));
      tabNav.appendChild(button);
      return button;
    });

    nav.querySelectorAll(':scope > a').forEach(link => link.classList.add('legacy-nav-link'));
    nav.insertBefore(tabNav, auth || null);

    const app = document.createElement('main');
    app.id = 'tabApp';

    tabIds.forEach(id => {
      const panel = document.createElement('div');
      panel.id = 'tab-' + id;
      panel.className = 'tab-panel' + (id === 'home' ? ' active' : '');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', '');
      app.appendChild(panel);
      panels[id] = panel;
    });

    const hero = document.querySelector('.hero');
    const stack = {
      home: document.createElement('div'),
      journey: document.createElement('div'),
      matching: document.createElement('div'),
      community: document.createElement('div'),
      articles: document.createElement('div'),
      messages: document.createElement('div'),
      study: document.createElement('div'),
      profile: document.createElement('div')
    };
    Object.values(stack).forEach(node => { node.className = 'section-stack'; });
    if (hero) panels.home.appendChild(hero);

    const sectionOwners = {
      nasil: 'journey', yol: 'journey', eslesme: 'matching', topluluk: 'community', makaleler: 'articles', mektuplar: 'messages', 'calisma-odasi': 'study', study: 'study', profil: 'profile',
      puan: 'home', harita: 'home', ekip: 'home'
    };

    document.querySelectorAll('body > section').forEach(section => {
      const id = section.id;
      const owner = sectionOwners[id] || 'home';
      const target = stack[owner];
      if (target) {
        section.dataset.tabOwner = owner;
        target.appendChild(section);
      }
    });

    panels.home.appendChild(stack.home);
    panels.journey.appendChild(stack.journey);
    panels.matching.appendChild(stack.matching);
    panels.community.appendChild(stack.community);
    panels.articles.appendChild(stack.articles);
    panels.messages.appendChild(stack.messages);
    panels.study.appendChild(stack.study);
    panels.profile.appendChild(stack.profile);

    quickContainer = document.createElement('div');
    quickContainer.className = 'quick-access';
    quickContainer.setAttribute('aria-label', 'Quick access');
    panels.home.insertBefore(quickContainer, stack.home);

    header.after(app);

    tabNav.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
      setTab(buttons[next].dataset.tab);
    });

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.closest('#mainNav')) return;
      const target = document.querySelector(link.getAttribute('href'));
      if (!target || !target.closest('.tab-panel')) return;
      event.preventDefault();
      const panel = target.closest('.tab-panel');
      setTab(panel.id.replace('tab-', ''));
      requestAnimationFrame(() => {
        const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 12;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '');
      if (panels[hash]) {
        setTab(hash, false);
        return;
      }
      const target = document.getElementById(hash);
      if (target) {
        const panel = target.closest('.tab-panel');
        if (panel) setTab(panel.id.replace('tab-', ''), false);
      }
    });

    window.addEventListener('tda:unreadCountChanged', event => {
      const count = event.detail?.unread ?? 0;
      const badges = document.querySelectorAll('#navTabUnreadBadge, #navUnreadBadge');
      badges.forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'inline-block' : 'none';
      });
    });

    window.addEventListener('tda:languageChanged', event => {
      const lang = event.detail?.language || window.TDAI18n?.language || 'tr';
      setLabels(lang);
      setQuickLabels(lang);
    });

    const initLang = window.TDAI18n?.language || document.documentElement.lang || 'tr';
    setLabels(initLang);
    setQuickLabels(initLang);

    const initialHash = location.hash.replace('#', '');
    const initialTarget = initialHash && document.getElementById(initialHash);
    const initialPanel = initialTarget?.closest('.tab-panel');
    setTab(panels[initialHash] ? initialHash : (initialPanel ? initialPanel.id.replace('tab-', '') : 'home'), false);
  }

  return {
    init,
    setTab
  };
})();
