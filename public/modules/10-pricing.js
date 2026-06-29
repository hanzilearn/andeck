/* ============================================================
   ANDECK PRICING — Giai đoạn 2 (API)
   ============================================================ */
(function () {
  var AD_ZALO_CSKH = '0792739257';

  var AD_PACKAGES = {
    goi1: {
      id: 'goi1',
      name: 'Gói 1',
      priceLabel: '17.000đ',
      label: 'Gói 1 — +10 deck, +1.000 từ',
      deckAdd: 10,
      wordAdd: 1000
    },
    goi2: {
      id: 'goi2',
      name: 'Gói 2',
      priceLabel: '29.000đ',
      label: 'Gói 2 — +20 deck, +2.000 từ',
      deckAdd: 20,
      wordAdd: 2000
    }
  };

  var adPaymentSession = null;
  var adOrdersCache = [];

  function adAuthHeaders(json) {
    var headers = {};
    if (typeof getAuthToken === 'function') {
      var token = getAuthToken();
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function openPrOverlay(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.removeAttribute('hidden');
    el.classList.add('is-open');
  }

  function closePrOverlay(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('hidden', '');
  }

  function adEscapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function adGetUserEmail() {
    if (typeof currentUser !== 'undefined' && currentUser) {
      return currentUser.email || currentUser.u || '';
    }
    var dd = document.getElementById('dd-email');
    return dd ? dd.textContent.trim() : '';
  }

  function adBuildZaloMsg(session) {
    return (
      'Mã đơn: ' + session.orderCode + '\n' +
      'Email: ' + session.email + '\n' +
      'Gói: ' + session.pkg.name + ' — ' + session.pkg.priceLabel
    );
  }

  function adBuildZaloDeepLink(session) {
    var text =
      'Mã đơn ' + session.orderCode + '\n' +
      'Email: ' + session.email + '\n' +
      'Đã chuyển ' + session.pkg.priceLabel + ' — đính kèm bill + ảnh web';
    return 'https://zalo.me/' + AD_ZALO_CSKH + '?text=' + encodeURIComponent(text);
  }

  function adCopyFeedback(btnEl) {
    if (typeof showLabelToast === 'function') {
      showLabelToast('Đã copy', '#27ae60');
      return;
    }
    if (btnEl) {
      var orig = btnEl.textContent;
      btnEl.textContent = 'Đã copy!';
      setTimeout(function () { btnEl.textContent = orig; }, 1500);
    }
  }

  function adCopyTextFallback(text, onOk) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (onOk) onOk();
    } catch (e) {
      window.prompt('Copy thủ công:', text);
    }
    document.body.removeChild(ta);
  }

  function adCopyText(text, btnEl) {
    function onOk() { adCopyFeedback(btnEl); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onOk).catch(function () {
        adCopyTextFallback(text, onOk);
      });
    } else {
      adCopyTextFallback(text, onOk);
    }
  }

  function adFormatOrderDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function adOrderIsActive(o) {
    return o.status === 'pending' || o.status === 'verified';
  }

  function adOrderIsActivated(o) {
    return o.status === 'applied' || o.status === 'verified';
  }

  function adFindSessionOrder() {
    if (!adPaymentSession || !adPaymentSession.orderCode) return null;
    return adOrdersCache.find(function (o) {
      return o.orderCode === adPaymentSession.orderCode;
    }) || null;
  }

  function adFindPendingForPackage(packageId) {
    return adOrdersCache.find(function (o) {
      return o.packageId === packageId && o.status === 'pending';
    }) || null;
  }

  async function adFetchOrders() {
    if (typeof getAuthToken !== 'function' || !getAuthToken()) {
      adOrdersCache = [];
      return [];
    }
    try {
      var res = await fetch('/api/orders/mine', {
        headers: adAuthHeaders(),
        cache: 'no-store'
      });
      if (!res.ok) {
        adOrdersCache = [];
        return [];
      }
      var data = await res.json();
      adOrdersCache = data.orders || [];
      return adOrdersCache;
    } catch (e) {
      console.error('adFetchOrders:', e);
      adOrdersCache = [];
      return [];
    }
  }

  function adRenderOrdersList() {
    var listEl = document.getElementById('adOrdersList');
    var emptyEl = document.getElementById('adOrdersEmpty');
    if (!listEl || !emptyEl) return;

    var orders = adOrdersCache;
    if (!orders.length) {
      listEl.hidden = true;
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = orders.map(function (o) {
      var isActivated = adOrderIsActivated(o);
      var badgeClass = isActivated
        ? 'pr-order-card__badge--verified'
        : 'pr-order-card__badge--pending';
      var badgeText = isActivated ? 'Đã kích hoạt' : 'Chờ xác minh';
      var priceLabel = o.priceLabel || (o.amount != null ? o.amount.toLocaleString('vi-VN') + 'đ' : '—');
      return (
        '<li class="pr-order-card">' +
          '<div class="pr-order-card__head">' +
            '<span class="pr-order-card__code">' + adEscapeHtml(o.orderCode) + '</span>' +
            '<span class="pr-order-card__badge ' + badgeClass + '">' + badgeText + '</span>' +
          '</div>' +
          '<div class="pr-order-card__row">' +
            '<span class="pr-order-card__pkg">' + adEscapeHtml(o.packageName) + '</span>' +
            '<span class="pr-order-card__price">' + adEscapeHtml(priceLabel) + '</span>' +
          '</div>' +
          '<time class="pr-order-card__date" datetime="' + adEscapeHtml(o.createdAt) + '">' +
            adFormatOrderDate(o.createdAt) +
          '</time>' +
        '</li>'
      );
    }).join('');
  }

  function adHasPaidOrder() {
    var order = adFindSessionOrder();
    return !!(order && adOrderIsActive(order));
  }

  function adNotifyUnpaid() {
    if (typeof showLabelToast === 'function') {
      showLabelToast('Bạn chưa ấn thanh toán', '#e67e22');
    } else {
      alert('Bạn chưa ấn thanh toán');
    }
  }

  function adSyncPaymentActions() {
    var paidBtn = document.getElementById('adCreateOrderBtn');
    var copyBtn = document.getElementById('adCopyZaloMsg');
    var codeEl = document.getElementById('adOrderCode');
    if (!adPaymentSession) return;

    var existing = adFindSessionOrder();
    var hasOrder = !!(existing && adOrderIsActive(existing));

    if (codeEl) {
      codeEl.textContent = hasOrder ? adPaymentSession.orderCode : '—';
    }

    if (paidBtn) {
      if (hasOrder) {
        paidBtn.disabled = true;
        paidBtn.textContent = 'Đã ghi nhận đơn';
      } else {
        paidBtn.disabled = false;
        paidBtn.textContent = 'Đã thanh toán';
      }
    }
    if (copyBtn) {
      if (hasOrder) {
        copyBtn.classList.remove('pr-btn--locked');
        copyBtn.removeAttribute('aria-disabled');
      } else {
        copyBtn.classList.add('pr-btn--locked');
        copyBtn.setAttribute('aria-disabled', 'true');
      }
    }
  }

  async function adCreateOrder() {
    if (!adPaymentSession) return;

    if (adHasPaidOrder()) {
      adSyncPaymentActions();
      return;
    }

    if (typeof getAuthToken !== 'function' || !getAuthToken()) {
      adNotify('Vui lòng đăng nhập để tạo đơn.', 'err');
      return;
    }

    var paidBtn = document.getElementById('adCreateOrderBtn');
    if (paidBtn) {
      paidBtn.disabled = true;
      paidBtn.textContent = 'Đang ghi nhận…';
    }

    try {
      var res = await fetch('/api/orders', {
        method: 'POST',
        headers: adAuthHeaders(true),
        body: JSON.stringify({ packageId: adPaymentSession.pkg.id })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        adNotify(data.error || 'Không tạo được đơn.', 'err');
        adSyncPaymentActions();
        return;
      }

      var order = data.order;
      adPaymentSession.orderCode = order.orderCode;
      adPaymentSession.orderId = order.id;

      await adFetchOrders();
      adSyncPaymentActions();

      if (typeof showLabelToast === 'function') {
        showLabelToast('Đã ghi nhận đơn — gửi bill qua Zalo nhé', '#27ae60');
      }
    } catch (e) {
      console.error('adCreateOrder:', e);
      adNotify('Không thể kết nối server.', 'err');
      adSyncPaymentActions();
    }
  }

  function adNotify(msg, type) {
    var color = type === 'ok' ? '#27ae60' : type === 'err' ? '#e74c3c' : '#95a5a6';
    if (typeof showLabelToast === 'function') {
      showLabelToast(msg, color);
    } else {
      alert(msg);
    }
  }

  window.adOpenUpgradeModal = function () {
    openPrOverlay('adUpgradeModal');
  };

  window.adOpenOrdersPanel = async function () {
    await adFetchOrders();
    adRenderOrdersList();
    openPrOverlay('adOrdersPanel');
  };

  window.adCloseUpgradeModal = function () {
    closePrOverlay('adUpgradeModal');
  };

  window.adCloseOrdersPanel = function () {
    closePrOverlay('adOrdersPanel');
  };

  window.adClosePaymentModal = function () {
    closePrOverlay('adPaymentModal');
  };

  window.adOpenPaymentModal = async function (packageId) {
    var pkg = AD_PACKAGES[packageId];
    if (!pkg) return;

    adPaymentSession = {
      pkg: pkg,
      orderCode: null,
      orderId: null,
      email: adGetUserEmail() || 'email@andeck.vn'
    };

    var labelEl = document.getElementById('adPaymentPackageLabel');
    var amountEl = document.getElementById('adPaymentAmount');
    if (labelEl) labelEl.textContent = pkg.label;
    if (amountEl) amountEl.textContent = pkg.priceLabel;

    var phoneEl = document.getElementById('adPaymentZaloPhone');
    if (phoneEl) {
      phoneEl.textContent =
        typeof getZaloAdminNum === 'function' ? getZaloAdminNum() : '0792 739 257';
    }

    await adFetchOrders();
    var pending = adFindPendingForPackage(packageId);
    if (pending) {
      adPaymentSession.orderCode = pending.orderCode;
      adPaymentSession.orderId = pending.id;
    }

    adSyncPaymentActions();
    adCloseUpgradeModal();
    openPrOverlay('adPaymentModal');
  };

  document.getElementById('adUpgradeClose')?.addEventListener('click', adCloseUpgradeModal);
  document.getElementById('adUpgradeModal')?.addEventListener('click', function (e) {
    if (e.target.id === 'adUpgradeModal') adCloseUpgradeModal();
  });
  document.getElementById('adPaymentClose')?.addEventListener('click', adClosePaymentModal);
  document.getElementById('adPaymentModal')?.addEventListener('click', function (e) {
    if (e.target.id === 'adPaymentModal') adClosePaymentModal();
  });
  document.getElementById('adOrdersClose')?.addEventListener('click', adCloseOrdersPanel);
  document.getElementById('adOrdersPanel')?.addEventListener('click', function (e) {
    if (e.target.id === 'adOrdersPanel') adCloseOrdersPanel();
  });
  document.getElementById('adAvatarUpgradeBtn')?.addEventListener('click', function () {
    if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
    adOpenUpgradeModal();
  });
  document.getElementById('adAvatarOrdersBtn')?.addEventListener('click', function () {
    if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
    adOpenOrdersPanel();
  });
  document.getElementById('adPackageGoi1')?.addEventListener('click', function () {
    adOpenPaymentModal('goi1');
  });
  document.getElementById('adPackageGoi2')?.addEventListener('click', function () {
    adOpenPaymentModal('goi2');
  });
  document.getElementById('adCopyOrderCode')?.addEventListener('click', function () {
    if (!adPaymentSession || !adPaymentSession.orderCode) {
      adNotifyUnpaid();
      return;
    }
    adCopyText(adPaymentSession.orderCode, document.getElementById('adCopyOrderCode'));
  });
  document.getElementById('adCopyZaloMsg')?.addEventListener('click', function () {
    if (!adPaymentSession) return;
    if (!adHasPaidOrder()) {
      adNotifyUnpaid();
      return;
    }
    adCopyText(adBuildZaloMsg(adPaymentSession), document.getElementById('adCopyZaloMsg'));
  });
  document.getElementById('adOpenZaloBtn')?.addEventListener('click', function () {
    if (!adPaymentSession) return;
    if (!adHasPaidOrder()) {
      adNotifyUnpaid();
      return;
    }
    window.open(adBuildZaloDeepLink(adPaymentSession), '_blank', 'noopener,noreferrer');
  });
  document.getElementById('adCreateOrderBtn')?.addEventListener('click', adCreateOrder);
})();
