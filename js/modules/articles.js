/**
 * Türk Dünyası Beceri Ağı - Öğrenci Makaleleri & İçerik Modülü
 */

window.TDAArticles = (function() {
  const $ = id => document.getElementById(id);

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));
  }

  function readJSON(k, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  }

  function featureT(k, vars = {}) {
    return window.TDAI18n?.t(k, vars) || k;
  }

  function countryLabel(c) {
    return window.TDAI18n?.t(c, { fallback: c }) || c;
  }

  function ensureArticleModal() {
    let backdrop = $('articleDetailModal');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'articleDetailModal';
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
      <div class="modal article-detail-modal">
        <div class="modal-head">
          <h2 id="articleModalTitle"></h2>
          <button type="button" class="close-btn" id="articleModalClose" aria-label="Kapat">×</button>
        </div>
        <div class="article-modal-meta">
          <span class="article-country" id="articleModalCountryCategory"></span>
          <div class="article-byline" id="articleModalByline"></div>
        </div>
        <div class="uyari article-prototype-notice" id="articleModalNotice" data-i18n="articlePrototypeNotice">
          Bu bir prototip olduğu için yazının içeriği şu an görüntülenememektedir.
        </div>
        <div class="form-actions" style="margin-top:18px">
          <button type="button" class="btn primary" id="articleModalCloseBtn" data-i18n="close">Kapat</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const closeModal = () => {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
    };

    backdrop.querySelector('#articleModalClose')?.addEventListener('click', closeModal);
    backdrop.querySelector('#articleModalCloseBtn')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) closeModal();
    });

    return backdrop;
  }

  function openArticleDetail(article) {
    const backdrop = ensureArticleModal();
    const titleEl = $('articleModalTitle');
    const metaEl = $('articleModalCountryCategory');
    const bylineEl = $('articleModalByline');
    const noticeEl = $('articleModalNotice');
    const dateStr = new Date(article.createdAt || Date.now()).toLocaleDateString(window.TDAI18n?.getLocale ? window.TDAI18n.getLocale() : undefined);

    if (titleEl) titleEl.textContent = featureT(article.title, { fallback: article.title });
    if (metaEl) metaEl.textContent = `${countryLabel(article.country)} · ${featureT(article.category, { fallback: article.category })}`;
    if (bylineEl) bylineEl.textContent = `${article.author} · ${dateStr}`;
    if (noticeEl) {
      noticeEl.textContent = featureT('articlePrototypeNotice', {
        fallback: 'Bu bir prototip olduğu için yazının içeriği şu an görüntülenememektedir.'
      });
    }

    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  function renderArticles() {
    const tabs = $('articleTabs');
    const grid = $('articleGrid');
    if (!tabs || !grid) return;

    const selected = tabs.dataset.selected || '';
    tabs.innerHTML = '';

    const countries = window.TDAConfig?.COUNTRIES || [];
    const all = [{ name: '', label: featureT('allArticles') }, ...countries.map(c => ({ name: c.name, label: countryLabel(c.name) }))];

    all.forEach(x => {
      const b = document.createElement('button');
      b.className = 'article-tab' + (x.name === selected ? ' active' : '');
      b.textContent = x.label;
      b.onclick = () => {
        tabs.dataset.selected = x.name;
        renderArticles();
      };
      tabs.appendChild(b);
    });

    const articlesDefault = window.TDAConfig?.ARTICLES_DEFAULT || [];
    const articles = readJSON('tda-articles', articlesDefault);
    const filtered = selected ? articles.filter(a => a.country === selected) : articles;

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state">${featureT('noArticles')}</div>`;
      return;
    }

    const displayList = filtered.slice().reverse();
    grid.innerHTML = displayList.map((a, idx) => `
      <article class="article-card" role="button" tabindex="0" data-article-idx="${idx}">
        <h3>${escapeHtml(featureT(a.title, { fallback: a.title }))}</h3>
        <div class="article-country">${escapeHtml(countryLabel(a.country))} · ${escapeHtml(featureT(a.category, { fallback: a.category }))}</div>
        <div class="article-byline">${escapeHtml(a.author)} · ${new Date(a.createdAt || Date.now()).toLocaleDateString(window.TDAI18n?.getLocale ? window.TDAI18n.getLocale() : undefined)}</div>
      </article>
    `).join('');

    grid.querySelectorAll('.article-card').forEach(card => {
      const idx = parseInt(card.dataset.articleIdx, 10);
      const item = displayList[idx];
      if (!item) return;
      card.addEventListener('click', () => openArticleDetail(item));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openArticleDetail(item);
        }
      });
    });
  }

  function init() {
    renderArticles();

    $('articleForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const p = window.TDAAuth?.getProfile();
      const country = p?.country || '';

      if (!p || !country) {
        alert(featureT('profileRequired'));
        return;
      }

      const title = $('articleTitle')?.value.trim();
      const body = $('articleBody')?.value.trim();
      const category = $('articleCategory')?.value;

      const articlesDefault = window.TDAConfig?.ARTICLES_DEFAULT || [];
      const arr = readJSON('tda-articles', articlesDefault);

      arr.push({
        id: 'a' + Date.now(),
        title,
        body,
        category,
        country,
        author: `${p.firstName || ''} ${p.lastName || ''}`.trim() || featureT('demo'),
        createdAt: new Date().toISOString()
      });

      writeJSON('tda-articles', arr);
      e.target.reset();

      const st = $('articleStatus');
      if (st) {
        st.style.display = 'block';
        st.textContent = featureT('articlePublished');
      }

      renderArticles();
    });

    window.addEventListener('tda:languageChanged', () => {
      renderArticles();
    });
  }

  return {
    init,
    renderArticles
  };
})();
