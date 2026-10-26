/**
 * =================================================================================================
 * TÜRK DÜNYASI BECERİ AĞI - AYDINLIK TEMA SANAL ÇALIŞMA ODASI MOTORU (STUDY ROOM)
 * =================================================================================================
 * - 10 Farklı Salon (Rooms) ve Her Salonda 50 Çalışma Masası Kapasitesi (500 Masa)
 * - Dinamik Canlı Kapasite ve Doluluk Oranları (Örn: "Salon 1 - 14/50 Dolu")
 * - 50 Masalık Ferah Kütüphane Salonu (Boş/Dolu Masalar, Yumuşak 2.5D Gölgeler)
 * - Bitmoji Entegrasyonu: Seçilen Herhangi Bir Masaya Sinematik Zoom-In & Oturma
 * - Light Mode Floating Pomodoro & Çok Kanallı Web Audio API Sentezleyicisi
 * =================================================================================================
 */

window.TDAStudyRoom = (function() {
  const STORAGE_TODO_KEY = 'tda-iso-todos-v2';
  const STORAGE_POMO_KEY = 'tda-iso-pomo-streak-v2';
  const STORAGE_SESSION_KEY = 'tda-iso-active-session-v2';

  // --- 1. 10 FARKLI SALON VE ANLIK VERİLER ---
  const ROOMS = [
    { id: 'room-1', name: 'Salon 1', subtitle: 'Ulu Bozkır Salonu', icon: '🏛️', baseOccupancy: 14 },
    { id: 'room-2', name: 'Salon 2', subtitle: 'Semerkant Kitaplığı', icon: '🕌', baseOccupancy: 10 },
    { id: 'room-3', name: 'Salon 3', subtitle: 'Divan-ı Lügat', icon: '📜', baseOccupancy: 22 },
    { id: 'room-4', name: 'Salon 4', subtitle: 'Kaşgar İlim Odası', icon: '🏔️', baseOccupancy: 8 },
    { id: 'room-5', name: 'Salon 5', subtitle: 'Ötüken Araştırma', icon: '🌲', baseOccupancy: 16 },
    { id: 'room-6', name: 'Salon 6', subtitle: 'Buhara Kütüphanesi', icon: '✨', baseOccupancy: 12 },
    { id: 'room-7', name: 'Salon 7', subtitle: 'Horasan Salonu', icon: '🌌', baseOccupancy: 6 },
    { id: 'room-8', name: 'Salon 8', subtitle: 'Hoca Ahmed Yesevi', icon: '🕊️', baseOccupancy: 15 },
    { id: 'room-9', name: 'Salon 9', subtitle: 'Çankaya Çalışma Evi', icon: '🎓', baseOccupancy: 20 },
    { id: 'room-10', name: 'Salon 10', subtitle: 'Gökbörü Gençlik Alanı', icon: '🐺', baseOccupancy: 0 }
  ];

  const TOTAL_DESKS_PER_ROOM = 50;

  // --- 2. ÇEVRİM İÇİ TÜRK DÜNYASI ÖĞRENCİ HAVUZU ---
  const PEER_STUDENTS_POOL = [
    { name: 'Müslüme', country: 'Kazakistan', flag: '🇰🇿', city: 'Almatı', status: '📖 Kazak Dili & Dilbilim', avatarSeed: 'MuslumeKZ' },
    { name: 'Nigar Məmmədova', country: 'Azerbaycan', flag: '🇦🇿', city: 'Bakü', status: '🎨 Minyatür Sanatı Okuması', avatarSeed: 'NigarMammedova' },
    { name: 'Bekzod Karimov', country: 'Özbekistan', flag: '🇺🇿', city: 'Semerkant', status: '💻 İpek Yolu Mimarisi & Kodlama', avatarSeed: 'BekzodKarimov' },
    { name: 'Caner Yıldız', country: 'Türkiye', flag: '🇹🇷', city: 'İstanbul', status: '📐 Tarihi Restorasyon Çizimleri', avatarSeed: 'CanerYildiz' },
    { name: 'Aygül Asanova', country: 'Kırgızistan', flag: '🇰🇬', city: 'Bişkek', status: '✍️ Cengiz Aytmatov Çözümlemeleri', avatarSeed: 'AygulAsan' },
    { name: 'Batyr Annayev', country: 'Türkmenistan', flag: '🇹🇲', city: 'Aşkabat', status: '📚 Mahtumkulu Divanı Çevirisi', avatarSeed: 'BatyrAnna' },
    { name: 'Gülşah Denktaş', country: 'KKTC', flag: '🇹🇷', city: 'Lefkoşa', status: '📜 Akdeniz Deniz Hukuku', avatarSeed: 'GulsahDenktas' },
    { name: 'Timur Halilov', country: 'Özbekistan', flag: '🇺🇿', city: 'Buhara', status: '🧬 Biyoteknoloji & Genetik', avatarSeed: 'TimurHalil' },
    { name: 'Leyla Aliyeva', country: 'Azerbaycan', flag: '🇦🇿', city: 'Gence', status: '💻 Algoritma & Veri Yapıları', avatarSeed: 'LeylaAli' },
    { name: 'Arman Sauytbay', country: 'Kazakistan', flag: '🇰🇿', city: 'Astana', status: '📊 Finansal Modelleme', avatarSeed: 'ArmanSauyt' },
    { name: 'Elif Şahin', country: 'Türkiye', flag: '🇹🇷', city: 'Ankara', status: '🔬 Moleküler Biyoloji', avatarSeed: 'ElifSahin' },
    { name: 'Samat Joldoshev', country: 'Kırgızistan', flag: '🇰🇬', city: 'Oş', status: '🏔️ Jeoloji & Madencilik', avatarSeed: 'SamatJold' },
    { name: 'Döwlet Mergenow', country: 'Türkmenistan', flag: '🇹🇲', city: 'Merv', status: '📜 Selçuklu Tarihi Araştırması', avatarSeed: 'DowletMerg' },
    { name: 'Zeynep Kaya', country: 'Türkiye', flag: '🇹🇷', city: 'İzmir', status: '🎨 UI/UX ve Tasarım Sistemleri', avatarSeed: 'ZeynepKaya' },
    { name: 'Şamil İsmayılov', country: 'Azerbaycan', flag: '🇦🇿', city: 'Şuşa', status: '🎵 Türk Dünyası Etnomüzikoloji', avatarSeed: 'SamilIsmay' },
    { name: 'Dinara Oralova', country: 'Kazakistan', flag: '🇰🇿', city: 'Çimkent', status: '💻 Mobil Uygulama Geliştirme', avatarSeed: 'DinaraOral' },
    { name: 'Murad Orazow', country: 'Türkmenistan', flag: '🇹🇲', city: 'Türkmenabat', status: '📐 İnşaat & Statik Hesap', avatarSeed: 'MuradOraz' },
    { name: 'Barchinoy Rustamova', country: 'Özbekistan', flag: '🇺🇿', city: 'Hiva', status: '🏺 Seramik ve Çini Sanatı', avatarSeed: 'Barchinoy' },
    { name: 'Almaz Bekov', country: 'Kırgızistan', flag: '🇰🇬', city: 'Karakol', status: '🌲 Çevre Bilimleri & Ekoloji', avatarSeed: 'AlmazBek' },
    { name: 'Deniz Eren', country: 'Türkiye', flag: '🇹🇷', city: 'Bursa', status: '🤖 Yapay Zeka & Makine Öğrenimi', avatarSeed: 'DenizEren' },
    { name: 'Sevinç Mirzayeva', country: 'Özbekistan', flag: '🇺🇿', city: 'Taşkent', status: '🌐 Uluslararası Ticaret', avatarSeed: 'SevincMirza' },
    { name: 'Ceyhun Memmedov', country: 'Azerbaycan', flag: '🇦🇿', city: 'Sumgayıt', status: '⚡ Yenilenebilir Enerji', avatarSeed: 'CeyhunMem' },
    { name: 'Kuanysh Baurzhan', country: 'Kazakistan', flag: '🇰🇿', city: 'Kökşetav', status: '📖 Göktürk Yazıtları İncelemesi', avatarSeed: 'KuanyshB' },
    { name: 'Oğuzhan Koç', country: 'Türkiye', flag: '🇹🇷', city: 'Trabzon', status: '🚢 Denizcilik & Lojistik', avatarSeed: 'OguzhanKoc' },
    { name: 'Nursultan Toktosunov', country: 'Kırgızistan', flag: '🇰🇬', city: 'Narin', status: '💻 Siber Güvenlik Analizi', avatarSeed: 'NursultanT' }
  ];

  // --- 3. MERKEZİ REAKTİF STATE DEPOSU ---
  const state = {
    // 3.1 Salon ve Masa Yönetimi
    activeRoomId: 'room-1',
    userDeskNumber: null, // Oturulan masa no: 1..50
    userSeatedRoomId: null, // Oturulan salon id'si
    targetDeskNumber: null, // Modal için seçilen masa no
    sceneState: 'LOBBY', // 'LOBBY' | 'GOAL_MODAL' | 'TRANSITION' | 'FOCUS'
    activeGoal: 'Derin Odaklanma Seansı',
    selectedDurationMinutes: 25,
    activePeerPopover: null,
    zoomLevel: 1.0,

    // Her salonun 50 masalık yerleşim haritası (Cache)
    roomDeskAllocations: {},

    // 3.2 Pomodoro Zamanlayıcı
    pomodoro: {
      mode: 'work', // 'work' | 'shortBreak' | 'longBreak'
      timeLeft: 25 * 60,
      totalDuration: 25 * 60,
      isRunning: false,
      intervalId: null,
      completedSessions: 0
    },

    // 3.3 Günlük Hedefler ve Görevler
    todos: [],

    // 3.4 Ortam Sesleri Motoru (Web Audio API)
    ambient: {
      audioCtx: null,
      isUnlocked: false,
      tracks: {
        rain: { name: 'Bozkır Yağmuru', icon: '🌧️', active: false, volume: 50, nodes: null },
        cafe: { name: 'Semerkant Çayhanesi', icon: '☕', active: false, volume: 40, nodes: null },
        fire: { name: 'Otağ Ateşi', icon: '🔥', active: false, volume: 50, nodes: null },
        nature: { name: 'Yayla Rüzgarı & Doğa', icon: '🍃', active: false, volume: 40, nodes: null },
        lofi: { name: 'Lo-Fi Beats (Rhodes)', icon: '🎵', active: false, volume: 60, nodes: null }
      }
    }
  };

  // --- 4. BİTMOJİ AVATAR MODELİ (Mektuplaşma Modülünden Çekme) ---

  function fetchCurrentAvatarConfig() {
    if (window.TDAMessaging && typeof window.TDAMessaging.getMyAvatarConfig === 'function') {
      return window.TDAMessaging.getMyAvatarConfig();
    }
    try {
      const raw = localStorage.getItem('tda-my-avatar-config-v2');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return {
      skinColor: 'f8d9ce',
      skinTone: 'f8d9ce',
      eyeColor: '3b2219',
      hairColor: '0e0e0e',
      hair: 'long01',
      mood: 'variant01',
      eyes: 'variant01',
      accessories: 'none',
      backgroundColor: 'transparent'
    };
  }

  function getUserAvatarUrl() {
    const c = fetchCurrentAvatarConfig();
    const skin = (c.skinColor || c.skinTone || 'f8d9ce').replace('#', '');
    const hair = c.hair || 'long01';
    const hairColor = c.hairColor || '0e0e0e';
    const eyes = c.eyes || 'variant01';
    const mouth = c.mood || 'variant01';
    let url = `https://api.dicebear.com/7.x/adventurer/svg?seed=TurkPenpal&skinColor=${encodeURIComponent(skin)}&hair=${encodeURIComponent(hair)}&hairProbability=100&hairColor=${encodeURIComponent(hairColor)}&eyes=${encodeURIComponent(eyes)}&mouth=${encodeURIComponent(mouth)}&backgroundColor=transparent`;
    if (c.accessories && c.accessories !== 'none') {
      url += `&glasses=${encodeURIComponent(c.accessories)}&glassesProbability=100`;
    } else {
      url += `&glassesProbability=0`;
    }
    return url;
  }

  // --- 5. 10 SALONUN 50 MASALIK YERLEŞİM VE KAPASİTE MOTORU ---

  function generateRoomAllocations(roomId) {
    if (state.roomDeskAllocations[roomId]) {
      return state.roomDeskAllocations[roomId];
    }

    const room = ROOMS.find(r => r.id === roomId) || ROOMS[0];
    const count = room.baseOccupancy;
    const desks = [];

    // Belirlenen kapasiteye göre masaları seç
    // Sabit ama doğal dağılım için deterministik algoritma
    const occupiedDeskIndices = new Set();
    let seed = 0;
    for (let i = 0; i < roomId.length; i++) seed += roomId.charCodeAt(i);

    while (occupiedDeskIndices.size < count && occupiedDeskIndices.size < TOTAL_DESKS_PER_ROOM) {
      seed = (seed * 9301 + 49297) % 233280;
      const deskNum = 1 + Math.floor((seed / 233280) * TOTAL_DESKS_PER_ROOM);
      occupiedDeskIndices.add(deskNum);
    }

    let peerIndex = 0;
    for (let deskNo = 1; deskNo <= TOTAL_DESKS_PER_ROOM; deskNo++) {
      if (occupiedDeskIndices.has(deskNo)) {
        const student = PEER_STUDENTS_POOL[peerIndex % PEER_STUDENTS_POOL.length];
        peerIndex++;
        desks.push({
          deskNo,
          occupied: true,
          student: {
            ...student,
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${student.avatarSeed}&backgroundColor=transparent`
          }
        });
      } else {
        desks.push({
          deskNo,
          occupied: false,
          student: null
        });
      }
    }

    state.roomDeskAllocations[roomId] = desks;
    return desks;
  }

  function getRoomOccupancy(roomId) {
    const desks = generateRoomAllocations(roomId);
    let count = desks.filter(d => d.occupied).length;
    if (state.userDeskNumber && state.userSeatedRoomId === roomId) {
      count++;
    }
    return count;
  }

  // --- 6. SALON SEÇİM BARI RENDER MOTORU ---

  function renderRoomSelector() {
    const tabsContainer = document.getElementById('roomTabsScroll');
    const summaryLabel = document.getElementById('roomCurrentCapacitySummary');
    if (!tabsContainer) return;

    let totalOnlineAllRooms = 0;

    const html = ROOMS.map(room => {
      const occ = getRoomOccupancy(room.id);
      totalOnlineAllRooms += occ;
      const isFull = occ >= TOTAL_DESKS_PER_ROOM;
      const isEmpty = occ === 0;
      const isActive = room.id === state.activeRoomId;

      let badgeClass = 'room-tab-badge';
      let badgeText = `${occ}/${TOTAL_DESKS_PER_ROOM} Dolu`;
      if (isFull) {
        badgeClass += ' badge-full';
        badgeText = '50/50 Tam Dolu';
      } else if (isEmpty) {
        badgeClass += ' badge-empty';
        badgeText = '0/50 Boş';
      }

      return `
        <button 
          type="button" 
          class="btn-room-tab ${isActive ? 'active' : ''}" 
          data-room-id="${room.id}"
          title="${escapeHtml(room.subtitle)}"
        >
          <span class="room-tab-icon">${room.icon}</span>
          <div class="room-tab-text">
            <span class="room-tab-name">${escapeHtml(room.name)}</span>
            <span class="${badgeClass}">${badgeText}</span>
          </div>
        </button>
      `;
    }).join('');

    tabsContainer.innerHTML = html;

    const currentRoom = ROOMS.find(r => r.id === state.activeRoomId) || ROOMS[0];
    const currentOcc = getRoomOccupancy(currentRoom.id);
    if (summaryLabel) {
      summaryLabel.textContent = `${currentRoom.name} (${currentOcc}/${TOTAL_DESKS_PER_ROOM} Dolu) • Toplam ${totalOnlineAllRooms} Çevrim İçi`;
    }

    // Salon Değiştirme Dinleyicileri
    tabsContainer.querySelectorAll('.btn-room-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const roomId = btn.dataset.roomId;
        switchRoom(roomId);
      });
    });
  }

  function switchRoom(roomId) {
    if (roomId === state.activeRoomId) return;
    state.activeRoomId = roomId;
    renderRoomSelector();
    renderHallDesks();

    const room = ROOMS.find(r => r.id === roomId);
    showToast(`🏛️ ${room ? room.subtitle : 'Yeni Salon'} görüntülendi.`);

    // Eğer kullanıcı bu salonda oturmuyorsa lobiye al
    if (state.userSeatedRoomId !== roomId) {
      setSceneState('LOBBY');
    } else {
      setSceneState('FOCUS');
    }
  }

  // --- 7. 50 MASALIK DEV SALON GRID MOTORU ---

  function renderHallDesks() {
    const grid = document.getElementById('grandDesksGrid');
    if (!grid) return;

    const desks = generateRoomAllocations(state.activeRoomId);
    let html = '';

    desks.forEach((deskItem, idx) => {
      // Her 10 masada bir koridor bolucusu ekle
      if (idx > 0 && idx % 10 === 0) {
        const rowNumber = Math.floor(idx / 10);
        html += `
          <div class="grand-hall-aisle-divider">
            <span class="aisle-label">Koridor ${rowNumber} &bull; Sessiz &#x00C7;al&#x0131;&#x015F;ma B&ouml;lgesi</span>
          </div>
        `;
      }

      const deskNo = deskItem.deskNo;
      const isUserDeskHere = (state.userDeskNumber === deskNo && state.userSeatedRoomId === state.activeRoomId);
      const isOccupied = deskItem.occupied;

      // 1. ZEMIN DUSEN GOLGE
      const shadowHtml = `<div class="desk-floor-shadow"></div>`;

      // 2. 2.5D FIZIKSEL SANDALYE (Z-Index 2: Masanin Arkasinda)
      const chairHtml = `
        <div class="chair-3d-unit">
          <div class="chair-backrest"></div>
          <div class="chair-seat"></div>
          <div class="chair-legs"></div>
          ${!isOccupied && !isUserDeskHere ? `
            <div class="chair-empty-indicator">
              <span>Masaya Otur</span>
            </div>
          ` : ''}
        </div>
      `;

      // 3. BITMOJI AVATAR KATMANI (Z-Index 3: Sandalyenin Ustunde, Masanin Arkasinda)
      let avatarHtml = '';
      if (isUserDeskHere) {
        const userAvatarUrl = getUserAvatarUrl();
        avatarHtml = `
          <div class="seated-avatar-layer">
            <div class="avatar-seated-figure">
              <img src="${userAvatarUrl}" alt="Sen" class="avatar-seated-img" />
              <div class="student-name-tag">
                <span class="country-flag">&#x2B50;</span>
                <span class="student-name">Sen</span>
              </div>
            </div>
          </div>
        `;
      } else if (isOccupied) {
        const st = deskItem.student;
        avatarHtml = `
          <div class="seated-avatar-layer">
            <div class="avatar-seated-figure">
              <img src="${st.avatarUrl}" alt="${escapeHtml(st.name)}" class="avatar-seated-img" loading="lazy" />
              <div class="student-name-tag">
                <span class="country-flag">${st.flag}</span>
                <span class="student-name">${escapeHtml(st.name)}</span>
              </div>
            </div>
          </div>
        `;
      }

      // 4. FIZIKSEL AHSAP MASA (Z-Index 5: Avatarin alt govdesini fiziksel olarak kapatir!)
      const tableHtml = `
        <div class="physical-wood-table">
          <div class="tabletop-surface">
            <div class="tabletop-front-lip"></div>
            
            <!-- Masa Ustu Fiziksel Objeler (Props) -->
            <div class="desk-props-container">
              <!-- 4.1 Acik Laptop -->
              <div class="prop-laptop">
                <div class="laptop-screen">
                  <div class="screen-glow"></div>
                  <div class="screen-code-lines"></div>
                </div>
                <div class="laptop-base">
                  <div class="laptop-trackpad"></div>
                </div>
              </div>

              <!-- 4.2 Klasik Bankaci Masa Lambasi & Sicak Isik Halesi -->
              <div class="prop-lamp">
                <div class="lamp-shade"></div>
                <div class="lamp-stem"></div>
                <div class="lamp-base"></div>
                <div class="lamp-glow-cone"></div>
              </div>

              <!-- 4.3 Renkli Kitap Yigini & Defter -->
              <div class="prop-books">
                <div class="book-spine book-1"></div>
                <div class="book-spine book-2"></div>
                <div class="open-notebook"></div>
              </div>

              <!-- 4.4 Sicak Kupa -->
              <div class="prop-mug">
                <div class="mug-steam"></div>
              </div>
            </div>
          </div>

          <!-- 4.5 Kalin Masa Ayaklari & Destek Kirisi -->
          <div class="table-legs-row">
            <div class="desk-leg"></div>
            <div class="desk-crossbar"></div>
            <div class="desk-leg"></div>
          </div>
        </div>
      `;

      // 5. MASA PIRINC KUNYESI (01 - 50)
      const brassPlateHtml = `<div class="desk-brass-plate">Masa ${String(deskNo).padStart(2, '0')}</div>`;

      // Istasyon Sinifi
      let unitClass = 'iso-game-desk-unit hall-desk-station';
      let titleAttr = '';
      let dataPeerAttr = '';

      if (isUserDeskHere) {
        unitClass += ' user-seated-desk user-occupied-desk';
        titleAttr = `Masa ${deskNo} &bull; Senin Masan (Odakta)`;
      } else if (isOccupied) {
        unitClass += ' occupied-desk';
        titleAttr = `Masa ${deskNo} &bull; ${escapeHtml(deskItem.student.name)} (${deskItem.student.country})`;
        dataPeerAttr = `data-peer-data='${escapeHtml(JSON.stringify(deskItem.student))}'`;
      } else {
        unitClass += ' empty-desk';
        titleAttr = `Masa ${deskNo} &bull; &#x00C7;al&#x0131;&#x015F;maya Ba&#x015F;lamak &#x0130;&ccedil;in Sandalyeye T&#x0131;kla`;
      }

      html += `
        <div 
          class="${unitClass}" 
          id="deskStation_${deskNo}" 
          data-desk-no="${deskNo}" 
          ${dataPeerAttr}
          title="${titleAttr}"
        >
          ${shadowHtml}
          ${chairHtml}
          ${avatarHtml}
          ${tableHtml}
          ${brassPlateHtml}
        </div>
      `;
    });

    grid.innerHTML = html;
    bindDeskClickEvents();
  }

  function bindDeskClickEvents() {
    // 1. Bos Masalara Tiklama -> Asama 2: Hedef Modalini Ac
    document.querySelectorAll('.iso-game-desk-unit.empty-desk').forEach(el => {
      el.addEventListener('click', () => {
        const deskNo = parseInt(el.dataset.deskNo, 10);
        openGoalModalForDesk(deskNo);
      });
    });

    // 2. Dolu Masalara Tiklama -> Sosyal Reaksiyon Popover'i Ac
    document.querySelectorAll('.iso-game-desk-unit.occupied-desk').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        try {
          const raw = el.dataset.peerData;
          if (raw) {
            const peer = JSON.parse(raw);
            openSocialPopover(peer, el);
          }
        } catch(err) {}
      });
    });
  }

  // --- 8. ASAMA 2 & 3: SINEMATIK ZOOM VE SEANS BASLATMA ---

  function openGoalModalForDesk(deskNo) {
    unlockAudioContext();
    state.targetDeskNumber = deskNo;

    const modal = document.getElementById('studyGoalModal');
    const title = document.querySelector('.goal-modal-title');
    const sub = document.querySelector('.goal-modal-subtitle');
    const input = document.getElementById('studyGoalInput');

    const room = ROOMS.find(r => r.id === state.activeRoomId) || ROOMS[0];

    if (title) title.textContent = `Masa ${String(deskNo).padStart(2, '0')} Seçildi`;
    if (sub) sub.textContent = `${room.subtitle} • Canlı Odaklanma Alanı`;
    if (input) {
      input.value = state.activeGoal !== 'Derin Odaklanma Seansı' ? state.activeGoal : '';
      setTimeout(() => input.focus(), 150);
    }

    if (modal) modal.style.display = 'flex';
  }

  function closeGoalModal() {
    const modal = document.getElementById('studyGoalModal');
    if (modal) modal.style.display = 'none';
    state.targetDeskNumber = null;
  }

  function onConfirmStartSession() {
    unlockAudioContext();

    const input = document.getElementById('studyGoalInput');
    const goalText = (input && input.value.trim()) ? input.value.trim() : 'Derin Çalışma & Odaklanma';
    state.activeGoal = goalText;
    state.userDeskNumber = state.targetDeskNumber || 1;
    state.userSeatedRoomId = state.activeRoomId;

    closeGoalModal();

    // 1. Masaları tekrar çiz (Kullanıcı avatarı masaya oturur)
    renderHallDesks();
    renderRoomSelector();

    // 2. TRANSITION (Aşama 3): Seçilen masaya doğru akıcı kamera yakınlaşması (Smooth Zoom-In)
    setSceneState('TRANSITION');
    smoothZoomToDesk(state.userDeskNumber);

    // Seans süresini ayarla
    setWorkDuration(state.selectedDurationMinutes);

    // 3. FOCUS (Aşama 4): Odak moduna geç ve Floating Timer'ı aç
    setTimeout(() => {
      setSceneState('FOCUS');
      startPomodoro();
      const goalLabel = document.getElementById('pomoActiveGoalText');
      if (goalLabel) goalLabel.textContent = `Hedef: ${goalText}`;
      showToast(`🎯 Masa ${state.userDeskNumber}'de seans başladı. Verimli çalışmalar!`);
    }, 900);

    saveActiveSession();
  }

  function smoothZoomToDesk(deskNo) {
    const deskEl = document.getElementById(`deskStation_${deskNo}`);
    const viewportInner = document.getElementById('grandHallViewportInner');
    const cameraRig = document.getElementById('grandCameraRig');

    if (deskEl && viewportInner) {
      // Masayı görünür alanın merkezine akıcı bir şekilde kaydır
      deskEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    if (cameraRig) {
      // Kamerayı zarifçe %130 büyüt
      cameraRig.style.transform = 'scale(1.75)';
    }
  }

  function resetCameraZoom() {
    const cameraRig = document.getElementById('grandCameraRig');
    if (cameraRig) {
      cameraRig.style.transform = 'scale(1.0)';
    }
  }

  function onUserLeaveDesk() {
    pausePomodoro();
    state.userDeskNumber = null;
    state.userSeatedRoomId = null;
    localStorage.removeItem(STORAGE_SESSION_KEY);

    resetCameraZoom();
    renderHallDesks();
    renderRoomSelector();
    setSceneState('LOBBY');
    showToast('🚪 Masadan kalkıldı ve salona dönüldü.');
  }

  function saveActiveSession() {
    try {
      const data = {
        userDeskNumber: state.userDeskNumber,
        userSeatedRoomId: state.userSeatedRoomId,
        activeGoal: state.activeGoal,
        duration: state.selectedDurationMinutes
      };
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  function setSceneState(newState) {
    state.sceneState = newState;
    const viewport = document.getElementById('isoLibraryViewport');
    const header = document.querySelector('.study-room-header');
    const floatingPomo = document.getElementById('isoFloatingPomodoro');
    const btnLeave = document.getElementById('btnLeaveDesk');

    if (viewport) {
      viewport.setAttribute('data-scene-state', newState);
    }

    if (newState === 'LOBBY') {
      if (header) header.classList.remove('hidden-in-focus');
      if (floatingPomo) floatingPomo.style.display = 'none';
      if (btnLeave) btnLeave.style.display = 'none';
    } else if (newState === 'FOCUS') {
      if (header) header.classList.add('hidden-in-focus');
      if (floatingPomo) floatingPomo.style.display = 'block';
      if (btnLeave) btnLeave.style.display = 'flex';
    }
  }

  // --- 9. SOSYAL ETKİLEŞİM MODALI ---

  function openSocialPopover(peer, stationEl) {
    state.activePeerPopover = peer;
    const popover = document.getElementById('isoSocialPopover');
    if (!popover) return;

    document.getElementById('socialPeerAvatar').src = peer.avatarUrl;
    document.getElementById('socialPeerFlag').textContent = peer.flag;
    document.getElementById('socialPeerName').textContent = peer.name;
    document.getElementById('socialPeerCity').textContent = `${peer.city}, ${peer.country}`;
    document.getElementById('socialPeerStatus').textContent = peer.status;

    popover.style.display = 'block';
  }

  function closeSocialPopover() {
    const popover = document.getElementById('isoSocialPopover');
    if (popover) popover.style.display = 'none';
    state.activePeerPopover = null;
  }

  function sendReactionToPeer(emoji) {
    if (!state.activePeerPopover) return;
    const peer = state.activePeerPopover;

    closeSocialPopover();
    showToast(`${peer.name} öğrencisine "${emoji}" reaksiyonu gönderdin!`);
  }

  function showToast(message) {
    const existing = document.querySelector('.iso-toast-message');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'iso-toast-message';
    toast.textContent = message;
    const viewport = document.getElementById('isoLibraryViewport');
    if (viewport) viewport.appendChild(toast);
    setTimeout(() => toast.remove(), 2300);
  }

  // --- 10. LIGHT MODE FLOATING POMODORO ZAMANLAYICI ---

  function initPomodoro() {
    try {
      const savedStreak = localStorage.getItem(STORAGE_POMO_KEY);
      if (savedStreak) state.pomodoro.completedSessions = parseInt(savedStreak, 10) || 0;
    } catch(e) {}

    updatePomodoroDisplay();
  }

  function setWorkDuration(minutes) {
    state.selectedDurationMinutes = minutes;
    if (state.pomodoro.mode === 'work') {
      state.pomodoro.totalDuration = minutes * 60;
      if (!state.pomodoro.isRunning) {
        state.pomodoro.timeLeft = minutes * 60;
      }
      updatePomodoroDisplay();
    }
  }

  function setPomodoroMode(mode) {
    if (state.pomodoro.isRunning) pausePomodoro();
    state.pomodoro.mode = mode;

    let mins = state.selectedDurationMinutes;
    if (mode === 'shortBreak') mins = 5;
    if (mode === 'longBreak') mins = 15;

    state.pomodoro.totalDuration = mins * 60;
    state.pomodoro.timeLeft = mins * 60;

    document.querySelectorAll('.f-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const ring = document.getElementById('isoPomoRingProgress');
    if (ring) {
      ring.classList.toggle('mode-break', mode !== 'work');
    }

    updatePomodoroDisplay();
  }

  function startPomodoro() {
    unlockAudioContext();
    if (state.pomodoro.isRunning) return;
    state.pomodoro.isRunning = true;
    updatePomoButtons();

    state.pomodoro.intervalId = setInterval(() => {
      if (state.pomodoro.timeLeft > 0) {
        state.pomodoro.timeLeft--;
        updatePomodoroDisplay();
      } else {
        handlePomodoroComplete();
      }
    }, 1000);
  }

  function pausePomodoro() {
    state.pomodoro.isRunning = false;
    if (state.pomodoro.intervalId) {
      clearInterval(state.pomodoro.intervalId);
      state.pomodoro.intervalId = null;
    }
    updatePomoButtons();
  }

  function resetPomodoro() {
    pausePomodoro();
    state.pomodoro.timeLeft = state.pomodoro.totalDuration;
    updatePomodoroDisplay();
  }

  function handlePomodoroComplete() {
    pausePomodoro();
    playZenBellChime();

    if (state.pomodoro.mode === 'work') {
      state.pomodoro.completedSessions++;
      try {
        localStorage.setItem(STORAGE_POMO_KEY, String(state.pomodoro.completedSessions));
      } catch(e) {}

      const nextMode = (state.pomodoro.completedSessions % 4 === 0) ? 'longBreak' : 'shortBreak';
      showToast(`🎉 Tebrikler! Seansı tamamladın. Şimdi ${nextMode === 'longBreak' ? '15 dk Uzun Mola' : '5 dk Kısa Mola'} vakti.`);
      setPomodoroMode(nextMode);
    } else {
      showToast('☕ Mola sona erdi! Yeni bir çalışma seansına hazır mısın?');
      setPomodoroMode('work');
    }
    updatePomodoroDisplay();
  }

  function updatePomodoroDisplay() {
    const mins = Math.floor(state.pomodoro.timeLeft / 60);
    const secs = state.pomodoro.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const clock = document.getElementById('isoPomoClockDigits');
    if (clock) clock.textContent = timeStr;

    // Dairesel İlerleme Çemberi (Stroke-dasharray: 326)
    const ring = document.getElementById('isoPomoRingProgress');
    if (ring) {
      const progress = state.pomodoro.timeLeft / state.pomodoro.totalDuration;
      const offset = 326 - (326 * progress);
      ring.style.strokeDashoffset = offset;
    }

    const countEl = document.getElementById('isoPomoCompletedCount');
    if (countEl) countEl.textContent = state.pomodoro.completedSessions;
  }

  function updatePomoButtons() {
    const playBtn = document.getElementById('btnPomoPlay');
    if (!playBtn) return;
    const iconSvg = state.pomodoro.isRunning
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    playBtn.innerHTML = iconSvg;
  }

  // --- 11. İŞLEVSEL ÇOK KANALLI ORTAM SESLERİ MOTORU ---

  function unlockAudioContext() {
    if (!state.ambient.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.ambient.audioCtx = new AudioCtx();
    }
    if (state.ambient.audioCtx.state === 'suspended') {
      state.ambient.audioCtx.resume();
    }
    state.ambient.isUnlocked = true;
  }

  function startTrack(trackKey) {
    unlockAudioContext();
    const ctx = state.ambient.audioCtx;
    const track = state.ambient.tracks[trackKey];
    if (track.nodes) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((track.volume / 100) * 0.45, ctx.currentTime);
    masterGain.connect(ctx.destination);

    let nodes = { masterGain };

    if (trackKey === 'rain') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.12;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(820, ctx.currentTime);
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      nodes.source = noise;
    } else if (trackKey === 'fire') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() < 0.0025 ? (Math.random() * 2 - 1) * 0.95 : (Math.random() * 2 - 1) * 0.015;
      }
      const crackle = ctx.createBufferSource();
      crackle.buffer = buffer;
      crackle.loop = true;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1300, ctx.currentTime);
      bandpass.Q.setValueAtTime(2.2, ctx.currentTime);
      crackle.connect(bandpass);
      bandpass.connect(masterGain);
      crackle.start();
      nodes.source = crackle;
    } else if (trackKey === 'cafe') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.055;
      }
      const cafe = ctx.createBufferSource();
      cafe.buffer = buffer;
      cafe.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, ctx.currentTime);
      cafe.connect(filter);
      filter.connect(masterGain);
      cafe.start();
      nodes.source = cafe;
    } else if (trackKey === 'nature') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.07;
      }
      const wind = ctx.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.Q.setValueAtTime(3.2, ctx.currentTime);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
      lfoGain.gain.setValueAtTime(140, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      wind.connect(filter);
      filter.connect(masterGain);
      wind.start();
      nodes.source = wind;
      nodes.lfo = lfo;
    } else if (trackKey === 'lofi') {
      const chords = [
        [261.63, 311.13, 392.00, 466.16], // Cm7
        [174.61, 261.63, 311.13, 392.00], // Fm7
        [233.08, 293.66, 349.23, 440.00], // Bb7
        [155.56, 196.00, 233.08, 311.13]  // Ebmaj7
      ];
      let chordIndex = 0;
      const playChord = () => {
        if (!state.ambient.tracks.lofi.active) return;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;
        const t = ctx.currentTime;
        currentChord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);
          noteGain.gain.setValueAtTime(0.001, t + idx * 0.08);
          noteGain.gain.linearRampToValueAtTime(0.085, t + idx * 0.08 + 0.12);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 2.4);
          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 2.5);
        });
      };
      playChord();
      nodes.timerId = setInterval(playChord, 2600);
    }

    track.nodes = nodes;
    track.active = true;
    updateTrackUI(trackKey);
  }

  function stopTrack(trackKey) {
    const track = state.ambient.tracks[trackKey];
    if (!track.nodes) return;
    try {
      if (track.nodes.source) track.nodes.source.stop();
      if (track.nodes.lfo) track.nodes.lfo.stop();
      if (track.nodes.timerId) clearInterval(track.nodes.timerId);
    } catch(e) {}
    track.nodes = null;
    track.active = false;
    updateTrackUI(trackKey);
  }

  function toggleTrack(trackKey) {
    const track = state.ambient.tracks[trackKey];
    if (track.active) stopTrack(trackKey);
    else startTrack(trackKey);
  }

  function setTrackVolume(trackKey, volume) {
    const track = state.ambient.tracks[trackKey];
    track.volume = volume;
    if (track.nodes && track.nodes.masterGain && state.ambient.audioCtx) {
      state.ambient.audioCtx.resume();
      state.ambient.tracks[trackKey].nodes.masterGain.gain.setValueAtTime((volume / 100) * 0.45, state.ambient.audioCtx.currentTime);
    }
    const label = document.getElementById(`volVal_${trackKey}`);
    if (label) label.textContent = `%${volume}`;
  }

  function updateTrackUI(trackKey) {
    const card = document.getElementById(`ambItem_${trackKey}`);
    const btn = card?.querySelector('.btn-track-toggle');
    const track = state.ambient.tracks[trackKey];
    if (card) card.classList.toggle('active', track.active);
    if (btn) btn.textContent = track.active ? '■' : '▶';
  }

  function renderAmbientPanel() {
    const list = document.getElementById('ambientTracksScroll');
    if (!list) return;

    list.innerHTML = Object.entries(state.ambient.tracks).map(([key, track]) => `
      <div class="ambient-track-item ${track.active ? 'active' : ''}" id="ambItem_${key}">
        <div class="ambient-item-top">
          <span class="ambient-item-name">${track.icon} ${escapeHtml(track.name)}</span>
          <button type="button" class="btn-track-toggle" data-key="${key}">
            ${track.active ? '■' : '▶'}
          </button>
        </div>
        <div class="ambient-volume-row">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value="${track.volume}" 
            class="ambient-slider-clean" 
            data-key="${key}"
          />
          <span class="ambient-vol-pct" id="volVal_${key}">%${track.volume}</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-track-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleTrack(btn.dataset.key));
    });

    list.querySelectorAll('.ambient-slider-clean').forEach(slider => {
      slider.addEventListener('input', e => {
        setTrackVolume(e.target.dataset.key, parseInt(e.target.value, 10));
      });
    });
  }

  function playZenBellChime() {
    try {
      unlockAudioContext();
      const ctx = state.ambient.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 3.3);
    } catch(e) {}
  }

  // --- 12. GÜNLÜK HEDEFLER VE GÖREVLER (TO-DO LIST) ---

  function initTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_TODO_KEY);
      if (raw) {
        state.todos = JSON.parse(raw);
      } else {
        state.todos = [
          { id: 'td1', text: 'Türk Dünyası ortak beceri makalesini oku', completed: false },
          { id: 'td2', text: 'Bakü ve Almatı mektup taslaklarını tamamla', completed: true },
          { id: 'td3', text: '25 dakikalık derin odaklanma seansı yap', completed: false }
        ];
        saveTodos();
      }
    } catch(e) {
      state.todos = [];
    }
    renderTodoList();
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_TODO_KEY, JSON.stringify(state.todos));
    } catch(e) {}
  }

  function addTodo(text) {
    const clean = text ? text.trim() : '';
    if (!clean) return;
    state.todos.unshift({
      id: 'todo_' + Date.now(),
      text: clean,
      completed: false
    });
    saveTodos();
    renderTodoList();
  }

  function toggleTodo(id) {
    const item = state.todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      saveTodos();
      renderTodoList();
    }
  }

  function deleteTodo(id) {
    state.todos = state.todos.filter(t => t.id !== id);
    saveTodos();
    renderTodoList();
  }

  function renderTodoList() {
    const list = document.getElementById('todoListScroll');
    const badge = document.getElementById('isoTodoCountBadge');
    if (!list) return;

    const remaining = state.todos.filter(t => !t.completed).length;
    if (badge) badge.textContent = remaining;

    if (state.todos.length === 0) {
      list.innerHTML = `<li style="text-align:center;color:#64748b;font-size:11px;padding:14px 0;">Henüz hedef eklenmedi.</li>`;
      return;
    }

    list.innerHTML = state.todos.map(item => `
      <li class="todo-item-row ${item.completed ? 'completed' : ''}" data-id="${item.id}">
        <input 
          type="checkbox" 
          class="todo-checkbox-clean" 
          ${item.completed ? 'checked' : ''} 
          aria-label="Görevi tamamla"
        />
        <span class="todo-item-text">${escapeHtml(item.text)}</span>
        <button type="button" class="btn-del-todo" title="Sil">✕</button>
      </li>
    `).join('');

    list.querySelectorAll('.todo-checkbox-clean').forEach(box => {
      box.addEventListener('change', e => {
        const id = e.target.closest('.todo-item-row').dataset.id;
        toggleTodo(id);
      });
    });

    list.querySelectorAll('.btn-del-todo').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.closest('.todo-item-row').dataset.id;
        deleteTodo(id);
      });
    });
  }

  // --- 13. YARDIMCI VE BINDING İŞLEMLERİ ---

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function bindUI() {
    // 1. Kütüphaneye / Salona Geri Dönüş
    const btnLeave = document.getElementById('btnLeaveDesk');
    if (btnLeave) btnLeave.addEventListener('click', onUserLeaveDesk);

    // 2. Hedef Belirleme Modalı Butonları
    const btnStart = document.getElementById('btnStartStudySession');
    if (btnStart) btnStart.addEventListener('click', onConfirmStartSession);

    const btnCancelGoal = document.getElementById('btnCancelGoalModal');
    if (btnCancelGoal) btnCancelGoal.addEventListener('click', closeGoalModal);

    const btnCloseGoal = document.getElementById('btnCloseGoalModal');
    if (btnCloseGoal) btnCloseGoal.addEventListener('click', closeGoalModal);

    // Hazır Hedef Etiketleri (Chips)
    document.querySelectorAll('.goal-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('studyGoalInput');
        if (input) {
          input.value = chip.dataset.goal;
          input.focus();
        }
      });
    });

    // Seans Süresi Kartları
    document.querySelectorAll('.btn-duration-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.btn-duration-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mins = parseInt(card.dataset.mins, 10) || 25;
        state.selectedDurationMinutes = mins;
      });
    });

    // Enter Tuşuyla Seansı Başlatma
    const goalInput = document.getElementById('studyGoalInput');
    if (goalInput) {
      goalInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') onConfirmStartSession();
      });
    }

    // 3. Sosyal Etkileşim Butonları
    const btnCloseSocial = document.getElementById('btnCloseSocialPopover');
    if (btnCloseSocial) btnCloseSocial.addEventListener('click', closeSocialPopover);

    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        sendReactionToPeer(btn.dataset.reaction);
      });
    });

    // 4. Floating Pomodoro Kontrolleri
    const playBtn = document.getElementById('btnPomoPlay');
    if (playBtn) playBtn.addEventListener('click', () => {
      if (state.pomodoro.isRunning) pausePomodoro();
      else startPomodoro();
    });

    const resetBtn = document.getElementById('btnPomoReset');
    if (resetBtn) resetBtn.addEventListener('click', resetPomodoro);

    document.querySelectorAll('.f-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setPomodoroMode(btn.dataset.mode));
    });

    const btnEditGoal = document.getElementById('btnEditPomoGoal');
    if (btnEditGoal) btnEditGoal.addEventListener('click', () => {
      if (state.userDeskNumber) openGoalModalForDesk(state.userDeskNumber);
    });

    // 5. Salon Zoom & Pan Kontrolleri
    const btnZoomIn = document.getElementById('btnHallZoomIn');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        state.zoomLevel = Math.min(1.8, state.zoomLevel + 0.2);
        applyCameraZoom();
      });
    }

    const btnZoomOut = document.getElementById('btnHallZoomOut');
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        state.zoomLevel = Math.max(0.7, state.zoomLevel - 0.2);
        applyCameraZoom();
      });
    }

    const btnResetView = document.getElementById('btnHallResetView');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        state.zoomLevel = 1.0;
        applyCameraZoom();
        const viewportInner = document.getElementById('grandHallViewportInner');
        if (viewportInner) viewportInner.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      });
    }

    const btnFindEmpty = document.getElementById('btnHallFindEmpty');
    if (btnFindEmpty) {
      btnFindEmpty.addEventListener('click', () => {
        const desks = generateRoomAllocations(state.activeRoomId);
        const emptyDesk = desks.find(d => !d.occupied);
        if (emptyDesk) {
          const el = document.getElementById(`deskStation_${emptyDesk.deskNo}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            el.style.transform = 'scale(1.2)';
            setTimeout(() => { el.style.transform = ''; }, 600);
            showToast(`🪑 Masa ${emptyDesk.deskNo} müsait!`);
          }
        }
      });
    }

    // 6. Köşe Çekmeceleri (To-Do & Ambient)
    const btnToggleTodo = document.getElementById('btnToggleTodoDrawer');
    const todoDrawer = document.getElementById('isoTodoDrawer');
    if (btnToggleTodo && todoDrawer) {
      btnToggleTodo.addEventListener('click', () => {
        const isClosed = todoDrawer.style.display === 'none' || !todoDrawer.style.display;
        todoDrawer.style.display = isClosed ? 'flex' : 'none';
      });
    }

    const btnCloseTodo = document.getElementById('btnCloseTodoDrawer');
    if (btnCloseTodo && todoDrawer) {
      btnCloseTodo.addEventListener('click', () => {
        todoDrawer.style.display = 'none';
      });
    }

    const btnToggleAmbient = document.getElementById('btnToggleAmbientDrawer');
    const ambientDrawer = document.getElementById('isoAmbientDrawer');
    if (btnToggleAmbient && ambientDrawer) {
      btnToggleAmbient.addEventListener('click', () => {
        unlockAudioContext();
        const isClosed = ambientDrawer.style.display === 'none' || !ambientDrawer.style.display;
        ambientDrawer.style.display = isClosed ? 'flex' : 'none';
      });
    }

    const btnCloseAmbient = document.getElementById('btnCloseAmbientDrawer');
    if (btnCloseAmbient && ambientDrawer) {
      btnCloseAmbient.addEventListener('click', () => {
        ambientDrawer.style.display = 'none';
      });
    }

    // To-Do Ekleme
    const todoInput = document.getElementById('todoInputClean');
    const todoAddBtn = document.getElementById('btnAddTodo');
    if (todoAddBtn && todoInput) {
      todoAddBtn.addEventListener('click', () => {
        addTodo(todoInput.value);
        todoInput.value = '';
      });
      todoInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          addTodo(todoInput.value);
          todoInput.value = '';
        }
      });
    }

    // Avatar Değişimi Dinleyicisi
    window.addEventListener('tda:avatar-changed', () => {
      renderHallDesks();
    });
    window.addEventListener('storage', e => {
      if (e.key === 'tda-my-avatar-config-v2') {
        renderHallDesks();
      }
    });

    // Popover dışına tıklandığında kapatma
    document.addEventListener('click', e => {
      const popover = document.getElementById('isoSocialPopover');
      if (popover && popover.style.display === 'block' && !e.target.closest('#isoSocialPopover') && !e.target.closest('.hall-desk-station')) {
        closeSocialPopover();
      }
    });
  }

  function applyCameraZoom() {
    const cameraRig = document.getElementById('grandCameraRig');
    if (cameraRig) {
      cameraRig.style.transform = `scale(${state.zoomLevel})`;
    }
  }

  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.userDeskNumber = parsed.userDeskNumber || null;
        state.userSeatedRoomId = parsed.userSeatedRoomId || null;
        if (parsed.activeGoal) state.activeGoal = parsed.activeGoal;
        if (parsed.duration) state.selectedDurationMinutes = parsed.duration;
        if (state.userSeatedRoomId) state.activeRoomId = state.userSeatedRoomId;
      }
    } catch(e) {}

    renderRoomSelector();
    renderHallDesks();
    initPomodoro();
    initTodos();
    renderAmbientPanel();
    bindUI();

    if (state.userDeskNumber && state.userSeatedRoomId === state.activeRoomId) {
      const goalLabel = document.getElementById('pomoActiveGoalText');
      if (goalLabel) goalLabel.textContent = `Hedef: ${state.activeGoal}`;
      setSceneState('FOCUS');
      setTimeout(() => smoothZoomToDesk(state.userDeskNumber), 300);
    } else {
      setSceneState('LOBBY');
    }

    console.log('✓ Aydınlık Tema 10 Salonlu & 50 Masalı Sanal Çalışma Odası başarıyla yüklendi.');
  }

  return {
    init,
    switchRoom,
    setSceneState,
    openGoalModalForDesk,
    closeGoalModal,
    openSocialPopover,
    closeSocialPopover,
    sendReactionToPeer,
    setPomodoroMode,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    onConfirmStartSession,
    onUserLeaveDesk
  };
})();
