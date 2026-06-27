/* =====================================================================
   MODULE 08 — FLASHCARD (Andeck)
   Port 09-flashcard.js — primary/reading/meaning
   ===================================================================== */

var fcCfg = { pool: 'all', order: 'seq', count: 10 };
var fcHideReading = false;
var fcCards = [];
var fcIdx = 0;
var fcFlipped = false;
var fcAnimDir = '';
var fcStarred = new Set();
var fcSaveLabelId = null;
var fcSaveLabelPick = null;
var _fcAnimBound = false;

function fcSaveLabelName() {
  return (
    userLabels.find(function (l) {
      return l.id === fcSaveLabelId;
    })?.name || 'Đã nhớ'
  );
}

function renderFcSaveLabelBtn() {
  const lbl = userLabels.find(function (l) {
    return l.id === fcSaveLabelId;
  });
  const starEl = document.getElementById('fc-save-label-star');
  const nameEl = document.getElementById('fc-save-label-name');
  const displayEl = document.getElementById('fc-save-label-display');
  if (!nameEl) return;
  nameEl.textContent = lbl?.name || 'Đã nhớ';
  if (starEl) starEl.style.color = lbl?.color || '#f1c40f';
  if (displayEl && lbl?.color) displayEl.style.borderColor = lbl.color + '66';
}

function openFcSaveLabelPicker() {
  fcSaveLabelPick = fcSaveLabelId || activeLabelId || userLabels[0]?.id || 'lbl_default';
  radialMode = 'pick-fc-label';
  ensureRadialMenuDOM();
  renderRadialMenu();
  document.getElementById('label-radial-overlay').classList.add('open');
}

function confirmFcSaveLabelPick() {
  if (!fcSaveLabelPick) {
    showLabelToast('Chọn nhãn trước', '#e74c3c');
    return;
  }
  fcSaveLabelId = fcSaveLabelPick;
  fcSaveLabelPick = null;
  radialMode = 'assign';
  document.getElementById('label-radial-overlay')?.classList.remove('open');
  renderFcSaveLabelBtn();
  const lbl = userLabels.find(function (l) {
    return l.id === fcSaveLabelId;
  });
  showLabelToast('✓ Lưu vào "' + (lbl?.name || '') + '"', lbl?.color || '#27ae60');
}

function fcStarLabelIdForWord(ci) {
  if (!fcStarred.has(ci)) return null;
  if (itemLabels[ci]) return itemLabels[ci];
  return fcSaveLabelId || activeLabelId || 'lbl_default';
}

function fcStarInnerHtml(ci, uid) {
  const labelId = fcStarLabelIdForWord(ci);
  if (!labelId) {
    return (
      '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2l2.99 6.07L22 9.24l-5.5 5.36L17.82 22 12 18.73 6.18 22 7.5 14.6 2 9.24l7.01-1.17L12 2z" fill="#d4d0c8" stroke="#a8a49c" stroke-width="1" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  const lbl = userLabels.find(function (l) {
    return l.id === labelId;
  });
  const c = lbl?.color || '#f1c40f';
  const light = typeof lightenColor === 'function' ? lightenColor(c, 40) : c;
  const dark = typeof darkenColor === 'function' ? darkenColor(c, 25) : c;
  const gradId = 'fc-star-grad-' + uid;
  return (
    '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">' +
    '<defs><linearGradient id="' +
    gradId +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    light +
    '"/>' +
    '<stop offset="50%" stop-color="' +
    c +
    '"/>' +
    '<stop offset="100%" stop-color="' +
    dark +
    '"/>' +
    '</linearGradient></defs>' +
    '<path d="M12 2l2.99 6.07L22 9.24l-5.5 5.36L17.82 22 12 18.73 6.18 22 7.5 14.6 2 9.24l7.01-1.17L12 2z" fill="url(#' +
    gradId +
    ')" stroke="' +
    dark +
    '" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M12 4.5l1.8 3.6 4 .6-3 3 .8 4-3.6-2" fill="rgba(255,255,255,.35)"/>' +
    '</svg>'
  );
}

function fcUpdateStarButtons(ci) {
  const isStar = fcStarred.has(ci);
  ['fc-sf', 'fc-sb'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', isStar);
    el.innerHTML = fcStarInnerHtml(ci, id);
    const lbl = userLabels.find(function (l) {
      return l.id === fcStarLabelIdForWord(ci);
    });
    el.title = isStar && lbl ? 'Nhãn: ' + lbl.name : 'Click để đánh dấu đã nhớ';
  });
}

function fcBindAnimCleanup() {
  if (_fcAnimBound) return;
  const wrap = document.querySelector('.fc-card-wrap');
  if (!wrap) return;
  _fcAnimBound = true;
  wrap.addEventListener('animationend', function () {
    wrap.classList.remove('anim-left', 'anim-right');
  });
}

function setFcOpt(k, v, btn) {
  fcCfg[k] = v;
  if (k === 'count' && v === 0) fcCfg.count = VOCAB.length;
  if (btn) {
    btn.parentElement.querySelectorAll('.opt-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    if (k === 'count') document.getElementById('fc-custom-count').value = '';
  }
}
function toggleFcReading() {
  fcHideReading = !fcHideReading;
  document.getElementById('fc-reading-toggle').className = 'toggle-switch' + (fcHideReading ? ' on' : '');
}

function adSyncFcSetupLabels() {
  const profile = typeof adGetLangProfile === 'function' ? adGetLangProfile() : null;
  const readingLbl = profile?.readingLabel || 'Reading';
  const hasReading = profile?.hasReading !== false;
  const toggleRow = document.querySelector('#fc-setup-screen .toggle-row');
  if (toggleRow) {
    toggleRow.style.display = hasReading ? '' : 'none';
    const lbl = toggleRow.querySelector('.toggle-label');
    if (lbl) {
      lbl.innerHTML = 'Ẩn ' + readingLbl + '<br><small>Chỉ hiện từ gốc, rèn nhớ phát âm</small>';
    }
  }
}

function _openFlashcardSetup() {
  const t = VOCAB.length,
    s = starred.size;
  document.getElementById('fc-total').textContent = t;
  document.getElementById('fc-starred').textContent = s;
  document.getElementById('fc-unstarred').textContent = t - s;
  fcCfg = { pool: 'all', order: 'seq', count: 10 };
  fcFilterIds = [];
  fcHideReading = false;
  document.getElementById('fc-reading-toggle').className = 'toggle-switch';
  document.querySelectorAll('#fc-setup-screen .setup-section .option-group .opt-btn').forEach(function (b, i) {
    b.classList.toggle('active', i === 0);
  });
  document.getElementById('fc-custom-count').value = '';
  fcSaveLabelId = activeLabelId || userLabels[0]?.id || 'lbl_default';
  adSyncFcSetupLabels();
  renderFcSaveLabelBtn();
  if (typeof updateFcPoolDisplay === 'function') updateFcPoolDisplay();
  showOnly('fc-setup-screen');
}

function showFlashcard() {
  if (window._currentDeckId) {
    const n = Array.isArray(VOCAB) ? VOCAB.length : 0;
    if (n < 1) {
      showLabelToast('Deck chưa có từ để học flashcard', '#95a5a6');
      return;
    }
  }
  _openFlashcardSetup();
}

function startFc() {
  let pool = [];
  for (let i = 0; i < VOCAB.length; i++) {
    if (fcCfg.pool === 'starred') {
      if (fcFilterIds?.length > 0) {
        const lid = itemLabels[i];
        if (!lid || !fcFilterIds.includes(lid)) continue;
      } else {
        if (!starred.has(i)) continue;
      }
    }
    if (fcCfg.pool === 'unstarred' && starred.has(i)) continue;
    pool.push(i);
  }
  if (!pool.length) {
    alert('Không có từ nào phù hợp!');
    return;
  }

  if (fcCfg.order === 'rand') {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
  }
  fcCards = pool.slice(0, Math.min(fcCfg.count || pool.length, pool.length));
  fcIdx = 0;
  fcFlipped = false;
  fcAnimDir = '';
  fcStarred = new Set();
  fcCards.forEach(function (ci) {
    if (starred.has(ci)) fcStarred.add(ci);
  });

  fcBindAnimCleanup();
  showOnly('fc-play-screen');
  fcRender();
}

function fcUpdateExampleBox(w) {
  const box = document.getElementById('fc-example');
  const exPrimaryEl = document.getElementById('fc-ex-primary');
  const exReadingEl = document.getElementById('fc-ex-reading');
  const exMeaningEl = document.getElementById('fc-ex-meaning');
  const exNoteEl = document.getElementById('fc-ex-note');
  if (!box || !exPrimaryEl || !exReadingEl || !exMeaningEl || !exNoteEl) return;

  const hasEx = !!(w.exPrimary && String(w.exPrimary).trim());
  const hasNote = !!(w.note && String(w.note).trim());

  if (!hasEx && !hasNote) {
    box.style.display = 'none';
    box.classList.remove('fc-example--compact');
    return;
  }

  box.style.display = 'block';

  if (hasEx) {
    exPrimaryEl.style.display = '';
    exPrimaryEl.innerHTML = adFormatPrimaryHtml(w.exPrimary, w.exReading || '');
    const reading = String(w.exReading || '').trim();
    if (reading) {
      exReadingEl.style.display = '';
      exReadingEl.textContent = reading;
    } else {
      exReadingEl.style.display = 'none';
      exReadingEl.textContent = '';
    }
    const exMean = String(w.exMeaning || '').trim();
    if (exMean) {
      exMeaningEl.style.display = '';
      exMeaningEl.textContent = exMean;
    } else {
      exMeaningEl.style.display = 'none';
      exMeaningEl.textContent = '';
    }
  } else {
    exPrimaryEl.style.display = 'none';
    exPrimaryEl.innerHTML = '';
    exReadingEl.style.display = 'none';
    exReadingEl.textContent = '';
    exMeaningEl.style.display = 'none';
    exMeaningEl.textContent = '';
  }

  if (hasNote) {
    exNoteEl.style.display = '';
    exNoteEl.textContent = String(w.note).trim();
  } else {
    exNoteEl.style.display = 'none';
    exNoteEl.textContent = '';
  }

  const totalLen =
    (hasEx ? String(w.exPrimary || '') + String(w.exReading || '') + String(w.exMeaning || '') : '') +
    (hasNote ? String(w.note || '') : '');
  box.classList.toggle('fc-example--compact', totalLen.length > 72);
}

function fcRender() {
  if (fcIdx < 0) fcIdx = 0;
  if (fcIdx >= fcCards.length) fcIdx = fcCards.length - 1;

  const ci = fcCards[fcIdx];
  const w = VOCAB[ci];
  const tot = fcCards.length;

  fcFlipped = false;
  const card = document.getElementById('fc-card');
  const wrap = card.parentElement;
  card.classList.remove('flipped', 'anim-left', 'anim-right');
  wrap.classList.remove('anim-left', 'anim-right');
  if (fcAnimDir) {
    void wrap.offsetWidth;
    wrap.classList.add(fcAnimDir === 'left' ? 'anim-left' : 'anim-right');
    fcAnimDir = '';
  }

  document.getElementById('fc-prog-text').textContent = fcIdx + 1 + '/' + tot;
  document.getElementById('fc-prog-bar').style.width = ((fcIdx + 1) / tot) * 100 + '%';
  document.getElementById('fc-cur').textContent = fcIdx + 1;
  document.getElementById('fc-tot').textContent = tot;

  fcUpdateStarButtons(ci);

  document.getElementById('fc-primary').innerHTML = adFormatPrimaryHtml(w.primary, w.reading);
  document.getElementById('fc-reading').innerHTML = fcHideReading
    ? '<span style="color:#ccc">\u2022\u2022\u2022</span>'
    : adFormatReadingHtml(w.reading || '', false);

  document.getElementById('fc-pos').textContent = w.pos || '';
  document.getElementById('fc-meaning').textContent = w.meaning;
  fcUpdateExampleBox(w);

  document.getElementById('fc-prev').disabled = fcIdx === 0;
  const nb = document.getElementById('fc-next');
  if (fcIdx === tot - 1) {
    nb.innerHTML = '✓';
    nb.classList.add('fc-done');
    nb.disabled = false;
  } else {
    nb.innerHTML = '▶';
    nb.classList.remove('fc-done');
    nb.disabled = false;
  }
}

function fcFlip(e) {
  if (e?.target?.closest('.fc-speak-btn') || e?.target?.closest('.fc-star')) return;
  const card = document.getElementById('fc-card');
  const wrap = card.parentElement;
  wrap.classList.remove('anim-left', 'anim-right');
  card.classList.remove('anim-left', 'anim-right');
  fcFlipped = !fcFlipped;
  void card.offsetWidth;
  card.classList.toggle('flipped', fcFlipped);
}
function fcNext() {
  if (fcIdx >= fcCards.length - 1) {
    fcShowEnd();
    return;
  }
  fcAnimDir = 'left';
  fcIdx++;
  fcRender();
}
function fcPrev() {
  if (fcIdx > 0) {
    fcAnimDir = 'right';
    fcIdx--;
    fcRender();
  }
}

function fcToggleStar() {
  const ci = fcCards[fcIdx];
  const wasStarred = fcStarred.has(ci);
  if (wasStarred) fcStarred.delete(ci);
  else fcStarred.add(ci);
  fcUpdateStarButtons(ci);
  if (!wasStarred && fcStarred.has(ci) && typeof playCorrectSound === 'function') playCorrectSound();
}

function fcSpeak() {
  speak(VOCAB[fcCards[fcIdx]].primary);
}

function fcCountStarred() {
  let c = 0;
  fcCards.forEach(function (ci) {
    if (fcStarred.has(ci)) c++;
  });
  return c;
}

document.addEventListener('keydown', function (e) {
  if (!document.getElementById('fc-play-screen').classList.contains('active')) return;
  if (document.getElementById('fc-quit-modal').classList.contains('show')) return;
  if (e.key === 'ArrowRight') fcNext();
  else if (e.key === 'ArrowLeft') fcPrev();
  else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    fcFlip({});
  }
});

function showFcQuit() {
  const d = fcIdx + 1,
    t = fcCards.length,
    s = fcCountStarred();
  const labelName = fcSaveLabelName();
  document.getElementById('fc-quit-summary').textContent =
    'Bạn đã lướt ' + d + '/' + t + ' từ, đánh dấu nhớ ' + s + ' từ.';
  const b = document.getElementById('fc-quit-save');
  if (s === 0) {
    b.textContent = 'Chưa có từ nào đánh dấu nhớ';
    b.disabled = true;
    b.classList.add('is-disabled');
  } else {
    b.textContent = '⭐ Lưu ' + s + ' từ → ' + labelName + ' & thoát';
    b.disabled = false;
    b.classList.remove('is-disabled');
  }
  document.getElementById('fc-quit-modal').classList.add('show');
}
function closeFcQuit() {
  document.getElementById('fc-quit-modal').classList.remove('show');
}
function fcQuitSave() {
  fcSaveStarsToMain();
  closeFcQuit();
  backToApp();
}
function fcQuitNoSave() {
  closeFcQuit();
  backToApp();
}

function fcShowEnd() {
  const t = fcCards.length,
    s = fcCountStarred();
  const labelName = fcSaveLabelName();
  document.getElementById('fc-end-total').textContent = t;
  document.getElementById('fc-end-starred').textContent = s;
  const b = document.getElementById('fc-end-save');
  if (s === 0) {
    b.textContent = 'Chưa có từ nào đánh dấu nhớ';
    b.disabled = true;
    b.style.opacity = '.5';
  } else {
    b.textContent = '⭐ Lưu ' + s + ' từ → ' + labelName;
    b.disabled = false;
    b.style.opacity = '1';
    b.style.background = '';
  }
  showOnly('fc-end-screen');
}
function fcEndSave() {
  fcSaveStarsToMain();
  const b = document.getElementById('fc-end-save');
  const s = fcCountStarred();
  b.textContent = '✅ Đã lưu ' + s + ' từ → ' + fcSaveLabelName();
  b.disabled = true;
  b.style.background = '#27ae60';
}

function fcSaveStarsToMain() {
  const targetLabel = fcSaveLabelId || activeLabelId || 'lbl_default';
  const lbl = userLabels.find(function (l) {
    return l.id === targetLabel;
  });
  fcCards.forEach(function (ci) {
    if (fcStarred.has(ci)) {
      starred.add(ci);
      itemLabels[ci] = targetLabel;
    }
  });
  activeLabelId = targetLabel;
  saveStars();
  updateStarCount();
  const n = fcCountStarred();
  if (n > 0) showLabelToast('✓ Đã lưu ' + n + ' từ vào "' + (lbl?.name || '') + '"', lbl?.color || '#27ae60');
}

function backToApp() {
  showOnly('app-screen');
  render();
}
