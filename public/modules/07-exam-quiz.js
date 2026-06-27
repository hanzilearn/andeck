/* =====================================================================
   MODULE 07 — EXAM / QUIZ (Andeck)
   Port 08-exam-quiz.js — primary/reading/meaning, deck level
   ===================================================================== */

var skipStarred = true;
var hideReadingExam = false;

function adExamProfile() {
  return typeof adGetLangProfile === 'function' ? adGetLangProfile() : null;
}

function adSyncExamSetupLabels() {
  const profile = adExamProfile();
  const primaryLbl = profile?.primaryLabel || 'Từ gốc';
  const readingLbl = profile?.readingLabel || 'Reading';
  const hasReading = profile?.hasReading !== false;

  const typeGroup = document.getElementById('exam-type-group');
  if (typeGroup) {
    const btns = typeGroup.querySelectorAll('.opt-btn');
    if (btns[0]) btns[0].textContent = 'KT nghĩa';
    if (btns[1]) btns[1].textContent = 'KT ' + primaryLbl.toLowerCase();
    if (btns[2]) {
      btns[2].textContent = 'KT ' + readingLbl.toLowerCase();
      btns[2].style.display = hasReading ? '' : 'none';
    }
  }

  const hideRow = document.getElementById('hide-reading-row');
  if (hideRow) {
    const lbl = hideRow.querySelector('.toggle-label');
    if (lbl) {
      lbl.innerHTML =
        'Ẩn ' +
        readingLbl +
        ' trong bài kiểm tra<br><small>Chỉ hiện ' +
        primaryLbl +
        ', rèn nhớ phát âm</small>';
    }
    hideRow.style.display = hasReading ? '' : 'none';
  }
}

function showExamSetup() {
  updateStarCount();
  const maxWords = VOCAB.length;
  document.getElementById('exam-total').textContent = maxWords;
  examCfg = { pool: 'all', types: ['meaning'], count: 10 };
  examFilterIds = [];

  document.querySelectorAll('#exam-screen .setup-section').forEach(function (s) {
    if (s.querySelector('#exam-type-group')) return;
    s.querySelectorAll('.opt-btn').forEach(function (b, i) {
      b.classList.toggle('active', i === 0);
    });
  });
  document.querySelectorAll('#exam-type-group .opt-btn').forEach(function (b, i) {
    b.classList.toggle('active', i === 0);
  });
  document.getElementById('custom-count').value = '';
  document.getElementById('exam-warn').style.display = 'none';
  document.getElementById('exam-all-btn').textContent = 'Tất cả (' + maxWords + ')';
  adSyncExamSetupLabels();
  updateExamProgress();
  updateHideReadingState();
  document.getElementById('skip-starred-toggle').className = 'toggle-switch' + (skipStarred ? ' on' : '');
  document.getElementById('hide-reading-toggle').className = 'toggle-switch' + (hideReadingExam ? ' on' : '');
  if (typeof updateExamPoolDisplay === 'function') updateExamPoolDisplay();
  showOnly('exam-screen');
}

function updateExamProgress() {
  const maxWords = VOCAB.length;
  const starredCount = starred.size;
  const remaining = Math.max(0, maxWords - starredCount);
  const pct = maxWords > 0 ? Math.round((starredCount / maxWords) * 100) : 0;
  document.getElementById('prog-starred').textContent = starredCount;
  document.getElementById('prog-total').textContent = maxWords;
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-note').innerHTML = 'Còn <b>' + remaining + '</b> từ chưa đánh dấu';
}

function toggleSkipStarred() {
  skipStarred = !skipStarred;
  document.getElementById('skip-starred-toggle').className = 'toggle-switch' + (skipStarred ? ' on' : '');
}
function toggleHideReadingExam() {
  hideReadingExam = !hideReadingExam;
  document.getElementById('hide-reading-toggle').className = 'toggle-switch' + (hideReadingExam ? ' on' : '');
}

async function resetStarProgress() {
  const totalMarked = Object.values(itemLabels).filter(Boolean).length;
  if (totalMarked === 0) {
    showLabelToast('Chưa có từ nào được đánh dấu', '#95a5a6');
    return;
  }
  const deckLabel = document.getElementById('app-deck-label')?.textContent || 'deck này';
  const ok = await showConfirm({
    title: 'Đặt lại tiến độ?',
    text: 'Tất cả nhãn của <b>' + esc(deckLabel) + '</b> sẽ bị xóa.',
    warn: '<b>' + totalMarked + ' từ</b> đã đánh dấu sẽ trở về trắng — bạn sẽ làm lại từ đầu',
    confirmLabel: 'Đặt lại',
    cancelLabel: 'Hủy'
  });
  if (!ok) return;
  starred = new Set();
  itemLabels = {};
  saveStars();
  updateStarCount();
  updateExamProgress();
  render();
  showLabelToast('✓ Đã xóa hết tiến độ deck', '#27ae60');
}

function setExamOpt(key, val, btn) {
  examCfg[key] = val;
  if (key === 'count' && val === 0) examCfg.count = VOCAB.length;
  if (btn) {
    btn.parentElement.querySelectorAll('.opt-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    if (key === 'count') document.getElementById('custom-count').value = '';
  }
  validateExam();
}

function toggleExamType(type, btn) {
  btn.classList.toggle('active');
  const types = [];
  document.querySelectorAll('#exam-type-group .opt-btn').forEach(function (b, i) {
    if (b.style.display === 'none' || !b.classList.contains('active')) return;
    if (i === 0) types.push('meaning');
    else if (i === 1) types.push('primary');
    else if (i === 2) types.push('reading');
  });
  if (types.length === 0) {
    btn.classList.add('active');
    types.push(type);
  }
  examCfg.types = types;
  updateHideReadingState();
  validateExam();
}

function updateHideReadingState() {
  const hpRow = document.getElementById('hide-reading-row');
  if (!hpRow) return;
  const onlyReading = examCfg.types?.length === 1 && examCfg.types[0] === 'reading';
  if (onlyReading) {
    hpRow.classList.add('disabled');
    hideReadingExam = false;
    document.getElementById('hide-reading-toggle').className = 'toggle-switch';
  } else {
    hpRow.classList.remove('disabled');
  }
}

function validateExam() {
  const warn = document.getElementById('exam-warn');
  const maxWords = VOCAB.length;
  const pool = examCfg.pool === 'starred' ? starred.size : maxWords;
  const cnt = examCfg.count;
  if (examCfg.pool === 'starred' && starred.size === 0) {
    warn.textContent = '⚠️ Bạn chưa đánh dấu từ nào là đã nhớ!';
    warn.style.display = 'block';
    return false;
  }
  if (cnt > pool) {
    warn.textContent =
      '⚠️ Số từ nhập (' + cnt + ') lớn hơn số từ có sẵn (' + pool + '). Sẽ dùng tối đa ' + pool + ' từ.';
    warn.style.display = 'block';
  } else {
    warn.style.display = 'none';
  }
  return true;
}

function startExam() {
  if (!validateExam() && examCfg.pool === 'starred' && starred.size === 0) return;

  let pool;
  if (examCfg.pool === 'starred') {
    if (examFilterIds?.length > 0) {
      pool = Object.entries(itemLabels)
        .filter(function (entry) {
          return examFilterIds.includes(entry[1]);
        })
        .map(function (entry) {
          return parseInt(entry[0], 10);
        })
        .filter(function (n) {
          return !isNaN(n);
        });
    } else {
      pool = [...starred];
    }
  } else {
    pool = [];
    for (let i = 0; i < VOCAB.length; i++) {
      if (skipStarred && starred.has(i)) continue;
      pool.push(i);
    }
  }

  if (pool.length === 0) {
    alert('Chúc mừng! Bạn đã nhớ hết tất cả từ vựng! Bấm "Đặt lại tiến độ" để làm lại từ đầu.');
    return;
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const cnt = Math.min(examCfg.count || 10, pool.length);
  pool = pool.slice(0, cnt);

  quizQuestions = pool.map(function (idx) {
    const types = examCfg.types || ['meaning'];
    return { idx: idx, qtype: types[Math.floor(Math.random() * types.length)] };
  });
  quizIdx = 0;
  quizResults = [];
  showOnly('quiz-screen');
  renderQuiz();
}

function renderQuiz() {
  if (quizIdx >= quizQuestions.length) {
    showResult();
    return;
  }
  const q = quizQuestions[quizIdx];
  const w = VOCAB[q.idx];
  const total = quizQuestions.length;
  const profile = adExamProfile();
  const readingLbl = profile?.readingLabel || 'Reading';

  document.getElementById('quiz-prog-text').textContent = 'Câu ' + (quizIdx + 1) + ' / ' + total;
  document.getElementById('quiz-bar').style.width = (quizIdx / total) * 100 + '%';

  let wrongPool = VOCAB.map(function (_, i) {
    return i;
  }).filter(function (i) {
    return i !== q.idx;
  });
  for (let i = wrongPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = wrongPool[i];
    wrongPool[i] = wrongPool[j];
    wrongPool[j] = tmp;
  }
  const wrongs = wrongPool.slice(0, 3);
  let choices = [q.idx].concat(wrongs);
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = choices[i];
    choices[i] = choices[j];
    choices[j] = tmp;
  }

  const card = document.getElementById('quiz-card');
  const speakText = esc(w.primary);

  if (q.qtype === 'meaning') {
    const readingDisplay = hideReadingExam
      ? '<span style="color:#888">\u2022\u2022\u2022</span>'
      : adFormatReadingHtml(w.reading || '', false);
    card.innerHTML =
      '<div class="quiz-q-label">Chọn nghĩa tiếng Việt đúng</div>' +
      '<div class="quiz-q-hanzi">' +
      adFormatPrimaryHtml(w.primary, w.reading) +
      '</div>' +
      '<button class="quiz-speak" onclick="speak(\'' +
      speakText +
      '\')" title="Phát âm">🔊</button>' +
      (w.reading ? '<div class="quiz-q-pinyin">' + readingDisplay + '</div>' : '') +
      '<div class="choices">' +
      choices
        .map(function (ci) {
          return (
            '<button class="choice-btn" data-choice-idx="' +
            ci +
            '" onclick="pickChoice(this,' +
            ci +
            ',' +
            q.idx +
            ",\'meaning\')\">" +
            esc(VOCAB[ci].meaning) +
            '</button>'
          );
        })
        .join('') +
      '</div>';
  } else if (q.qtype === 'reading') {
    const readingChoices = adGenerateReadingChoices(w.reading || '', q.idx);
    card.innerHTML =
      '<div class="quiz-q-label">Chọn ' +
      esc(readingLbl) +
      ' đúng</div>' +
      '<div class="quiz-q-hanzi">' +
      adFormatPrimaryHtml(w.primary, w.reading) +
      '</div>' +
      '<div class="choices">' +
      readingChoices
        .map(function (p) {
          return (
            '<button class="choice-btn" data-reading="' +
            esc(p) +
            '" onclick="pickReadingChoice(this,\'' +
            esc(p) +
            "','" +
            esc(w.reading || '') +
            "'," +
            q.idx +
            ')">' +
            '<span style="font-style:italic;font-size:18px">' +
            esc(p) +
            '</span></button>'
          );
        })
        .join('') +
      '</div>';
  } else {
    card.innerHTML =
      '<div class="quiz-q-label">Chọn từ gốc đúng</div>' +
      '<div class="quiz-q-meaning">' +
      esc(w.meaning) +
      '</div>' +
      '<div class="choices">' +
      choices
        .map(function (ci) {
          return (
            '<button class="choice-btn" data-choice-idx="' +
            ci +
            '" onclick="pickChoice(this,' +
            ci +
            ',' +
            q.idx +
            ",\'primary\')\">" +
            '<span class="choice-hanzi">' +
            esc(VOCAB[ci].primary) +
            '</span></button>'
          );
        })
        .join('') +
      '</div>';
  }
}

function pickChoice(btn, chosen, correct, type) {
  const card = document.getElementById('quiz-card');
  card.querySelectorAll('.choice-btn').forEach(function (b) {
    b.disabled = true;
  });
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? 'correct-choice' : 'wrong-choice');
  if (!isCorrect) {
    card.querySelectorAll('.choice-btn').forEach(function (b) {
      const idx = parseInt(b.getAttribute('data-choice-idx'), 10);
      if (idx === correct) b.classList.add('correct-choice');
    });
  }
  playFeedbackSound(isCorrect);
  quizResults.push({ idx: correct, correct: isCorrect, qtype: type });
  setTimeout(function () {
    speak(VOCAB[correct].primary);
  }, 100);
  setTimeout(
    function () {
      quizIdx++;
      renderQuiz();
    },
    isCorrect ? 900 : 1500
  );
}

function pickReadingChoice(btn, chosenReading, correctReading, correctIdx) {
  const card = document.getElementById('quiz-card');
  card.querySelectorAll('.choice-btn').forEach(function (b) {
    b.disabled = true;
  });
  const isCorrect = chosenReading === correctReading;
  btn.classList.add(isCorrect ? 'correct-choice' : 'wrong-choice');
  if (!isCorrect) {
    card.querySelectorAll('.choice-btn').forEach(function (b) {
      const reading = b.getAttribute('data-reading');
      if (reading === correctReading) b.classList.add('correct-choice');
    });
  }
  playFeedbackSound(isCorrect);
  quizResults.push({ idx: correctIdx, correct: isCorrect, qtype: 'reading' });
  setTimeout(function () {
    speak(VOCAB[correctIdx].primary);
  }, 100);
  setTimeout(
    function () {
      quizIdx++;
      renderQuiz();
    },
    isCorrect ? 900 : 1500
  );
}

var quizSavePending = null;
var quizSaveLabelPicked = null;

function openQuizSaveLabelPicker(source, indices) {
  if (!indices || indices.length === 0) {
    showLabelToast('Chưa có từ nào để lưu', '#95a5a6');
    return;
  }
  if (!currentLevel) {
    alert('Lỗi: không xác định được deck.');
    return;
  }
  quizSavePending = { source: source, indices: indices };
  quizSaveLabelPicked = activeLabelId || userLabels[0]?.id || 'lbl_default';
  radialMode = 'save-quiz';
  ensureRadialMenuDOM();
  renderRadialMenu();
  document.getElementById('label-radial-overlay').classList.add('open');
}

function _applyQuizSave(targetLabel, indices, source) {
  const lbl = userLabels.find(function (l) {
    return l.id === targetLabel;
  });
  indices.forEach(function (idx) {
    starred.add(idx);
    itemLabels[idx] = targetLabel;
  });
  activeLabelId = targetLabel;
  saveStars();
  updateStarCount();
  const count = indices.length;
  const name = lbl?.name || 'Đã nhớ';
  if (source === 'result') {
    const btn = document.getElementById('btn-save-star');
    if (btn) btn.textContent = '✅ Đã lưu ' + count + ' từ → ' + name;
  } else if (source === 'quit') {
    document.getElementById('quit-modal')?.classList.remove('show');
    backToApp();
  }
  showLabelToast('✓ Đã lưu ' + count + ' từ vào "' + name + '"', lbl?.color || '#27ae60');
}

function confirmQuizSaveLabel() {
  if (!quizSavePending) return;
  if (!quizSaveLabelPicked) {
    showLabelToast('Chọn nhãn trước khi lưu', '#e74c3c');
    return;
  }
  const pending = quizSavePending;
  const labelId = quizSaveLabelPicked;
  quizSavePending = null;
  quizSaveLabelPicked = null;
  radialMode = 'assign';
  document.getElementById('label-radial-overlay')?.classList.remove('open');
  _applyQuizSave(labelId, pending.indices, pending.source);
}

function quitQuiz() {
  const done = quizResults.length;
  const total = quizQuestions.length;
  const correctN = quizResults.filter(function (r) {
    return r.correct;
  }).length;
  if (done === 0) {
    backToApp();
    return;
  }

  document.getElementById('quit-summary').textContent =
    'Bạn đã làm ' + done + '/' + total + ' câu, đúng ' + correctN + ' từ.';
  const saveBtn = document.getElementById('quit-save-btn');
  if (correctN === 0) {
    saveBtn.textContent = 'Chưa có từ đúng để lưu';
    saveBtn.disabled = true;
    saveBtn.classList.add('is-disabled');
  } else {
    saveBtn.textContent = '⭐ Lưu ' + correctN + ' từ đúng & thoát';
    saveBtn.disabled = false;
    saveBtn.classList.remove('is-disabled');
  }
  document.getElementById('quit-modal').classList.add('show');
}
function closeQuitModal() {
  document.getElementById('quit-modal').classList.remove('show');
}
function quitAndSave() {
  const indices = quizResults
    .filter(function (r) {
      return r.correct;
    })
    .map(function (r) {
      return r.idx;
    });
  openQuizSaveLabelPicker('quit', indices);
}
function quitNoSave() {
  document.getElementById('quit-modal').classList.remove('show');
  backToApp();
}

var quizStarChecked = new Set();

function showResult() {
  showOnly('result-screen');
  const total = quizResults.length;
  const correctN = quizResults.filter(function (r) {
    return r.correct;
  }).length;
  const pct = Math.round((correctN / total) * 100);
  document.getElementById('res-score').textContent = correctN + '/' + total;
  document.getElementById('res-sub').textContent =
    pct >= 90
      ? '🎉 Xuất sắc! Bạn thật giỏi!'
      : pct >= 70
        ? '👍 Khá tốt! Tiếp tục cố gắng!'
        : pct >= 50
          ? '💪 Ổn! Ôn luyện thêm nhé!'
          : '📚 Cần ôn tập thêm nhiều hơn!';
  document.getElementById('res-correct').textContent = correctN;
  document.getElementById('res-wrong').textContent = total - correctN;

  quizStarChecked = new Set();
  quizResults.forEach(function (r) {
    if (r.correct) quizStarChecked.add(r.idx);
  });

  document.getElementById('res-list').innerHTML = quizResults
    .map(function (r) {
      const w = VOCAB[r.idx];
      const checked = quizStarChecked.has(r.idx);
      return (
        '<div class="result-item ' +
        (r.correct ? 'c' : 'w') +
        '" onclick="toggleQuizStar(' +
        r.idx +
        ', this)">' +
        '<div class="ri-check ' +
        (checked ? 'checked' : '') +
        '" id="qstar-' +
        r.idx +
        '">' +
        (checked ? '✓' : '') +
        '</div>' +
        '<div class="ri-hanzi">' +
        adFormatPrimaryHtml(w.primary, w.reading) +
        '</div>' +
        '<div class="ri-info">' +
        (w.reading
          ? '<div class="ri-reading">' + adFormatReadingHtml(w.reading, false) + '</div>'
          : '') +
        '<div class="ri-meaning">' + esc(w.meaning) + '</div></div>' +
        '<div class="ri-icon">' +
        (r.correct ? '✅' : '❌') +
        '</div></div>'
      );
    })
    .join('');

  updateSaveStarBtn();
}

function toggleQuizStar(idx) {
  if (quizStarChecked.has(idx)) quizStarChecked.delete(idx);
  else quizStarChecked.add(idx);
  const check = document.getElementById('qstar-' + idx);
  if (check) {
    check.className = 'ri-check' + (quizStarChecked.has(idx) ? ' checked' : '');
    check.textContent = quizStarChecked.has(idx) ? '✓' : '';
  }
  updateSaveStarBtn();
}
function updateSaveStarBtn() {
  const btn = document.getElementById('btn-save-star');
  if (btn) btn.textContent = '⭐ Lưu từ đã nhớ (' + quizStarChecked.size + ' từ)';
}
function saveQuizStars() {
  if (quizStarChecked.size === 0) {
    showLabelToast('Chưa chọn từ nào để lưu', '#95a5a6');
    return;
  }
  openQuizSaveLabelPicker('result', [...quizStarChecked]);
}

/* ─── Reading quiz choices ─── */
const PINYIN_VOWELS = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
  v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ']
};
const PINYIN_TONE_MAP = {};
for (const v in PINYIN_VOWELS) {
  for (let t = 0; t < 5; t++) {
    PINYIN_TONE_MAP[PINYIN_VOWELS[v][t]] = { base: v, tone: t };
  }
}

function getPinyinTone(syl) {
  for (const ch of syl) {
    if (PINYIN_TONE_MAP[ch]?.tone > 0) return PINYIN_TONE_MAP[ch].tone;
  }
  return 0;
}
function getPinyinToneVowel(syl) {
  syl = syl.toLowerCase();
  if (syl.includes('a')) return 'a';
  if (syl.includes('o')) return 'o';
  if (syl.includes('e')) return 'e';
  const li = syl.lastIndexOf('i'),
    lu = syl.lastIndexOf('u'),
    lv = syl.lastIndexOf('ü');
  if (lv > li && lv > lu) return 'ü';
  if (lu > li) return 'u';
  if (li !== -1) return 'i';
  if (lu !== -1) return 'u';
  if (lv !== -1) return 'ü';
  return null;
}
function setPinyinTone(syl, newTone) {
  let plain = '';
  for (const ch of syl) plain += PINYIN_TONE_MAP[ch] ? PINYIN_TONE_MAP[ch].base : ch;
  if (newTone === 0) return plain;
  const tv = getPinyinToneVowel(plain);
  if (!tv) return plain;
  let idx = plain.indexOf(tv);
  if ((tv === 'i' || tv === 'u') && !plain.includes('a') && !plain.includes('o') && !plain.includes('e'))
    idx = plain.lastIndexOf(tv);
  return plain.substring(0, idx) + PINYIN_VOWELS[tv][newTone] + plain.substring(idx + 1);
}
function splitPinyin(pinyin) {
  return pinyin.trim().split(/\s+/).filter(Boolean);
}
function generateWrongPinyin(originalPinyin) {
  return splitPinyin(originalPinyin)
    .map(function (syl) {
      const cur = getPinyinTone(syl);
      let newT;
      do {
        newT = Math.floor(Math.random() * 5);
      } while (newT === cur);
      return setPinyinTone(syl, newT);
    })
    .join(' ');
}
function generatePinyinChoices(correctPinyin) {
  const choices = [correctPinyin];
  let attempts = 0;
  while (choices.length < 4 && attempts < 30) {
    const wrong = generateWrongPinyin(correctPinyin);
    if (!choices.includes(wrong)) choices.push(wrong);
    attempts++;
  }
  while (choices.length < 4) choices.push(generateWrongPinyin(correctPinyin) + (Math.random() < 0.5 ? '·' : ''));
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = choices[i];
    choices[i] = choices[j];
    choices[j] = tmp;
  }
  return choices;
}

function adGenerateReadingChoices(correctReading, correctIdx) {
  if (!correctReading || !String(correctReading).trim()) {
    return VOCAB.map(function (w) {
      return w.reading;
    })
      .filter(function (r, i) {
        return r && i !== correctIdx;
      })
      .slice(0, 3)
      .concat([correctReading || '—']);
  }
  const langPair = window._currentLangPair || '';
  if (langPair.startsWith('zh')) return generatePinyinChoices(correctReading);

  const choices = [correctReading];
  const pool = VOCAB.map(function (w) {
    return w.reading;
  }).filter(function (r) {
    return r && r !== correctReading;
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  pool.forEach(function (r) {
    if (choices.length < 4 && !choices.includes(r)) choices.push(r);
  });
  while (choices.length < 4) choices.push(correctReading + String.fromCharCode(97 + choices.length));
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = choices[i];
    choices[i] = choices[j];
    choices[j] = tmp;
  }
  return choices;
}

const _baseShowExamSetup = showExamSetup;
showExamSetup = function adShowExamSetup() {
  if (window._currentDeckId) {
    const n = Array.isArray(VOCAB) ? VOCAB.length : 0;
    if (n < 4) {
      showLabelToast('Cần ít nhất 4 từ để làm quiz', '#95a5a6');
      return;
    }
  }
  _baseShowExamSetup();
};
