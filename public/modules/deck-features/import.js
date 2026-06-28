/* ============================================================
   ANDECK IMPORT — modal import create/append + prompt theo lang
   Port quota/import logic từ Hanzi myproject-features/import.js
   ============================================================ */

let adImportModalInited = false;
let adImportSaving = false;
let adImportMode = 'create';
let adImportPromptText = '';

function adBuildImportPrompt(profile) {
  if (!profile) {
    return (
      'H\u00e3y chuy\u1ec3n b\u1ea3ng t\u1eeb v\u1ef1ng th\u00e0nh JSON array.\n' +
      'M\u1ed7i t\u1eeb l\u00e0 object: primary, reading, meaning, exPrimary, exReading, exMeaning, pos, note.\n' +
      'Ch\u1ec9 tr\u1ea3 v\u1ec1 JSON array thu\u1ea7n, kh\u00f4ng markdown.\n\n' +
      'D\u1eef li\u1ec7u c\u1ea7n chuy\u1ec3n \u0111\u1ed5i:\n[D\u00c1N N\u1ed8I DUNG V\u00c0O \u0110\u00c2Y]'
    );
  }

  const pLabel = profile.primaryLabel || 'primary';
  const rLabel = profile.readingLabel || 'reading';
  const fields = profile.importFields || [
    'primary',
    'reading',
    'meaning',
    'exPrimary',
    'exReading',
    'exMeaning',
    'pos',
    'note'
  ];

  let extra = '';
  if (profile.langPair === 'zh-vi') {
    extra =
      '\n(C\u00f3 th\u1ec3 d\u00f9ng t\u00ean legacy: hanzi, pinyin, ex_hanzi, ex_pinyin, ex_viet, tu_loai.)' +
      '\nPinyin ph\u1ea3i c\u00f3 d\u1ea5u thanh (\u0101 \u00e1 \u01ce \u00e0), kh\u00f4ng d\u00f9ng s\u1ed1.';
  }

  return (
    'H\u00e3y chuy\u1ec3n b\u1ea3ng t\u1eeb v\u1ef1ng ' +
    profile.label +
    ' d\u01b0\u1edbi \u0111\u00e2y th\u00e0nh JSON array.\n' +
    'M\u1ed7i t\u1eeb l\u00e0 m\u1ed9t object v\u1edbi c\u00e1c tr\u01b0\u1eddng: ' +
    fields.join(', ') +
    '.\n' +
    'Tr\u01b0\u1eddng b\u1eaft bu\u1ed9c: ' +
    pLabel +
    ' (primary), Ngh\u0129a (meaning).' +
    (profile.hasReading !== false ? ' ' + rLabel + ' (reading).' : '') +
    '\nN\u1ebfu thi\u1ebfu tr\u01b0\u1eddng n\u00e0o th\u00ec \u0111\u1ec3 chu\u1ed7i r\u1ed7ng "".\n' +
    'Ch\u1ec9 tr\u1ea3 v\u1ec1 JSON array thu\u1ea7n, kh\u00f4ng gi\u1ea3i th\u00edch, kh\u00f4ng markdown, kh\u00f4ng ```json.' +
    extra +
    '\n\nD\u1eef li\u1ec7u c\u1ea7n chuy\u1ec3n \u0111\u1ed5i:\n[D\u00c1N N\u1ed8I DUNG FILE EXCEL/SHEET V\u00c0O \u0110\u00c2Y]'
  );
}

function adMapImportItem(item, langPair) {
  if (!item || typeof item !== 'object') return null;
  if (langPair === 'zh-vi' && (item.hanzi || item.primary)) {
    return {
      primary: String(item.primary ?? item.hanzi ?? '').trim(),
      reading: String(item.reading ?? item.pinyin ?? '').trim(),
      meaning: String(item.meaning ?? '').trim(),
      exPrimary: String(item.exPrimary ?? item.ex_hanzi ?? '').trim(),
      exReading: String(item.exReading ?? item.ex_pinyin ?? '').trim(),
      exMeaning: String(item.exMeaning ?? item.ex_viet ?? '').trim(),
      pos: String(item.pos ?? item.tu_loai ?? '').trim(),
      note: String(item.note ?? '').trim()
    };
  }
  return {
    primary: String(item.primary ?? '').trim(),
    reading: String(item.reading ?? '').trim(),
    meaning: String(item.meaning ?? '').trim(),
    exPrimary: String(item.exPrimary ?? '').trim(),
    exReading: String(item.exReading ?? '').trim(),
    exMeaning: String(item.exMeaning ?? '').trim(),
    pos: String(item.pos ?? '').trim(),
    note: String(item.note ?? '').trim()
  };
}

function adImportIsLegacyItem(item) {
  if (!item || typeof item !== 'object') return false;
  return (
    item.hanzi != null ||
    item.pinyin != null ||
    item.ex_hanzi != null ||
    item.ex_pinyin != null ||
    item.ex_viet != null ||
    item.tu_loai != null
  );
}

function adImportDetectLegacy(arr) {
  if (!Array.isArray(arr) || !arr.length) return false;
  return arr.some(adImportIsLegacyItem);
}

function adImportUnwrapPayload(data) {
  if (Array.isArray(data)) {
    return { words: data, langPair: null, name: null, source: 'array' };
  }
  if (!data || typeof data !== 'object') return null;

  if (data.format === 'andeck' && data.deck && Array.isArray(data.deck.words)) {
    return {
      words: data.deck.words,
      langPair: data.deck.langPair || null,
      name: data.deck.name || null,
      source: 'andeck-export'
    };
  }

  if (Array.isArray(data.words)) {
    return {
      words: data.words,
      langPair: data.langPair || null,
      name: data.name || null,
      source: 'deck-object'
    };
  }

  return null;
}

function adImportApplyMeta(meta) {
  if (!meta || adImportMode !== 'create') return;
  if (meta.name) {
    const nameEl = document.getElementById('importDeckNameInput');
    if (nameEl && !String(nameEl.value || '').trim()) nameEl.value = meta.name;
  }
  if (meta.langPair) {
    const sel = document.getElementById('importLangPairSelect');
    if (sel) {
      sel.value = meta.langPair;
      adImportRefreshPrompt();
    }
  }
}

function adImportParseJson(text, langPair) {
  if (!text || !String(text).trim()) {
    return { ok: false, items: [], count: 0, meta: null };
  }
  let raw = String(text).trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) raw = fenced[1].trim();
  try {
    const data = JSON.parse(raw);
    let words = null;
    let meta = null;

    if (Array.isArray(data)) {
      words = data;
      meta = { langPair: null, name: null, legacy: adImportDetectLegacy(words), source: 'array' };
    } else {
      const unwrapped = adImportUnwrapPayload(data);
      if (!unwrapped) return { ok: false, items: [], count: 0, meta: null };
      words = unwrapped.words;
      meta = {
        langPair: unwrapped.langPair,
        name: unwrapped.name,
        legacy: adImportDetectLegacy(words),
        source: unwrapped.source
      };
    }

    let pair = langPair || window._currentLangPair || 'zh-vi';
    if (meta.legacy) {
      if (adImportMode === 'append' && pair !== 'zh-vi') {
        return { ok: false, items: [], count: 0, meta: meta, error: 'legacy-zh-only' };
      }
      pair = 'zh-vi';
      meta.langPair = 'zh-vi';
    }

    const items = words
      .map(function (item) {
        return adMapImportItem(item, pair);
      })
      .filter(function (mapped) {
        return mapped && mapped.primary && mapped.meaning;
      });

    meta.legacy = meta.legacy || adImportDetectLegacy(words);
    return { ok: true, items: items, count: items.length, meta: meta };
  } catch {
    return { ok: false, items: [], count: 0, meta: null };
  }
}

function adImportGetLangPairForParse() {
  if (adImportMode === 'append') return window._currentLangPair;
  const sel = document.getElementById('importLangPairSelect');
  return (sel && sel.value) || 'zh-vi';
}

function adImportGetAppendContext() {
  const id = window._currentDeckId;
  if (!id) return null;
  const deck = AD.decks.find(function (d) {
    return d.deckId === id;
  });
  const deckWords = adGetCurrentDeckWordCount ? adGetCurrentDeckWordCount() : adWordCount(deck || {});
  const deckRem = Math.max(0, AD.wordQuota - deckWords);
  const total = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  const globalRem = Math.max(0, adMaxTotalWords() - total);
  return {
    deckId: id,
    deckName: (deck && deck.name) || 'Deck',
    total: deckWords,
    remaining: Math.min(deckRem, globalRem),
    wordQuota: AD.wordQuota
  };
}

function adImportApplyModeUI() {
  const isAppend = adImportMode === 'append';
  const nameBlock = document.getElementById('importDeckNameBlock');
  const langBlock = document.getElementById('importLangPairBlock');
  if (nameBlock) nameBlock.style.display = isAppend ? 'none' : '';
  if (langBlock) langBlock.style.display = isAppend ? 'none' : '';

  const titleEl = document.querySelector('#importWordOverlay .iw-title');
  const subtitleEl = document.querySelector('#importWordOverlay .iw-subtitle');
  if (titleEl) {
    titleEl.textContent = isAppend ? 'Th\u00eam t\u1eeb v\u00e0o deck' : 'Import t\u1eeb v\u1ef1ng h\u00e0ng lo\u1ea1t';
  }
  if (subtitleEl) {
    subtitleEl.textContent = isAppend
      ? 'Import JSON v\u00e0o deck \u0111ang h\u1ecdc'
      : 'D\u00f9ng AI \u0111\u1ec3 chuy\u1ec3n file Excel/Sheet v\u1ec1 \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng Andeck';
  }

  adImportRefreshPrompt();
  adImportUpdateQuotaDisplay();
}

function adImportRefreshPrompt() {
  const pair = adImportGetLangPairForParse();
  const profile = adGetLangProfile(pair);
  adImportPromptText = adBuildImportPrompt(profile);
  const preview = document.getElementById('importPromptPreview');
  if (preview) preview.textContent = adImportPromptText;

  const placeholder = document.getElementById('importJsonInput');
  if (placeholder && profile) {
    const sample =
      profile.langPair === 'zh-vi'
        ? '[{"hanzi":"\u670b\u53cb","pinyin":"p\u00e9ngyou","meaning":"b\u1ea1n b\u00e8","ex_hanzi":"","ex_pinyin":"","ex_viet":"","tu_loai":""}]'
        : '[{"primary":"hello","reading":"","meaning":"xin ch\u00e0o",...}]';
    placeholder.placeholder = sample;
  }
}

function adImportUpdateQuotaDisplay() {
  const el = document.getElementById('importQuotaInfo');
  if (!el) return;
  const maxWords = adMaxTotalWords();
  if (adImportMode === 'append') {
    const ctx = adImportGetAppendContext();
    if (!ctx) {
      el.textContent = 'Quota: 0/' + AD.wordQuota + ' t\u1eeb';
      return;
    }
    el.textContent =
      '"' +
      ctx.deckName +
      '": t\u1ed5ng ' +
      ctx.total +
      '/' +
      ctx.wordQuota +
      ' t\u1eeb \u00b7 c\u00f2n th\u00eam t\u1ed1i \u0111a ' +
      ctx.remaining;
    return;
  }
  const total = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  const remaining = Math.max(0, maxWords - total);
  let text = 'T\u1ed5ng: ' + total + '/' + maxWords + ' t\u1eeb \u00b7 c\u00f2n th\u00eam t\u1ed1i \u0111a ' + remaining;
  if (!adIsDeckAtQuota()) {
    text += ' (' + AD.decks.length + '/' + AD.deckQuota + ' deck \u0111\u00e3 d\u00f9ng)';
  }
  el.textContent = text;
}

function adImportUpdateWordCountDisplay() {
  const span = document.getElementById('importWordCount');
  const input = document.getElementById('importJsonInput');
  if (!span || !input) return;
  const parsed = adImportParseJson(input.value, adImportGetLangPairForParse());
  if (parsed.error === 'legacy-zh-only') {
    span.textContent = 'Format Hanzi legacy chỉ dùng cho deck zh-vi';
    span.classList.remove('is-valid');
    return;
  }
  if (parsed.ok && parsed.count > 0) {
    let label = parsed.count + ' t\u1eeb h\u1ee3p l\u1ec7';
    if (parsed.meta && parsed.meta.legacy) label += ' (Hanzi legacy)';
    else if (parsed.meta && parsed.meta.source === 'andeck-export') label += ' (Andeck export)';
    span.textContent = label;
    span.classList.add('is-valid');
    adImportApplyMeta(parsed.meta);
  } else {
    span.textContent = '0 t\u1eeb h\u1ee3p l\u1ec7';
    span.classList.remove('is-valid');
  }
}

function adImportRenderLangPairOptions() {
  if (typeof adRenderLangPairSelect === 'function') {
    adRenderLangPairSelect('importLangPairSelect', adLangProfiles);
    return;
  }
  const sel = document.getElementById('importLangPairSelect');
  if (sel) sel.innerHTML = '<option value="" disabled selected>Đang tải...</option>';
}

function adImportOpenModal(mode) {
  adImportMode = mode === 'append' ? 'append' : 'create';
  if (!getAuthToken()) {
    alert('Vui l\u00f2ng \u0111\u0103ng nh\u1eadp \u0111\u1ec3 import t\u1eeb v\u1ef1ng.');
    return;
  }

  const total = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  const remainingGlobal = adMaxTotalWords() - total;
  if (remainingGlobal <= 0) {
    adShowQuotaLimit('word');
    return;
  }

  if (adImportMode === 'create') {
    if (adIsDeckAtQuota()) {
      adShowQuotaLimit('deck');
      return;
    }
    if (!adLangProfiles.length) loadAdLangProfiles();
    else adImportRenderLangPairOptions();
  } else {
    if (!window._currentDeckId) return;
  }

  adImportApplyModeUI();
  adImportUpdateWordCountDisplay();
  const overlay = document.getElementById('importWordOverlay');
  if (overlay) overlay.style.display = 'flex';
  document.getElementById('importJsonInput')?.focus();
}

function adImportCloseModal() {
  const overlay = document.getElementById('importWordOverlay');
  if (overlay) overlay.style.display = 'none';
  const input = document.getElementById('importJsonInput');
  if (input) input.value = '';
  const nameInput = document.getElementById('importDeckNameInput');
  if (nameInput) nameInput.value = '';
  adImportMode = 'create';
  adImportApplyModeUI();
  adImportUpdateWordCountDisplay();
}

async function adImportCopyPrompt() {
  const btn = document.getElementById('copyPromptBtn');
  const label = btn?.textContent || 'Copy prompt';
  const text = adImportPromptText || document.getElementById('importPromptPreview')?.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  if (btn) {
    btn.textContent = '\u0110\u00e3 copy!';
    setTimeout(function () {
      btn.textContent = label;
    }, 1500);
  }
}

async function adImportSubmitAppend(parsed, submitBtn, submitLabel) {
  const ctx = adImportGetAppendContext();
  if (!ctx || !ctx.deckId) {
    alert('Kh\u00f4ng x\u00e1c \u0111\u1ecbnh \u0111\u01b0\u1ee3c deck.');
    return;
  }
  if (ctx.remaining <= 0) {
    adImportCloseModal();
    adShowQuotaLimit('word');
    return;
  }
  const willInsert = Math.min(parsed.count, ctx.remaining);
  const over = parsed.count - willInsert;
  if (over > 0) {
    const ok = window.confirm(
      'B\u1ea1n c\u00f3 ' +
        parsed.count +
        ' t\u1eeb h\u1ee3p l\u1ec7 nh\u01b0ng quota ch\u1ec9 c\u00f2n ch\u1ed7 cho ' +
        ctx.remaining +
        ' t\u1eeb.\n' +
        'Ch\u1ec9 l\u01b0u ' +
        willInsert +
        ' t\u1eeb \u0111\u1ea7u, ' +
        over +
        ' t\u1eeb b\u1ecb b\u1ecf do gi\u1edbi h\u1ea1n.\n\nTi\u1ebfp t\u1ee5c?'
    );
    if (!ok) return;
  }
  const wordsToSend = parsed.items.slice(0, ctx.remaining);
  if (submitBtn) {
    submitBtn.textContent = '\u0110ang l\u01b0u...';
    submitBtn.disabled = true;
  }
  adImportSaving = true;
  try {
    const res = await fetch('/api/decks/' + ctx.deckId + '/words/bulk', {
      method: 'POST',
      headers: adAuthHeaders(true),
      body: JSON.stringify({ words: wordsToSend })
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      if (/gi\u1edbi h\u1ea1n|quota/i.test(err.error || '')) {
        adImportCloseModal();
        adShowQuotaLimit('word');
      } else {
        alert(err.error || 'L\u1ed7i k\u1ebft n\u1ed1i, vui l\u00f2ng th\u1eed l\u1ea1i.');
      }
      return;
    }
    const data = await res.json();
    const inserted = data.inserted || 0;
    const skipped = data.skipped || 0;
    const overQuota = data.overQuota || 0;
    if (inserted > 0) {
      const pname = (data.deckName || ctx.deckName || '').trim();
      let msg = pname
        ? '\u0110\u00e3 th\u00eam ' + inserted + ' t\u1eeb v\u00e0o "' + pname + '"!'
        : '\u0110\u00e3 th\u00eam ' + inserted + ' t\u1eeb th\u00e0nh c\u00f4ng!';
      if (skipped > 0 || overQuota > 0) {
        const parts = [];
        if (skipped > 0) parts.push('b\u1ecf qua ' + skipped + ' t\u1eeb l\u1ed7i');
        if (overQuota > 0) parts.push(overQuota + ' t\u1eeb v\u01b0\u1ee3t quota');
        msg += ' (' + parts.join(', ') + ')';
      }
      adNotify(msg, 'ok');
      adImportCloseModal();
      await loadAdDecks();
      if (typeof loadDeckStudy === 'function') {
        await loadDeckStudy(ctx.deckId);
      }
    } else {
      alert('Kh\u00f4ng th\u00eam \u0111\u01b0\u1ee3c t\u1eeb n\u00e0o.\nKi\u1ec3m tra l\u1ea1i \u0111\u1ecbnh d\u1ea1ng JSON ho\u1ecdc quota.');
    }
  } catch (e) {
    console.error('adImportSubmitAppend:', e);
    alert('L\u1ed7i k\u1ebft n\u1ed1i, vui l\u00f2ng th\u1eed l\u1ea1i.');
  } finally {
    adImportSaving = false;
    if (submitBtn) {
      submitBtn.textContent = submitLabel;
      submitBtn.disabled = false;
    }
  }
}

async function adImportSubmitCreate(parsed, submitBtn, submitLabel) {
  const total = AD.totalWords != null ? AD.totalWords : adSumDeckWords();
  const remainingGlobal = adMaxTotalWords() - total;
  if (remainingGlobal <= 0) {
    adImportCloseModal();
    adShowQuotaLimit('word');
    return;
  }
  const perDeckCap = AD.wordQuota;
  const cap = Math.min(remainingGlobal, perDeckCap);
  const willInsert = Math.min(parsed.count, cap);
  const over = parsed.count - willInsert;
  if (over > 0) {
    const ok = window.confirm(
      'B\u1ea1n c\u00f3 ' +
        parsed.count +
        ' t\u1eeb h\u1ee3p l\u1ec7 nh\u01b0ng quota ch\u1ec9 c\u00f2n ch\u1ed7 cho ' +
        cap +
        ' t\u1eeb.\n' +
        'Ch\u1ec9 l\u01b0u ' +
        willInsert +
        ' t\u1eeb \u0111\u1ea7u, ' +
        over +
        ' t\u1eeb b\u1ecb b\u1ecf do gi\u1edbi h\u1ea1n.\n\nTi\u1ebfp t\u1ee5c?'
    );
    if (!ok) return;
  }

  const langPair = adImportGetLangPairForParse();
  if (!langPair) {
    alert('Vui l\u00f2ng ch\u1ecdn c\u1eb7p ng\u00f4n ng\u1eef.');
    return;
  }

  const nameEl = document.getElementById('importDeckNameInput');
  const importName = String(nameEl?.value ?? '').trim();
  if (importName.length > 50) {
    alert('T\u00ean qu\u00e1 d\u00e0i (t\u1ed1i \u0111a 50 k\u00fd t\u1ef1)');
    return;
  }

  const wordsToSend = parsed.items.slice(0, cap);
  const importBody = { words: wordsToSend, langPair: langPair };
  if (importName) importBody.name = importName;

  if (submitBtn) {
    submitBtn.textContent = '\u0110ang l\u01b0u...';
    submitBtn.disabled = true;
  }
  adImportSaving = true;
  try {
    const res = await fetch('/api/decks/import', {
      method: 'POST',
      headers: adAuthHeaders(true),
      body: JSON.stringify(importBody)
    });
    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      if (err.code === 'QUOTA_EXCEEDED') {
        adImportCloseModal();
        adShowQuotaLimit('deck');
      } else {
        alert(err.error || 'L\u1ed7i k\u1ebft n\u1ed1i, vui l\u00f2ng th\u1eed l\u1ea1i.');
      }
      return;
    }
    const data = await res.json();
    const name = (data.deckName || '').trim();
    const inserted = data.inserted || 0;
    const skipped = data.skipped || 0;
    const overQuota = data.overQuota || 0;
    if (inserted > 0) {
      let msg = name
        ? '\u0110\u00e3 t\u1ea1o "' + name + '" v\u00e0 th\u00eam ' + inserted + ' t\u1eeb th\u00e0nh c\u00f4ng!'
        : '\u0110\u00e3 t\u1ea1o deck v\u00e0 th\u00eam ' + inserted + ' t\u1eeb th\u00e0nh c\u00f4ng!';
      if (skipped > 0 || overQuota > 0) {
        const parts = [];
        if (skipped > 0) parts.push('b\u1ecf qua ' + skipped + ' t\u1eeb l\u1ed7i');
        if (overQuota > 0) parts.push(overQuota + ' t\u1eeb v\u01b0\u1ee3t quota');
        msg += ' (' + parts.join(', ') + ')';
      }
      adNotify(msg, 'ok');
      adImportCloseModal();
      await loadAdDecks();
      if (data.deckId && typeof loadDeckStudy === 'function') {
        loadDeckStudy(data.deckId);
      }
    } else {
      alert('Kh\u00f4ng th\u00eam \u0111\u01b0\u1ee3c t\u1eeb n\u00e0o.\nKi\u1ec3m tra l\u1ea1i \u0111\u1ecbnh d\u1ea1ng JSON ho\u1ecdc quota.');
    }
  } catch (e) {
    console.error('adImportSubmitCreate:', e);
    alert('L\u1ed7i k\u1ebft n\u1ed1i, vui l\u00f2ng th\u1eed l\u1ea1i.');
  } finally {
    adImportSaving = false;
    if (submitBtn) {
      submitBtn.textContent = submitLabel;
      submitBtn.disabled = false;
    }
  }
}

async function adImportSubmit() {
  if (adImportSaving) return;
  const submitBtn = document.getElementById('importSubmitBtn');
  const submitLabel = submitBtn?.textContent || 'Xem tr\u01b0\u1edbc & L\u01b0u';
  const input = document.getElementById('importJsonInput');
  const langPair = adImportGetLangPairForParse();
  const parsed = adImportParseJson(input?.value || '', langPair);
  if (parsed.error === 'legacy-zh-only') {
    alert('JSON format Hanzi legacy (hanzi/pinyin) chỉ import được vào deck zh-vi.');
    return;
  }
  if (!parsed.ok || parsed.count === 0) {
    alert('Kh\u00f4ng c\u00f3 t\u1eeb h\u1ee3p l\u1ec7, vui l\u00f2ng ki\u1ec3m tra l\u1ea1i');
    return;
  }
  if (adImportMode === 'append') {
    await adImportSubmitAppend(parsed, submitBtn, submitLabel);
  } else {
    await adImportSubmitCreate(parsed, submitBtn, submitLabel);
  }
}

function openAdUpfile() {
  adImportOpenModal('create');
}

function openAdUpfileAppend() {
  adImportOpenModal('append');
}

function initAdImportModal() {
  if (adImportModalInited) return;
  adImportModalInited = true;

  adImportRefreshPrompt();

  document.getElementById('importModalClose')?.addEventListener('click', adImportCloseModal);
  document.getElementById('importModalCancel')?.addEventListener('click', adImportCloseModal);
  document.getElementById('copyPromptBtn')?.addEventListener('click', adImportCopyPrompt);
  document.getElementById('importSubmitBtn')?.addEventListener('click', adImportSubmit);
  document.getElementById('importJsonInput')?.addEventListener('input', adImportUpdateWordCountDisplay);
  document.getElementById('importLangPairSelect')?.addEventListener('change', function () {
    adImportRefreshPrompt();
    adImportUpdateWordCountDisplay();
  });
  document.getElementById('importWordOverlay')?.addEventListener('click', function (e) {
    if (e.target.id === 'importWordOverlay') adImportCloseModal();
  });
  document.getElementById('adUpfileBtn')?.addEventListener('click', openAdUpfile);
  document.getElementById('adUpfileHeaderBtn')?.addEventListener('click', openAdUpfileAppend);
}
