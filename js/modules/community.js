/**
 * Türk Dünyası Beceri Ağı - Topluluk Odaları & Puan Bağış Modülü
 */

window.TDACommunity = (function() {
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

  function monthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function receivedThisMonth() {
    const profile = window.TDAAuth?.getProfile();
    if (!profile) return 0;
    const key = monthKey();
    return readJSON('tda-point-transfers', [])
      .filter(x => x.to === profile.email && x.month === key)
      .reduce((a, b) => a + Number(b.amount || 0), 0);
  }

  function findUserByStudentId(studentId) {
    const id = String(studentId || '').trim().toUpperCase();
    if (!id) return null;
    const p = window.TDAAuth?.getProfile();
    if (p && String(p.studentId || '').toUpperCase() === id) return p;
    const demoUsers = window.TDAConfig?.DEMO_USERS || [];
    const demo = demoUsers.find(u => String(u.studentId || '').toUpperCase() === id);
    return demo || null;
  }

  function renderMyStudentId() {
    const el = $('myStudentIdValue');
    if (!el) return;
    const p = window.TDAAuth?.getProfile();
    el.textContent = p?.studentId || '—';
  }

  function setDonationStatus(msg, type = '') {
    const el = $('donationStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'donation-status' + (type ? ' ' + type : '');
  }

  function donateByStudentId() {
    const p = window.TDAAuth?.getProfile();
    if (!p) {
      alert(featureT('profileRequired'));
      return;
    }
    const recipientId = $('donationRecipientId')?.value?.trim();
    const amount = Number($('donationAmount')?.value || 1);

    if (!recipientId) {
      setDonationStatus(featureT('donationRecipientNotFound'), 'error');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10 || Math.round(amount * 2) !== amount * 2) {
      setDonationStatus(featureT('donationAmountInvalid'), 'error');
      return;
    }

    const recipient = findUserByStudentId(recipientId);
    if (!recipient) {
      setDonationStatus(featureT('donationRecipientNotFound'), 'error');
      return;
    }
    if (String(recipient.studentId || '').toUpperCase() === String(p.studentId || '').toUpperCase()) {
      setDonationStatus(featureT('donationSelf'), 'error');
      return;
    }
    if (Number(p.points || 0) < amount) {
      alert(featureT('insufficientPoints'));
      return;
    }

    p.points = Number(p.points) - amount;
    writeJSON('tda-demo-user', p);

    const transfers = readJSON('tda-point-transfers', []);
    transfers.push({
      id: Date.now(),
      from: p.studentId,
      fromEmail: p.email,
      to: recipient.studentId,
      toEmail: recipient.email || null,
      amount,
      month: monthKey(),
      createdAt: new Date().toISOString(),
      type: 'direct-id-donation'
    });
    writeJSON('tda-point-transfers', transfers);

    if (recipient.email && recipient.email !== p.email) {
      const saved = readJSON('tda-demo-user', null);
      if (saved && saved.email === recipient.email) {
        saved.points = Number(saved.points || 0) + amount;
        writeJSON('tda-demo-user', saved);
      }
    }

    renderMyStudentId();
    setDonationStatus(`${featureT('donationSuccess')} ${recipient.studentId}`, 'ok');
  }

  function renderSupportRequests() {
    const box = $('supportRequests');
    const lim = $('supportLimit');
    if (!box || !lim) return;

    const profile = window.TDAAuth?.getProfile();
    const received = receivedThisMonth();
    lim.textContent = `${featureT('monthlyLimit')}: ${Math.max(0, 2 - received)} ${featureT('points')} (2 ${featureT('points')} / ${monthKey()})`;

    const reqs = readJSON('tda-support-requests', []).filter(r => r.status === 'open');
    if (!reqs.length) {
      box.innerHTML = `<div class="empty-state">${featureT('noRequests')}</div>`;
      return;
    }

    box.innerHTML = reqs.map(r => `
      <div class="request-card">
        <div>
          <strong>${escapeHtml(r.name)}</strong>
          <small>${escapeHtml(countryLabel(r.country))} · ID: ${escapeHtml(r.studentId || '—')} · ${escapeHtml(new Date(r.createdAt).toLocaleDateString())}</small>
        </div>
        <div class="request-actions">
          ${profile && profile.email !== r.email && received < 2 && Number(profile.points || 0) >= 1 ? `<button class="ghost-btn" data-donate="${r.id}">${featureT('donate')}</button>` : ''}
        </div>
      </div>
    `).join('');

    box.querySelectorAll('[data-donate]').forEach(b => {
      b.onclick = () => donatePoint(b.dataset.donate);
    });
  }

  function createRequest() {
    const p = window.TDAAuth?.getProfile();
    if (!p) {
      alert(featureT('profileRequired'));
      return;
    }
    if (Number(p.points || 0) !== 0) {
      alert(featureT('requestDenied'));
      return;
    }
    const country = p.country;
    const reqs = readJSON('tda-support-requests', []);
    if (reqs.some(r => r.email === p.email && r.status === 'open')) {
      alert(featureT('requestCreated'));
      return;
    }
    reqs.push({
      id: 'r' + Date.now(),
      studentId: p.studentId,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || featureT('demo'),
      email: p.email,
      country,
      amount: 1,
      status: 'open',
      createdAt: new Date().toISOString()
    });
    writeJSON('tda-support-requests', reqs);
    renderSupportRequests();
    alert(featureT('requestCreated'));
  }

  function donatePoint(requestId) {
    const p = window.TDAAuth?.getProfile();
    const reqs = readJSON('tda-support-requests', []);
    const r = reqs.find(x => x.id === requestId && x.status === 'open');
    if (!p || !r) return;

    const received = readJSON('tda-point-transfers', [])
      .filter(x => x.to === r.email && x.month === monthKey())
      .reduce((a, b) => a + Number(b.amount || 0), 0);

    if (received >= 2) {
      alert(featureT('supportLimitReached'));
      return;
    }
    if (Number(p.points || 0) < 1) {
      alert(featureT('insufficientPoints'));
      return;
    }

    p.points = Number(p.points) - 1;
    writeJSON('tda-demo-user', p);

    const transfers = readJSON('tda-point-transfers', []);
    transfers.push({
      id: Date.now(),
      from: p.email,
      to: r.email,
      amount: 1,
      month: monthKey(),
      createdAt: new Date().toISOString()
    });
    writeJSON('tda-point-transfers', transfers);

    if (received + 1 >= 2) r.status = 'closed';
    writeJSON('tda-support-requests', reqs);
    renderSupportRequests();
    alert(featureT('donationDone'));
  }

  const COMMUNITY_COUNTRIES = ['Türkiye', 'Azerbaycan', 'Kazakistan', 'Kırgızistan', 'Özbekistan', 'Türkmenistan', 'KKTC'];

  function updateRoomCards() {
    const cards = [...document.querySelectorAll('.community-room-card')];
    cards.forEach((card, i) => {
      const country = COMMUNITY_COUNTRIES[i];
      const h3 = card.querySelector('h3');
      const p = card.querySelector('p');
      if (h3) h3.textContent = countryLabel(country) + ' ' + featureT('roomSuffix');
      if (p) p.textContent = featureT('roomDesc');
    });
    const grid = document.querySelector('.community-rooms-grid');
    if (grid) grid.setAttribute('aria-label', featureT('roomsAria'));
  }

  function initCommunityModal() {
    const modal = $('communityModal');
    const title = $('communityModalTitle');
    const chat = $('communityChat');
    const close = $('communityModalClose');
    const cards = [...document.querySelectorAll('.community-room-card')];

    function openRoom(country) {
      if (!modal) return;
      modal.dataset.currentCountry = country;
      if (title) title.textContent = countryLabel(country) + ' ' + featureT('roomChatTitle', { fallback: 'Sohbet Odası' });
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeRoom() {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    cards.forEach((card, index) => {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('click', () => {
        const country = COMMUNITY_COUNTRIES[index] || 'Türkiye';
        openRoom(country);
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });
    });

    document.querySelectorAll('.community-ready-message').forEach(button => {
      button.addEventListener('click', () => {
        const bubble = document.createElement('div');
        bubble.className = 'community-message user';
        bubble.textContent = button.textContent;
        chat?.appendChild(bubble);
        if (chat) chat.scrollTop = chat.scrollHeight;
      });
    });

    close?.addEventListener('click', closeRoom);
    modal?.addEventListener('click', event => {
      if (event.target === modal) closeRoom();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeRoom();
    });

    updateRoomCards();
  }

  function init() {
    initCommunityModal();
    renderSupportRequests();
    renderMyStudentId();

    $('requestPointBtn')?.addEventListener('click', createRequest);
    $('donateByIdBtn')?.addEventListener('click', donateByStudentId);

    window.addEventListener('tda:languageChanged', () => {
      renderSupportRequests();
      renderMyStudentId();
      updateRoomCards();
      const modal = $('communityModal');
      const title = $('communityModalTitle');
      if (modal && modal.classList.contains('open') && modal.dataset.currentCountry && title) {
        title.textContent = countryLabel(modal.dataset.currentCountry) + ' ' + featureT('roomChatTitle', { fallback: 'Sohbet Odası' });
      }
    });

    window.addEventListener('tda:profileUpdated', () => {
      renderMyStudentId();
      renderSupportRequests();
    });
  }

  return {
    init,
    renderSupportRequests,
    renderMyStudentId,
    donateByStudentId,
    createRequest
  };
})();
