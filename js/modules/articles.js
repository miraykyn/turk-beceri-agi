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

    grid.innerHTML = filtered.slice().reverse().map(a => `
      <article class="article-card">
        <h3>${escapeHtml(featureT(a.title, { fallback: a.title }))}</h3>
        <p>${escapeHtml(featureT(a.body, { fallback: a.body }))}</p>
        <div class="article-country">${escapeHtml(countryLabel(a.country))} · ${escapeHtml(featureT(a.category, { fallback: a.category }))}</div>
        <div class="article-byline">${escapeHtml(a.author)} · ${new Date(a.createdAt || Date.now()).toLocaleDateString(window.TDAI18n?.getLocale ? window.TDAI18n.getLocale() : undefined)}</div>
      </article>
    `).join('');
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
