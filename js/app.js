/**
 * Türk Dünyası Beceri Ağı - Ana Uygulama Giriş Noktası (Application Bootstrap)
 * Tüm modüllerin yaşam döngüsünü ve bağımlılıklarını tek merkezden yönetir.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Türk Dünyası Beceri Ağı başlatılıyor...');

  // 1. Çoklu Dil (i18n) Motorunu Başlat
  if (window.TDAI18n) {
    window.TDAI18n.init();
  }

  // 2. Kimlik Doğrulama & Beceri Seçici Modülünü Başlat
  if (window.TDAAuth) {
    window.TDAAuth.init();
  }

  // 3. Akıllı Beceri Eşleştirme Modülünü Başlat
  if (window.TDAMatching) {
    window.TDAMatching.init();
  }

  // 4. Topluluk Odaları ve Puan Bağış Sistemini Başlat
  if (window.TDACommunity) {
    window.TDACommunity.init();
  }

  // 5. Öğrenci Makaleleri Modülünü Başlat
  if (window.TDAArticles) {
    window.TDAArticles.init();
  }

  // 6. Biliyor muydunuz? (Fact Ticker) ve 3D Bayrak Kartlarını Başlat
  if (window.TDATicker) {
    window.TDATicker.init();
  }

  // 7. Turan AI Asistanı & Dedektörünü Başlat
  if (window.TDATuran) {
    window.TDATuran.init();
  }

  // 8. Sınır Ötesi Mektuplaşma / Mesajlaşma Modülünü Başlat
  if (window.TDAMessaging) {
    window.TDAMessaging.init();
  }

  // 9. Sanal Çalışma Odası (Lofi Study Room) Modülünü Başlat
  if (window.TDAStudyRoom) {
    window.TDAStudyRoom.init();
  }

  // 10. Dijital Kültür Arşivi Modülünü Başlat
  if (window.TDACultureArchive) {
    window.TDACultureArchive.init();
  }

  // 11. Çok Oyunculu Online Kelime Oyunu Modülünü Başlat
  if (window.TDAWordGame) {
    window.TDAWordGame.init();
  }

  // 12. Sekmeli SPA Mimarisi (Tabs) ve Navigasyonu Başlat
  if (window.TDATabs) {
    window.TDATabs.init();
  }

  console.log('Türk Dünyası Beceri Ağı başarıyla hazırlandı.');
});
