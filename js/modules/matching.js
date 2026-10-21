/**
 * Türk Dünyası Beceri Ağı - Akıllı Beceri Eşleştirme & Değerlendirme Modülü
 */

window.TDAMatching = (function() {
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

  function skillLabel(c) {
    return window.TDAI18n?.t(c, { fallback: c }) || c;
  }

  function populateSelect(id, items, allKey = 'anyOption') {
    const el = $(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = featureT(allKey);
    el.appendChild(first);
    items.forEach(x => {
      const o = document.createElement('option');
      o.value = x;
      o.textContent = skillLabel(x);
      el.appendChild(o);
    });
    el.value = items.includes(val) ? val : '';
  }

  function populateMatchControls() {
    const demoUsers = window.TDAConfig?.DEMO_USERS || [];
    const skillCatalog = window.TDAConfig?.skillCatalog || [];
    const worldCatalog = window.TDAConfig?.worldLanguageCatalog || [];
    const countries = window.TDAConfig?.COUNTRIES || [];

    const allSkills = [...new Set([
      ...demoUsers.flatMap(u => [...u.teach, ...u.learn]),
      ...skillCatalog.map(x => x[1])
    ])].sort((a, b) => a.localeCompare(b, 'tr'));

    const allLanguages = [...new Set([
      ...demoUsers.flatMap(u => u.languages),
      ...worldCatalog.map(x => x.n.tr).filter(Boolean)
    ])];

    populateSelect('matchTeach', allSkills);
    populateSelect('matchLearn', allSkills);
    populateSelect('matchCountry', countries.map(c => c.name), 'allCountries');
    populateSelect('matchLanguage', allLanguages);

    const sort = $('matchSort');
    if (sort) {
      const v = sort.value;
      sort.innerHTML = `<option value="score">${featureT('scoreSort')}</option><option value="rating">${featureT('ratingSort')}</option>`;
      sort.value = v || 'score';
    }
  }

  function initMatchDropdowns() {
    ['matchTeach', 'matchLearn', 'matchCountry', 'matchLanguage', 'matchLevel', 'matchAvailability', 'matchMode', 'matchSort'].forEach(id => {
      const select = $(id);
      if (!select || select.dataset.dropdownReady) return;
      select.dataset.dropdownReady = 'true';
      select.addEventListener('focus', () => select.classList.add('dropdown-active'));
      select.addEventListener('click', () => select.classList.add('dropdown-active'));
      select.addEventListener('change', () => {
        select.classList.remove('dropdown-active');
        renderMatches();
      });
      select.addEventListener('blur', () => select.classList.remove('dropdown-active'));
    });
  }

  function getRating(id) {
    const rs = readJSON('tda-reviews', []).filter(r => r.userId === id);
    if (!rs.length) return { avg: null, count: 0 };
    return { avg: rs.reduce((a, b) => a + b.rating, 0) / rs.length, count: rs.length };
  }

  function scoreMatch(me, c, filters) {
    let score = 0;
    const reasons = [];
    const teachNeed = filters.learn;
    const learnNeed = filters.teach;

    if (teachNeed && c.teach.includes(teachNeed)) {
      score += 35;
      reasons.push(featureT('skillsMatch'));
    } else if (!teachNeed) {
      score += 15;
    }

    if (learnNeed && c.learn.includes(learnNeed)) {
      score += 20;
      reasons.push(featureT('skillsMatch'));
    } else if (!learnNeed) {
      score += 10;
    }

    const lang = filters.language;
    if (lang && c.languages.includes(lang)) {
      score += 15;
      reasons.push(featureT('languageMatch'));
    } else if (!lang) {
      score += 8;
    }

    if (filters.country && c.country === filters.country) {
      score += 10;
      reasons.push(featureT('countryMatch'));
    } else if (!filters.country) {
      score += 4;
    }

    if (filters.level && c.level === filters.level) {
      score += 10;
      reasons.push(featureT('levelMatch'));
    } else if (!filters.level) {
      score += 5;
    }

    if (filters.availability && c.availability === filters.availability) {
      score += 10;
      reasons.push(featureT('availabilityMatch'));
    } else if (!filters.availability) {
      score += 5;
    }

    const rating = getRating(c.id);
    return { ...c, score: Math.min(100, score), rating: rating.avg, reviews: rating.count, reasons };
  }

  function renderMatches() {
    const box = $('matchResults');
    if (!box) return;

    const filters = {
      teach: $('matchTeach')?.value || '',
      learn: $('matchLearn')?.value || '',
      country: $('matchCountry')?.value || '',
      language: $('matchLanguage')?.value || '',
      level: $('matchLevel')?.value || '',
      availability: $('matchAvailability')?.value || ''
    };
    const mode = $('matchMode')?.value || 'manual';
    const search = String($('matchSearch')?.value || '').trim().toLocaleLowerCase('tr-TR');

    const demoUsers = window.TDAConfig?.DEMO_USERS || [];
    const myProfile = window.TDAAuth?.getProfile() || null;

    let list = demoUsers
      .map(u => scoreMatch(myProfile, u, filters))
      .filter(u => !filters.country || u.country === filters.country)
      .filter(u => !filters.language || u.languages.includes(filters.language))
      .filter(u => !filters.level || u.level === filters.level)
      .filter(u => !filters.availability || u.availability === filters.availability);

    if (search) {
      list = list.filter(u => [u.name, u.country, u.level, u.availability, ...u.languages, ...u.teach, ...u.learn].join(' ').toLocaleLowerCase('tr-TR').includes(search));
    }
    if (filters.teach) list = list.filter(u => u.learn.includes(filters.teach));
    if (filters.learn) list = list.filter(u => u.teach.includes(filters.learn));

    list.sort((a, b) => ($('matchSort')?.value === 'rating' ? (b.rating ?? -1) - (a.rating ?? -1) : b.score - a.score));

    if (mode === 'auto') list = list.slice(0, 3);

    if (!list.length) {
      box.innerHTML = `<div class="empty-state">${featureT('noMatches')}</div>`;
      return;
    }

    box.innerHTML = list.map(u => {
      const r = u.rating ? `${u.rating.toFixed(1)} / 5 · ${u.reviews} ${featureT('reviews')}` : featureT('noReviews');
      return `
        <article class="match-card">
          <div class="match-top">
            <div>
              <h3 style="margin:0">${escapeHtml(u.name)}</h3>
              <div class="match-meta">${escapeHtml(countryLabel(u.country))} · ${escapeHtml(featureT(u.level, { fallback: u.level }))} · ${escapeHtml(featureT(u.availability, { fallback: u.availability }))}</div>
            </div>
            <div class="match-score">${u.score}%</div>
          </div>
          <div class="match-tags">
            ${u.teach.slice(0, 3).map(x => `<span>${escapeHtml(skillLabel(x))}</span>`).join('')}
          </div>
          <div class="match-meta">⭐ ${r}</div>
          <div class="match-reason">
            <strong>${featureT('whyMatch')}:</strong> ${u.reasons.length ? u.reasons.join(' · ') : featureT('demo')}
          </div>
          <button class="ghost-btn" style="margin-top:11px" data-review-user="${u.id}">${featureT('rating')}</button>
        </article>
      `;
    }).join('');

    box.querySelectorAll('[data-review-user]').forEach(b => {
      b.onclick = () => openReview(b.dataset.reviewUser);
    });
  }

  function renderReviews() {
    const box = $('reviewList');
    if (!box) return;
    const storedReviews = readJSON('tda-reviews', []);
    const rs = storedReviews.length ? storedReviews : [{
      id: 'demo-review',
      author: 'Aibek M. & Leyla S.',
      rating: 5,
      text: featureT('demoReviewText'),
      date: featureT('demoReviewDate'),
      match: featureT('demoReviewMatch')
    }];
    box.innerHTML = rs.slice().reverse().map(r => `
      <div class="review-item">
        <div class="review-item-head">
          <strong>${escapeHtml(featureT(r.match || 'Eşleşme kaydı', { fallback: r.match || 'Eşleşme kaydı' }))}</strong>
          <span>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)</span>
        </div>
        <div class="review-item-meta">${escapeHtml(featureT(r.author || 'Öğrenci', { fallback: r.author || 'Öğrenci' }))} · ${escapeHtml(featureT(r.date || '', { fallback: r.date || '' }))}</div>
        <p>"${escapeHtml(featureT(r.text || '', { fallback: r.text || '' }))}"</p>
      </div>
    `).join('');
  }

  function openReview(userId) {
    const demoUsers = window.TDAConfig?.DEMO_USERS || [];
    const u = demoUsers.find(x => x.id === userId);
    if (!u) return;
    const text = prompt(`${u.name} — ${featureT('rating')} (1-5)`);
    if (text === null) return;
    const rating = Math.max(1, Math.min(5, parseInt(text, 10) || 0));
    if (!rating) return;
    const comment = prompt(featureT('reviewsIntro')) || '';
    const rs = readJSON('tda-reviews', []);
    rs.push({
      id: Date.now(),
      userId,
      author: window.TDAAuth?.getProfile()?.firstName || 'Prototip kullanıcı',
      rating,
      text: comment,
      date: new Date().toLocaleDateString()
    });
    writeJSON('tda-reviews', rs);
    renderReviews();
    renderMatches();
    alert(featureT('reviewSaved'));
  }

  function init() {
    populateMatchControls();
    initMatchDropdowns();
    renderMatches();
    renderReviews();

    $('runMatch')?.addEventListener('click', renderMatches);
    $('matchSearch')?.addEventListener('input', renderMatches);
    $('clearMatch')?.addEventListener('click', () => {
      ['matchTeach', 'matchLearn', 'matchCountry', 'matchLanguage', 'matchLevel', 'matchAvailability'].forEach(id => {
        if ($(id)) $(id).value = '';
      });
      if ($('matchSearch')) $('matchSearch').value = '';
      if ($('matchMode')) $('matchMode').value = 'manual';
      renderMatches();
    });

    window.addEventListener('tda:languageChanged', () => {
      populateMatchControls();
      renderMatches();
      renderReviews();
    });
  }

  return {
    init,
    renderMatches,
    renderReviews
  };
})();
