/* =====================================================================
   MODULE 03 — AUTH (Andeck)
   Token: localStorage andeck_token
   ===================================================================== */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const isLight = theme === 'light';

  const moonPath = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const sunPath =
    '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

  const stroke = isLight ? '#E67E22' : '#1C2B3A';
  const svg = function (path, size) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="' +
      stroke +
      '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="' +
      size +
      '" height="' +
      size +
      '">' +
      path +
      '</svg>'
    );
  };

  [
    ['login-toggle', 'login-thumb', 16],
    ['register-toggle', 'register-thumb', 16],
    ['header-toggle', 'header-thumb', 16]
  ].forEach(function (pair) {
    const track = document.getElementById(pair[0]);
    const thumb = document.getElementById(pair[1]);
    if (track) track.classList.toggle('is-light', isLight);
    if (thumb) thumb.innerHTML = svg(isLight ? sunPath : moonPath, pair[2]);
  });
}

function toggleTheme(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem('andeck_theme', next);
  } catch (err) {}
  applyTheme(next);
}

(function initTheme() {
  try {
    const saved = localStorage.getItem('andeck_theme');
    if (saved) {
      applyTheme(saved);
      return;
    }
  } catch (err) {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
})();

async function refreshUserProfile() {
  if (!window._authToken || !currentUser) return false;
  try {
    const res = await fetch(window.location.origin + '/api/me', {
      headers: { Authorization: 'Bearer ' + window._authToken }
    });
    if (!res.ok) return false;
    const data = await res.json();
    currentUser.u = data.email;
    currentUser.email = data.email;
    currentUser.role = data.role;
    currentUser.deckQuota = data.deckQuota;
    currentUser.wordQuota = data.wordQuota;
    if (window.AD) {
      if (data.deckQuota != null) window.AD.deckQuota = data.deckQuota;
      if (data.wordQuota != null) window.AD.wordQuota = data.wordQuota;
    }
    try {
      localStorage.setItem('andeck_user', JSON.stringify(currentUser));
    } catch (err) {}
    return true;
  } catch (err) {
    return false;
  }
}

function showRegister() {
  document.getElementById('login-error').style.display = 'none';
  const ls = document.getElementById('login-success');
  if (ls) {
    ls.style.display = 'none';
    ls.textContent = '';
  }
  document.getElementById('register-error').style.display = 'none';
  ['reg-email', 'reg-pw', 'reg-pw2'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const consent = document.getElementById('reg-consent');
  if (consent) consent.checked = false;
  showOnly('register-screen');
}

function showLoginScreen() {
  document.getElementById('register-error').style.display = 'none';
  showOnly('login-screen');
}

async function doRegister() {
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pw = document.getElementById('reg-pw').value;
  const pw2 = document.getElementById('reg-pw2').value;
  const errEl = document.getElementById('register-error');

  if (!email || !pw || !pw2) {
    errEl.textContent = 'Vui lòng nhập đầy đủ thông tin.';
    errEl.style.display = 'block';
    return;
  }
  if (pw.length < 6) {
    errEl.textContent = 'Mật khẩu tối thiểu 6 ký tự.';
    errEl.style.display = 'block';
    return;
  }
  if (pw !== pw2) {
    errEl.textContent = 'Mật khẩu nhập lại không khớp.';
    errEl.style.display = 'block';
    return;
  }
  const consent = document.getElementById('reg-consent');
  if (!consent || !consent.checked) {
    errEl.textContent = 'Vui lòng đồng ý Điều khoản sử dụng và Chính sách bảo mật.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(window.location.origin + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pw, confirmPassword: pw2 })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('u').value = email;
      document.getElementById('p').value = '';
      document.getElementById('login-error').style.display = 'none';
      const okEl = document.getElementById('login-success');
      if (okEl) {
        okEl.textContent = data.message || 'Đăng ký thành công! Vui lòng đăng nhập.';
        okEl.style.display = 'block';
      }
      showOnly('login-screen');
      return;
    }

    errEl.textContent = data.error || 'Không thể đăng ký. Vui lòng thử lại.';
    errEl.style.display = 'block';
  } catch (err) {
    errEl.textContent = 'Không thể kết nối server. Vui lòng thử lại.';
    errEl.style.display = 'block';
  }
}

async function doLogin() {
  const u = document.getElementById('u').value.trim();
  const p = document.getElementById('p').value.trim();
  if (!u || !p) return false;

  const okEl = document.getElementById('login-success');
  if (okEl) okEl.style.display = 'none';

  try {
    const res = await fetch(window.location.origin + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      window._authToken = data.token;
      currentUser = {
        u: data.email,
        email: data.email,
        role: data.role,
        deckQuota: data.deckQuota,
        wordQuota: data.wordQuota
      };
      window._currentDeckId = null;
      if (typeof adResetSessionState === 'function') adResetSessionState();

      try {
        localStorage.setItem('andeck_token', data.token);
        localStorage.setItem('andeck_user', JSON.stringify(currentUser));
      } catch (err) {}

      document.getElementById('avatar-btn').textContent = u.charAt(0).toUpperCase();
      document.getElementById('dd-email').textContent = data.email;
      document.getElementById('login-error').style.display = 'none';

      showOnly('deck-hub-screen');
      if (typeof initDeckHub === 'function') initDeckHub();
      return false;
    }

    document.getElementById('login-error').style.display = 'block';
    document.getElementById('p').value = '';
    return false;
  } catch (err) {
    const el = document.getElementById('login-error');
    el.textContent = 'Không thể kết nối server. Vui lòng thử lại.';
    el.style.display = 'block';
    document.getElementById('p').value = '';
    return false;
  }
}

function logout() {
  currentUser = null;
  window._authToken = null;
  window._currentDeckId = null;
  if (typeof adResetSessionState === 'function') adResetSessionState();
  try {
    localStorage.removeItem('andeck_token');
    localStorage.removeItem('andeck_user');
  } catch (err) {}
  closeAllDropdowns();
  showOnly('login-screen');
  document.getElementById('u').value = '';
  document.getElementById('p').value = '';
  document.getElementById('login-error').style.display = 'none';
  const ls = document.getElementById('login-success');
  if (ls) {
    ls.style.display = 'none';
    ls.textContent = '';
  }
}

(function autoRestoreSession() {
  try {
    const token = localStorage.getItem('andeck_token');
    const user = localStorage.getItem('andeck_user');
    if (!token || !user) return;

    window._authToken = token;
    currentUser = JSON.parse(user);
    document.getElementById('avatar-btn').textContent = currentUser.u.charAt(0).toUpperCase();
    document.getElementById('dd-email').textContent = currentUser.u;

    fetch(window.location.origin + '/api/me', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(function (res) {
        if (res.status === 401) {
          try {
            localStorage.removeItem('andeck_token');
            localStorage.removeItem('andeck_user');
          } catch (err) {}
          window._authToken = null;
          currentUser = null;
          if (typeof adResetSessionState === 'function') adResetSessionState();
          showOnly('login-screen');
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data) {
          currentUser.deckQuota = data.deckQuota;
          currentUser.wordQuota = data.wordQuota;
        }
        if (!window._authToken) return;
        showOnly('deck-hub-screen');
        if (typeof initDeckHub === 'function') initDeckHub();
      })
      .catch(function (err) {
        console.error('Auto-restore error:', err);
        if (window._authToken) {
          showOnly('deck-hub-screen');
          if (typeof initDeckHub === 'function') initDeckHub();
        }
      });
  } catch (err) {
    console.error('Auto-restore error:', err);
  }
})();

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  if (document.getElementById('login-screen').classList.contains('active')) {
    e.preventDefault();
    doLogin();
  } else if (document.getElementById('register-screen').classList.contains('active')) {
    e.preventDefault();
    doRegister();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.querySelector('#login-screen .btn-login');
  if (btn) {
    btn.addEventListener('touchend', function (e) {
      e.preventDefault();
      doLogin();
    });
  }
  const regBtn = document.querySelector('#register-screen .btn-login');
  if (regBtn) {
    regBtn.addEventListener('touchend', function (e) {
      e.preventDefault();
      doRegister();
    });
  }
});

function toggleAvatar() {
  document.getElementById('avatar-dropdown').classList.toggle('show');
}

function closeAllDropdowns() {
  document.getElementById('avatar-dropdown').classList.remove('show');
  document.getElementById('zalo-popup')?.classList.remove('show');
}

document.addEventListener('click', function (e) {
  const dd = document.getElementById('avatar-dropdown');
  if (dd && dd.classList.contains('show') && !e.target.closest('.avatar-wrap')) {
    dd.classList.remove('show');
  }
  if (!e.target.closest('.zalo-float')) {
    document.getElementById('zalo-popup')?.classList.remove('show');
  }
});

function showChangePassword() {
  closeAllDropdowns();
  document.getElementById('pw-modal').classList.add('show');
  ['pw-old', 'pw-new', 'pw-confirm'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  const msg = document.getElementById('pw-msg');
  msg.className = 'modal-msg';
  msg.textContent = '';
}

function closePwModal() {
  document.getElementById('pw-modal').classList.remove('show');
}

async function doChangePw() {
  const old = document.getElementById('pw-old').value;
  const nw = document.getElementById('pw-new').value;
  const cf = document.getElementById('pw-confirm').value;
  const msg = document.getElementById('pw-msg');

  if (nw.length < 4) {
    msg.className = 'modal-msg err';
    msg.textContent = 'Mật khẩu mới phải từ 4 ký tự!';
    return;
  }
  if (nw !== cf) {
    msg.className = 'modal-msg err';
    msg.textContent = 'Mật khẩu nhập lại không khớp!';
    return;
  }

  try {
    const res = await fetch(window.location.origin + '/api/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + window._authToken
      },
      body: JSON.stringify({ oldPassword: old, newPassword: nw })
    });
    const data = await res.json();
    if (res.ok) {
      msg.className = 'modal-msg ok';
      msg.textContent = '✅ ' + data.message;
      setTimeout(closePwModal, 1200);
      return;
    }
    msg.className = 'modal-msg err';
    msg.textContent = data.error;
  } catch (err) {
    msg.className = 'modal-msg err';
    msg.textContent = 'Không thể kết nối server.';
  }
}

function getZaloAdminNum() {
  const el = document.querySelector('.zalo-popup-num');
  return (el && el.textContent.trim()) || '0792 739 257';
}

function toggleZaloPopup() {
  document.getElementById('zalo-popup')?.classList.toggle('show');
}

function showZaloContact() {
  alert('Liên hệ Zalo Admin: ' + getZaloAdminNum());
}
