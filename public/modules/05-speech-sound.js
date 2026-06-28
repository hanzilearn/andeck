/* =====================================================================
   MODULE 05 — SPEECH & SOUND (Andeck)
   Port 06-speech-sound.js — TTS/mic theo lang profile API
   ===================================================================== */

var _audioCtx = null;
var _soundEnabled = localStorage.getItem('andeck_sound_enabled') !== 'false';

function adGetTtsLang() {
  const p = typeof adGetLangProfile === 'function' ? adGetLangProfile() : null;
  return (p && p.ttsLang) || 'en-US';
}

function adGetSpeechLang() {
  const p = typeof adGetLangProfile === 'function' ? adGetLangProfile() : null;
  return (p && p.speechLang) || 'en-US';
}

function getAudioCtx() {
  if (!_audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    } catch (e) {
      console.error('AudioContext error:', e);
    }
  }
  return _audioCtx;
}

function playCorrectSound() {
  if (!_soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach(function (f, i) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.45);
    });
  } catch (e) {
    console.error('playCorrectSound:', e);
  }
}

function playWrongSound() {
  if (!_soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.18);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.error('playWrongSound:', e);
  }
}

function playFeedbackSound(correct) {
  if (correct) playCorrectSound();
  else playWrongSound();
}

function toggleSound() {
  _soundEnabled = !_soundEnabled;
  localStorage.setItem('andeck_sound_enabled', _soundEnabled ? 'true' : 'false');
  if (mode === 'primary' || mode === 'meaning') render();
  if (_soundEnabled) playCorrectSound();
}

function speak(text) {
  const lang = adGetTtsLang();
  const langPrefix = lang.split('-')[0];

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const ua = navigator.userAgent || '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    u.rate = isIOS ? 0.72 : 0.85;
    const voices = window.speechSynthesis.getVoices();
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.indexOf(langPrefix) === 0) {
        u.voice = voices[i];
        break;
      }
    }
    window.speechSynthesis.speak(u);
    return;
  }
  try {
    new Audio(
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' +
        encodeURIComponent(lang) +
        '&q=' +
        encodeURIComponent(text)
    )
      .play()
      .catch(function () {});
  } catch (e) {}
}

var _pronRecognition = null;
var _pronCurrentIdx = -1;
var _pronInited = false;
var _pronVersion = 0;

var _TONE_MAP = {
  '\u0101': 'a',
  '\u00e1': 'a',
  '\u01ce': 'a',
  '\u00e0': 'a',
  '\u0113': 'e',
  '\u00e9': 'e',
  '\u011b': 'e',
  '\u00e8': 'e',
  '\u012b': 'i',
  '\u00ed': 'i',
  '\u01d0': 'i',
  '\u00ec': 'i',
  '\u014d': 'o',
  '\u00f3': 'o',
  '\u01d2': 'o',
  '\u00f2': 'o',
  '\u016b': 'u',
  '\u00fa': 'u',
  '\u01d4': 'u',
  '\u00f9': 'u',
  '\u01d6': 'v',
  '\u01d8': 'v',
  '\u01da': 'v',
  '\u01dc': 'v',
  '\u00fc': 'v'
};

function stripTones(s) {
  return (s || '')
    .toLowerCase()
    .split('')
    .map(function (c) {
      return _TONE_MAP[c] || c;
    })
    .join('')
    .replace(/\s+/g, '');
}

function primaryToAsciiReading(text, langPair) {
  if (langPair === 'zh-vi' && typeof window.pinyinPro !== 'undefined' && typeof window.pinyinPro.pinyin === 'function') {
    try {
      return (window.pinyinPro.pinyin(text, { toneType: 'none', type: 'string' }) || '')
        .toLowerCase()
        .replace(/\s+/g, '');
    } catch (e) {
      console.error('pinyinPro error:', e);
    }
  }
  return stripTones(text);
}

function initPronRecognition() {
  if (_pronInited) return _pronRecognition;
  _pronInited = true;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    _pronRecognition = null;
    return null;
  }
  _pronRecognition = new SR();
  _pronRecognition.lang = adGetSpeechLang();
  _pronRecognition.interimResults = false;
  _pronRecognition.maxAlternatives = 5;

  _pronRecognition.onresult = function (event) {
    const alts = [];
    if (event.results && event.results[0]) {
      for (let i = 0; i < event.results[0].length; i++) alts.push(event.results[0][i].transcript);
    }
    handlePronResult(_pronCurrentIdx, alts, _pronVersion);
  };
  _pronRecognition.onerror = function (event) {
    if (event.error === 'aborted') return;
    handlePronError(_pronCurrentIdx, event.error, _pronVersion);
  };
  _pronRecognition.onend = function () {
    stopPronUI(_pronCurrentIdx);
  };
  return _pronRecognition;
}

function startPronRecording(idx) {
  const rec = initPronRecognition();
  if (!rec) {
    alert(
      '\u26a0\ufe0f Tr\u00ecnh duy\u1ec7t kh\u00f4ng h\u1ed7 tr\u1ee3 nh\u1eadn di\u1ec7n gi\u1ecdng n\u00f3i.\n\nVui l\u00f2ng d\u00f9ng Chrome / Edge / C\u1ed1c C\u1ed1c ho\u1eb7c Safari iOS 14.5+.'
    );
    return;
  }

  rec.lang = adGetSpeechLang();

  const doStart = function () {
    _pronVersion++;
    _pronCurrentIdx = idx;
    const btn = document.getElementById('mic-' + idx);
    if (btn) {
      btn.classList.add('recording');
      btn.innerHTML = '\u0110ang nghe...';
      btn.disabled = true;
    }
    const row = document.getElementById('row-' + idx);
    if (row) row.classList.add('row-pron-recording');
    try {
      rec.start();
    } catch (e) {
      setTimeout(function () {
        try {
          rec.start();
        } catch (e2) {
          handlePronError(idx, 'busy-please-retry', _pronVersion);
        }
      }, 400);
    }
  };

  if (_pronCurrentIdx !== -1 && _pronCurrentIdx !== idx) {
    const oldIdx = _pronCurrentIdx;
    const oldBtn = document.getElementById('mic-' + oldIdx);
    if (oldBtn) {
      oldBtn.classList.remove('recording');
      oldBtn.disabled = false;
      oldBtn.innerHTML = answers[oldIdx] ? '\u0110\u1ecdc l\u1ea1i' : '\u0110\u1ecdc';
    }
    const oldRow = document.getElementById('row-' + oldIdx);
    if (oldRow) oldRow.classList.remove('row-pron-recording');
    _pronCurrentIdx = -1;
    try {
      rec.stop();
    } catch (e) {}
    setTimeout(doStart, 350);
    return;
  }

  if (_pronCurrentIdx === idx) {
    try {
      rec.stop();
    } catch (e) {}
    return;
  }

  doStart();
}

function stopPronUI(idx) {
  if (idx === -1) return;
  const btn = document.getElementById('mic-' + idx);
  if (btn) {
    btn.classList.remove('recording');
    btn.disabled = false;
    btn.innerHTML = answers[idx] ? '\u0110\u1ecdc l\u1ea1i' : '\u0110\u1ecdc';
  }
  const row = document.getElementById('row-' + idx);
  if (row) row.classList.remove('row-pron-recording');
  _pronCurrentIdx = -1;
}

function handlePronResult(idx, alternatives, version) {
  if (version !== undefined && version !== _pronVersion) return;
  if (idx === -1 || !alternatives || !alternatives.length) {
    handlePronError(idx, 'no-speech', version);
    return;
  }

  const w = VOCAB[idx];
  const targetPrimary = w.primary;
  const targetReadingAscii = stripTones(w.reading || '');
  const langPair = window._currentLangPair || '';
  const normalizePrimary = function (s) {
    return (s || '').replace(/[\s,，。.!?！？]/g, '');
  };
  const normalizedTarget = normalizePrimary(targetPrimary);

  let matchType = null;
  let matchedHeard = '';

  for (let i = 0; i < alternatives.length; i++) {
    const heard = alternatives[i];
    if (!heard || !heard.trim()) continue;
    if (normalizePrimary(heard) === normalizedTarget) {
      matchType = 'primary';
      matchedHeard = heard;
      break;
    }
    const heardReading = primaryToAsciiReading(heard, langPair).replace(/\s+/g, '');
    const targetReading = (targetReadingAscii || '').replace(/\s+/g, '');
    if (heardReading && targetReading && heardReading === targetReading && !matchType) {
      matchType = 'reading';
      matchedHeard = heard;
    }
  }

  const correct = matchType !== null;
  const heardDisplay = matchedHeard || alternatives[0];
  answers[idx] = { value: heardDisplay, correct: correct, heard: heardDisplay, matchType: matchType, isPron: true };
  render();
}

function handlePronError(idx, errorType, version) {
  if (version !== undefined && version !== _pronVersion) return;
  if (idx === -1) return;
  const msgs = {
    'no-speech': 'Kh\u00f4ng nghe \u0111\u01b0\u1ee3c, h\u00e3y th\u1eed l\u1ea1i',
    'not-allowed': 'C\u1ea7n c\u1ea5p quy\u1ec1n microphone',
    'audio-capture': 'Kh\u00f4ng t\u00ecm th\u1ea5y microphone',
    network: 'L\u1ed7i m\u1ea1ng',
    'busy-please-retry': 'H\u1ec7 th\u1ed1ng \u0111ang b\u1eadn, h\u00e3y th\u1eed l\u1ea1i'
  };
  const msg = msgs[errorType] || 'L\u1ed7i: ' + errorType;
  answers[idx] = { value: '', correct: false, heard: '\u26a0\ufe0f ' + msg, matchType: null, isPron: true };
  render();
}
