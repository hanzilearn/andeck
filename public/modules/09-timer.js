/* =====================================================================
   MODULE 10 — TIMER WIDGET
   Đồng hồ đếm ngược / đếm xuôi — floating window, draggable, resizable.
   Chỉ hiện trên màn ≥ 768px (CSS ẩn trên mobile).
   Toàn bộ logic đặt trong IIFE để tránh ô nhiễm global scope.
   Phụ thuộc: không phụ thuộc module khác.
   ===================================================================== */

(function() {
  var TMR = {
    mode: 'countdown',     // 'countdown' | 'countup'
    initialSeconds: 1500,
    currentSeconds: 1500,
    running: false,
    finished: false,
    intervalId: null
  };

  var $ = function(id) { return document.getElementById(id); };

  /* ── Format giây → HH:MM:SS hoặc MM:SS ── */
  function fmt(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var mm = String(m).padStart(2, '0');
    var ss = String(sec).padStart(2, '0');
    return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
  }

  /* ── Fit digits to window size ── */
  function fitDigits() {
  var win = $('tmr-window');
  var dig = $('tmr-digits');
  if (!win || !dig) return;
  var w = win.offsetWidth, h = win.offsetHeight;
  var hasHours = TMR.currentSeconds >= 3600;
  var ratio = hasHours ? 0.22 : 0.35;
  var base = Math.min(w * ratio, h * 0.5);
  dig.style.fontSize = Math.max(20, Math.min(base, 200)) + 'px';
}
  /* ── Tick ── */
  function startTick() {
    if (TMR.running) return;
    if (TMR.mode === 'countdown' && TMR.currentSeconds <= 0) {
      TMR.finished = true; updateUI(); return;
    }
    TMR.running = true;
    TMR.intervalId = setInterval(function() {
      if (TMR.mode === 'countdown') {
        TMR.currentSeconds--;
        if (TMR.currentSeconds <= 0) {
          TMR.currentSeconds = 0; TMR.finished = true;
          pauseTick();
        }
      } else {
        TMR.currentSeconds++;
      }
      updateUI();
    }, 1000);
    updateUI();
  }

  function pauseTick() {
    if (TMR.intervalId) { clearInterval(TMR.intervalId); TMR.intervalId = null; }
    TMR.running = false;
    updateUI();
  }

  function doReset() {
    pauseTick();
    TMR.finished = false;
    TMR.currentSeconds = TMR.mode === 'countdown' ? TMR.initialSeconds : 0;
    updateUI();
  }

  /* ── Update UI ── */
  function updateUI() {
    var dig   = $('tmr-digits');
    var win   = $('tmr-window');
    var label = $('tmr-mode-label');
    var playIcon  = $('tmr-play-icon');
    var pauseIcon = $('tmr-pause-icon');
    if (!dig || !win) return;

    var newText = fmt(TMR.currentSeconds);
    var lengthChanged = (dig.textContent.length !== newText.length);
    dig.textContent = newText;
    if (lengthChanged) fitDigits();

    win.classList.toggle('running',  TMR.running);
    win.classList.toggle('finished', TMR.finished);

    if (label) {
      if (TMR.finished)      label.textContent = 'Đã hết giờ';
      else if (TMR.running)  label.textContent = TMR.mode === 'countdown' ? 'Đang đếm ngược' : 'Đang đếm xuôi';
      else                   label.textContent = TMR.mode === 'countdown' ? 'Đếm ngược'       : 'Đếm xuôi';
    }
    if (playIcon && pauseIcon) {
      playIcon.style.display  = TMR.running ? 'none' : '';
      pauseIcon.style.display = TMR.running ? '' : 'none';
    }
  }

  /* ── Public API (gắn vào window để HTML onclick dùng được) ── */
  window.tmrOpenModal = function() {
    var win = $('tmr-window');
    if (win && win.classList.contains('show')) {
      win.style.transform = 'scale(1.03)';
      setTimeout(function() { win.style.transform = ''; }, 200);
      return;
    }
    var modal = $('tmr-modal');
    if (modal) modal.classList.add('show');
  };

  window.tmrCloseModal = function() {
    var modal = $('tmr-modal');
    if (modal) modal.classList.remove('show');
  };

  window.tmrSelectMode = function(mode) {
    document.querySelectorAll('.tmr-mode-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
    var inputs = $('tmr-countdown-inputs');
    if (inputs) inputs.style.display = mode === 'countdown' ? '' : 'none';
  };

  window.tmrStart = function() {
    var activeTab = document.querySelector('.tmr-mode-tab.active');
    if (!activeTab) return;
    TMR.mode = activeTab.dataset.mode;
    if (TMR.mode === 'countdown') {
      var h = parseInt(($('tmr-input-h') || {}).value, 10) || 0;
      var m = parseInt(($('tmr-input-m') || {}).value, 10) || 0;
      var s = parseInt(($('tmr-input-s') || {}).value, 10) || 0;
      var total = h * 3600 + m * 60 + s;
      if (total <= 0) { alert('Vui lòng nhập thời gian lớn hơn 0'); return; }
      TMR.initialSeconds = total;
      TMR.currentSeconds = total;
    } else {
      TMR.initialSeconds = 0;
      TMR.currentSeconds = 0;
    }
    TMR.finished = false;
    tmrCloseModal();
    var win = $('tmr-window');
    if (win) win.classList.add('show');
    document.querySelectorAll('.tmr-icon-btn').forEach(function(b) { b.classList.add('active'); });
    updateUI(); fitDigits(); startTick();
  };

  window.tmrTogglePlayPause = function(e) {
    if (e) e.stopPropagation();
    if (TMR.running) pauseTick(); else startTick();
  };

  window.tmrReset = function(e) {
    if (e) e.stopPropagation();
    doReset();
  };

  window.tmrCloseWindow = function(e) {
    if (e) e.stopPropagation();
    pauseTick();
    var win = $('tmr-window');
    if (win) win.classList.remove('show');
    document.querySelectorAll('.tmr-icon-btn').forEach(function(b) { b.classList.remove('active'); });
  };

  /* ── DRAG ── */
  var dragState = null;
  function getTouchPoint(e) {
    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return null;
    return { clientX: t.clientX, clientY: t.clientY };
  }
  document.addEventListener('mousedown', function(e) {
    var win = $('tmr-window');
    if (!win || !win.classList.contains('show')) return;
    if (!win.contains(e.target)) return;
    if (e.target.closest('.tmr-ctrl')) return;
    if (e.target.closest('.tmr-resize')) return;
    var rect = win.getBoundingClientRect();
    dragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    win.classList.add('dragging');
    win.style.left  = rect.left + 'px';
    win.style.right = 'auto';
    win.style.top   = rect.top + 'px';
    e.preventDefault();
  });
  document.addEventListener('touchstart', function(e) {
    var win = $('tmr-window');
    if (!win || !win.classList.contains('show')) return;
    if (!win.contains(e.target)) return;
    if (e.target.closest('.tmr-ctrl')) return;
    if (e.target.closest('.tmr-resize')) return;
    var p = getTouchPoint(e);
    if (!p) return;
    var rect = win.getBoundingClientRect();
    dragState = { offsetX: p.clientX - rect.left, offsetY: p.clientY - rect.top };
    win.classList.add('dragging');
    win.style.left  = rect.left + 'px';
    win.style.right = 'auto';
    win.style.top   = rect.top + 'px';
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('mousemove', function(e) {
    var win = $('tmr-window');
    if (!win) return;
    if (dragState) {
      var x = Math.max(0, Math.min(e.clientX - dragState.offsetX, window.innerWidth  - win.offsetWidth));
      var y = Math.max(0, Math.min(e.clientY - dragState.offsetY, window.innerHeight - win.offsetHeight));
      win.style.left = x + 'px';
      win.style.top  = y + 'px';
    }
    if (resizeState) {
      var dx = e.clientX - resizeState.startX;
      var dy = e.clientY - resizeState.startY;
      var growX, growY;
      switch (resizeState.corner) {
        case 'br': growX=dx;  growY=dy;  break;
        case 'tl': growX=-dx; growY=-dy; break;
        case 'tr': growX=dx;  growY=-dy; break;
        case 'bl': growX=-dx; growY=dy;  break;
      }
      var delta = Math.max(growX, growY);
      var newW  = Math.max(240, Math.min(900, resizeState.startW + delta));
      var newH  = Math.max(130, Math.min(500, resizeState.startH + delta / 1.9));
      var newLeft = resizeState.startLeft;
      var newTop  = resizeState.startTop;
      if (resizeState.corner === 'tl' || resizeState.corner === 'bl')
        newLeft = resizeState.startLeft + (resizeState.startW - newW);
      if (resizeState.corner === 'tl' || resizeState.corner === 'tr')
        newTop = resizeState.startTop + (resizeState.startH - newH);
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - newW));
      newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - newH));
      win.style.width  = newW + 'px';
      win.style.height = newH + 'px';
      win.style.left   = newLeft + 'px';
      win.style.top    = newTop  + 'px';
      fitDigits();
    }
  });
  document.addEventListener('touchmove', function(e) {
    var win = $('tmr-window');
    if (!win) return;
    var p = getTouchPoint(e);
    if (!p) return;
    if (dragState) {
      var x = Math.max(0, Math.min(p.clientX - dragState.offsetX, window.innerWidth  - win.offsetWidth));
      var y = Math.max(0, Math.min(p.clientY - dragState.offsetY, window.innerHeight - win.offsetHeight));
      win.style.left = x + 'px';
      win.style.top  = y + 'px';
    }
    if (resizeState) {
      var dx = p.clientX - resizeState.startX;
      var dy = p.clientY - resizeState.startY;
      var growX, growY;
      switch (resizeState.corner) {
        case 'br': growX=dx;  growY=dy;  break;
        case 'tl': growX=-dx; growY=-dy; break;
        case 'tr': growX=dx;  growY=-dy; break;
        case 'bl': growX=-dx; growY=dy;  break;
      }
      var delta = Math.max(growX, growY);
      var newW  = Math.max(240, Math.min(900, resizeState.startW + delta));
      var newH  = Math.max(130, Math.min(500, resizeState.startH + delta / 1.9));
      var newLeft = resizeState.startLeft;
      var newTop  = resizeState.startTop;
      if (resizeState.corner === 'tl' || resizeState.corner === 'bl')
        newLeft = resizeState.startLeft + (resizeState.startW - newW);
      if (resizeState.corner === 'tl' || resizeState.corner === 'tr')
        newTop = resizeState.startTop + (resizeState.startH - newH);
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - newW));
      newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - newH));
      win.style.width  = newW + 'px';
      win.style.height = newH + 'px';
      win.style.left   = newLeft + 'px';
      win.style.top    = newTop  + 'px';
      fitDigits();
    }
    if (dragState || resizeState) e.preventDefault();
  }, { passive: false });

  document.addEventListener('mouseup', function() {
    var win = $('tmr-window');
    if (dragState && win) { dragState = null; win.classList.remove('dragging'); }
    resizeState = null;
  });
  document.addEventListener('touchend', function() {
    var win = $('tmr-window');
    if (dragState && win) { dragState = null; win.classList.remove('dragging'); }
    resizeState = null;
  });

  /* ── RESIZE 4 góc ── */
  var resizeState = null;
  document.addEventListener('mousedown', function(e) {
    var handle = e.target.closest('.tmr-resize');
    if (!handle) return;
    var win = $('tmr-window');
    if (!win || !win.classList.contains('show')) return;
    var rect = win.getBoundingClientRect();
    win.style.left  = rect.left + 'px';
    win.style.top   = rect.top  + 'px';
    win.style.right = 'auto';
    resizeState = {
      corner: handle.dataset.corner,
      startX: e.clientX, startY: e.clientY,
      startW: rect.width, startH: rect.height,
      startLeft: rect.left, startTop: rect.top
    };
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('touchstart', function(e) {
    var handle = e.target.closest('.tmr-resize');
    if (!handle) return;
    var win = $('tmr-window');
    if (!win || !win.classList.contains('show')) return;
    var p = getTouchPoint(e);
    if (!p) return;
    var rect = win.getBoundingClientRect();
    win.style.left  = rect.left + 'px';
    win.style.top   = rect.top  + 'px';
    win.style.right = 'auto';
    resizeState = {
      corner: handle.dataset.corner,
      startX: p.clientX, startY: p.clientY,
      startW: rect.width, startH: rect.height,
      startLeft: rect.left, startTop: rect.top
    };
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  /* ── Click outside modal để đóng ── */
  document.addEventListener('click', function(e) {
    var modal = $('tmr-modal');
    if (modal && e.target === modal) tmrCloseModal();
  });

  /* ── Init ── */
  function init() { fitDigits(); updateUI(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  else setTimeout(init, 200);
})();
