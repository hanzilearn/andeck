/* =====================================================================
   MODULE 01 — CONFIG & STATE (Andeck)
   showOnly(), esc(), toast — không HSK
   ===================================================================== */

let currentUser = null;

/* ─── Label config (module 06) ─── */
const LABEL_COLOR_PALETTE = [
  { hex: '#f1c40f', name: 'Vàng' },
  { hex: '#e74c3c', name: 'Đỏ' },
  { hex: '#27ae60', name: 'Xanh lá' },
  { hex: '#3498db', name: 'Xanh dương' },
  { hex: '#9b59b6', name: 'Tím' },
  { hex: '#e67e22', name: 'Cam' },
  { hex: '#95a5a6', name: 'Xám' },
  { hex: '#e91e63', name: 'Hồng' }
];
const MAX_LABELS = 8;

/* ─── Study table state (module 04) ─── */
let currentLevel = null;
let VOCAB = [];
let mode = 'all';
let shuffled = false;
let order = [];
let answers = {};
let _answersCache = {};
let starred = new Set();

/* Exam / quiz (module 07) */
let examCfg = { pool: 'all', types: ['meaning'], count: 10 };
let quizQuestions = [];
let quizIdx = 0;
let quizResults = [];

/* Label system state (module 06) */
let userLabels = [{ id: 'lbl_default', name: 'Đã nhớ', color: '#f1c40f', isDefault: true }];
let itemLabels = {};
let activeLabelId = 'lbl_default';
let filterStatePerLevel = {};
let examFilterIds = [];
let fcFilterIds = [];
let radialMode = 'assign';
let filterPicked = [];

function getAuthToken() {
  return window._authToken || localStorage.getItem('andeck_token') || '';
}

function isFreeLocked() {
  return false;
}

function getCurrentFilterState() {
  if (!currentLevel) return { state: 'all', ids: [] };
  if (!filterStatePerLevel[currentLevel]) {
    filterStatePerLevel[currentLevel] = { state: 'all', ids: [] };
  }
  return filterStatePerLevel[currentLevel];
}

function setCurrentFilterState(state, ids) {
  if (!currentLevel) return;
  filterStatePerLevel[currentLevel] = { state: state, ids: ids || [] };
}

const SCREENS = [
  'login-screen',
  'register-screen',
  'deck-hub-screen',
  'app-screen',
  'exam-screen',
  'quiz-screen',
  'result-screen',
  'fc-setup-screen',
  'fc-play-screen',
  'fc-end-screen'
];

function showOnly(id) {
  SCREENS.forEach(function (s) {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('active', s === id);
  });

  const appHeader = document.getElementById('app-select-header');
  if (appHeader) {
    appHeader.style.display = id === 'deck-hub-screen' ? 'flex' : 'none';
  }

  if (id === 'deck-hub-screen' || id === 'login-screen' || id === 'register-screen') {
    window._currentDeckId = null;
  }

  const tmrApp = document.getElementById('tmr-icon-btn-app');
  if (tmrApp) {
    tmrApp.style.display = id === 'app-screen' && window._currentDeckId ? '' : 'none';
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function backFromDeckStudy() {
  window._currentDeckId = null;
  currentLevel = null;
  adClearLayoutProfile();
  if (typeof emExit === 'function') emExit();
  if (typeof dmExit === 'function') dmExit();
  showOnly('deck-hub-screen');
  if (typeof initDeckHub === 'function') initDeckHub();
}
