/* ============================================================
   ANDECK DECK HUB — State, grid, CRUD deck
   Mapping: Project → Deck, MP → AD
   ============================================================ */

const AD_DEFAULT_NAME = 'Deck mới';

window.AD = {
  decks: [],
  deckQuota: 3,
  wordQuota: 50,
  totalWordQuota: null,
  totalWords: 0
};

let adEditingId = null;
let adGridEventsBound = false;
let adDocClickBound = false;
let adConfirmResolve = null;
let adDecksLoadedOnce = false;
let adSessionEmail = null;
let adLangProfiles = [];
let adModalsInited = false;

function adResetSessionState() {
  AD.decks = [];
  AD.deckQuota = 3;
  AD.wordQuota = 50;
  AD.totalWordQuota = null;
  AD.totalWords = 0;
  adDecksLoadedOnce = false;
  adSessionEmail = null;
  adEditingId = null;
  window._currentDeckId = null;
  if (typeof adResetStudySession === 'function') adResetStudySession();
  renderAdHeaderQuota();
  renderAdGrid();
}

function adAuthHeaders(json) {
  const headers = { Authorization: 'Bearer ' + getAuthToken() };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function adWordCount(deck) {
  if (deck.wordCount != null) return deck.wordCount;
  return Array.isArray(deck.words) ? deck.words.length : 0;
}

function adSumDeckWords() {
  return AD.decks.reduce(function (sum, d) {
    return sum + adWordCount(d);
  }, 0);
}

function adMaxTotalWords() {
  return AD.deckQuota * AD.wordQuota;
}

function adPoolWordQuota() {
  if (AD.totalWordQuota != null) return AD.totalWordQuota;
  return AD.deckQuota * AD.wordQuota;
}

function adLangLabel(langPair) {
  const p = adLangProfiles.find(function (x) {
    return x.langPair === langPair;
  });
  return p ? p.label : langPair || '';
}

function renderAdHeaderQuota() {
  const deckEl = document.getElementById('adQuotaDecks');
  const wordsEl = document.getElementById('adQuotaWords');
  if (!deckEl || !wordsEl) return;
  deckEl.closest('.mp-quota-pill')?.classList.remove('mp-quota-pill--loading');
  wordsEl.closest('.mp-quota-pill')?.classList.remove('mp-quota-pill--loading');
  const totalWords = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  const poolTotal = adPoolWordQuota();
  deckEl.textContent = AD.decks.length + '/' + AD.deckQuota + ' deck';
  wordsEl.textContent = totalWords + '/' + poolTotal + ' từ';
  wordsEl.title = 'Tổng từ tối đa trên tài khoản';
}

function renderAdHeaderQuotaSkeleton() {
  const deckEl = document.getElementById('adQuotaDecks');
  const wordsEl = document.getElementById('adQuotaWords');
  if (!deckEl || !wordsEl) return;
  deckEl.closest('.mp-quota-pill')?.classList.add('mp-quota-pill--loading');
  wordsEl.closest('.mp-quota-pill')?.classList.add('mp-quota-pill--loading');
  deckEl.textContent = '—/— deck';
  wordsEl.textContent = '—/— từ';
  wordsEl.removeAttribute('title');
}

function renderAdSkeleton() {
  const grid = document.getElementById('adGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < 2; i++) {
    const card = document.createElement('div');
    card.className = 'mp-card-skeleton';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML =
      '<div class="mp-skeleton-line mp-skeleton-line--title"></div>' +
      '<div class="mp-skeleton-line mp-skeleton-line--badge"></div>' +
      '<div class="mp-skeleton-line mp-skeleton-line--btn"></div>';
    grid.appendChild(card);
  }

  const addSkel = document.createElement('div');
  addSkel.className = 'mp-card-skeleton-add';
  addSkel.setAttribute('aria-hidden', 'true');
  addSkel.innerHTML =
    '<div class="mp-skeleton-line mp-skeleton-line--add-icon"></div>' +
    '<div class="mp-skeleton-line mp-skeleton-line--add-label"></div>';
  grid.appendChild(addSkel);
}

function closeAdDropdowns() {
  document.querySelectorAll('.mp-dropdown').forEach(function (d) {
    d.classList.remove('open');
  });
}

function adNotify(msg, type) {
  const color = type === 'ok' ? '#27ae60' : type === 'err' ? '#e74c3c' : '#95a5a6';
  if (typeof showLabelToast === 'function') {
    showLabelToast(msg, color);
  } else {
    alert(msg);
  }
}

function adIsDeckAtQuota() {
  return AD.decks.length >= AD.deckQuota;
}

function adShowQuotaLimit(type) {
  const ov = document.getElementById('adQuotaLimitOverlay');
  const titleEl = document.getElementById('adQuotaLimitTitle');
  const textEl = document.getElementById('adQuotaLimitText');
  const zalo = typeof getZaloAdminNum === 'function' ? getZaloAdminNum() : '0792 739 257';
  if (!ov || !titleEl || !textEl) {
    const msg =
      type === 'deck'
        ? 'Số deck của bạn đã đến giới hạn (' + AD.deckQuota + '). Liên hệ Zalo Admin: ' + zalo
        : 'Số từ đã đến giới hạn (' + adMaxTotalWords() + ' tổng). Liên hệ Zalo Admin: ' + zalo;
    alert(msg);
    return;
  }
  if (type === 'deck') {
    titleEl.textContent = 'Giới hạn deck';
    textEl.textContent =
      'Số deck của bạn đã đến giới hạn (' + AD.deckQuota + '). Gia hạn thêm — liên hệ Zalo Admin.';
  } else {
    titleEl.textContent = 'Giới hạn từ vựng';
    textEl.textContent =
      'Số từ đã đến giới hạn (' + adMaxTotalWords() + ' tổng). Gia hạn thêm — liên hệ Zalo Admin.';
  }
  const zaloEl = document.getElementById('adQuotaLimitZaloNum');
  if (zaloEl) zaloEl.textContent = zalo;
  ov.style.display = 'flex';
}

function adCloseQuotaLimit() {
  const ov = document.getElementById('adQuotaLimitOverlay');
  if (ov) ov.style.display = 'none';
}

function adConfirm(opts) {
  return new Promise(function (resolve) {
    const titleEl = document.getElementById('adConfirmTitle');
    const textEl = document.getElementById('adConfirmText');
    const okBtn = document.getElementById('adConfirmOkBtn');
    if (!titleEl || !textEl || !okBtn) {
      resolve(window.confirm((opts.title ? opts.title + '\n\n' : '') + (opts.text || '')));
      return;
    }
    titleEl.textContent = opts.title || 'Xác nhận';
    textEl.textContent = opts.text || '';
    okBtn.textContent = opts.confirmLabel || 'Xác nhận';
    okBtn.className = 'dm-confirm-btn ' + (opts.danger ? 'dm-confirm-btn--delete' : 'dm-confirm-btn--warn');
    adConfirmResolve = resolve;
    document.getElementById('adConfirmOverlay').style.display = 'flex';
  });
}

function adConfirmClose(result) {
  const ov = document.getElementById('adConfirmOverlay');
  if (ov) ov.style.display = 'none';
  if (adConfirmResolve) adConfirmResolve(result);
  adConfirmResolve = null;
}

function renderAdGrid() {
  const grid = document.getElementById('adGrid');
  if (!grid) return;
  grid.innerHTML = '';

  AD.decks.forEach(function (d) {
    const wc = adWordCount(d);
    const lang = d.langPair || 'zh-vi';
    const card = document.createElement('div');
    card.className = 'mp-card';
    card.dataset.lang = lang;
    card.dataset.id = d.deckId;
    card.innerHTML =
      '<div class="mp-card-accent"></div>' +
      '<button type="button" class="mp-gear-btn" data-id="' +
      esc(d.deckId) +
      '">' +
      '<i class="ti ti-settings-filled"></i>' +
      '</button>' +
      '<div class="mp-dropdown" id="dd-' +
      esc(d.deckId) +
      '">' +
      '<div class="mp-dd-item" data-action="rename" data-id="' +
      esc(d.deckId) +
      '">' +
      '<i class="ti ti-pencil"></i> Đổi tên' +
      '</div>' +
      '<div class="mp-dd-divider"></div>' +
      '<div class="mp-dd-item danger" data-action="reset" data-id="' +
      esc(d.deckId) +
      '">' +
      '<i class="ti ti-refresh"></i> Reset deck' +
      '</div>' +
      '<div class="mp-dd-divider"></div>' +
      '<div class="mp-dd-item danger" data-action="delete" data-id="' +
      esc(d.deckId) +
      '">' +
      '<i class="ti ti-trash"></i> Xóa deck' +
      '</div>' +
      '</div>' +
      '<div class="mp-card-name">' +
      esc(d.name) +
      '</div>' +
      '<div class="mp-card-lang">' +
      esc(adLangLabel(lang)) +
      '</div>' +
      '<div class="mp-card-badge">' +
      wc +
      ' từ vựng</div>' +
      '<button type="button" class="mp-card-btn" data-id="' +
      esc(d.deckId) +
      '">Bắt đầu học →</button>';
    grid.appendChild(card);
  });

  const addCard = document.createElement('button');
  addCard.type = 'button';
  addCard.className = 'mp-card-add';
  addCard.setAttribute('aria-label', 'Thêm deck');
  addCard.innerHTML =
    '<span class="mp-card-add-icon" aria-hidden="true"><i class="ti ti-plus"></i></span>' +
    '<span class="mp-card-add-label">Thêm deck</span>';
  grid.appendChild(addCard);

  bindAdEvents();
}

function bindAdEvents() {
  const grid = document.getElementById('adGrid');
  if (!grid || adGridEventsBound) return;
  adGridEventsBound = true;

  grid.addEventListener('click', function (e) {
    const gearBtn = e.target.closest('.mp-gear-btn');
    if (gearBtn) {
      e.stopPropagation();
      const id = gearBtn.dataset.id;
      const dropdown = document.getElementById('dd-' + id);
      const isOpen = dropdown && dropdown.classList.contains('open');
      closeAdDropdowns();
      if (dropdown && !isOpen) dropdown.classList.add('open');
      return;
    }

    const ddItem = e.target.closest('.mp-dd-item');
    if (ddItem) {
      e.stopPropagation();
      const action = ddItem.dataset.action;
      const id = ddItem.dataset.id;
      closeAdDropdowns();
      if (action === 'rename') openAdRenameModal(id);
      if (action === 'reset') confirmAdReset(id);
      if (action === 'delete') confirmAdDelete(id);
      return;
    }

    const addCardBtn = e.target.closest('.mp-card-add');
    if (addCardBtn) {
      e.stopPropagation();
      if (adIsDeckAtQuota()) {
        adShowQuotaLimit('deck');
      } else {
        openAdCreateModal();
      }
      return;
    }

    const studyBtn = e.target.closest('.mp-card-btn');
    if (studyBtn) {
      e.stopPropagation();
      loadDeckData(studyBtn.dataset.id);
    }
  });

  if (!adDocClickBound) {
    adDocClickBound = true;
    document.addEventListener('click', closeAdDropdowns);
  }
}

function openAdRenameModal(id) {
  const d = AD.decks.find(function (x) {
    return x.deckId === id;
  });
  if (!d) return;
  adEditingId = id;
  document.getElementById('adRenameInput').value = d.name;
  document.getElementById('adRenameModal').style.display = 'flex';
}

function closeAdRenameModal() {
  document.getElementById('adRenameModal').style.display = 'none';
  adEditingId = null;
}

function adRenderLangPairSelect(selectId, profiles) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const list = profiles && profiles.length ? profiles : [];
  if (!list.length) {
    sel.innerHTML = '<option value="" disabled selected>Không tải được ngôn ngữ</option>';
    return;
  }
  sel.innerHTML = list
    .map(function (p) {
      return '<option value="' + esc(p.langPair) + '">' + esc(p.label) + '</option>';
    })
    .join('');
}

function renderAdLangPairOptions() {
  adRenderLangPairSelect('adCreateLangPair', adLangProfiles);
}

function openAdCreateModal() {
  if (!adLangProfiles.length) loadAdLangProfiles();
  else renderAdLangPairOptions();
  document.getElementById('adCreateNameInput').value = '';
  document.getElementById('adCreateModal').style.display = 'flex';
  setTimeout(function () {
    document.getElementById('adCreateNameInput')?.focus();
  }, 50);
}

function closeAdCreateModal() {
  document.getElementById('adCreateModal').style.display = 'none';
}

async function saveAdRename() {
  const newName = document.getElementById('adRenameInput').value.trim();
  if (!newName || !adEditingId) return;
  try {
    const res = await fetch('/api/decks/' + adEditingId, {
      method: 'PUT',
      headers: adAuthHeaders(true),
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      adNotify(err.error || 'Không thể đổi tên deck.', 'err');
      return;
    }
    closeAdRenameModal();
    adNotify('Đã đổi tên deck', 'ok');
    await loadAdDecks();
  } catch (err) {
    console.error('saveAdRename:', err);
    adNotify('Không thể kết nối server.', 'err');
  }
}

async function saveAdCreate() {
  if (adIsDeckAtQuota()) {
    closeAdCreateModal();
    adShowQuotaLimit('deck');
    return;
  }
  const rawName = document.getElementById('adCreateNameInput').value.trim();
  const name = rawName || AD_DEFAULT_NAME;
  const langPair = document.getElementById('adCreateLangPair').value;
  if (!langPair) {
    adNotify('Vui lòng chọn cặp ngôn ngữ.', 'err');
    return;
  }
  try {
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: adAuthHeaders(true),
      body: JSON.stringify({ name: name, langPair: langPair })
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      if (res.status === 403 || (err.error && /giới hạn|quota|toi da/i.test(err.error))) {
        closeAdCreateModal();
        adShowQuotaLimit('deck');
      } else {
        adNotify(err.error || 'Không thể tạo deck.', 'err');
      }
      return;
    }
    closeAdCreateModal();
    adNotify('Đã tạo deck mới', 'ok');
    await loadAdDecks();
  } catch (err) {
    console.error('saveAdCreate:', err);
    adNotify('Không thể kết nối server.', 'err');
  }
}

async function confirmAdReset(id) {
  const d = AD.decks.find(function (x) {
    return x.deckId === id;
  });
  const ok = await adConfirm({
    title: 'Reset deck',
    text:
      'Xóa toàn bộ từ vựng trong "' +
      (d ? d.name : 'deck này') +
      '"? Hành động không thể hoàn tác.',
    confirmLabel: 'Reset',
    danger: false
  });
  if (!ok) return;
  try {
    const res = await fetch('/api/decks/' + id + '/words', {
      method: 'DELETE',
      headers: adAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      adNotify(err.error || 'Không thể reset deck.', 'err');
      return;
    }
    adNotify('Đã reset deck', 'ok');
    await loadAdDecks();
    if (window._currentDeckId === id && typeof loadDeckData === 'function') {
      await loadDeckData(id);
    }
  } catch (err) {
    console.error('confirmAdReset:', err);
    adNotify('Không thể kết nối server.', 'err');
  }
}

async function confirmAdDelete(id) {
  const d = AD.decks.find(function (x) {
    return x.deckId === id;
  });
  const ok = await adConfirm({
    title: 'Xóa deck',
    text: 'Xóa deck "' + (d ? d.name : '') + '" và toàn bộ từ vựng? Hành động không thể hoàn tác.',
    confirmLabel: 'Xóa',
    danger: true
  });
  if (!ok) return;
  try {
    const res = await fetch('/api/decks/' + id, {
      method: 'DELETE',
      headers: adAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      adNotify(err.error || 'Không thể xóa deck.', 'err');
      return;
    }
    if (window._currentDeckId === id) {
      window._currentDeckId = null;
      if (typeof adResetStudySession === 'function') adResetStudySession();
      showOnly('deck-hub-screen');
    }
    adNotify('Đã xóa deck', 'ok');
    await loadAdDecks();
  } catch (err) {
    console.error('confirmAdDelete:', err);
    adNotify('Không thể kết nối server.', 'err');
  }
}

async function loadAdLangProfiles() {
  try {
    const res = await fetch('/api/decks/lang-profiles');
    if (!res.ok) {
      adLangProfiles = [];
    } else {
      const data = await res.json();
      adLangProfiles = data.profiles || [];
    }
  } catch (err) {
    console.error('loadAdLangProfiles:', err);
    adLangProfiles = [];
  }
  renderAdLangPairOptions();
  if (typeof adImportRenderLangPairOptions === 'function') {
    adImportRenderLangPairOptions();
  }
}

async function loadAdDecks() {
  if (!getAuthToken()) {
    adResetSessionState();
    return;
  }
  const sessionEmail =
    (typeof currentUser !== 'undefined' && currentUser && (currentUser.u || currentUser.email)) || '';
  if (sessionEmail && adSessionEmail && sessionEmail !== adSessionEmail) {
    adResetSessionState();
  }
  const showSkeleton = !adDecksLoadedOnce;
  if (showSkeleton) {
    AD.decks = [];
    renderAdHeaderQuotaSkeleton();
    renderAdSkeleton();
  }
  try {
    const res = await fetch('/api/decks', {
      headers: adAuthHeaders(),
      cache: 'no-store'
    });
    if (!res.ok) {
      adNotify('Không tải được danh sách deck. Thử lại sau.', 'err');
      if (showSkeleton) {
        renderAdHeaderQuota();
        renderAdGrid();
      }
      return;
    }
    const data = await res.json();
    AD.decks = data.decks || [];
    if (sessionEmail) adSessionEmail = sessionEmail;
    if (data.deckQuota != null) AD.deckQuota = data.deckQuota;
    if (data.wordQuota != null) AD.wordQuota = data.wordQuota;
    AD.totalWords = data.totalWords != null ? data.totalWords : adSumDeckWords();
    adDecksLoadedOnce = true;
    renderAdHeaderQuota();
    renderAdGrid();
  } catch (err) {
    console.error('loadAdDecks:', err);
    adNotify('Không thể kết nối server.', 'err');
    if (showSkeleton) {
      renderAdHeaderQuota();
      renderAdGrid();
    }
  }
}

function initDeckHub() {
  loadAdDecks();
}

function initAdModals() {
  if (adModalsInited) return;
  adModalsInited = true;

  document.getElementById('adRenameCancelBtn')?.addEventListener('click', closeAdRenameModal);
  document.getElementById('adRenameSaveBtn')?.addEventListener('click', saveAdRename);
  document.getElementById('adCreateCancelBtn')?.addEventListener('click', closeAdCreateModal);
  document.getElementById('adCreateSaveBtn')?.addEventListener('click', saveAdCreate);

  document.getElementById('adRenameModal')?.addEventListener('click', function (e) {
    if (e.target.id === 'adRenameModal') closeAdRenameModal();
  });
  document.getElementById('adCreateModal')?.addEventListener('click', function (e) {
    if (e.target.id === 'adCreateModal') closeAdCreateModal();
  });
  document.getElementById('adConfirmCancelBtn')?.addEventListener('click', function () {
    adConfirmClose(false);
  });
  document.getElementById('adConfirmOkBtn')?.addEventListener('click', function () {
    adConfirmClose(true);
  });
  document.getElementById('adConfirmOverlay')?.addEventListener('click', function (e) {
    if (e.target.id === 'adConfirmOverlay') adConfirmClose(false);
  });
  document.getElementById('adQuotaLimitCloseBtn')?.addEventListener('click', adCloseQuotaLimit);
  document.getElementById('adQuotaLimitBuyBtn')?.addEventListener('click', function () {
    adCloseQuotaLimit();
    if (typeof adOpenUpgradeModal === 'function') adOpenUpgradeModal();
  });
  document.getElementById('adQuotaLimitZaloBtn')?.addEventListener('click', function () {
    adCloseQuotaLimit();
    if (typeof showZaloContact === 'function') showZaloContact();
  });
  document.getElementById('adQuotaLimitOverlay')?.addEventListener('click', function (e) {
    if (e.target.id === 'adQuotaLimitOverlay') adCloseQuotaLimit();
  });
}
