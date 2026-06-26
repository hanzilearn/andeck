/* =====================================================================
   MODULE 06 — LABEL SYSTEM (Andeck)
   Port 07-label-system.js — deck_<deckId>, getAuthToken()
   ===================================================================== */

function lightenColor(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round((n >> 16) + (255 - (n >> 16)) * pct / 100));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * pct / 100));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * pct / 100));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function darkenColor(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = 1 - pct / 100;
  const r = Math.max(0, Math.round((n >> 16) * f));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * f));
  const b = Math.max(0, Math.round((n & 0xff) * f));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function renderStarSVG(idx, lbl) {
  if (lbl) {
    const c = lbl.color,
      light = lightenColor(c, 40),
      dark = darkenColor(c, 25);
    const gid = 'gst-' + idx;
    return (
      '<button class="star-btn-svg starred" id="star-' +
      idx +
      '" onclick="toggleStar(' +
      idx +
      ')" title="Nhãn: ' +
      esc(lbl.name) +
      '">' +
      '<svg width="22" height="22" viewBox="0 0 24 24">' +
      '<defs><linearGradient id="' +
      gid +
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
      gid +
      ')" stroke="' +
      dark +
      '" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M12 4.5l1.8 3.6 4 .6-3 3 .8 4-3.6-2" fill="rgba(255,255,255,.35)"/>' +
      '</svg></button>'
    );
  }
  return (
    '<button class="star-btn-svg" id="star-' +
    idx +
    '" onclick="toggleStar(' +
    idx +
    ')" title="Click để gán nhãn">' +
    '<svg width="22" height="22" viewBox="0 0 24 24">' +
    '<path d="M12 2l2.99 6.07L22 9.24l-5.5 5.36L17.82 22 12 18.73 6.18 22 7.5 14.6 2 9.24l7.01-1.17L12 2z" fill="#d4d0c8" stroke="#a8a49c" stroke-width="1" stroke-linejoin="round"/>' +
    '</svg></button>'
  );
}

function openAssignMenu() {
  radialMode = 'assign';
  ensureRadialMenuDOM();
  renderRadialMenu();
  document.getElementById('label-radial-overlay').classList.add('open');
}
function openFilterMenu(ctx) {
  radialMode = 'filter-' + ctx;
  if (ctx === 'table') filterPicked = [...getCurrentFilterState().ids];
  else if (ctx === 'exam') filterPicked = [...examFilterIds];
  else if (ctx === 'fc') filterPicked = [...fcFilterIds];
  ensureRadialMenuDOM();
  renderRadialMenu();
  document.getElementById('label-radial-overlay').classList.add('open');
}
function closeRadialMenu(e) {
  if (e && e.target?.id !== 'label-radial-overlay') return;
  document.getElementById('label-radial-overlay')?.classList.remove('open');
  if (radialMode === 'save-quiz') {
    quizSavePending = null;
    quizSaveLabelPicked = null;
    radialMode = 'assign';
  }
  if (radialMode === 'pick-fc-label') {
    fcSaveLabelPick = null;
    radialMode = 'assign';
  }
}

function ensureRadialMenuDOM() {
  if (document.getElementById('label-radial-overlay')) return;
  const div = document.createElement('div');
  div.id = 'label-radial-overlay';
  div.className = 'label-radial-overlay';
  div.onclick = closeRadialMenu;
  div.innerHTML =
    '<div class="label-radial-wrap" onclick="event.stopPropagation()">' +
    '<svg class="label-radial-svg" viewBox="0 0 380 380" id="label-radial-svg"></svg>' +
    '<button class="label-radial-center" id="label-radial-center"></button>' +
    '<div class="label-radial-hint" id="label-radial-hint"></div>' +
    '</div>';
  document.body.appendChild(div);
}

function describeDonutSlice(cx, cy, rIn, rOut, a0, a1) {
  const span = a1 - a0;
  if (span >= 2 * Math.PI - 0.001) {
    const topO = cx + ' ' + (cy - rOut),
      botO = cx + ' ' + (cy + rOut);
    const topI = cx + ' ' + (cy - rIn),
      botI = cx + ' ' + (cy + rIn);
    return (
      'M ' +
      topO +
      ' A ' +
      rOut +
      ' ' +
      rOut +
      ' 0 1 1 ' +
      botO +
      ' A ' +
      rOut +
      ' ' +
      rOut +
      ' 0 1 1 ' +
      topO +
      ' Z M ' +
      topI +
      ' A ' +
      rIn +
      ' ' +
      rIn +
      ' 0 1 0 ' +
      botI +
      ' A ' +
      rIn +
      ' ' +
      rIn +
      ' 0 1 0 ' +
      topI +
      ' Z'
    );
  }
  const largeArc = span > Math.PI ? 1 : 0;
  const cx0o = cx + Math.cos(a0) * rOut,
    cy0o = cy + Math.sin(a0) * rOut;
  const cx1o = cx + Math.cos(a1) * rOut,
    cy1o = cy + Math.sin(a1) * rOut;
  const cx0i = cx + Math.cos(a0) * rIn,
    cy0i = cy + Math.sin(a0) * rIn;
  const cx1i = cx + Math.cos(a1) * rIn,
    cy1i = cy + Math.sin(a1) * rIn;
  return (
    'M ' +
    cx0o +
    ' ' +
    cy0o +
    ' A ' +
    rOut +
    ' ' +
    rOut +
    ' 0 ' +
    largeArc +
    ' 1 ' +
    cx1o +
    ' ' +
    cy1o +
    ' L ' +
    cx1i +
    ' ' +
    cy1i +
    ' A ' +
    rIn +
    ' ' +
    rIn +
    ' 0 ' +
    largeArc +
    ' 0 ' +
    cx0i +
    ' ' +
    cy0i +
    ' Z'
  );
}

function renderRadialMenu() {
  const svg = document.getElementById('label-radial-svg');
  const center = document.getElementById('label-radial-center');
  const hint = document.getElementById('label-radial-hint');
  if (!svg) return;
  const isSaveQuiz = radialMode === 'save-quiz';
  const isPickFc = radialMode === 'pick-fc-label';
  const isFilter = radialMode.startsWith('filter');
  const isSinglePick = isSaveQuiz || isPickFc;

  const slices = userLabels.map(function (l) {
    return { type: 'label', data: l };
  });
  if (radialMode === 'assign' && userLabels.length < MAX_LABELS) slices.push({ type: 'add' });

  const n = slices.length,
    cx = 190,
    cy = 190,
    rOut = 155,
    rIn = 72;
  const step = (2 * Math.PI) / n,
    start = -Math.PI / 2 - step / 2;
  let html = '';

  slices.forEach(function (s, i) {
    const a0 = start + i * step,
      a1 = a0 + step;
    const pathD = describeDonutSlice(cx, cy, rIn, rOut, a0, a1);
    let midA, mx, my;
    if (n === 1) {
      midA = -Math.PI / 2;
      const rM = (rIn + rOut) / 2;
      mx = cx + Math.cos(midA) * rM;
      my = cy + Math.sin(midA) * rM;
    } else {
      midA = (a0 + a1) / 2;
      const rM = (rIn + rOut) / 2;
      mx = cx + Math.cos(midA) * rM;
      my = cy + Math.sin(midA) * rM;
    }
    let fill,
      labelHtml = '',
      dataAttr = '',
      cls = 'label-slice-group',
      strokeStyle = '';
    if (s.type === 'label') {
      fill = s.data.color;
      const isActive = !isFilter && !isSinglePick && s.data.id === activeLabelId;
      const isPicked =
        (isFilter && filterPicked.includes(s.data.id)) ||
        (isSaveQuiz && quizSaveLabelPicked === s.data.id) ||
        (isPickFc && fcSaveLabelPick === s.data.id);
      if (isActive) cls += ' selected';
      if (isPicked) cls += ' filter-picked';
      const sn = s.data.name.length > 10 ? s.data.name.substring(0, 9) + '…' : s.data.name;
      labelHtml =
        '<text x="' +
        mx +
        '" y="' +
        (my - 4) +
        '" class="label-slice-text" style="font-size:20px">★</text>' +
        '<text x="' +
        mx +
        '" y="' +
        (my + 15) +
        '" class="label-slice-text" style="font-size:11px;font-weight:600">' +
        esc(sn) +
        '</text>' +
        '<g class="filter-check" transform="translate(' +
        (mx + 22) +
        ',' +
        (my - 24) +
        ')">' +
        '<circle cx="0" cy="0" r="11" fill="white" stroke="' +
        s.data.color +
        '" stroke-width="2.5"/>' +
        '<path d="M-4.5 0 L-1 3.5 L4.5 -3.5" stroke="' +
        s.data.color +
        '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '</g>';
      dataAttr = 'data-type="label" data-id="' + s.data.id + '"';
    } else {
      fill = '#ffffff';
      strokeStyle = 'stroke:#888;stroke-width:2;stroke-dasharray:4 3';
      labelHtml =
        '<text x="' +
        mx +
        '" y="' +
        (my + 2) +
        '" style="fill:#888;font-size:26px" text-anchor="middle">+</text>' +
        '<text x="' +
        mx +
        '" y="' +
        (my + 18) +
        '" style="fill:#888;font-size:10px" text-anchor="middle">Tạo mới</text>';
      dataAttr = 'data-type="add"';
    }
    html +=
      '<g class="' +
      cls +
      '" ' +
      dataAttr +
      '><path d="' +
      pathD +
      '" fill="' +
      fill +
      '" style="' +
      strokeStyle +
      '"/>' +
      labelHtml +
      '</g>';
  });

  svg.innerHTML = html;
  svg.querySelectorAll('.label-slice-group').forEach(function (g) {
    g.addEventListener('click', handleSliceClick);
  });

  center.className = 'label-radial-center';
  if (isFilter || isSinglePick) {
    center.classList.add('filter-confirm');
    const hasPick = isSaveQuiz
      ? !!quizSaveLabelPicked
      : isPickFc
        ? !!fcSaveLabelPick
        : filterPicked.length > 0;
    if (hasPick) center.classList.add('has-selection');
    center.innerHTML = '<span class="confirm-main">Xác nhận</span>';
    center.onclick = isSaveQuiz
      ? confirmQuizSaveLabel
      : isPickFc
        ? confirmFcSaveLabelPick
        : confirmFilter;
    if (isSaveQuiz) {
      const nWords = quizSavePending?.indices?.length || 0;
      const pickedName = userLabels.find(function (l) {
        return l.id === quizSaveLabelPicked;
      })?.name;
      hint.textContent = pickedName
        ? 'Lưu ' + nWords + ' từ vào "' + pickedName + '" · bấm Xác nhận'
        : 'Chọn nhãn để lưu ' + nWords + ' từ';
    } else if (isPickFc) {
      const pickedName = userLabels.find(function (l) {
        return l.id === fcSaveLabelPick;
      })?.name;
      hint.textContent = pickedName
        ? 'Lưu flashcard vào "' + pickedName + '" · bấm Xác nhận'
        : 'Chọn nhãn để lưu từ flashcard';
    } else {
      hint.textContent =
        filterPicked.length === 0
          ? 'Chọn 1 hoặc nhiều nhãn để lọc'
          : 'Đã chọn ' + filterPicked.length + ' nhãn';
    }
  } else {
    if (activeLabelId) {
      const albl = userLabels.find(function (l) {
        return l.id === activeLabelId;
      });
      if (albl) {
        center.style.background = albl.color;
        center.style.color = 'white';
      }
    } else {
      center.style.background = '#95a5a6';
      center.style.color = 'white';
    }
    center.innerHTML =
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
      '<span class="label-radial-center-sub" style="color:rgba(255,255,255,.85)">Quản lý</span>';
    center.onclick = function () {
      closeRadialMenu();
      openManageLabelsModal();
    };
    hint.textContent = 'Click 1 nhãn để cầm bút · Bánh răng = Quản lý';
  }
}

function handleSliceClick(e) {
  const g = e.currentTarget;
  const type = g.getAttribute('data-type');
  const isFilter = radialMode.startsWith('filter');
  if (type === 'add') {
    openCreateLabelModal();
    return;
  }
  if (type !== 'label') return;
  const id = g.getAttribute('data-id');
  if (radialMode === 'save-quiz') {
    quizSaveLabelPicked = id;
    renderRadialMenu();
    return;
  }
  if (radialMode === 'pick-fc-label') {
    fcSaveLabelPick = id;
    renderRadialMenu();
    return;
  }
  if (isFilter) {
    filterPicked = filterPicked.includes(id)
      ? filterPicked.filter(function (x) {
          return x !== id;
        })
      : [...filterPicked, id];
    renderRadialMenu();
  } else {
    activeLabelId = id;
    const lbl = userLabels.find(function (l) {
      return l.id === id;
    });
    closeRadialMenu();
    showLabelToast('🖊 Đang cầm bút "' + lbl.name + '"', lbl.color);
    render();
  }
}

function confirmFilter() {
  if (filterPicked.length === 0) {
    showLabelToast('Đã hủy (chưa chọn nhãn nào)', '#95a5a6');
    closeRadialMenu();
    return;
  }
  if (radialMode === 'filter-table') {
    setCurrentFilterState('labels', [...filterPicked]);
    const btn = document.getElementById('hide-starred-btn');
    if (btn) {
      btn.classList.remove('on-red-slash');
      btn.classList.add('on-red');
    }
    const names = filterPicked
      .map(function (id) {
        return userLabels.find(function (x) {
          return x.id === id;
        })?.name || '';
      })
      .join(', ');
    showLabelToast('✓ Lọc theo: ' + names, '#27ae60');
    render();
  } else if (radialMode === 'filter-exam') {
    examCfg.pool = 'starred';
    examFilterIds = [...filterPicked];
    updateExamPoolDisplay();
    showLabelToast('✓ Đã chọn ' + filterPicked.length + ' nhãn', '#27ae60');
    if (typeof validateExam === 'function') validateExam();
  } else if (radialMode === 'filter-fc') {
    fcCfg.pool = 'starred';
    fcFilterIds = [...filterPicked];
    updateFcPoolDisplay();
    showLabelToast('✓ Đã chọn ' + filterPicked.length + ' nhãn', '#27ae60');
  }
  closeRadialMenu();
}

function setExamPoolLabeled(btn) {
  document.querySelectorAll('#exam-screen .opt-btn').forEach(function (b) {
    const tx = b.textContent.trim();
    if (b.id === 'starred-opt' || tx.startsWith('Tất cả') || tx.startsWith('Ngẫu')) b.classList.remove('active');
  });
  btn.classList.add('active');
  examCfg.pool = 'starred';
  openFilterMenu('exam');
}
function setFcPoolLabeled(btn) {
  document.querySelectorAll('#fc-setup-screen .opt-btn').forEach(function (b) {
    const tx = b.textContent.trim();
    if (b.id === 'fc-starred-opt' || tx.includes('Tất cả') || tx.includes('Chưa')) b.classList.remove('active');
  });
  btn.classList.add('active');
  fcCfg.pool = 'starred';
  openFilterMenu('fc');
}
function updateExamPoolDisplay() {
  const dot = document.getElementById('exam-opt-dot');
  const txt = document.getElementById('exam-opt-text');
  const cnt = document.getElementById('star-count');
  if (!dot) return;
  if (examFilterIds.length > 0) {
    const sel = examFilterIds
      .map(function (id) {
        return userLabels.find(function (l) {
          return l.id === id;
        });
      })
      .filter(Boolean);
    const total = Object.values(itemLabels).filter(function (v) {
      return examFilterIds.includes(v);
    }).length;
    if (sel.length === 1) {
      dot.style.background = sel[0].color;
      txt.textContent = sel[0].name;
    } else {
      dot.style.background = 'linear-gradient(90deg,' + sel.map(function (l) { return l.color; }).join(',') + ')';
      txt.textContent = sel.length + ' nhãn';
    }
    cnt.textContent = total;
  } else {
    dot.style.background = '#f1c40f';
    txt.textContent = 'Đã nhớ';
    cnt.textContent = starred.size;
  }
}
function updateFcPoolDisplay() {
  const dot = document.getElementById('fc-opt-dot');
  const txt = document.getElementById('fc-opt-text');
  const cnt = document.getElementById('fc-starred');
  if (!dot) return;
  if (fcFilterIds.length > 0) {
    const sel = fcFilterIds
      .map(function (id) {
        return userLabels.find(function (l) {
          return l.id === id;
        });
      })
      .filter(Boolean);
    const total = Object.values(itemLabels).filter(function (v) {
      return fcFilterIds.includes(v);
    }).length;
    if (sel.length === 1) {
      dot.style.background = sel[0].color;
      txt.textContent = sel[0].name;
    } else {
      dot.style.background = 'linear-gradient(90deg,' + sel.map(function (l) { return l.color; }).join(',') + ')';
      txt.textContent = sel.length + ' nhãn';
    }
    cnt.textContent = total;
  } else {
    dot.style.background = '#f1c40f';
    txt.textContent = 'Đã nhớ';
    cnt.textContent = starred.size;
  }
}

var _labelToastTimer = null;
function showLabelToast(text, color) {
  let t = document.getElementById('label-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'label-toast';
    t.className = 'label-toast';
    t.innerHTML = '<span class="label-toast-dot" id="label-toast-dot"></span><span id="label-toast-text"></span>';
    document.body.appendChild(t);
  }
  document.getElementById('label-toast-text').textContent = text;
  document.getElementById('label-toast-dot').style.background = color || '#d4a017';
  t.classList.add('show');
  if (_labelToastTimer) clearTimeout(_labelToastTimer);
  _labelToastTimer = setTimeout(function () {
    t.classList.remove('show');
  }, 2400);
}

function showConfirm(opts) {
  return new Promise(function (resolve) {
    opts = opts || {};
    const iconSVG =
      opts.icon ||
      '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
    let overlay = document.getElementById('cf-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cf-overlay';
      overlay.className = 'cf-overlay';
      document.body.appendChild(overlay);
    }
    const warnHTML = opts.warn
      ? '<div class="cf-warn"><span class="warn-icon">⚠️</span><span>' + opts.warn + '</span></div>'
      : '';
    overlay.innerHTML =
      '<div class="cf-modal" onclick="event.stopPropagation()">' +
      '<div class="cf-icon-wrap">' +
      iconSVG +
      '</div>' +
      '<div class="cf-title">' +
      (opts.title || 'Xác nhận') +
      '</div>' +
      '<div class="cf-text">' +
      (opts.text || '') +
      '</div>' +
      warnHTML +
      '<div class="cf-actions">' +
      '<button class="cf-btn cf-btn-cancel" id="cf-btn-cancel">' +
      (opts.cancelLabel || 'Hủy') +
      '</button>' +
      '<button class="cf-btn cf-btn-danger" id="cf-btn-confirm">' +
      (opts.confirmLabel || 'Xóa') +
      '</button>' +
      '</div></div>';
    overlay.classList.add('show');
    const cleanup = function (result) {
      overlay.classList.remove('show');
      document.removeEventListener('keydown', escHandler);
      resolve(result);
    };
    const escHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      }
    };
    document.addEventListener('keydown', escHandler);
    overlay.onclick = function (e) {
      if (e.target === overlay) cleanup(false);
    };
    document.getElementById('cf-btn-cancel').onclick = function () {
      cleanup(false);
    };
    document.getElementById('cf-btn-confirm').onclick = function () {
      cleanup(true);
    };
  });
}

async function createLabelAPI(name, color) {
  const token = getAuthToken();
  if (!token) return null;
  if (!currentLevel) {
    alert('Vui lòng mở deck trước khi tạo nhãn');
    return null;
  }
  try {
    const res = await fetch(window.location.origin + '/api/labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ name: name, color: color, level: currentLevel })
    });
    const data = await res.json();
    if (res.ok && data.label) {
      userLabels.push(data.label);
      return data.label;
    }
    alert(data.error || 'Không thể tạo nhãn');
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
async function updateLabelAPI(id, name, color) {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const res = await fetch(window.location.origin + '/api/labels/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ name: name, color: color })
    });
    const data = await res.json();
    if (res.ok && data.label) {
      const i = userLabels.findIndex(function (l) {
        return l.id === id;
      });
      if (i >= 0) userLabels[i] = data.label;
      return true;
    }
    alert(data.error || 'Không thể cập nhật');
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}
async function deleteLabelAPI(id) {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const res = await fetch(window.location.origin + '/api/labels/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (res.ok) {
      userLabels = userLabels.filter(function (l) {
        return l.id !== id;
      });
      Object.keys(itemLabels).forEach(function (k) {
        if (itemLabels[k] === id) delete itemLabels[k];
      });
      if (activeLabelId === id) activeLabelId = userLabels[0]?.id || null;
      Object.values(filterStatePerLevel).forEach(function (fs) {
        fs.ids = fs.ids.filter(function (x) {
          return x !== id;
        });
      });
      examFilterIds = examFilterIds.filter(function (x) {
        return x !== id;
      });
      fcFilterIds = fcFilterIds.filter(function (x) {
        return x !== id;
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

var _editingLabelId = null;
var _selectedColor = null;

function openCreateLabelModal() {
  closeRadialMenu();
  _editingLabelId = null;
  _selectedColor = LABEL_COLOR_PALETTE[0].hex;
  const modal = document.getElementById('label-edit-modal');
  if (!modal) return;
  document.getElementById('lem-title').textContent = 'Tạo nhãn mới';
  document.getElementById('lem-name').value = '';
  renderColorPalette();
  modal.classList.add('show');
  setTimeout(function () {
    document.getElementById('lem-name')?.focus();
  }, 100);
}
function openEditLabelModal(id) {
  const lbl = userLabels.find(function (l) {
    return l.id === id;
  });
  if (!lbl) return;
  _editingLabelId = id;
  _selectedColor = lbl.color;
  const modal = document.getElementById('label-edit-modal');
  if (!modal) return;
  document.getElementById('lem-title').textContent = 'Sửa nhãn';
  document.getElementById('lem-name').value = lbl.name;
  renderColorPalette();
  modal.classList.add('show');
  setTimeout(function () {
    document.getElementById('lem-name')?.focus();
  }, 100);
}
function closeLabelEditModal() {
  document.getElementById('label-edit-modal')?.classList.remove('show');
}
function selectLabelColor(hex, el) {
  _selectedColor = hex;
  document.querySelectorAll('.lem-color-dot').forEach(function (d) {
    d.classList.remove('selected');
  });
  el?.classList.add('selected');
}
function renderColorPalette() {
  const wrap = document.getElementById('lem-color-wrap');
  if (!wrap) return;
  wrap.innerHTML = LABEL_COLOR_PALETTE.map(function (c) {
    return (
      '<div class="lem-color-dot' +
      (c.hex === _selectedColor ? ' selected' : '') +
      '" style="background:' +
      c.hex +
      '" onclick="selectLabelColor(\'' +
      c.hex +
      '\',this)" title="' +
      c.name +
      '"></div>'
    );
  }).join('');
}
async function saveLabelEdit() {
  const name = document.getElementById('lem-name')?.value.trim();
  if (!name) {
    showLabelToast('Tên nhãn không được trống', '#e74c3c');
    return;
  }
  if (name.length > 20) {
    showLabelToast('Tên nhãn tối đa 20 ký tự', '#e74c3c');
    return;
  }
  const color = _selectedColor || LABEL_COLOR_PALETTE[0].hex;
  if (_editingLabelId) {
    const ok = await updateLabelAPI(_editingLabelId, name, color);
    if (ok) {
      showLabelToast('✓ Đã cập nhật nhãn', '#27ae60');
      closeLabelEditModal();
      renderRadialMenu?.();
      render();
    }
  } else {
    const lbl = await createLabelAPI(name, color);
    if (lbl) {
      activeLabelId = lbl.id;
      showLabelToast('✓ Đã tạo nhãn "' + name + '"', color);
      closeLabelEditModal();
      renderRadialMenu?.();
      openAssignMenu();
    }
  }
}

function openManageLabelsModal() {
  const modal = document.getElementById('label-manage-modal');
  if (!modal) return;
  renderManageList();
  modal.classList.add('show');
}
function closeManageLabelsModal() {
  document.getElementById('label-manage-modal')?.classList.remove('show');
}
function renderManageList() {
  const list = document.getElementById('lmm-list');
  if (!list) return;
  if (userLabels.length === 0) {
    list.innerHTML = '<div style="color:#888;padding:16px 0;text-align:center">Chưa có nhãn nào</div>';
    return;
  }
  list.innerHTML = userLabels
    .map(function (l) {
      const cnt = Object.values(itemLabels).filter(function (v) {
        return v === l.id;
      }).length;
      const canDel = !l.isDefault;
      return (
        '<div class="lmm-item" id="lmm-' +
        l.id +
        '">' +
        '<div class="lmm-dot" style="background:' +
        l.color +
        '"></div>' +
        '<div class="lmm-info">' +
        '<div class="lmm-name">' +
        esc(l.name) +
        '</div>' +
        '<div class="lmm-count">' +
        cnt +
        ' từ được đánh dấu</div>' +
        '</div>' +
        '<div class="lmm-actions">' +
        '<button class="lmm-btn lmm-edit" onclick="openEditLabelModal(\'' +
        l.id +
        "');closeManageLabelsModal()\">✏️</button>" +
        (canDel
          ? '<button class="lmm-btn lmm-del" onclick="confirmDeleteLabel(\'' + l.id + "')\">🗑️</button>"
          : '<button class="lmm-btn lmm-del" disabled style="opacity:.3">🗑️</button>') +
        '</div></div>'
      );
    })
    .join('');
}
async function confirmDeleteLabel(id) {
  const lbl = userLabels.find(function (l) {
    return l.id === id;
  });
  if (!lbl) return;
  const cnt = Object.values(itemLabels).filter(function (v) {
    return v === id;
  }).length;
  const ok = await showConfirm({
    title: 'Xóa nhãn "' + lbl.name + '"?',
    text: cnt > 0 ? cnt + ' từ đang dùng nhãn này sẽ mất nhãn.' : 'Nhãn này chưa được dùng.',
    warn: cnt > 0 ? '<b>' + cnt + ' từ</b> sẽ trở về trạng thái chưa đánh dấu' : null,
    confirmLabel: 'Xóa nhãn',
    cancelLabel: 'Hủy'
  });
  if (!ok) return;
  const deleted = await deleteLabelAPI(id);
  if (deleted) {
    showLabelToast('✓ Đã xóa nhãn "' + lbl.name + '"', '#95a5a6');
    renderManageList();
    render();
  }
}

async function loadStars() {
  const token = getAuthToken();
  if (!token || !currentLevel) return;
  try {
    const res = await fetch(window.location.origin + '/api/level-data?level=' + encodeURIComponent(currentLevel), {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      console.error('loadStars failed:', res.status);
      return;
    }
    const data = await res.json();

    userLabels =
      data.labels?.length > 0
        ? data.labels
        : [{ id: 'lbl_default', name: 'Đã nhớ', color: '#f1c40f', isDefault: true, level: null }];
    if (
      !userLabels.find(function (l) {
        return l.id === activeLabelId;
      })
    ) {
      activeLabelId = userLabels[0]?.id || null;
    }

    itemLabels = data.items || {};
    starred = new Set(data.stars || []);

    if (Object.keys(itemLabels).length === 0 && starred.size > 0) {
      starred.forEach(function (idx) {
        itemLabels[idx] = 'lbl_default';
      });
    }
    if (Object.keys(itemLabels).length > 0) {
      starred = new Set(
        Object.keys(itemLabels)
          .map(Number)
          .filter(function (n) {
            return !isNaN(n);
          })
      );
    }
    updateStarCount();
  } catch (e) {
    console.error('loadStars error:', e);
  }
}
