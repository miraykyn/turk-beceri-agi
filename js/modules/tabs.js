/**
 * Türk Dünyası Beceri Ağı - Sekmeli Uygulama Mimarisi (Tabs & Shell)
 */

window.TDATabs = (function() {
  const navTabs = [
    { key: 'tabHome', id: 'home' },
    { key: 'tabJourney', id: 'journey' },
    { key: 'tabMatching', id: 'matching' },
    { key: 'tabCommunity', id: 'community' },
    { key: 'tabArticles', id: 'articles' },
    { key: 'tabMessages', id: 'messages' },
    { key: 'tabStudy', id: 'study' },
    { key: 'tabWordGame', id: 'wordgame' },
    { key: 'tabCulture', id: 'culture' }
  ];
  const tabKeys = navTabs.map(t => t.key);
  const tabIds = navTabs.map(t => t.id);
  const allPanelIds = ['home', 'journey', 'matching', 'community', 'articles', 'messages', 'study', 'wordgame', 'culture', 'profile', 'turan'];
  const quickItems = [
    { id: 'journey', titleKey: 'quickJourneyTitle', descKey: 'quickJourneySub' },
    { id: 'matching', titleKey: 'quickMatchingTitle', descKey: 'quickMatchingSub' },
    { id: 'study', titleKey: 'quickStudyTitle', descKey: 'quickStudySub' },
    { id: 'wordgame', titleKey: 'quickWordGameTitle', descKey: 'quickWordGameSub' },
    { id: 'culture', titleKey: 'quickCultureTitle', descKey: 'quickCultureSub' },
    { id: 'turan', titleKey: 'quickTuranTitle', descKey: 'quickTuranSub' }
  ];
  let buttons = [];
  let panels = {};
  let quickContainer = null;
  let tabNav = null;

  function setLabels(lang = window.TDAI18n?.language || 'tr') {
    buttons.forEach((button, index) => {
      const k = tabKeys[index];
      const text = (window.TDAI18n ? window.TDAI18n.t(k) : '') || (k === 'tabMessages' ? 'Mektuplar' : (k === 'tabCulture' ? 'Dijital Kültür Arşivi' : button.textContent || ''));
      if (button.dataset.tab === 'messages') {
        const unreadCount = window.TDAMessaging ? window.TDAMessaging.getUnreadCount() : 0;
        button.className = 'tab-button tab-button-mektuplar' + (button.classList.contains('active') ? ' active' : '');
        button.innerHTML = `
          <img src="assets/images/mektup-ikon.png" alt="" class="nav-mektup-icon">
          <span class="tab-btn-text">${text}</span>
          <span class="nav-mektup-badge" id="navTabUnreadBadge" style="${unreadCount > 0 ? '' : 'display:none'}">${unreadCount}</span>
        `;
        const mobileBadge = document.getElementById('mobileMailUnreadBadge');
        if (mobileBadge) {
          mobileBadge.textContent = unreadCount;
          mobileBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
      } else if (button.dataset.tab === 'study') {
        button.className = 'tab-button tab-button-study' + (button.classList.contains('active') ? ' active' : '');
        button.innerHTML = `
          <span class="nav-study-icon" aria-hidden="true">🎧</span>
          <span class="tab-btn-text">${text}</span>
        `;
      } else if (button.dataset.tab === 'wordgame') {
        button.className = 'tab-button tab-button-wordgame' + (button.classList.contains('active') ? ' active' : '');
        button.innerHTML = `
          <span class="nav-wordgame-icon" aria-hidden="true">🎮</span>
          <span class="tab-btn-text">${text || 'Kelime Oyunu'}</span>
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

    const mobileMailBtn = document.getElementById('mobileMailBtn');
    if (mobileMailBtn) {
      mobileMailBtn.classList.toggle('active', id === 'messages');
    }

    setMobileMenuOpen(false);

    window.dispatchEvent(new CustomEvent('tda:tab-changed', { detail: { tab: id } }));
  }

  function setMobileMenuOpen(open) {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    const backdrop = document.getElementById('mobileNavBackdrop');
    if (nav) nav.classList.toggle('open', open);
    if (backdrop) {
      backdrop.classList.toggle('open', open);
      backdrop.setAttribute('aria-hidden', String(!open));
    }
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open 
        ? (window.TDAI18n ? window.TDAI18n.t('menuCloseAria') : 'Menüyü kapat') 
        : (window.TDAI18n ? window.TDAI18n.t('menuOpenAria') : 'Menüyü aç'));
      toggle.textContent = open ? '×' : '☰';
    }
  }

  function initMobileNav() {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const mobileMailBtn = document.getElementById('mobileMailBtn');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', e => {
      e.preventDefault();
      setMobileMenuOpen(!nav.classList.contains('open'));
    });

    if (mobileMailBtn) {
      mobileMailBtn.addEventListener('click', e => {
        e.preventDefault();
        setMobileMenuOpen(false);
        setTab('messages');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        setMobileMenuOpen(false);
      });
    }

    nav.addEventListener('click', event => {
      if (event.target.closest('a, button')) setMobileMenuOpen(false);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('header') && !event.target.closest('#mobileNavBackdrop')) {
        setMobileMenuOpen(false);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
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

    allPanelIds.forEach(id => {
      const panel = document.createElement('div');
      panel.id = 'tab-' + id;
      panel.className = 'tab-panel' + (id === 'home' ? ' active' : '');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', '');
      app.appendChild(panel);
      panels[id] = panel;
    });

    const ticker = document.getElementById('factTicker');
    const flagCards = document.getElementById('flagCards');
    const hero = document.querySelector('.hero');
    const stack = {
      home: document.createElement('div'),
      journey: document.createElement('div'),
      matching: document.createElement('div'),
      wordgame: document.createElement('div'),
      community: document.createElement('div'),
      articles: document.createElement('div'),
      culture: document.createElement('div'),
      messages: document.createElement('div'),
      study: document.createElement('div'),
      profile: document.createElement('div')
    };
    Object.values(stack).forEach(node => { node.className = 'section-stack'; });
    if (ticker) panels.home.appendChild(ticker);
    if (flagCards) panels.home.appendChild(flagCards);
    if (hero) panels.home.appendChild(hero);

    const sectionOwners = {
      nasil: 'journey', eslesme: 'matching', 'kelime-oyunu': 'wordgame', wordgame: 'wordgame',
      topluluk: 'community', makaleler: 'articles',
      'kultur-arsivi': 'culture', culture: 'culture',
      mektuplar: 'messages', 'calisma-odasi': 'study', study: 'study', profil: 'profile',
      puan: 'home', harita: 'home', ekip: 'home'
    };

    document.querySelectorAll('body > section').forEach(section => {
      const id = section.id;
      if (id === 'flagCards') return;
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
    panels.wordgame.appendChild(stack.wordgame);
    panels.community.appendChild(stack.community);
    panels.articles.appendChild(stack.articles);
    panels.culture.appendChild(stack.culture);
    panels.messages.appendChild(stack.messages);
    panels.study.appendChild(stack.study);
    panels.profile.appendChild(stack.profile);

    quickContainer = document.createElement('div');
    quickContainer.className = 'quick-access';
    quickContainer.setAttribute('aria-label', 'Quick access');
    panels.home.insertBefore(quickContainer, stack.home);

    header.after(app);

    const logoLink = document.getElementById('siteLogoLink') || document.querySelector('.logo');
    if (logoLink) {
      logoLink.addEventListener('click', e => {
        e.preventDefault();
        setTab('home');
      });
    }

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
      const hash = location.hash.replace('#', '').split('?')[0];
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
      const badges = document.querySelectorAll('#navTabUnreadBadge, #navUnreadBadge, #mobileMailUnreadBadge');
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

    const initialHash = location.hash.replace('#', '').split('?')[0];
    const initialTarget = initialHash && document.getElementById(initialHash);
    const initialPanel = initialTarget?.closest('.tab-panel');
    setTab(panels[initialHash] ? initialHash : (initialPanel ? initialPanel.id.replace('tab-', '') : 'home'), false);
  }

  return {
    init,
    setTab
  };
})();
