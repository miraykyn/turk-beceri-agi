/**
 * Türk Dünyası Beceri Ağı - Kimlik Doğrulama & Beceri Seçici Modülü
 */

window.TDAAuth = (function() {
  const CERT_MAX = 3 * 1024 * 1024;
  const CERT_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  function generateStudentId(country = '') {
    const prefix = ({
      'Türkiye': 'TR',
      'Azerbaycan': 'AZ',
      'Özbekistan': 'UZ',
      'Kazakistan': 'KZ',
      'Kuzey Kıbrıs Türk Cumhuriyeti': 'KKTC',
      'Türkmenistan': 'TM',
      'Kırgızistan': 'KG'
    }[country] || 'TD');
    return `TDA-${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  function getProfile() {
    try {
      const u = JSON.parse(localStorage.getItem('tda-demo-user') || 'null');
      if (!u) return null;
      ensureStudentId(u);
      return { ...u, points: Number(u.points ?? 0) };
    } catch (e) {
      return null;
    }
  }

  function ensureStudentId(user) {
    if (!user) return null;
    if (!user.studentId) {
      user.studentId = generateStudentId(user.country);
      try {
        localStorage.setItem('tda-demo-user', JSON.stringify(user));
      } catch (e) {}
    }
    return user;
  }

  function openAuth(mode) {
    const b = document.getElementById('authBackdrop');
    if (!b) return;
    const title = document.getElementById('authTitle');
    const reg = document.getElementById('registerPanel');
    const login = document.getElementById('loginPanel');
    const rs = document.getElementById('registerStatus');
    const ls = document.getElementById('loginStatus');
    if (rs) rs.className = 'auth-status';
    if (ls) ls.className = 'auth-status';
    if (mode === 'login') {
      if (title) {
        title.dataset.i18n = 'loginTitle';
        title.textContent = window.TDAI18n?.t('loginTitle') || 'Giriş Yap';
      }
      reg.style.display = 'none';
      login.style.display = 'block';
    } else {
      if (title) {
        title.dataset.i18n = 'registerTitle';
        title.textContent = window.TDAI18n?.t('registerTitle') || 'Kayıt Ol';
      }
      reg.style.display = 'block';
      login.style.display = 'none';
    }
    b.classList.add('open');
    b.setAttribute('aria-hidden', 'false');
  }

  function closeAuth() {
    const b = document.getElementById('authBackdrop');
    if (b) {
      b.classList.remove('open');
      b.setAttribute('aria-hidden', 'true');
    }
  }

  function localizedLanguageName(code, lang = window.TDAI18n?.language || 'tr') {
    const catalog = window.TDAConfig?.worldLanguageCatalog || [];
    const item = catalog.find(x => x.c === code || x.a2 === code);
    if (!item) return String(code);
    return item.n[lang] || item.n.tr || item.c;
  }

  function localizedSkillName(label, lang = window.TDAI18n?.language || 'tr') {
    if (lang === 'tr') return label;
    return window.TDAI18n?.t(label, { fallback: label }) || label;
  }

  function renderSelected(picker) {
    const box = picker.querySelector('[data-selected]');
    if (!box) return;
    box.innerHTML = '';
    (picker._selected || new Set()).forEach(label => {
      const chip = document.createElement('span');
      chip.className = 'skill-chip';
      chip.textContent = label;
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.setAttribute('aria-label', window.TDAI18n?.t('selectionRemove') || 'Seçimi kaldır');
      x.onclick = () => {
        picker._selected.delete(label);
        renderSelected(picker);
        renderSkillPicker(picker);
        syncSkillHidden(picker);
      };
      chip.appendChild(x);
      box.appendChild(chip);
    });
  }

  function syncSkillHidden(picker) {
    const input = picker.parentElement.querySelector('input[type=hidden]');
    if (input) input.value = [...(picker._selected || new Set())].join(' | ');
  }

  function renderSkillPicker(picker) {
    const category = picker.dataset.category || 'languages';
    const list = picker.querySelector('[data-list]');
    const other = picker.querySelector('.skill-other');
    const search = picker.querySelector('[data-skill-search]');
    const count = picker.querySelector('[data-skill-count]');
    if (!list) return;

    const q = (search?.value || '').trim().toLocaleLowerCase();
    if (category === 'other') {
      list.style.display = 'none';
      other.classList.add('show');
      if (search) search.parentElement.style.display = 'none';
      if (count) count.textContent = '';
      return;
    }
    if (search) search.parentElement.style.display = 'flex';
    list.style.display = 'grid';
    other.classList.remove('show');

    const worldLanguages = window.TDAConfig?.worldLanguageCatalog || [];
    const skillCatalog = window.TDAConfig?.skillCatalog || [];

    let items = category === 'languages'
      ? worldLanguages.map(x => [localizedLanguageName(x.c, 'tr'), x.c, x.n])
      : skillCatalog.map(x => [x[0], x[1], null]);

    if (q) {
      items = items.filter(([label, code, names]) => {
        const hay = names ? Object.values(names).join(' ') + ' ' + code : label + ' ' + code;
        return hay.toLocaleLowerCase().includes(q);
      });
    }

    const limit = q ? 100 : 50;
    const shown = items.slice(0, limit);
    if (count) {
      const n = items.length > limit ? `${limit} / ${items.length}` : `${items.length}`;
      const k = items.length > limit ? 'countShowing' : 'countResults';
      count.textContent = window.TDAI18n?.t(k, { n }) || `${n} sonuç`;
    }

    list.innerHTML = '';
    const selected = picker._selected || new Set();

    shown.forEach(([label, code]) => {
      const row = document.createElement('label');
      row.className = 'skill-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = label;
      cb.dataset.code = code;
      cb.checked = selected.has(label);
      const span = document.createElement('span');
      span.textContent = category === 'languages' ? localizedLanguageName(code) : localizedSkillName(label);
      row.append(cb, span);
      list.appendChild(row);

      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(label);
        else selected.delete(label);
        picker._selected = selected;
        renderSelected(picker);
        syncSkillHidden(picker);
      });
    });
  }

  function initSkillPicker(picker) {
    picker._selected = new Set();
    const head = picker.querySelector('.skill-picker-head');
    head.addEventListener('click', () => {
      picker.classList.toggle('open');
      head.setAttribute('aria-expanded', picker.classList.contains('open'));
    });
    head.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        head.click();
      }
    });

    picker.querySelectorAll('.skill-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        picker.querySelectorAll('.skill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        picker.dataset.category = tab.dataset.category;
        const search = picker.querySelector('[data-skill-search]');
        if (search) search.value = '';
        renderSkillPicker(picker);
      });
    });

    picker.querySelector('[data-skill-search]')?.addEventListener('input', () => renderSkillPicker(picker));
    picker.querySelector('[data-other-add]')?.addEventListener('click', () => {
      const input = picker.querySelector('[data-other-input]');
      const v = (input?.value || '').trim();
      if (v) {
        picker._selected.add(v);
        input.value = '';
        renderSelected(picker);
        syncSkillHidden(picker);
      }
    });
    picker.querySelector('[data-other-input]')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        picker.querySelector('[data-other-add]')?.click();
      }
    });

    renderSkillPicker(picker);
    renderSelected(picker);
  }

  function clearCertificateUI() {
    const certificateInput = document.getElementById('regCertificate');
    const certificateMeta = document.getElementById('certificateMeta');
    const certificateMetaText = document.getElementById('certificateMetaText');
    if (certificateInput) certificateInput.value = '';
    if (certificateMeta) certificateMeta.classList.remove('show');
    if (certificateMetaText) certificateMetaText.textContent = '';
  }

  function readCertificate(file) {
    return new Promise(resolve => {
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result || '') });
      reader.onerror = () => resolve({ name: file.name, type: file.type, size: file.size });
      reader.readAsDataURL(file);
    });
  }

  function showAuthStatus(id, message) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.className = 'auth-status show';
    }
  }

  function init() {
    window.openAuth = openAuth;
    window.closeAuth = closeAuth;

    document.addEventListener('click', e => {
      if (e.target === document.getElementById('authBackdrop')) closeAuth();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAuth();
    });

    document.querySelectorAll('.skill-picker').forEach(initSkillPicker);

    const certificateInput = document.getElementById('regCertificate');
    const certificateMeta = document.getElementById('certificateMeta');
    const certificateMetaText = document.getElementById('certificateMetaText');

    if (certificateInput) {
      certificateInput.addEventListener('change', () => {
        const file = certificateInput.files?.[0];
        if (!file) return;
        const allowed = CERT_TYPES.includes(file.type) || /\.(pdf|jpe?g|png|webp|docx?)$/i.test(file.name);
        if (!allowed) {
          alert(window.TDAI18n?.t('certificateInvalid') || 'Desteklenmeyen dosya türü.');
          clearCertificateUI();
          return;
        }
        if (file.size > CERT_MAX) {
          alert(window.TDAI18n?.t('certificateTooLarge') || 'Dosya 3 MB sınırını aşıyor.');
          clearCertificateUI();
          return;
        }
        if (certificateMeta) certificateMeta.classList.add('show');
        if (certificateMetaText) certificateMetaText.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(registerForm).entries());
        const certFile = certificateInput?.files?.[0] || null;
        delete data.certificate;
        data.certificate = await readCertificate(certFile);
        data.createdAt = new Date().toISOString();
        if (!data.studentId) data.studentId = generateStudentId(data.country);
        if (data.points == null) data.points = 2.5;

        try {
          localStorage.setItem('tda-demo-user', JSON.stringify(data));
        } catch (err) {}

        showAuthStatus('registerStatus', window.TDAI18n?.t('registrationSuccess') || 'Kayıt oluşturuldu.');
        registerForm.reset();
        clearCertificateUI();

        window.dispatchEvent(new CustomEvent('tda:profileUpdated', { detail: data }));
      });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(loginForm).entries());
        let user = null;
        try {
          user = JSON.parse(localStorage.getItem('tda-demo-user') || 'null');
        } catch (err) {}

        if (user && user.email === data.email) {
          showAuthStatus('loginStatus', window.TDAI18n?.t('loginSuccess', { name: user.firstName || 'Öğrenci' }) || 'Giriş başarılı.');
          window.dispatchEvent(new CustomEvent('tda:profileUpdated', { detail: user }));
        } else {
          showAuthStatus('loginStatus', window.TDAI18n?.t('loginNotFound') || 'Hesap bulunamadı.');
        }
      });
    }

    window.addEventListener('tda:languageChanged', () => {
      document.querySelectorAll('.skill-picker').forEach(p => renderSkillPicker(p));
    });
  }

  return {
    init,
    openAuth,
    closeAuth,
    getProfile,
    ensureStudentId,
    generateStudentId
  };
})();
