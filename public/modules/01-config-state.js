/* =====================================================================
   MODULE 01 — CONFIG & STATE (Andeck)
   showOnly(), esc(), toast — không HSK
   ===================================================================== */

let currentUser = null;

const SCREENS = [
  'login-screen',
  'register-screen',
  'deck-hub-screen',
  'app-screen'
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
    if (id !== 'app-screen') window._currentDeckId = null;
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showLabelToast(msg, color) {
  let toast = document.getElementById('label-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'label-toast';
    toast.className = 'label-toast';
    toast.innerHTML = '<span class="label-toast-dot"></span><span class="label-toast-text"></span>';
    document.body.appendChild(toast);
  }
  const dot = toast.querySelector('.label-toast-dot');
  const text = toast.querySelector('.label-toast-text');
  if (dot) dot.style.background = color || '#95a5a6';
  if (text) text.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showLabelToast._t);
  showLabelToast._t = setTimeout(function () {
    toast.classList.remove('show');
  }, 2800);
}

function backFromDeckStudy() {
  window._currentDeckId = null;
  showOnly('deck-hub-screen');
  if (typeof initDeckHub === 'function') initDeckHub();
}
