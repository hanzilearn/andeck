/* =====================================================================
   MODULE 04 — MAIN TABLE (Andeck)
   Port 05-main-table.js — generic primary/reading/meaning
   ===================================================================== */

var readingHidden = false;
var starFilter = 'all';
var searchQuery = '';

function adGetStudyProfile() {
  return typeof adGetLangProfile === 'function' ? adGetLangProfile() : null;
}

function adPrimaryLabel() {
  const p = adGetStudyProfile();
  return (p && p.primaryLabel) || 'T\u1eeb g\u1ed1c';
}

function adReadingLabel() {
  const p = adGetStudyProfile();
  return (p && p.readingLabel) || 'Reading';
}

function adMeaningLabel() {
  const p = adGetStudyProfile();
  return (p && p.meaningLabel) || 'Ngh\u0129a';
}

function adHasReadingColumn() {
  const p = adGetStudyProfile();
  return !p || p.hasReading !== false;
}

function adFormatDetailHtml(w) {
  const hasEx = !!(w.exPrimary && String(w.exPrimary).trim());
  const hasNote = !!(w.note && String(w.note).trim());
  if (!hasEx && !hasNote) {
    return '<span class="td-detail-empty">\u2014</span>';
  }
  let html = '';
  if (hasEx) {
    html +=
      '<div class="ex-hanzi">' +
      adFormatPrimaryHtml(w.exPrimary, w.exReading || '') +
      '</div>';
    if (w.exReading && String(w.exReading).trim()) {
      html += '<div class="ex-pinyin">' + esc(w.exReading) + '</div>';
    }
    if (w.exMeaning && String(w.exMeaning).trim()) {
      html += '<div class="ex-viet">' + esc(w.exMeaning) + '</div>';
    }
  }
  if (hasNote) {
    html += '<div class="word-note">' + esc(w.note) + '</div>';
  }
  return html;
}

/* ─── MODE ─── */
function setMode(m, btn) {
  _answersCache[mode] = answers;
  answers = _answersCache[m] || {};
  mode = m;
  if (m === 'all') window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.mode-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  render();
}

function toggleReading() {
  if (!adHasReadingColumn()) return;
  readingHidden = !readingHidden;
  const btn = document.getElementById('reading-btn');
  if (btn) btn.classList.toggle('on-red', readingHidden);
  render();
}

function toggleHideStarred() {
  const lblFilter = getCurrentFilterState();
  const btn = document.getElementById('hide-starred-btn');
  if (lblFilter.state === 'all') {
    openFilterMenu('table');
    return;
  }
  if (lblFilter.state === 'labels') {
    setCurrentFilterState('unlabeled', []);
    starFilter = 'all';
    if (btn) {
      btn.classList.remove('on-red');
      btn.classList.add('on-red-slash');
    }
  } else {
    setCurrentFilterState('all', []);
    starFilter = 'all';
    if (btn) btn.classList.remove('on-red', 'on-red-slash');
  }
  render();
}

function toggleStar(idx) {
  const cur = itemLabels[idx];
  if (!cur) {
    if (!activeLabelId) {
      openAssignMenu();
      return;
    }
    itemLabels[idx] = activeLabelId;
    starred.add(idx);
  } else if (cur === activeLabelId) {
    delete itemLabels[idx];
    starred.delete(idx);
  } else {
    itemLabels[idx] = activeLabelId;
  }
  render();
  updateStarCount();
  saveStars();
}

function updateStarCount() {
  const el = document.getElementById('star-count');
  if (el) el.textContent = starred.size;
}

function saveStars() {
  const token = getAuthToken();
  if (!token || !currentLevel) return;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token
  };
  fetch(window.location.origin + '/api/stars', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ level: currentLevel, stars: [...starred] })
  }).catch(function (e) {
    console.error('saveStars error:', e);
  });
  fetch(window.location.origin + '/api/items', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ level: currentLevel, items: itemLabels })
  }).catch(function (e) {
    console.error('saveItems error:', e);
  });
}

function handleSearch(input) {
  searchQuery = input.value.trim().toLowerCase();
  render();
}

function toggleShuffle() {
  shuffled = !shuffled;
  const btn = document.getElementById('shuffle-btn');
  if (btn) btn.classList.toggle('on', shuffled);
  if (shuffled) {
    order = VOCAB.map(function (_, i) {
      return i;
    });
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
  } else {
    order = VOCAB.map(function (_, i) {
      return i;
    });
  }
  answers = {};
  _answersCache = {};
  render();
}

function resetAll() {
  answers = {};
  _answersCache = {};
  searchQuery = '';
  const si = document.getElementById('search-input');
  if (si) si.value = '';
  starFilter = 'all';
  const hsBtn = document.getElementById('hide-starred-btn');
  if (hsBtn) hsBtn.classList.remove('on-red', 'on-red-slash');
  setCurrentFilterState('all', []);
  readingHidden = false;
  const rb = document.getElementById('reading-btn');
  if (rb) rb.classList.remove('on-red');
  shuffled = false;
  const sb = document.getElementById('shuffle-btn');
  if (sb) sb.classList.remove('on');
  order = VOCAB.map(function (_, i) {
    return i;
  });
  render();
}

var _tableRenderGen = 0;
var TABLE_RENDER_CHUNK = 80;
var TABLE_RENDER_SYNC_MAX = 500;

function showTableLoading(msg) {
  const el = document.getElementById('table-loading');
  const tx = document.getElementById('table-loading-text');
  const tbl = document.getElementById('tbl');
  if (tx && msg) tx.textContent = msg;
  if (el) el.style.display = 'flex';
  if (tbl) tbl.style.display = 'none';
}

function hideTableLoading() {
  const el = document.getElementById('table-loading');
  if (el) el.style.display = 'none';
}

function renderTableBodyChunked(tbody, filteredOrder, buildRow, gen) {
  tbody.innerHTML = '';
  if (!filteredOrder.length) return Promise.resolve();

  return new Promise(function (resolve) {
    let pos = 0;
    function step() {
      if (gen !== _tableRenderGen) {
        resolve();
        return;
      }
      const end = Math.min(pos + TABLE_RENDER_CHUNK, filteredOrder.length);
      tbody.insertAdjacentHTML('beforeend', filteredOrder.slice(pos, end).map(buildRow).join(''));
      pos = end;
      if (pos < filteredOrder.length) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function render() {
  const thead = document.getElementById('thead-row');
  const tbody = document.getElementById('tbody');
  if (!thead || !tbody) return;

  let filteredOrder = order;
  if (searchQuery) {
    filteredOrder = order.filter(function (idx) {
      const w = VOCAB[idx];
      return (
        String(w.primary || '')
          .toLowerCase()
          .indexOf(searchQuery) !== -1 ||
        String(w.reading || '')
          .toLowerCase()
          .indexOf(searchQuery) !== -1 ||
        String(w.meaning || '')
          .toLowerCase()
          .indexOf(searchQuery) !== -1 ||
        String(w.note || '')
          .toLowerCase()
          .indexOf(searchQuery) !== -1
      );
    });
  }

  if (starFilter === 'only') filteredOrder = filteredOrder.filter(function (idx) { return starred.has(idx); });
  else if (starFilter === 'hide') filteredOrder = filteredOrder.filter(function (idx) { return !starred.has(idx); });

  const labelFilter = getCurrentFilterState();
  if (labelFilter.state === 'labels' && labelFilter.ids.length > 0) {
    filteredOrder = filteredOrder.filter(function (idx) {
      const lid = itemLabels[idx];
      return lid && labelFilter.ids.includes(lid);
    });
  } else if (labelFilter.state === 'unlabeled') {
    filteredOrder = filteredOrder.filter(function (idx) {
      return !itemLabels[idx];
    });
  }

  const inDeck = !!window._currentDeckId;
  const deckAllMode = inDeck && mode === 'all';
  const deckProfile =
    deckAllMode && window._adLayoutProfile
      ? window._adLayoutProfile
      : { showReading: adHasReadingColumn(), showDetail: false, showExample: false, layout: 'normal' };
  const dmOn = inDeck && typeof dmActive !== 'undefined' && dmActive;
  const emOn = inDeck && typeof emActive !== 'undefined' && emActive;
  const dmHdr = dmOn ? '<th class="dm-check-col" style="width:40px;"></th>' : '';
  const sttHdr = emOn
    ? '<th class="td-stt-col em-stt-hdr" style="width:40px"><span class="em-pen-hdr" aria-hidden="true"><i class="ti ti-pencil"></i></span></th>'
    : '<th style="width:36px">#</th>';

  const dmCell = function (w) {
    if (!dmOn) return '';
    const wordId = w.id || '';
    if (!wordId) {
      return '<td class="dm-check-col" style="width:40px;text-align:center;"></td>';
    }
    return (
      '<td class="dm-check-col" style="width:40px;text-align:center;">' +
      '<input type="checkbox" class="dm-checkbox" style="width:16px;height:16px;accent-color:#E24B4A;cursor:pointer;"' +
      ' onclick="event.stopPropagation()"' +
      " onchange=\"dmToggleRow('" +
      esc(wordId) +
      "', this.checked); this.closest('tr').style.background = this.checked ? 'rgba(226,75,74,0.07)' : '';\">" +
      '</td>'
    );
  };

  const sttCell = function (idx, w) {
    const wordId = w.id || '';
    if (emOn && wordId) {
      return '<td class="td-stt em-stt-cell"><span class="em-pen-slot" aria-hidden="true"><i class="ti ti-pencil"></i></span></td>';
    }
    return '<td class="td-stt">' + (idx + 1) + '</td>';
  };

  const deckRowOn = function (wordId) {
    if (!inDeck || !wordId) return '';
    if (emOn) return " onclick=\"emRowClick(this, '" + esc(wordId) + "')\"";
    if (dmOn) return " onclick=\"dmRowClick(this, '" + esc(wordId) + "')\"";
    return '';
  };

  const deckRowClass = function (rc) {
    const base = rc || '';
    return emOn ? (base ? base + ' em-row-edit' : 'em-row-edit') : base;
  };

  const soundBtn = function (id) {
    return (
      '<button class="sound-toggle-inline ' +
      (_soundEnabled ? '' : 'sound-muted') +
      '" onclick="toggleSound()" title="B\u1eadt/t\u1eaft \u00e2m thanh" id="' +
      id +
      '">' +
      '<span class="sound-on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></span>' +
      '<span class="sound-off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg></span>' +
      '</button>'
    );
  };

  const primaryLbl = esc(adPrimaryLabel());
  const readingLbl = esc(adReadingLabel());
  const meaningLbl = esc(adMeaningLabel());

  if (mode === 'primary') {
    const readHdr = adHasReadingColumn() ? '<th>' + readingLbl + '</th>' : '';
    thead.innerHTML =
      '<tr>' +
      dmHdr +
      sttHdr +
      readHdr +
      '<th>' +
      meaningLbl +
      '</th><th>Nh\u1eadp ' +
      primaryLbl +
      soundBtn('sound-btn-inline') +
      '</th><th></th></tr>';
  } else if (mode === 'meaning') {
    const readHdr = adHasReadingColumn() ? '<th>' + readingLbl + '</th>' : '';
    thead.innerHTML =
      '<tr>' +
      dmHdr +
      sttHdr +
      '<th>' +
      primaryLbl +
      '</th>' +
      readHdr +
      '<th>Nh\u1eadp ' +
      meaningLbl +
      soundBtn('sound-btn-inline2') +
      '</th><th></th></tr>';
  } else {
    const actLbl = activeLabelId
      ? userLabels.find(function (l) {
          return l.id === activeLabelId;
        })
      : null;
    const dotC = actLbl ? actLbl.color : '#d4a017';
    const lblTxt = actLbl ? esc(actLbl.name) : 'Đã nhớ';
    const lblHdr =
      inDeck && !dmOn && !emOn
        ? '<th class="th-label-header" style="width:140px" onclick="openAssignMenu()" title="Click để đổi nhãn">' +
          '<div class="th-label-inner">' +
          '<span class="th-label-dot" style="background:' +
          dotC +
          '"></span>' +
          '<span class="th-label-text">' +
          lblTxt +
          '</span>' +
          '<span class="th-label-arrow">▼</span>' +
          '</div></th>'
        : '';
    const readHdr = deckProfile.showReading ? '<th>' + readingLbl + '</th>' : '';
    const detailHdr =
      deckAllMode && deckProfile.showDetail
        ? '<th class="th-example-pc th-detail-pc">V\u00ed d\u1ee5 / Ch\u00fa thích</th>'
        : !deckAllMode && deckProfile.showExample
          ? '<th class="th-example-pc">V\u00ed d\u1ee5</th>'
          : '';
    thead.innerHTML =
      '<tr>' +
      dmHdr +
      sttHdr +
      '<th>' +
      primaryLbl +
      '</th>' +
      readHdr +
      '<th>' +
      meaningLbl +
      '</th>' +
      detailHdr +
      lblHdr +
      '</tr>';
  }

  const tblEl = document.getElementById('tbl');
  if (tblEl) {
    tblEl.classList.toggle('mp-project-table', deckAllMode);
    tblEl.classList.remove('mp-layout-sparse', 'mp-layout-full');
    if (deckAllMode) {
      if (deckProfile.showDetail) {
        tblEl.classList.add('mp-layout-full');
      } else if (!deckProfile.showReading) {
        tblEl.classList.add('mp-layout-sparse');
      }
    }
  }

  const readingBtn = document.getElementById('reading-btn');
  if (readingBtn) {
    const readDisabled = deckAllMode && !deckProfile.showReading;
    readingBtn.disabled = readDisabled;
    readingBtn.classList.toggle('is-disabled', readDisabled);
    readingBtn.title = readDisabled
      ? 'C\u1ed9t reading \u0111\u00e3 \u1ea9n (deck thi\u1ebfu reading)'
      : '\u1ea8n ' + adReadingLabel();
  }

  const emptyEl = document.getElementById('empty-state');
  if (tblEl) tblEl.style.display = 'table';
  if (emptyEl) emptyEl.style.display = filteredOrder.length === 0 ? 'block' : 'none';

  const renderGen = ++_tableRenderGen;

  function buildRow(idx) {
    const w = VOCAB[idx];
    const a = answers[idx];
    const rc = a ? (a.correct ? 'row-correct' : 'row-wrong') : '';
    const icon = a ? (a.correct ? '\u2705' : '\u274c') : '';
    const val = a ? esc(a.value) : '';
    const ic = a ? (a.correct ? 'correct' : 'wrong') : '';
    const dis = a ? 'disabled' : '';
    const speakText = esc(w.primary);
    const speakBtn =
      '<button class="speak-btn" onclick="speak(\'' +
      speakText +
      '\')" title="Ph\u00e1t \u00e2m">\uD83D\uDD0A</button>';
    const readingText = adFormatReadingHtml(w.reading, readingHidden);
    const wordId = w.id || '';
    const rowOn = deckRowOn(wordId);
    const rowCls = deckRowClass(rc);

    if (mode === 'primary') {
      const readCell = adHasReadingColumn()
        ? '<td class="td-pinyin"><div class="td-pinyin-inner">' + speakBtn + readingText + '</div></td>'
        : '';
      return (
        '<tr class="' +
        rowCls +
        '" id="row-' +
        idx +
        '"' +
        rowOn +
        '>' +
        dmCell(w) +
        sttCell(idx, w) +
        readCell +
        '<td class="td-meaning">' +
        esc(w.meaning) +
        '</td><td class="td-input">' +
        '<input class="vocab-input ' +
        ic +
        '" type="text" ' +
        dis +
        ' value="' +
        val +
        '" placeholder="Nh\u1eadp ' +
        esc(adPrimaryLabel()) +
        '..." onkeydown="if(event.key===\'Enter\')check(' +
        idx +
        ',this,\'primary\')">' +
        (a && !a.correct
          ? '<div class="hint-answer">\u2192 ' + esc(w.primary) + '</div>'
          : '') +
        '</td><td class="td-result"><span class="result-icon" id="ic-' +
        idx +
        '">' +
        icon +
        '</span></td></tr>'
      );
    }

    if (mode === 'meaning') {
      const readCell = adHasReadingColumn()
        ? '<td class="td-pinyin"><div class="td-pinyin-inner">' + speakBtn + readingText + '</div></td>'
        : '';
      return (
        '<tr class="' +
        rowCls +
        '" id="row-' +
        idx +
        '"' +
        rowOn +
        '>' +
        dmCell(w) +
        sttCell(idx, w) +
        '<td class="td-hanzi">' +
        adFormatPrimaryHtml(w.primary, w.reading) +
        '</td>' +
        readCell +
        '<td class="td-input">' +
        '<input class="vocab-input ' +
        ic +
        '" type="text" ' +
        dis +
        ' value="' +
        val +
        '" placeholder="Nh\u1eadp ngh\u0129a..." onkeydown="if(event.key===\'Enter\')check(' +
        idx +
        ',this,\'meaning\')">' +
        (a && !a.correct
          ? '<div class="hint-answer">\u2192 ' + esc(w.meaning) + '</div>'
          : '') +
        '</td><td class="td-result"><span class="result-icon" id="ic-' +
        idx +
        '">' +
        icon +
        '</span></td></tr>'
      );
    }

    let detailPC = '';
    if (deckAllMode && deckProfile.showDetail) {
      detailPC =
        '<td class="td-example-pc td-detail-pc">' + adFormatDetailHtml(w) + '</td>';
    } else if (!deckAllMode && deckProfile.showExample) {
      const hasEx = !!(w.exPrimary && String(w.exPrimary).trim());
      detailPC = hasEx
        ? '<td class="td-example-pc"><div class="ex-hanzi">' +
          adFormatPrimaryHtml(w.exPrimary, w.exReading || '') +
          '</div><div class="ex-pinyin">' +
          adFormatReadingHtml(w.exReading || '', false) +
          '</div><div class="ex-viet">' +
          esc(w.exMeaning || '') +
          '</div></td>'
        : '<td class="td-example-pc"><span class="td-detail-empty">\u2014</span></td>';
    }
    const posTag = w.pos ? '<div class="tu-loai-tag">' + esc(w.pos) + '</div>' : '';
    const primaryDisplay = adFormatPrimaryHtml(w.primary, w.reading);
    const primaryInner = deckProfile.showReading
      ? primaryDisplay + posTag
      : '<div class="td-hanzi-inner">' + speakBtn + '<span>' + primaryDisplay + '</span></div>' + posTag;
    const readCell = deckProfile.showReading
      ? '<td class="td-pinyin"><div class="td-pinyin-inner">' + speakBtn + readingText + '</div></td>'
      : '';
    const lid = itemLabels[idx];
    const lbl = lid
      ? userLabels.find(function (l) {
          return l.id === lid;
        })
      : null;
    const starCell =
      inDeck && !dmOn && !emOn
        ? '<td class="td-star">' + renderStarSVG(idx, lbl) + '</td>'
        : '';
    const allCls = deckRowClass('');
    return (
      '<tr class="' +
      allCls +
      '" id="row-' +
      idx +
      '"' +
      deckRowOn(wordId) +
      '>' +
      dmCell(w) +
      sttCell(idx, w) +
      '<td class="td-hanzi">' +
      primaryInner +
      '</td>' +
      readCell +
      '<td class="td-meaning">' +
      esc(w.meaning) +
      '</td>' +
      detailPC +
      starCell +
      '</tr>'
    );
  }

  const tbl = document.getElementById('tbl');
  const isRefresh = tbl && tbl.style.display === 'table';

  if (filteredOrder.length <= TABLE_RENDER_SYNC_MAX || isRefresh) {
    tbody.innerHTML = filteredOrder.map(buildRow).join('');
    hideTableLoading();
    if (tbl) tbl.style.display = 'table';
    return Promise.resolve();
  }

  showTableLoading('\u0110ang hi\u1ec3n th\u1ecb b\u1ea3ng t\u1eeb (' + filteredOrder.length + ' t\u1eeb)\u2026');
  if (tbl) tbl.style.display = 'table';
  return renderTableBodyChunked(tbody, filteredOrder, buildRow, renderGen).then(function () {
    hideTableLoading();
  });
}

function check(idx, input, type) {
  const w = VOCAB[idx];
  const val = input.value.trim();
  if (!val) return;

  let correct = false;
  if (type === 'primary') {
    correct = val === w.primary;
  } else {
    const normalize = function (s) {
      return s
        .toLowerCase()
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*\/\s*/g, '/')
        .replace(/\s+/g, ' ')
        .trim();
    };
    const stripParens = function (s) {
      return s
        .replace(/[\(\（][^\)）]*[\)）]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[.!?。！？]+\s*$/g, '')
        .trim();
    };
    const userVal = normalize(val);
    const answerRaw = normalize(w.meaning);
    const answerStripped = stripParens(answerRaw);

    if (userVal === answerRaw || userVal === answerStripped) {
      correct = true;
    } else {
      const splitParts = function (s) {
        return s
          .split(/[,\/;]/)
          .map(function (p) {
            return p.trim().toLowerCase();
          })
          .filter(Boolean);
      };
      const partsRaw = splitParts(answerRaw);
      const partsStripped = splitParts(answerStripped);
      if (partsRaw.indexOf(userVal) !== -1 || partsStripped.indexOf(userVal) !== -1) {
        correct = true;
      } else {
        const tryClean = function (parts) {
          return parts.some(function (p) {
            const cleaned = p
              .replace(/[\(\（][^\)）]*[\)）]/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            return cleaned && cleaned === userVal;
          });
        };
        if (tryClean(partsRaw)) correct = true;
      }
    }
  }

  answers[idx] = { value: val, correct: correct };
  input.className = 'vocab-input ' + (correct ? 'correct' : 'wrong');
  input.disabled = true;

  const row = document.getElementById('row-' + idx);
  if (row) row.className = correct ? 'row-correct' : 'row-wrong';
  const ic = document.getElementById('ic-' + idx);
  if (ic) {
    ic.textContent = correct ? '\u2705' : '\u274c';
    ic.classList.remove('pop');
    void ic.offsetWidth;
    ic.classList.add('pop');
  }

  if (typeof playFeedbackSound === 'function') playFeedbackSound(correct);

  if (!correct) {
    let hint = row && row.querySelector('.hint-answer');
    if (!hint && input.parentNode) {
      hint = document.createElement('div');
      hint.className = 'hint-answer';
      input.parentNode.appendChild(hint);
    }
    if (hint) hint.textContent = '\u2192 ' + (type === 'primary' ? w.primary : w.meaning);
  }

  setTimeout(function () {
    const allInputs = Array.prototype.slice.call(document.querySelectorAll('.vocab-input'));
    const currentPos = allInputs.indexOf(input);
    const next = allInputs.slice(currentPos + 1).find(function (i) {
      return !i.disabled;
    });
    if (next) {
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 200);
}

function adInitStudyToolbar(profile) {
  profile = profile || adGetStudyProfile() || {};

  const readingBtn = document.getElementById('reading-btn');
  if (readingBtn) {
    const show = profile.hasReading !== false;
    readingBtn.style.display = show ? '' : 'none';
    readingBtn.title = '\u1ea8n ' + (profile.readingLabel || 'reading');
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder =
      '\uD83D\uDD0D T\u00ecm t\u1eeb (' +
      (profile.primaryLabel || 't\u1eeb') +
      ', ' +
      (profile.readingLabel || 'reading') +
      ' ho\u1eb7c ngh\u0129a)...';
  }
}

function adResetStudyUiState() {
  mode = 'all';
  shuffled = false;
  readingHidden = false;
  searchQuery = '';
  starFilter = 'all';
  answers = {};
  _answersCache = {};
  document.querySelectorAll('.mode-btn').forEach(function (b, i) {
    b.classList.toggle('active', i === 0 || b.dataset.mode === 'all');
  });
  const si = document.getElementById('search-input');
  if (si) si.value = '';
  const rb = document.getElementById('reading-btn');
  if (rb) rb.classList.remove('on-red');
  const sb = document.getElementById('shuffle-btn');
  if (sb) sb.classList.remove('on');
  const hsBtn = document.getElementById('hide-starred-btn');
  if (hsBtn) hsBtn.classList.remove('on-red', 'on-red-slash');
}

/* ─── MOBILE MODE DROPDOWN ─── */
var _modeIcons = {
  all: { icon: '\uD83D\uDC41', label: 'T\u1ea5t c\u1ea3' },
  primary: { icon: '\u270d\ufe0f', label: 'KT t\u1eeb' },
  meaning: { icon: '\uD83D\uDCD6', label: 'KT ngh\u0129a' }
};

function _updateDropdownIcon() {
  var btn = document.getElementById('mode-dropdown-btn');
  if (!btn) return;
  var iconSpan = btn.querySelector('.mode-icon');
  if (iconSpan) iconSpan.textContent = _modeIcons[mode] ? _modeIcons[mode].icon : '\uD83D\uDC41';
}

function toggleModeDropdown() {
  var overlay = document.getElementById('mode-dropdown-overlay');
  var menu = document.getElementById('mode-dropdown-menu');
  if (!overlay || !menu) return;
  var isOpen = menu.classList.contains('open');
  if (isOpen) {
    overlay.classList.remove('open');
    menu.classList.remove('open');
  } else {
    overlay.classList.add('open');
    menu.classList.add('open');
  }
}

function closeModeDropdown() {
  var overlay = document.getElementById('mode-dropdown-overlay');
  var menu = document.getElementById('mode-dropdown-menu');
  if (overlay) overlay.classList.remove('open');
  if (menu) menu.classList.remove('open');
}

function selectModeFromDropdown(m) {
  _answersCache[mode] = answers;
  answers = _answersCache[m] || {};
  closeModeDropdown();
  mode = m;
  if (m === 'all') window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.mode-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.mode === m);
  });
  _updateDropdownIcon();
  document.querySelectorAll('.mode-dropdown-item').forEach(function (item) {
    item.classList.toggle('selected', item.dataset.mode === m);
    var check = item.querySelector('.item-check');
    if (check) check.style.display = item.dataset.mode === m ? '' : 'none';
  });
  render();
}

function initModeDropdown() {
  if (window.innerWidth > 600) return;
  if (document.getElementById('mode-dropdown-btn')) return;

  var overlay = document.createElement('div');
  overlay.id = 'mode-dropdown-overlay';
  overlay.className = 'mode-dropdown-overlay';
  overlay.onclick = closeModeDropdown;
  document.body.appendChild(overlay);

  var menu = document.createElement('div');
  menu.id = 'mode-dropdown-menu';
  menu.className = 'mode-dropdown-menu';

  var modes = [
    { key: 'all', icon: '\uD83D\uDC41', label: 'T\u1ea5t c\u1ea3' },
    { key: 'primary', icon: '\u270d\ufe0f', label: 'KT t\u1eeb' },
    { key: 'meaning', icon: '\uD83D\uDCD6', label: 'KT ngh\u0129a' }
  ];

  modes.forEach(function (m) {
    var item = document.createElement('div');
    item.className = 'mode-dropdown-item' + (mode === m.key ? ' selected' : '');
    item.dataset.mode = m.key;
    item.innerHTML =
      '<span class="item-icon">' +
      m.icon +
      '</span><span>' +
      m.label +
      '</span><span class="item-check" style="' +
      (mode === m.key ? '' : 'display:none') +
      '">\u2713</span>';
    item.onclick = function () {
      selectModeFromDropdown(m.key);
    };
    menu.appendChild(item);
  });
  document.body.appendChild(menu);

  var btn = document.createElement('button');
  btn.id = 'mode-dropdown-btn';
  btn.className = 'mode-dropdown-btn';
  btn.setAttribute('aria-label', 'Ch\u1ecdn ch\u1ebf \u0111\u1ed9 h\u1ecdc');
  btn.innerHTML =
    '<span class="mode-icon">' +
    (_modeIcons[mode] ? _modeIcons[mode].icon : '\uD83D\uDC41') +
    '</span><span class="mode-chevron">\u25be</span>';
  btn.onclick = toggleModeDropdown;

  var toolbar = document.querySelector('.toolbar');
  if (toolbar) toolbar.insertBefore(btn, toolbar.firstChild);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModeDropdown);
} else {
  initModeDropdown();
}

window.addEventListener('resize', function () {
  if (window.innerWidth <= 600) initModeDropdown();
});
