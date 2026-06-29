/* ============================================================
   ANDECK PRICING — Giai đoạn 1 mock (Chat 1A→1D)
   Orders: sessionStorage key andeck_mock_orders
   ============================================================ */
(function () {
  var AD_ZALO_CSKH = '0792739257';
  var ORDERS_KEY = 'andeck_mock_orders';

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

  function adGenOrderCode() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var suffix = '';
    for (var i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'AD-' + y + m + day + '-' + suffix;
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
      'Email Andeck: ' + session.email + '\n' +
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

  function adNormalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function adLoadAllOrdersStore() {
    try {
      var raw = sessionStorage.getItem(ORDERS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        var store = {};
        parsed.forEach(function (o) {
          var key = adNormalizeEmail(o.email) || '_unknown';
          if (!store[key]) store[key] = [];
          store[key].push(o);
        });
        sessionStorage.setItem(ORDERS_KEY, JSON.stringify(store));
        return store;
      }
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function adSaveAllOrdersStore(store) {
    sessionStorage.setItem(ORDERS_KEY, JSON.stringify(store));
  }

  function adLoadOrders() {
    var email = adNormalizeEmail(adGetUserEmail());
    if (!email) return [];
    var store = adLoadAllOrdersStore();
    return Array.isArray(store[email]) ? store[email] : [];
  }

  function adSaveOrders(orders) {
    var email = adNormalizeEmail(adGetUserEmail());
    if (!email) return;
    var store = adLoadAllOrdersStore();
    store[email] = orders;
    adSaveAllOrdersStore(store);
  }

  function adFindOrderByCode(orderCode) {
    return adLoadOrders().find(function (o) {
      return o.orderCode === orderCode;
    });
  }

  function adSaveOrder(order) {
    var email = adNormalizeEmail(order.email);
    if (!email) return;
    var store = adLoadAllOrdersStore();
    if (!store[email]) store[email] = [];
    store[email].unshift(order);
    adSaveAllOrdersStore(store);
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

  function adRenderOrdersList() {
    var listEl = document.getElementById('adOrdersList');
    var emptyEl = document.getElementById('adOrdersEmpty');
    if (!listEl || !emptyEl) return;

    var orders = adLoadOrders();
    if (!orders.length) {
      listEl.hidden = true;
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = orders.map(function (o) {
      var isVerified = o.status === 'verified';
      var badgeClass = isVerified
        ? 'pr-order-card__badge--verified'
        : 'pr-order-card__badge--pending';
      var badgeText = isVerified ? 'Đã kích hoạt' : 'Chờ xác minh';
      return (
        '<li class="pr-order-card">' +
          '<div class="pr-order-card__head">' +
            '<span class="pr-order-card__code">' + adEscapeHtml(o.orderCode) + '</span>' +
            '<span class="pr-order-card__badge ' + badgeClass + '">' + badgeText + '</span>' +
          '</div>' +
          '<div class="pr-order-card__row">' +
            '<span class="pr-order-card__pkg">' + adEscapeHtml(o.packageName) + '</span>' +
            '<span class="pr-order-card__price">' + adEscapeHtml(o.priceLabel) + '</span>' +
          '</div>' +
          '<time class="pr-order-card__date" datetime="' + adEscapeHtml(o.createdAt) + '">' +
            adFormatOrderDate(o.createdAt) +
          '</time>' +
        '</li>'
      );
    }).join('');
  }

  function adSyncCreateOrderBtn() {
    var btn = document.getElementById('adCreateOrderBtn');
    if (!btn || !adPaymentSession) return;
    var existing = adFindOrderByCode(adPaymentSession.orderCode);
    if (existing) {
      btn.disabled = true;
      btn.textContent = 'Đã ghi nhận đơn';
    } else {
      btn.disabled = false;
      btn.textContent = 'Đã thanh toán';
    }
  }

  function adCreateOrder() {
    if (!adPaymentSession) return;

    var existing = adFindOrderByCode(adPaymentSession.orderCode);
    if (existing) {
      adSyncCreateOrderBtn();
      return;
    }

    adSaveOrder({
      orderCode: adPaymentSession.orderCode,
      packageId: adPaymentSession.pkg.id,
      packageName: adPaymentSession.pkg.name,
      priceLabel: adPaymentSession.pkg.priceLabel,
      email: adPaymentSession.email,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    adSyncCreateOrderBtn();
    if (typeof showLabelToast === 'function') {
      showLabelToast('Đã ghi nhận đơn — gửi bill qua Zalo nhé', '#27ae60');
    }
  }

  window.adOpenUpgradeModal = function () {
    openPrOverlay('adUpgradeModal');
  };

  window.adOpenOrdersPanel = function () {
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

  window.adOpenPaymentModal = function (packageId) {
    var pkg = AD_PACKAGES[packageId];
    if (!pkg) return;
    adPaymentSession = {
      pkg: pkg,
      orderCode: adGenOrderCode(),
      email: adGetUserEmail() || 'email@andeck.vn'
    };
    var labelEl = document.getElementById('adPaymentPackageLabel');
    var codeEl = document.getElementById('adOrderCode');
    var amountEl = document.getElementById('adPaymentAmount');
    if (labelEl) labelEl.textContent = pkg.label;
    if (codeEl) codeEl.textContent = adPaymentSession.orderCode;
    if (amountEl) amountEl.textContent = pkg.priceLabel;
    var phoneEl = document.getElementById('adPaymentZaloPhone');
    if (phoneEl) {
      phoneEl.textContent =
        typeof getZaloAdminNum === 'function' ? getZaloAdminNum() : '0792 739 257';
    }
    adSyncCreateOrderBtn();
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
    if (!adPaymentSession) return;
    adCopyText(adPaymentSession.orderCode, document.getElementById('adCopyOrderCode'));
  });
  document.getElementById('adCopyZaloMsg')?.addEventListener('click', function () {
    if (!adPaymentSession) return;
    adCopyText(adBuildZaloMsg(adPaymentSession), document.getElementById('adCopyZaloMsg'));
  });
  document.getElementById('adOpenZaloBtn')?.addEventListener('click', function () {
    if (!adPaymentSession) return;
    window.open(adBuildZaloDeepLink(adPaymentSession), '_blank', 'noopener,noreferrer');
  });
  document.getElementById('adCreateOrderBtn')?.addEventListener('click', adCreateOrder);
})();
