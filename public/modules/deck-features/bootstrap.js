/* ============================================================
   ANDECK DECK HUB — Bootstrap
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  initAdModals();
  loadAdLangProfiles();
  if (getToken()) loadAdDecks();
});
