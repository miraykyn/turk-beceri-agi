/**
 * Türk Dünyası Beceri Ağı - Dijital Kültür Arşivi Modülü (Reactive State & UI Component)
 * 
 * Özellikler:
 * 1. 7 Türk ülkesi ve topluluğu için yatay ülke filtreleme barı (onClick dinamik filtreleme).
 * 2. Her ülkeye ait tam 5'er adet (toplam 35 adet) doğrulanmış başlangıç verisi (Mock State).
 * 3. "Kültür Arşivine Ekle / Fotoğraf Paylaş" modalı, dosya yükleme (FileReader) & URL desteği.
 * 4. Kritik Kural: Açıklama / Konum (Nereden / Hangi Şehirden) alanında kesin maxLength="40"
 *    sınırı ve "Kalan Karakter: X" canlı görsel uyarısı.
 * 5. Estetik Grid galeri ve CSS hover büyüme (scale) animasyonu + Lightbox detay görünümü.
 */

window.TDACultureArchive = (function() {
  const STORAGE_KEY = 'tda-culture-archive-items-v1';
  const MAX_CAPTION_LENGTH = 40;

  // --- 1. ÜLKE METADATA VE BAYRAK LİSTESİ (Kural 1 Sıralaması) ---
  const COUNTRIES = [
    {
      name: 'Türkiye',
      shortName: 'Türkiye',
      flag: 'assets/flags/tr.svg',
      theme: ['#7f1d1d', '#b91c1c']
    },
    {
      name: 'Azerbaycan',
      shortName: 'Azerbaycan',
      flag: 'assets/flags/az.svg',
      theme: ['#0369a1', '#15803d']
    },
    {
      name: 'Kazakistan',
      shortName: 'Kazakistan',
      flag: 'assets/flags/kz.svg',
      theme: ['#0284c7', '#ca8a04']
    },
    {
      name: 'Özbekistan',
      shortName: 'Özbekistan',
      flag: 'assets/flags/uz.svg',
      theme: ['#0e7490', '#16a34a']
    },
    {
      name: 'Kırgızistan',
      shortName: 'Kırgızistan',
      flag: 'assets/flags/kg.svg',
      theme: ['#991b1b', '#d97706']
    },
    {
      name: 'Türkmenistan',
      shortName: 'Türkmenistan',
      flag: 'assets/flags/tm.svg',
      theme: ['#166534', '#b45309']
    },
    {
      name: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      shortName: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      flag: 'assets/flags/kktc.svg',
      theme: ['#991b1b', '#1e3a8a']
    }
  ];

  // --- 2. BAŞLANGIÇ VERİSİ (MOCK DATA - HER ÜLKEYE TAM 5'ER ADET GERÇEK FOTOĞRAF/KART) ---
  const INITIAL_ARCHIVE_ITEMS = [
    // ==================== TÜRKİYE (5) ====================
    {
      id: 'tr-1',
      country: 'Türkiye',
      caption: 'Anıtkabir (Ankara)',
      location: 'Ankara',
      image: './assets/images/culture/tr-1-1280.webp'
    },
    {
      id: 'tr-2',
      country: 'Türkiye',
      caption: 'Uzungöl (Trabzon)',
      location: 'Trabzon',
      image: './assets/images/culture/tr-2-1280.webp'
    },
    {
      id: 'tr-3',
      country: 'Türkiye',
      caption: 'Türk Baklavası (Gaziantep)',
      location: 'Gaziantep',
      image: './assets/images/culture/tr-3-1280.webp'
    },
    {
      id: 'tr-4',
      country: 'Türkiye',
      caption: 'Van Kedisi (Van)',
      location: 'Van',
      image: './assets/images/culture/tr-4-1280.webp'
    },
    {
      id: 'tr-5',
      country: 'Türkiye',
      caption: 'Türk Lokumu (İstanbul)',
      location: 'İstanbul',
      image: './assets/images/culture/tr-5-1280.webp'
    },

    // ==================== KAZAKİSTAN (5) ====================
    {
      id: 'kz-1',
      country: 'Kazakistan',
      caption: 'Dombra (Geleneksel Enstrüman)',
      location: 'Geleneksel Enstrüman',
      image: './assets/images/culture/kz-1-1280.webp'
    },
    {
      id: 'kz-2',
      country: 'Kazakistan',
      caption: 'Altay Dağları (Doğu Kazakistan)',
      location: 'Doğu Kazakistan',
      image: './assets/images/culture/kz-2-1280.webp'
    },
    {
      id: 'kz-3',
      country: 'Kazakistan',
      caption: 'Bayterek Kulesi (Astana)',
      location: 'Astana',
      image: './assets/images/culture/kz-3-1280.webp'
    },
    {
      id: 'kz-4',
      country: 'Kazakistan',
      caption: 'Hoca Ahmed Yesevi Türbesi (Türkistan)',
      location: 'Türkistan',
      image: './assets/images/culture/kz-4-1280.webp'
    },
    {
      id: 'kz-5',
      country: 'Kazakistan',
      caption: 'Kımız (Geleneksel İçecek)',
      location: 'Geleneksel İçecek',
      image: './assets/images/culture/kz-5-1280.webp'
    },

    // ==================== AZERBAYCAN (5) ====================
    {
      id: 'az-1',
      country: 'Azerbaycan',
      caption: 'Kız Kalesi (Bakü)',
      location: 'Bakü',
      image: './assets/images/culture/az-1-1280.webp'
    },
    {
      id: 'az-2',
      country: 'Azerbaycan',
      caption: 'Alev Kuleleri (Bakü)',
      location: 'Bakü',
      image: './assets/images/culture/az-2-1280.webp'
    },
    {
      id: 'az-3',
      country: 'Azerbaycan',
      caption: 'Şirvanşahlar Sarayı (İçerişehir)',
      location: 'İçerişehir',
      image: './assets/images/culture/az-3-1280.webp'
    },
    {
      id: 'az-4',
      country: 'Azerbaycan',
      caption: 'Düşbere (Geleneksel Yemek)',
      location: 'Geleneksel Yemek',
      image: './assets/images/culture/az-4-1280.webp'
    },
    {
      id: 'az-5',
      country: 'Azerbaycan',
      caption: 'Şekerbura (Geleneksel Tatlı)',
      location: 'Geleneksel Tatlı',
      image: './assets/images/culture/az-5-1280.webp'
    },

    // ==================== ÖZBEKİSTAN (5) ====================
    {
      id: 'uz-1',
      country: 'Özbekistan',
      caption: 'Özbek Pilavı (Taşkent)',
      location: 'Taşkent',
      image: './assets/images/culture/uz-1-1280.webp'
    },
    {
      id: 'uz-2',
      country: 'Özbekistan',
      caption: 'Registan Medreseleri (Semerkant)',
      location: 'Semerkant',
      image: './assets/images/culture/uz-2-1280.webp'
    },
    {
      id: 'uz-3',
      country: 'Özbekistan',
      caption: 'İçan Kale (Hive)',
      location: 'Hive',
      image: './assets/images/culture/uz-3-1280.webp'
    },
    {
      id: 'uz-4',
      country: 'Özbekistan',
      caption: 'Ark Kalesi (Buhara)',
      location: 'Buhara',
      image: './assets/images/culture/uz-4-1280.webp'
    },
    {
      id: 'uz-5',
      country: 'Özbekistan',
      caption: 'Şah-ı Zinde Türbesi (Semerkant)',
      location: 'Semerkant',
      image: './assets/images/culture/uz-5-1280.webp'
    },

    // ==================== KIRGIZİSTAN (5) ====================
    {
      id: 'kg-1',
      country: 'Kırgızistan',
      caption: 'Issık Göl (Karakol)',
      location: 'Karakol',
      image: './assets/images/culture/kg-1-1280.webp'
    },
    {
      id: 'kg-2',
      country: 'Kırgızistan',
      caption: 'Burana Kulesi (Çuy Vadisi)',
      location: 'Çuy Vadisi',
      image: './assets/images/culture/kg-2-1280.webp'
    },
    {
      id: 'kg-3',
      country: 'Kırgızistan',
      caption: 'Manas Heykeli (Bişkek)',
      location: 'Bişkek',
      image: './assets/images/culture/kg-3-1280.webp'
    },
    {
      id: 'kg-4',
      country: 'Kırgızistan',
      caption: 'Ala-Arça Milli Parkı (Tanrı Dağları)',
      location: 'Tanrı Dağları',
      image: './assets/images/culture/kg-4-1280.webp'
    },
    {
      id: 'kg-5',
      country: 'Kırgızistan',
      caption: 'Geleneksel Boz Üy / Yurt Çadırı (Son Göl)',
      location: 'Son Göl',
      image: './assets/images/culture/kg-5-1280.webp'
    },

    // ==================== TÜRKMENİSTAN (5) ====================
    {
      id: 'tm-1',
      country: 'Türkmenistan',
      caption: 'Darvaza Gaz Krateri (Karakum Çölü)',
      location: 'Karakum Çölü',
      image: './assets/images/culture/tm-1-1280.webp'
    },
    {
      id: 'tm-2',
      country: 'Türkmenistan',
      caption: 'Bağımsızlık Anıtı (Aşkabat)',
      location: 'Aşkabat',
      image: './assets/images/culture/tm-2-1280.webp'
    },
    {
      id: 'tm-3',
      country: 'Türkmenistan',
      caption: 'Ahal-Teke Atı (Aşkabat Harası)',
      location: 'Aşkabat Harası',
      image: './assets/images/culture/tm-3-1280.webp'
    },
    {
      id: 'tm-4',
      country: 'Türkmenistan',
      caption: 'Merv Antik Kenti (Mary)',
      location: 'Mary',
      image: './assets/images/culture/tm-4-1280.webp'
    },
    {
      id: 'tm-5',
      country: 'Türkmenistan',
      caption: 'Geleneksel Türkmen Halısı (Kültür Müzesi)',
      location: 'Kültür Müzesi',
      image: './assets/images/culture/tm-5-1280.webp'
    },

    // ==================== KUZEY KIBRIS TÜRK CUMHURİYETİ (5) ====================
    {
      id: 'kktc-1',
      country: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      caption: 'Girne Kalesi (Girne)',
      location: 'Girne',
      image: './assets/images/culture/kktc-1-1280.webp'
    },
    {
      id: 'kktc-2',
      country: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      caption: 'Bellapais Manastırı (Beylerbeyi)',
      location: 'Beylerbeyi',
      image: './assets/images/culture/kktc-2-1280.webp'
    },
    {
      id: 'kktc-3',
      country: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      caption: 'Salamis Antik Kenti (Gazimağusa)',
      location: 'Gazimağusa',
      image: './assets/images/culture/kktc-3-1280.webp'
    },
    {
      id: 'kktc-4',
      country: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      caption: 'Caretta Caretta Kaplumbağaları (Karpaz Sahili)',
      location: 'Karpaz Sahili',
      image: './assets/images/culture/kktc-4-1280.webp'
    },
    {
      id: 'kktc-5',
      country: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      caption: 'Hellim Peyniri (Geleneksel Lezzet)',
      location: 'Geleneksel Lezzet',
      image: './assets/images/culture/kktc-5-1280.webp'
    }
  ];

  // --- 3. REAKTİF STATE (DURUM) YÖNETİMİ ---
  const state = {
    selectedCountry: 'ALL', // 'ALL' veya 7 ülkeden birinin tam adı
    items: [],
    uploadedDataUrl: ''
  };

  const $ = id => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[m]));
  }

  function translateCountry(name) {
    return window.TDAI18n?.t(name, { fallback: name }) || name;
  }

  function getCountryMeta(countryName) {
    return COUNTRIES.find(c => c.name === countryName) || COUNTRIES[0];
  }

  /**
   * Çevrimdışı veya ağ engeli durumunda bile her kartın kusursuz görünmesini sağlayan SVG poster üretici
   */
  function createSvgFallback(caption, countryName) {
    const meta = getCountryMeta(countryName);
    const [c1, c2] = meta.theme || ['#102343', '#1d4ed8'];
    const safeTitle = escapeHtml(caption);
    const safeCountry = escapeHtml(countryName);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="600" height="450" fill="url(#g)"/>
      <circle cx="510" cy="80" r="130" fill="rgba(245,207,121,0.14)"/>
      <circle cx="90" cy="380" r="160" fill="rgba(255,255,255,0.07)"/>
      <rect x="36" y="36" width="528" height="378" rx="22" fill="none" stroke="rgba(245,207,121,0.4)" stroke-width="2"/>
      <text x="300" y="195" text-anchor="middle" fill="#f5cf79" font-family="Inter,Segoe UI,sans-serif" font-size="18" font-weight="700" letter-spacing="2">${safeCountry.toUpperCase()}</text>
      <text x="300" y="245" text-anchor="middle" fill="#ffffff" font-family="Inter,Segoe UI,sans-serif" font-size="24" font-weight="800">${safeTitle}</text>
      <text x="300" y="290" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="Inter,Segoe UI,sans-serif" font-size="14">Türk Dünyası Dijital Kültür Arşivi</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function loadItems() {
    try {
      const storedUserItems = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const userItems = Array.isArray(storedUserItems) ? storedUserItems : [];
      state.items = [...userItems, ...INITIAL_ARCHIVE_ITEMS];
    } catch (e) {
      state.items = INITIAL_ARCHIVE_ITEMS.slice();
    }
  }

  function saveUserItem(newItem) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const userItems = Array.isArray(stored) ? stored : [];
      userItems.unshift(newItem);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userItems));
      state.items = [newItem, ...state.items];
      return true;
    } catch (e) {
      return false;
    }
  }

  function deleteUserItem(itemId) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const userItems = Array.isArray(stored) ? stored.filter(x => x.id !== itemId) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userItems));
    } catch (e) {}
    state.items = state.items.filter(x => x.id !== itemId);
    render();
  }

  function extractLocationFromCaption(caption) {
    const match = String(caption).match(/\(([^)]+)\)\s*$/);
    if (match && match[1]) return match[1].trim();
    return caption;
  }

  // --- 4. ÜLKE FİLTRELEME (onClick Country Filter) ---
  function setCountryFilter(countryName) {
    state.selectedCountry = countryName || 'ALL';
    render();
  }

  function getFilteredItems() {
    if (!state.selectedCountry || state.selectedCountry === 'ALL') {
      return state.items;
    }
    return state.items.filter(item => item.country === state.selectedCountry);
  }

  // --- 5. ARAYÜZ RENDER FONKSİYONLARI ---
  function renderCountryFilterBar() {
    const bar = $('cultureCountryBar');
    const summaryEl = $('cultureActiveSummary');
    const statsPill = $('cultureTotalStatsPill');
    if (!bar) return;

    const totalCount = state.items.length;
    if (statsPill) {
      statsPill.textContent = window.TDAI18n ? window.TDAI18n.t('cultureTotalStats', { count: totalCount }) : `7 Türk Ülkesi ve Topluluğu • ${totalCount} Kültür Mirası Kaydı`;
    }

    const allBtnHtml = `
      <button type="button"
              class="culture-country-btn ${state.selectedCountry === 'ALL' ? 'active' : ''}"
              data-country="ALL"
              aria-pressed="${state.selectedCountry === 'ALL'}">
        <span class="culture-btn-globe" aria-hidden="true">🌍</span>
        <span data-i18n="allCountries">Tüm Ülkeler</span>
        <span class="culture-btn-count">${totalCount}</span>
      </button>
    `;

    const countryButtonsHtml = COUNTRIES.map(c => {
      const count = state.items.filter(item => item.country === c.name).length;
      const isActive = state.selectedCountry === c.name;
      return `
        <button type="button"
                class="culture-country-btn ${isActive ? 'active' : ''}"
                data-country="${escapeHtml(c.name)}"
                aria-pressed="${isActive}">
          <img src="${escapeHtml(c.flag)}" alt="${escapeHtml(c.name)} bayrağı" class="culture-btn-flag" loading="lazy" referrerpolicy="no-referrer"/>
          <span>${escapeHtml(translateCountry(c.name))}</span>
          <span class="culture-btn-count">${count}</span>
        </button>
      `;
    }).join('');

    bar.innerHTML = allBtnHtml + countryButtonsHtml;

    bar.querySelectorAll('.culture-country-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetCountry = btn.dataset.country || 'ALL';
        setCountryFilter(targetCountry);
      });
    });

    if (summaryEl) {
      const filteredCount = getFilteredItems().length;
      if (state.selectedCountry === 'ALL') {
        summaryEl.innerHTML = `Gösterilen: <strong>Tüm Türk Dünyası (${filteredCount} fotoğraf)</strong>`;
      } else {
        summaryEl.innerHTML = `Seçili Ülke: <strong>${escapeHtml(translateCountry(state.selectedCountry))} (${filteredCount} fotoğraf)</strong>`;
      }
    }
  }

  function renderGalleryGrid() {
    const grid = $('cultureGalleryGrid');
    if (!grid) return;

    const filtered = getFilteredItems();

    if (!filtered.length) {
      const emptyText = window.TDAI18n ? window.TDAI18n.t('cultureEmptyState') : 'Bu ülke için henüz kültür arşivi fotoğrafı bulunmuyor. İlk fotoğrafı siz paylaşın!';
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          ${emptyText}
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((item, index) => {
      const meta = getCountryMeta(item.country);
      const locationLabel = item.location || extractLocationFromCaption(item.caption);
      const delayMs = Math.min(index * 35, 350);
      const newBadge = window.TDAI18n ? window.TDAI18n.t('newShareBadge') : '✨ Yeni Paylaşım';
      const delLabel = window.TDAI18n ? window.TDAI18n.t('delete') : 'Sil';
      const heritageLabel = window.TDAI18n ? window.TDAI18n.t('cultureHeritageLabel') : 'Kültür Mirası';

      const isLocalCulture = typeof item.image === 'string' && item.image.includes('/culture/');
      const basePath = isLocalCulture ? item.image.replace(/\.(jpg|jpeg|webp)$/i, '').replace(/-(640|1280)$/, '') : '';
      const srcAttr = isLocalCulture ? `${basePath}-640.webp` : item.image;
      const srcsetAttr = isLocalCulture
        ? `srcset="${basePath}-640.webp 640w, ${basePath}-1280.webp 1280w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`
        : '';

      return `
        <article class="culture-card"
                 tabindex="0"
                 role="button"
                 aria-label="${escapeHtml(item.caption)} - ${escapeHtml(item.country)}"
                 data-item-id="${escapeHtml(item.id)}"
                 style="animation-delay: ${delayMs}ms">
          <div class="culture-card-media">
            <img src="${escapeHtml(srcAttr)}"
                 ${srcsetAttr}
                 alt="${escapeHtml(item.caption)}"
                 class="culture-card-img"
                 loading="lazy"
                 decoding="async"
                 referrerpolicy="no-referrer"
                 data-fallback-caption="${escapeHtml(item.caption)}"
                 data-fallback-country="${escapeHtml(item.country)}"/>
            <div class="culture-card-country-pill">
              <img src="${escapeHtml(meta.flag)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>
              <span>${escapeHtml(translateCountry(item.country))}</span>
            </div>
            ${item.isUserAdded ? `<span class="culture-card-user-badge">${newBadge}</span>` : ''}
            <span class="culture-card-zoom-hint" aria-hidden="true">🔍</span>
          </div>
          <div class="culture-card-body">
            <h3 class="culture-card-title" data-no-translate>${escapeHtml(item.caption)}</h3>
            <div class="culture-card-location">
              <span class="culture-location-pin">
                <span aria-hidden="true">📍</span>
                <span data-no-translate>${escapeHtml(locationLabel)}</span>
              </span>
              ${item.isUserAdded
                ? `<button type="button" class="culture-card-delete-btn" data-delete-id="${escapeHtml(item.id)}" title="${delLabel}">${delLabel}</button>`
                : `<small style="color:#64748b;font-weight:700;">${heritageLabel}</small>`
              }
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Görsel yükleme hatası (offline vb.) durumunda özel SVG kültür kartı yedeğini devreye al
    grid.querySelectorAll('.culture-card-img').forEach(img => {
      img.addEventListener('error', function handleImgError() {
        if (this.dataset.fallbackApplied === 'true') return;
        this.dataset.fallbackApplied = 'true';
        this.src = createSvgFallback(
          this.dataset.fallbackCaption || 'Kültür Mirası',
          this.dataset.fallbackCountry || 'Türk Dünyası'
        );
      });
    });

    // Silme butonları (kullanıcının eklediği fotoğraflar için)
    grid.querySelectorAll('[data-delete-id]').forEach(delBtn => {
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        const id = delBtn.dataset.deleteId;
        if (id) deleteUserItem(id);
      });
    });

    // Kart tıklama -> Lightbox büyük görünüm
    grid.querySelectorAll('.culture-card').forEach(card => {
      const openCard = () => {
        const item = state.items.find(x => x.id === card.dataset.itemId);
        if (item) openLightbox(item);
      };
      card.addEventListener('click', openCard);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCard();
        }
      });
    });
  }

  function render() {
    renderCountryFilterBar();
    renderGalleryGrid();
  }

  // --- 6. FOTOĞRAF PAYLAŞIM MODALI VE 40 KARAKTER SINIRI KONTROLÜ ---
  function updateCharacterCounter() {
    const input = $('cultureInputCaption');
    const remainingEl = $('cultureCharRemaining');
    const badgeEl = $('cultureCharBadge');
    const progressEl = $('cultureCharProgressBar');
    if (!input || !remainingEl) return;

    // Kesin maxLength="40" sınırı
    if (input.value.length > MAX_CAPTION_LENGTH) {
      input.value = input.value.slice(0, MAX_CAPTION_LENGTH);
    }

    const used = input.value.length;
    const remaining = Math.max(0, MAX_CAPTION_LENGTH - used);
    remainingEl.textContent = String(remaining);

    if (badgeEl) {
      badgeEl.classList.remove('warn', 'limit');
      if (remaining === 0) {
        badgeEl.classList.add('limit');
      } else if (remaining <= 10) {
        badgeEl.classList.add('warn');
      }
    }

    if (progressEl) {
      const pct = Math.min(100, Math.round((used / MAX_CAPTION_LENGTH) * 100));
      progressEl.style.width = pct + '%';
      progressEl.classList.toggle('limit', remaining === 0);
    }
  }

  function openShareModal() {
    const modal = $('cultureShareModal');
    const countrySelect = $('cultureInputCountry');
    const captionInput = $('cultureInputCaption');
    const errorBox = $('cultureFormError');
    if (!modal) return;

    if (countrySelect && state.selectedCountry !== 'ALL') {
      countrySelect.value = state.selectedCountry;
    }
    if (errorBox) {
      errorBox.classList.remove('show');
      errorBox.textContent = '';
    }

    updateCharacterCounter();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => captionInput?.focus(), 60);
  }

  function closeShareModal() {
    const modal = $('cultureShareModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function resetShareForm() {
    const form = $('cultureShareForm');
    const previewBox = $('culturePreviewBox');
    const previewImg = $('culturePreviewImg');
    const errorBox = $('cultureFormError');
    if (form) form.reset();
    state.uploadedDataUrl = '';
    if (previewImg) previewImg.src = '';
    if (previewBox) previewBox.classList.remove('show');
    if (errorBox) {
      errorBox.classList.remove('show');
      errorBox.textContent = '';
    }
    updateCharacterCounter();
  }

  function downscaleImage(file, maxDimension = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(ev.target.result);
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelected(file) {
    if (!file) return;
    const errorBox = $('cultureFormError');
    if (!file.type.startsWith('image/')) {
      if (errorBox) {
        errorBox.textContent = 'Lütfen geçerli bir fotoğraf dosyası (JPG, PNG, WEBP vb.) seçin.';
        errorBox.classList.add('show');
      }
      return;
    }

    try {
      state.uploadedDataUrl = await downscaleImage(file, 1280, 0.82);
      const previewBox = $('culturePreviewBox');
      const previewImg = $('culturePreviewImg');
      if (previewImg) previewImg.src = state.uploadedDataUrl;
      if (previewBox) previewBox.classList.add('show');
      if (errorBox) errorBox.classList.remove('show');
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = 'Fotoğraf işlenirken bir hata oluştu.';
        errorBox.classList.add('show');
      }
    }
  }

  function handleShareSubmit(e) {
    e.preventDefault();
    const countrySelect = $('cultureInputCountry');
    const captionInput = $('cultureInputCaption');
    const urlInput = $('cultureInputUrl');
    const errorBox = $('cultureFormError');

    const country = (countrySelect?.value || 'Türkiye').trim();
    const rawCaption = (captionInput?.value || '').trim().slice(0, MAX_CAPTION_LENGTH);
    const customUrl = (urlInput?.value || '').trim();

    if (!rawCaption) {
      if (errorBox) {
        errorBox.textContent = 'Lütfen fotoğrafın nereden / hangi şehirden çekildiğini yazın (maksimum 40 karakter).';
        errorBox.classList.add('show');
      }
      captionInput?.focus();
      return;
    }

    const finalImage = state.uploadedDataUrl || customUrl;
    if (!finalImage) {
      if (errorBox) {
        errorBox.textContent = 'Lütfen bilgisayarınızdan/telefonunuzdan bir fotoğraf seçin veya bir görsel URL’si girin.';
        errorBox.classList.add('show');
      }
      return;
    }

    const newItem = {
      id: 'user-culture-' + Date.now(),
      country,
      caption: rawCaption,
      location: extractLocationFromCaption(rawCaption),
      image: finalImage,
      isUserAdded: true,
      createdAt: new Date().toISOString()
    };

    const saved = saveUserItem(newItem);
    if (!saved) {
      if (errorBox) {
        errorBox.textContent = 'Depolama alanı yetersiz olduğu için fotoğraf kaydedilemedi. Lütfen daha küçük bir görsel deneyin.';
        errorBox.classList.add('show');
      }
      return;
    }

    // Eğer başka bir ülke filtresi seçiliyse, kullanıcının yeni eklediği fotoğrafı hemen görmesi için o ülkeye geç
    if (state.selectedCountry !== 'ALL' && state.selectedCountry !== country) {
      state.selectedCountry = country;
    }

    resetShareForm();
    closeShareModal();
    render();
  }

  // --- 7. LIGHTBOX (DETAY GÖRÜNÜMÜ) ---
  function openLightbox(item) {
    const modal = $('cultureLightboxModal');
    const img = $('cultureLightboxImg');
    const title = $('cultureLightboxTitle');
    const sub = $('cultureLightboxSub');
    if (!modal || !img) return;

    const isLocalCulture = typeof item.image === 'string' && item.image.includes('/culture/');
    if (isLocalCulture) {
      const basePath = item.image.replace(/\.(jpg|jpeg|webp)$/i, '').replace(/-(640|1280)$/, '');
      img.src = `${basePath}-1280.webp`;
      img.srcset = `${basePath}-640.webp 640w, ${basePath}-1280.webp 1280w`;
      img.sizes = '(max-width: 768px) 100vw, 1200px';
    } else {
      img.src = item.image;
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
    }
    img.alt = item.caption;
    img.onerror = () => {
      img.src = createSvgFallback(item.caption, item.country);
    };
    if (title) {
      title.textContent = item.caption;
      title.setAttribute('data-no-translate', '');
    }
    if (sub) {
      sub.textContent = `${translateCountry(item.country)} • 📍 ${item.location || extractLocationFromCaption(item.caption)}`;
      sub.setAttribute('data-no-translate', '');
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    const modal = $('cultureLightboxModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  // --- 8. BAŞLATICI (INIT) ---
  function init() {
    loadItems();
    render();

    // Modal aç/kapat olayları
    $('btnOpenCultureShare')?.addEventListener('click', openShareModal);
    $('btnCloseCultureShare')?.addEventListener('click', closeShareModal);
    $('btnCancelCultureShare')?.addEventListener('click', closeShareModal);

    const shareModal = $('cultureShareModal');
    shareModal?.addEventListener('click', e => {
      if (e.target === shareModal) closeShareModal();
    });

    // Karakter sayacı (input, keyup, paste)
    const captionInput = $('cultureInputCaption');
    if (captionInput) {
      captionInput.addEventListener('input', updateCharacterCounter);
      captionInput.addEventListener('keyup', updateCharacterCounter);
      captionInput.addEventListener('change', updateCharacterCounter);
      updateCharacterCounter();
    }

    // Dosya yükleme ve sürükle-bırak
    const fileInput = $('cultureInputFile');
    fileInput?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
    });

    const urlInput = $('cultureInputUrl');
    urlInput?.addEventListener('input', () => {
      const val = urlInput.value.trim();
      const previewBox = $('culturePreviewBox');
      const previewImg = $('culturePreviewImg');
      if (val && !state.uploadedDataUrl && (val.startsWith('http://') || val.startsWith('https://'))) {
        if (previewImg) previewImg.src = val;
        if (previewBox) previewBox.classList.add('show');
      } else if (!val && !state.uploadedDataUrl) {
        if (previewBox) previewBox.classList.remove('show');
      }
    });

    const dropzone = $('cultureUploadDropzone');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(ev => {
        dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(ev => {
        dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
        });
      });
      dropzone.addEventListener('drop', e => {
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileSelected(file);
      });
    }

    $('btnRemoveCulturePreview')?.addEventListener('click', () => {
      state.uploadedDataUrl = '';
      const fInput = $('cultureInputFile');
      const uInput = $('cultureInputUrl');
      if (fInput) fInput.value = '';
      if (uInput) uInput.value = '';
      $('culturePreviewBox')?.classList.remove('show');
    });

    // Form gönderimi
    $('cultureShareForm')?.addEventListener('submit', handleShareSubmit);

    // Lightbox kapatma
    $('btnCloseCultureLightbox')?.addEventListener('click', closeLightbox);
    const lightboxModal = $('cultureLightboxModal');
    lightboxModal?.addEventListener('click', e => {
      if (e.target === lightboxModal) closeLightbox();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeShareModal();
        closeLightbox();
      }
    });

    // Dil değiştiğinde ülke etiketlerini güncelle
    window.addEventListener('tda:languageChanged', () => {
      render();
    });
  }

  return {
    init,
    setCountryFilter,
    openShareModal
  };
})();
