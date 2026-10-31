/**
 * Türk Dünyası Beceri Ağı - Ana Uygulama Giriş Noktası (Application Bootstrap)
 * Tüm modüllerin yaşam döngüsünü ve bağımlılıklarını tek merkezden yönetir.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Türk Dünyası Beceri Ağı başlatılıyor...');

  function safeInit(name, mod) {
    try {
      mod?.init();
    } catch (e) {
      console.error(name + ' başlatılamadı', e);
    }
  }

  // 1. Çoklu Dil (i18n) Motorunu Başlat
  safeInit('I18n', window.TDAI18n);

  // 2. Kimlik Doğrulama & Beceri Seçici Modülünü Başlat
  safeInit('Auth', window.TDAAuth);

  // 3. Akıllı Beceri Eşleştirme Modülünü Başlat
  safeInit('Matching', window.TDAMatching);

  // 4. Topluluk Odaları ve Puan Bağış Sistemini Başlat
  safeInit('Community', window.TDACommunity);

  // 5. Öğrenci Makaleleri Modülünü Başlat
  safeInit('Articles', window.TDAArticles);

  // 6. Biliyor muydunuz? (Fact Ticker) ve 3D Bayrak Kartlarını Başlat
  safeInit('Ticker', window.TDATicker);

  // 7. Turan AI Asistanı & Dedektörünü Başlat
  safeInit('Turan', window.TDATuran);

  // 8. Sınır Ötesi Mektuplaşma / Mesajlaşma Modülünü Başlat
  safeInit('Messaging', window.TDAMessaging);

  // 9. Sanal Çalışma Odası (Lofi Study Room) Modülünü Başlat
  safeInit('StudyRoom', window.TDAStudyRoom);

  // 10. Dijital Kültür Arşivi Modülünü Başlat
  safeInit('CultureArchive', window.TDACultureArchive);

  // 11. Çok Oyunculu Online Kelime Oyunu Modülünü Başlat
  safeInit('WordGame', window.TDAWordGame);

  // 12. Sekmeli SPA Mimarisi (Tabs) ve Navigasyonu Başlat
  safeInit('Tabs', window.TDATabs);

  console.log('Türk Dünyası Beceri Ağı başarıyla hazırlandı.');
});
