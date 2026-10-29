/**
 * Türk Dünyası Beceri Ağı - Turan Yapay Zekâ Asistanı & Dedektör Modülü
 */

window.TDATuran = (function() {
  const $ = id => document.getElementById(id);
  let greeted = false;

  function featureT(k, vars = {}) {
    return window.TDAI18n?.t(k, vars) || k;
  }

  function addMessage(text, who) {
    const messages = $('turanMessages');
    if (!messages) return;
    const bubble = document.createElement('div');
    bubble.className = 'turan-msg ' + who;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function getLocalAnswer(text) {
    const q = text.toLocaleLowerCase('tr-TR');
    if (q.includes('puan')) {
      return featureT('turanPointAnswer', {
        fallback: 'Beceri Puanı, 1 saatlik beceri paylaşımıyla kazanılır. Kazandığın puanı Türk Dünyası\'nın başka bir ülkesindeki doğrulanmış öğrenciden öğrenmek için kullanabilirsin.'
      });
    }
    if (q.includes('eşleşme') || q.includes('eslesme') || q.includes('nasıl')) {
      return featureT('turanMatchAnswer', {
        fallback: 'Akıllı Eşleştirme sekmesinde öğretmek veya öğrenmek istediğin beceri, dil, seviye ve ülke filtrelerini seçerek sana en uygun öğrenci adaylarını görebilirsin.'
      });
    }
    if (q.includes('bağış') || q.includes('bagis') || q.includes('destek')) {
      return featureT('turanDonateAnswer', {
        fallback: 'Puanı biten öğrenciler Topluluk sekmesinden ayda 2 puana kadar destek isteyebilir veya arkadaşının Öğrenci ID\'sini girerek doğrudan puan aktarabilirsin.'
      });
    }
    return featureT('turanDefaultAnswer', {
      fallback: 'Türk Dünyası Beceri Ağı\'na hoş geldin! Ben Turan, 7 Türk devletindeki öğrencilerin beceri ve bilgi paylaşımında rehberlik eden asistanınım. Sana nasıl yardımcı olabilirim?'
    });
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    addMessage(featureT('turanGreeting'), 'bot');
  }

  async function ask() {
    const input = $('turanInput');
    const q = input?.value.trim();
    if (!q) return;

    greet();
    addMessage(q, 'user');
    input.value = '';

    const endpoint = window.TDAConfig?.AI_CONFIG?.endpoint || '/api/ai';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          message: q,
          language: window.TDAI18n?.language || 'tr',
          context: 'Türk Dünyası Beceri Ağı — Turan'
        })
      });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      addMessage(String(data.reply || data.message || ''), 'bot');
    } catch (e) {
      setTimeout(() => {
        addMessage(getLocalAnswer(q), 'bot');
      }, 700);
    }
  }

  function init() {
    const panel = $('turanPanel');
    const fab = $('turanFab');
    const close = $('turanClose');

    if (!panel || !fab) return;

    function show() {
      panel.classList.remove('embedded');
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      fab.setAttribute('aria-expanded', 'true');
      greet();
    }

    function hide() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      fab.setAttribute('aria-expanded', 'false');
    }

    fab.addEventListener('click', () => {
      if (panel.classList.contains('open')) hide();
      else show();
    });

    close?.addEventListener('click', hide);
    $('turanSend')?.addEventListener('click', ask);
    $('turanInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ask();
      }
    });

    document.querySelectorAll('.turan-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        show();
      });
    });
  }

  return {
    init,
    greet
  };
})();
