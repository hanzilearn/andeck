/* ============================================================
   ANDECK EDITOR — Học deck, thêm/sửa/xóa từ (generic fields)
   Mapping: projectId → deckId, MP → AD, hanzi/pinyin → primary/reading
   ============================================================ */

let adDeckWords = [];
let adEditingWordId = null;
let emActive = false;
let dmActive = false;
let dmSelected = new Set();
let adEditorInited = false;

const AD_LAYOUT_HIDE_THRESHOLD = 0.7;

function adWordHasDetail(w) {
  if (!w) return false;
  return !!(String(w.exPrimary || '').trim() || String(w.note || '').trim());
}

function adAnalyzeLayout(vocab) {
  const list = Array.isArray(vocab) ? vocab : [];
  const n = list.length;
  if (!n) {
    const profile = { showReading: true, showDetail: false, showExample: false, layout: 'normal' };
    window._adLayoutProfile = profile;
    return profile;
  }
  let missingReading = 0;
  let hasAnyDetail = false;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    if (!String(w.reading || '').trim()) missingReading++;
    if (adWordHasDetail(w)) hasAnyDetail = true;
  }
  const showReading = missingReading / n < AD_LAYOUT_HIDE_THRESHOLD;
  const showDetail = hasAnyDetail;
  const profile = {
    showReading: showReading,
    showDetail: showDetail,
    showExample: showDetail,
    layout: showDetail ? 'full' : showReading ? 'normal' : 'sparse'
  };
  window._adLayoutProfile = profile;
  return profile;
}

function adClearLayoutProfile() {
  window._adLayoutProfile = null;
}

function adClearDeckWords() {
  adDeckWords = [];
}

function adSyncFilterButtonUi() {
  const lblFilter = getCurrentFilterState();
  const hsBtn = document.getElementById('hide-starred-btn');
  if (!hsBtn) return;
  hsBtn.classList.remove('on-red', 'on-red-slash');
  if (lblFilter.state === 'labels') hsBtn.classList.add('on-red');
  else if (lblFilter.state === 'unlabeled') hsBtn.classList.add('on-red-slash');
  if (typeof starFilter !== 'undefined') starFilter = 'all';
}

function adSyncStudyLangAttr(langPair) {
  const pair = langPair || window._currentLangPair || 'zh-vi';
  document.body.setAttribute('data-lang-pair', pair);
  if (typeof adEnsureLangFonts === 'function') adEnsureLangFonts(pair);
}

function adGetLangProfile(langPair) {
  const pair = langPair || window._currentLangPair;
  return (
    (typeof adLangProfiles !== 'undefined' ? adLangProfiles : []).find(function (p) {
      return p.langPair === pair;
    }) || null
  );
}

function adGetCurrentDeck() {
  const id = window._currentDeckId;
  if (!id) return null;
  return AD.decks.find(function (d) {
    return d.deckId === id;
  });
}

function adGetCurrentDeckWordCount() {
  const id = window._currentDeckId;
  if (!id) return 0;
  if (Array.isArray(adDeckWords) && adDeckWords.length) return adDeckWords.length;
  const deck = adGetCurrentDeck();
  if (deck) return adWordCount(deck);
  return 0;
}

function adSyncDeckWordCount(deckId, count) {
  const deck = AD.decks.find(function (d) {
    return d.deckId === deckId;
  });
  if (deck) deck.wordCount = count;
  AD.totalWords = AD.decks.reduce(function (sum, d) {
    return sum + adWordCount(d);
  }, 0);
}

function adSetAppHeaderLabel(deckName, wordCount) {
  const el = document.getElementById('app-deck-label');
  if (!el) return;
  const n = wordCount != null ? wordCount : 0;
  el.textContent = deckName + ' (' + n + ' t\u1eeb)';
}

function adIsDeckWordAtQuota() {
  return adGetCurrentDeckWordCount() >= adPoolWordQuota() || adIsTotalWordsAtQuota();
}

function adIsTotalWordsAtQuota() {
  const total = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  return total >= adPoolWordQuota();
}

function adDeckWordRemaining() {
  const deckCount = adGetCurrentDeckWordCount();
  const poolTotal = adPoolWordQuota();
  const deckRem = Math.max(0, poolTotal - deckCount);
  const total = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  const globalRem = Math.max(0, poolTotal - total);
  return Math.min(deckRem, globalRem);
}

function adApplyWordFormLabels(profile) {
  if (!profile) return;
  const set = function (id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('awLabelPrimary', profile.primaryLabel || 'T\u1eeb');
  set('awLabelMeaning', profile.meaningLabel || 'Ngh\u0129a');
  set('awLabelReading', profile.readingLabel || 'Reading');
  set('awLabelPos', 'T\u1eeb lo\u1ea1i');
  set('awLabelExPrimary', 'V\u00ed d\u1ee5 (' + (profile.primaryLabel || 't\u1eeb') + ')');
  set('awLabelExReading', (profile.readingLabel || 'Reading') + ' v\u00ed d\u1ee5');
  set('awLabelExMeaning', 'Ngh\u0129a v\u00ed d\u1ee5');

  const readingField = document.getElementById('awReadingField');
  if (readingField) readingField.style.display = profile.hasReading === false ? 'none' : '';
}

function awIsExtraOpen(el) {
  return el && el.style.display === 'block';
}

function awClearExampleFields() {
  ['aw-exprimary', 'aw-exreading', 'aw-exmeaning'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function awClearNoteField() {
  const el = document.getElementById('aw-note');
  if (el) el.value = '';
}

function awCloseExamplePanel() {
  const opt = document.getElementById('awOptional');
  const btn = document.getElementById('awExampleBtn');
  if (opt) opt.style.display = 'none';
  if (btn) btn.classList.remove('is-open');
}

function awCloseNotePanel() {
  const noteSec = document.getElementById('awNoteSection');
  const btn = document.getElementById('awNoteBtn');
  if (noteSec) noteSec.style.display = 'none';
  if (btn) btn.classList.remove('is-open');
}

function awOpenExamplePanel() {
  awCloseNotePanel();
  awClearNoteField();
  const opt = document.getElementById('awOptional');
  const btn = document.getElementById('awExampleBtn');
  if (opt) opt.style.display = 'block';
  if (btn) btn.classList.add('is-open');
}

function awOpenNotePanel() {
  awCloseExamplePanel();
  awClearExampleFields();
  const noteSec = document.getElementById('awNoteSection');
  const btn = document.getElementById('awNoteBtn');
  if (noteSec) noteSec.style.display = 'block';
  if (btn) btn.classList.add('is-open');
  const noteInput = document.getElementById('aw-note');
  if (noteInput) noteInput.focus();
}

async function loadDeckStudy(deckId) {
  if (!getAuthToken()) return;
  try {
    const res = await fetch('/api/decks/' + deckId, { headers: adAuthHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      adNotify(err.error || 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c deck.', 'err');
      return;
    }
    const data = await res.json();
    const deck = data.deck;
    if (!deck) return;

    window._currentDeckId = deckId;
    window._currentLangPair = deck.langPair;
    adSyncStudyLangAttr(deck.langPair);
    currentLevel = 'deck_' + deckId;
    adDeckWords = (deck.words || []).slice();
    VOCAB = adDeckWords.slice();
    order = VOCAB.map(function (_, i) {
      return i;
    });

    emExit();
    dmExit();
    if (typeof adResetStudyUiState === 'function') adResetStudyUiState();

    adSyncDeckWordCount(deckId, adDeckWords.length);
    adSetAppHeaderLabel(deck.name, adDeckWords.length);

    showOnly('app-screen');

    const addBtn = document.getElementById('addWordBtn');
    if (addBtn) {
      addBtn.style.display = '';
      addBtn.onclick = awOpen;
    }
    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) {
      editBtn.style.display = '';
      editBtn.onclick = emToggle;
    }
    const delBtn = document.getElementById('deleteModeBtn');
    if (delBtn) {
      delBtn.style.display = '';
      delBtn.onclick = dmToggle;
    }
    const upfileHdr = document.getElementById('adUpfileHeaderBtn');
    if (upfileHdr) upfileHdr.style.display = '';

    const profile = adGetLangProfile(deck.langPair);
    adApplyWordFormLabels(profile);
    adAnalyzeLayout(VOCAB);
    if (typeof adInitStudyToolbar === 'function') adInitStudyToolbar(profile);
    adSyncFilterButtonUi();
    if (typeof loadStars === 'function') {
      loadStars().then(function () {
        adSyncFilterButtonUi();
        if (typeof render === 'function') render();
      });
    } else if (typeof render === 'function') {
      render();
    }
    window.scrollTo({ top: 0 });
  } catch (e) {
    console.error('loadDeckStudy:', e);
    adNotify('Không thể kết nối server.', 'err');
  }
}

window.loadDeckData = loadDeckStudy;

function awSetModalMode(mode) {
  const titleEl = document.getElementById('awTitle');
  const moreBtn = document.getElementById('awSaveMoreBtn');
  if (mode === 'edit') {
    if (titleEl) titleEl.textContent = 'Ch\u1ec9nh s\u1eeda t\u1eeb';
    if (moreBtn) moreBtn.style.display = 'none';
  } else {
    if (titleEl) titleEl.textContent = 'Th\u00eam t\u1eeb m\u1edbi';
    if (moreBtn) moreBtn.style.display = '';
    adEditingWordId = null;
  }
}

function awFillForm(w) {
  document.getElementById('aw-primary').value = w.primary || '';
  document.getElementById('aw-meaning').value = w.meaning || '';
  document.getElementById('aw-reading').value = w.reading || '';
  document.getElementById('aw-pos').value = w.pos || '';
  document.getElementById('aw-exprimary').value = w.exPrimary || '';
  document.getElementById('aw-exreading').value = w.exReading || '';
  document.getElementById('aw-exmeaning').value = w.exMeaning || '';
  document.getElementById('aw-note').value = w.note || '';
  const hasExamples = !!(w.exPrimary || w.exReading || w.exMeaning);
  const hasNote = !!String(w.note || '').trim();
  awCloseExamplePanel();
  awCloseNotePanel();
  if (hasExamples) {
    awOpenExamplePanel();
  } else if (hasNote) {
    const noteSec = document.getElementById('awNoteSection');
    const btn = document.getElementById('awNoteBtn');
    if (noteSec) noteSec.style.display = 'block';
    if (btn) btn.classList.add('is-open');
  }
}

function awOpen() {
  emExit();
  awSetModalMode('add');
  if (adIsDeckWordAtQuota() || adIsTotalWordsAtQuota()) {
    adShowQuotaLimit('word');
    return;
  }
  adApplyWordFormLabels(adGetLangProfile());
  document.getElementById('addWordOverlay').style.display = 'flex';
  awResetForm();
  document.getElementById('aw-primary').focus();
}

function awOpenEdit(wordId) {
  const w = adDeckWords.find(function (x) {
    return x.id === wordId;
  });
  if (!w) return;
  adEditingWordId = wordId;
  awSetModalMode('edit');
  adApplyWordFormLabels(adGetLangProfile());
  awFillForm(w);
  document.getElementById('addWordOverlay').style.display = 'flex';
  document.getElementById('aw-primary').focus();
}

function awClose() {
  document.getElementById('addWordOverlay').style.display = 'none';
  awSetModalMode('add');
}

function awResetForm() {
  ['aw-primary', 'aw-meaning', 'aw-reading', 'aw-pos', 'aw-exprimary', 'aw-exreading', 'aw-exmeaning', 'aw-note'].forEach(
    function (id) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
  );
  awCloseExamplePanel();
  awCloseNotePanel();
}

function awToggleExample() {
  const opt = document.getElementById('awOptional');
  if (awIsExtraOpen(opt)) {
    awCloseExamplePanel();
  } else {
    awOpenExamplePanel();
  }
}

function awToggleNote() {
  const noteSec = document.getElementById('awNoteSection');
  if (awIsExtraOpen(noteSec)) {
    awCloseNotePanel();
  } else {
    awOpenNotePanel();
  }
}

function awCollectWordPayload() {
  return {
    primary: document.getElementById('aw-primary').value.trim(),
    meaning: document.getElementById('aw-meaning').value.trim(),
    reading: document.getElementById('aw-reading')?.value.trim() || '',
    pos: document.getElementById('aw-pos')?.value.trim() || '',
    exPrimary: document.getElementById('aw-exprimary')?.value.trim() || '',
    exReading: document.getElementById('aw-exreading')?.value.trim() || '',
    exMeaning: document.getElementById('aw-exmeaning')?.value.trim() || '',
    note: document.getElementById('aw-note')?.value.trim() || ''
  };
}

async function awSubmit(keepOpen) {
  const profile = adGetLangProfile();
  const payload = awCollectWordPayload();
  const primaryLabel = (profile && profile.primaryLabel) || 'T\u1eeb';
  if (!payload.primary || !payload.meaning) {
    alert('Vui l\u00f2ng nh\u1eadp ' + primaryLabel + ' v\u00e0 Ngh\u0129a.');
    return;
  }

  const deckId = window._currentDeckId;
  if (!deckId) return;

  if (adEditingWordId) {
    try {
      const res = await fetch('/api/decks/' + deckId + '/words/' + adEditingWordId, {
        method: 'PUT',
        headers: adAuthHeaders(true),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(function () {
          return {};
        });
        alert(err.error || 'Kh\u00f4ng th\u1ec3 l\u01b0u thay \u0111\u1ed5i.');
        return;
      }
      emExit();
      awClose();
      await loadDeckStudy(deckId);
      await loadAdDecks();
    } catch (e) {
      console.error('awSubmit edit:', e);
      alert('Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i server.');
    }
    return;
  }

  if (adIsDeckWordAtQuota() || adIsTotalWordsAtQuota()) {
    adShowQuotaLimit('word');
    return;
  }

  try {
    const res = await fetch('/api/decks/' + deckId + '/words', {
      method: 'POST',
      headers: adAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      if (res.status === 400 && err.error && /gi\u1edbi h\u1ea1n|quota/i.test(err.error)) {
        adShowQuotaLimit('word');
      } else {
        alert(err.error || 'Kh\u00f4ng th\u1ec3 th\u00eam t\u1eeb.');
      }
      return;
    }
    await loadDeckStudy(deckId);
    await loadAdDecks();
    if (keepOpen) {
      awResetForm();
      document.getElementById('aw-primary').focus();
    } else {
      awClose();
    }
  } catch (e) {
    console.error('awSubmit:', e);
    alert('Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i server.');
  }
}

function awSave() {
  awSubmit(false);
}
function awSaveAndMore() {
  awSubmit(true);
}

function emEnter() {
  dmExit();
  emActive = true;
  const btn = document.getElementById('editModeBtn');
  if (btn) {
    btn.classList.add('is-active');
    btn.innerHTML = '<i class="ti ti-x"></i><span class="edit-mode-label">Ch\u1ec9nh s\u1eeda</span>';
  }
  if (typeof render === 'function') render();
}

function emExit() {
  emActive = false;
  const btn = document.getElementById('editModeBtn');
  if (btn) {
    btn.classList.remove('is-active');
    btn.innerHTML = '<i class="ti ti-pencil"></i><span class="edit-mode-label">Ch\u1ec9nh s\u1eeda</span>';
  }
  if (typeof render === 'function') render();
}

function emToggle() {
  if (emActive) emExit();
  else emEnter();
}

function emRowClick(tr, wordId) {
  if (!emActive || !wordId) return;
  const e = window.event;
  if (e && e.target.closest('button, input, textarea, select, a, label, .dm-checkbox')) return;
  awOpenEdit(wordId);
}

function dmEnter() {
  emExit();
  dmActive = true;
  dmSelected.clear();
  const btn = document.getElementById('deleteModeBtn');
  if (btn) {
    btn.classList.add('is-active');
    btn.innerHTML = '<i class="ti ti-x"></i>';
  }
  if (typeof render === 'function') render();
}

function dmExit() {
  dmActive = false;
  dmSelected.clear();
  const btn = document.getElementById('deleteModeBtn');
  if (btn) {
    btn.classList.remove('is-active');
    btn.innerHTML = '<i class="ti ti-trash-filled"></i>';
  }
  if (typeof render === 'function') render();
}

function dmToggle() {
  if (!dmActive) {
    dmEnter();
  } else if (dmSelected.size > 0) {
    document.getElementById('deleteCount').textContent = dmSelected.size;
    document.getElementById('deleteConfirmOverlay').style.display = 'flex';
  } else {
    dmExit();
  }
}

function dmCancelDialog() {
  document.getElementById('deleteConfirmOverlay').style.display = 'none';
  dmExit();
}

async function dmConfirmDelete() {
  document.getElementById('deleteConfirmOverlay').style.display = 'none';
  const ids = Array.from(dmSelected);
  const deckId = window._currentDeckId;
  if (!deckId || !ids.length) {
    dmExit();
    return;
  }
  try {
    const res = await fetch('/api/decks/' + deckId + '/words', {
      method: 'DELETE',
      headers: adAuthHeaders(true),
      body: JSON.stringify({ ids: ids })
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      throw new Error(err.error || 'Kh\u00f4ng th\u1ec3 x\u00f3a t\u1eeb');
    }
  } catch (e) {
    console.error('dmConfirmDelete:', e);
    alert('C\u00f3 l\u1ed7i khi x\u00f3a t\u1eeb: ' + (e.message || ''));
  }
  dmExit();
  await loadDeckStudy(deckId);
  await loadAdDecks();
}

function dmToggleRow(wordId, checked) {
  if (checked) dmSelected.add(wordId);
  else dmSelected.delete(wordId);
  const tr =
    document.querySelector('.deck-word-row[data-id="' + wordId + '"]') ||
    document.querySelector('tr[data-word-id="' + wordId + '"]');
  if (tr) tr.style.background = checked ? 'rgba(226,75,74,0.07)' : '';
}

function dmRowClick(tr, wordId) {
  if (!dmActive || !wordId) return;
  const cb = tr.querySelector('.dm-checkbox');
  if (!cb) return;
  cb.checked = !cb.checked;
  dmToggleRow(wordId, cb.checked);
}

async function adExportDeckJson() {
  const deckId = window._currentDeckId;
  if (!deckId || !getAuthToken()) {
    alert('Vui l\u00f2ng m\u1edf deck \u0111\u1ec3 t\u1ea3i JSON.');
    return;
  }
  try {
    const res = await fetch('/api/decks/' + deckId + '/export', { headers: adAuthHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      alert(err.error || 'Kh\u00f4ng th\u1ec3 t\u1ea3i JSON.');
      return;
    }
    const blob = await res.blob();
    let filename = 'andeck-' + deckId.slice(0, 8) + '.json';
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    if (match) filename = match[1];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    adNotify('\u0110\u00e3 t\u1ea3i JSON deck', 'ok');
  } catch (e) {
    console.error('adExportDeckJson:', e);
    alert('L\u1ed7i k\u1ebft n\u1ed1i, vui l\u00f2ng th\u1eed l\u1ea1i.');
  }
}

function initEditorModals() {
  if (adEditorInited) return;
  adEditorInited = true;

  document.getElementById('addWordOverlay')?.addEventListener('click', function (e) {
    if (e.target.id === 'addWordOverlay') awClose();
  });
  document.getElementById('deleteConfirmOverlay')?.addEventListener('click', function (e) {
    if (e.target.id === 'deleteConfirmOverlay') dmCancelDialog();
  });
}
