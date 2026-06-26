/* ============================================================
   ANDECK DECK HUB — Bootstrap
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  initAdModals();
  initEditorModals();
  initAdImportModal();
  loadAdLangProfiles();
  if (getToken()) loadAdDecks();
});
