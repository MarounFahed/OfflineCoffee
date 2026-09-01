/* ============================================================
   OFFLINE — theme.js
   Vanilla ES2020+. Single file. Each feature self-mounts and
   no-ops if its DOM target isn't present (theme editor users
   may remove the relevant section).
   Target budget per brief §11.1: < 30KB min, < 12KB gzip.
   ============================================================ */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ----- Header height publishing + sticky hairline ----- */
  function header() {
    const el = document.getElementById('siteHeader');
    const wrap = document.querySelector('.header-wrap') || el;
    if (!el) return;
    function setH() {
      document.documentElement.style.setProperty('--header-h', wrap.offsetHeight + 'px');
    }
    setH();
    window.addEventListener('resize', setH, { passive: true });
    window.addEventListener('scroll', () => {
      el.classList.toggle('scrolled', window.scrollY > 80);
    }, { passive: true });
  }

  /* ----- Mobile menu drawer ----- */
  function mobileMenu() {
    const drawer = document.getElementById('mobileMenu');
    const opener = document.querySelector('[data-menu-open]');
    const closer = document.querySelector('[data-menu-close]');
    if (!drawer || !opener) return;
    function open() {
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const first = drawer.querySelector('a, button');
      if (first) first.focus();
    }
    function close() {
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      opener.focus();
    }
    opener.addEventListener('click', open);
    if (closer) closer.addEventListener('click', close);
    drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ----- Brew timer (5 minutes, mono digits, no sound) ----- */
  function brewTimer() {
    const pill = document.getElementById('timerPill');
    const digits = document.getElementById('timerDigits');
    const label = document.getElementById('timerLabel');
    if (!pill || !digits || !label) return;
    const total = Number(pill.dataset.seconds || 300);
    let remaining = total;
    let intv = null;
    let running = false;
    const fmt = (s) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    };
    pill.addEventListener('click', () => {
      if (running) {
        clearInterval(intv);
        running = false;
        label.textContent = pill.dataset.labelResume || 'Resume';
        return;
      }
      if (remaining === 0) {
        remaining = total;
        digits.textContent = fmt(remaining);
        label.textContent = pill.dataset.labelStart || 'Start brew';
        return;
      }
      running = true;
      label.textContent = pill.dataset.labelRunning || 'Brewing…';
      intv = setInterval(() => {
        remaining -= 1;
        digits.textContent = fmt(remaining);
        if (remaining <= 0) {
          clearInterval(intv);
          running = false;
          digits.textContent = '00:00';
          label.textContent = pill.dataset.labelDone || 'Ready.';
        }
      }, 1000);
    });
  }

  /* ----- Cursor coordinate readout ----- */
  function cursorCoord() {
    if (reducedMotion || isTouch) return;
    const el = document.getElementById('cursorCoord');
    if (!el) return;
    const fmt = (v, max) => {
      const deg = Math.floor(Math.abs(v) * max);
      const min = Math.floor((Math.abs(v) * max - deg) * 60);
      return String(deg).padStart(2, '0') + '°' + String(min).padStart(2, '0') + '′';
    };
    let raf = null;
    let lx = 0;
    let ly = 0;
    window.addEventListener('mousemove', (e) => {
      lx = e.clientX / window.innerWidth;
      ly = e.clientY / window.innerHeight;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        el.textContent = 'N ' + fmt(1 - ly, 90) + ' / W ' + fmt(lx, 180) + ' · STEEPED HERE';
      });
    });
  }

  /* ----- Going-offline page transition cue ----- */
  function goingOffline() {
    if (reducedMotion) return;
    const cue = document.getElementById('goingOffline');
    if (!cue) return;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      // Internal link only (same origin), not new tab
      if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch (err) { return; }
      cue.classList.add('show');
      // Auto-clear if navigation is canceled or slow
      setTimeout(() => cue.classList.remove('show'), 1200);
    }, true);
  }

  /* ----- Quantity stepper (cart, PDP) ----- */
  function qtyStepper() {
    document.querySelectorAll('[data-qty]').forEach((wrap) => {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = '1';
      const input = wrap.querySelector('input[type="number"]');
      const minus = wrap.querySelector('[data-qty-minus]');
      const plus = wrap.querySelector('[data-qty-plus]');
      if (!input) return;
      const min = Number(input.min || 1);
      const change = (delta) => {
        const next = Math.max(min, Number(input.value || min) + delta);
        input.value = next;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      if (minus) minus.addEventListener('click', () => change(-1));
      if (plus) plus.addEventListener('click', () => change(+1));
    });
  }

  /* ----- Money formatting (mirrors shop.money_format) ----- */
  function formatMoney(cents) {
    const format = window.OFFLINE_MONEY_FORMAT || '${{amount}}';
    const placeholderMatch = format.match(/\{\{\s*(\w+)\s*\}\}/);
    const key = placeholderMatch ? placeholderMatch[1] : 'amount';
    const precision = key.indexOf('no_decimals') === -1 ? 2 : 0;
    const thousands = key.indexOf('comma_separator') === -1 ? ',' : '.';
    const decimal = key.indexOf('comma_separator') === -1 ? '.' : ',';
    const amount = (Number(cents || 0) / 100).toFixed(precision);
    const parts = amount.split('.');
    const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    const value = parts[1] ? dollars + decimal + parts[1] : dollars;
    return placeholderMatch ? format.replace(placeholderMatch[0], value) : '$' + value;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* ----- Cart drawer ----- */
  const cartDrawer = (function () {
    const root = document.getElementById('cartDrawer');
    if (!root) return { open: () => {}, close: () => {}, refresh: () => Promise.resolve() };

    const itemsEl = root.querySelector('[data-cart-drawer-items]');
    const emptyEl = root.querySelector('[data-cart-drawer-empty]');
    const summaryEl = root.querySelector('[data-cart-drawer-summary]');
    const subtotalEl = root.querySelector('[data-cart-drawer-subtotal]');
    const countEl = root.querySelector('[data-cart-drawer-count-label]');
    let lastFocused = null;

    function rowHtml(item) {
      const img = item.image ? item.image.replace(/(\.[a-zA-Z0-9]+)(\?|$)/, '_160x$1$2') : '';
      const hasVariant = item.variant_title && item.variant_title !== 'Default Title';
      return (
        '<div class="cart-drawer-row" data-key="' + escapeHtml(item.key) + '">' +
          '<a class="cart-drawer-row-img" href="' + escapeHtml(item.url) + '" tabindex="-1" aria-hidden="true">' +
            (img ? '<img src="' + escapeHtml(img) + '" alt="" width="80" height="100" loading="lazy">' : '') +
          '</a>' +
          '<div class="cart-drawer-row-body">' +
            '<a href="' + escapeHtml(item.url) + '" class="cart-drawer-row-title">' + escapeHtml(item.product_title) + '</a>' +
            (hasVariant ? '<div class="cart-drawer-row-meta">' + escapeHtml(item.variant_title) + '</div>' : '') +
            '<div class="cart-drawer-row-actions">' +
              '<div class="qty-stepper" data-qty>' +
                '<button type="button" data-qty-minus aria-label="' + escapeHtml(root.dataset.labelDecrease) + '">−</button>' +
                '<input type="number" min="0" value="' + item.quantity + '" inputmode="numeric" aria-label="' + escapeHtml(root.dataset.labelQuantity) + '">' +
                '<button type="button" data-qty-plus aria-label="' + escapeHtml(root.dataset.labelIncrease) + '">+</button>' +
              '</div>' +
              '<button type="button" class="cart-drawer-row-remove" data-cart-drawer-remove>' + escapeHtml(root.dataset.labelRemove) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-drawer-row-price">' + formatMoney(item.final_line_price) + '</div>' +
        '</div>'
      );
    }

    function bagsLabel(count) {
      if (!countEl) return '';
      if (count === 1 && countEl.dataset.tmplOne) return countEl.dataset.tmplOne;
      if (countEl.dataset.tmplOther) return countEl.dataset.tmplOther.replace(/^\d+/, String(count));
      return count + (count === 1 ? ' bag' : ' bags');
    }

    function render(cart) {
      if (!cart) return;
      const empty = cart.item_count === 0;
      if (itemsEl) { itemsEl.hidden = empty; itemsEl.innerHTML = empty ? '' : cart.items.map(rowHtml).join(''); }
      if (summaryEl) summaryEl.hidden = empty;
      if (emptyEl) emptyEl.hidden = !empty;
      if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
      if (countEl) countEl.textContent = bagsLabel(cart.item_count);
      document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = cart.item_count; });
      document.dispatchEvent(new CustomEvent('offline:cart-updated', { detail: cart }));
    }

    function refresh() {
      return fetch('/cart.js', { headers: { Accept: 'application/json' } })
        .then((res) => res.json())
        .then(render)
        .catch(() => {});
    }

    function open() {
      const mobileMenuEl = document.getElementById('mobileMenu');
      if (mobileMenuEl && mobileMenuEl.getAttribute('aria-hidden') === 'false') {
        mobileMenuEl.setAttribute('aria-hidden', 'true');
      }
      const quickViewEl = document.getElementById('quickView');
      if (quickViewEl && quickViewEl.getAttribute('aria-hidden') === 'false') {
        quickViewEl.setAttribute('aria-hidden', 'true');
      }
      const emailPopupEl = document.querySelector('.email-popup');
      if (emailPopupEl && emailPopupEl.getAttribute('aria-hidden') === 'false') {
        emailPopupEl.setAttribute('aria-hidden', 'true');
      }
      lastFocused = document.activeElement;
      root.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const closeBtn = root.querySelector('.cart-drawer-close');
      if (closeBtn) closeBtn.focus();
      refresh();
    }

    function close() {
      root.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    root.querySelectorAll('[data-cart-close]').forEach((el) => el.addEventListener('click', close));
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    function changeLine(key, quantity) {
      return fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity }),
      })
        .then((res) => res.json())
        .then(render)
        .catch(() => {});
    }

    if (itemsEl) {
      itemsEl.addEventListener('click', (e) => {
        const row = e.target.closest('[data-key]');
        if (!row) return;
        const key = row.dataset.key;
        const input = row.querySelector('input[type="number"]');
        if (e.target.closest('[data-qty-minus]')) {
          changeLine(key, Math.max(0, Number(input.value || 1) - 1));
        } else if (e.target.closest('[data-qty-plus]')) {
          changeLine(key, Number(input.value || 0) + 1);
        } else if (e.target.closest('[data-cart-drawer-remove]')) {
          changeLine(key, 0);
        }
      });
      itemsEl.addEventListener('change', (e) => {
        const input = e.target.closest('input[type="number"]');
        const row = input && input.closest('[data-key]');
        if (!row) return;
        changeLine(row.dataset.key, Math.max(0, Number(input.value || 0)));
      });
    }

    return { open, close, refresh };
  })();

  function cartOpeners() {
    document.querySelectorAll('[data-cart-open]').forEach((el) => {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        cartDrawer.open();
      });
    });
  }

  function quickAdd() {
    document.querySelectorAll('[data-quick-add]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      const labelEl = btn.querySelector('[data-quick-add-label]');
      const defaultLabel = labelEl ? labelEl.textContent : '';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.variantId;
        if (!variantId || btn.dataset.busy === '1') return;
        btn.dataset.busy = '1';
        btn.setAttribute('aria-disabled', 'true');
        if (labelEl) labelEl.textContent = btn.dataset.labelAdding || defaultLabel;
        const scope = btn.closest('.quick-view-content') || btn.parentElement;
        const qtyInput = scope ? scope.querySelector('[data-qty] input[type="number"]') : null;
        const quantity = qtyInput ? Math.max(1, Number(qtyInput.value || 1)) : 1;
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: quantity }),
        })
          .then((res) => {
            if (!res.ok) return res.json().then((err) => Promise.reject(err));
            return res.json();
          })
          .then(() => {
            if (labelEl) labelEl.textContent = btn.dataset.labelAdded || defaultLabel;
            if (btn.hasAttribute('data-quick-add-no-drawer')) {
              cartDrawer.refresh();
            } else {
              cartDrawer.open();
            }
            setTimeout(() => {
              if (labelEl) labelEl.textContent = defaultLabel;
              btn.dataset.busy = '0';
              btn.removeAttribute('aria-disabled');
            }, 1200);
          })
          .catch(() => {
            if (labelEl) labelEl.textContent = defaultLabel;
            btn.dataset.busy = '0';
            btn.removeAttribute('aria-disabled');
          });
      });
    });
  }

  /* ----- Quick view modal ----- */
  function quickView() {
    const modal = document.getElementById('quickView');
    if (!modal) return;
    const contentEl = modal.querySelector('[data-qv-content]');
    let currentVariantId = null;
    let lastFocused = null;

    function updateInCartLabel(cart) {
      if (!currentVariantId || !contentEl) return;
      const wrap = contentEl.querySelector('[data-qv-in-cart-wrap]');
      const label = contentEl.querySelector('[data-qv-in-cart]');
      if (!wrap || !label) return;
      const items = (cart && cart.items) || [];
      const line = items.find((item) => String(item.variant_id) === String(currentVariantId));
      if (line) {
        const tmpl = label.dataset.tmpl || '__COUNT__ already in your cart';
        label.textContent = tmpl.replace('__COUNT__', line.quantity);
        wrap.classList.add('is-visible');
      } else {
        wrap.classList.remove('is-visible');
      }
    }

    function open(id) {
      const tmpl = document.querySelector('[data-quick-view-template="' + id + '"]');
      if (!tmpl || !contentEl) return;
      contentEl.innerHTML = '';
      contentEl.appendChild(tmpl.content.cloneNode(true));
      const addBtn = contentEl.querySelector('[data-quick-add]');
      currentVariantId = addBtn ? addBtn.dataset.variantId : null;
      qtyStepper();
      quickAdd();
      cartOpeners();
      lastFocused = document.activeElement;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const closeBtn = modal.querySelector('.quick-view-close');
      if (closeBtn) closeBtn.focus();
      fetch('/cart.js', { headers: { Accept: 'application/json' } })
        .then((res) => res.json())
        .then(updateInCartLabel)
        .catch(() => {});
    }

    function close() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    modal.querySelectorAll('[data-qv-close]').forEach((el) => el.addEventListener('click', close));
    modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    document.addEventListener('offline:cart-updated', (e) => {
      if (modal.getAttribute('aria-hidden') === 'false') updateInCartLabel(e.detail);
    });

    document.querySelectorAll('[data-quick-view]').forEach((el) => {
      const trigger = (e) => {
        if (e.target.closest('[data-quick-add]')) return;
        const id = el.dataset.quickViewId;
        if (id) open(id);
      };
      el.addEventListener('click', trigger);
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('[data-quick-add]')) return;
        e.preventDefault();
        trigger(e);
      });
    });
  }

  /* ----- Email signup popup ----- */
  function emailPopup() {
    const modal = document.getElementById('emailPopup');
    if (!modal) return;
    const STORAGE_KEY = 'offline_email_popup';

    function getState() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
    }
    function setState(patch) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign(getState(), patch))); } catch (e) {}
    }
    function open() {
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const closeBtn = modal.querySelector('.email-popup-close');
      if (closeBtn) closeBtn.focus();
    }
    function close(dismissed) {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (dismissed) setState({ dismissedAt: Date.now() });
    }

    modal.querySelectorAll('[data-ep-close]').forEach((el) => el.addEventListener('click', () => close(true)));
    modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });

    if (modal.querySelector('[data-ep-posted]')) {
      setState({ subscribed: true });
      open();
      return;
    }

    const state = getState();
    if (state.subscribed) return;
    const cooldownDays = Number(modal.dataset.cooldownDays || 7);
    if (state.dismissedAt) {
      const elapsedDays = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
      if (elapsedDays < cooldownDays) return;
    }
    const delaySeconds = Number(modal.dataset.delay || 4);
    window.setTimeout(open, delaySeconds * 1000);
  }

  /* ----- Product form: AJAX add-to-cart (PDP) ----- */
  function productForm() {
    const form = document.querySelector('.product-form');
    if (!form) return;
    const addBtn = form.querySelector('[data-add-to-cart]');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (addBtn) addBtn.disabled = true;
      const formData = new FormData(form);
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      })
        .then((res) => {
          if (!res.ok) return res.json().then((err) => Promise.reject(err));
          cartDrawer.open();
        })
        .catch(() => {})
        .finally(() => { if (addBtn) addBtn.disabled = false; });
    });
  }

  function pdpCartButton() {
    const goToCart = document.querySelector('[data-pdp-go-to-cart]');
    const form = document.querySelector('.product-form');
    if (!goToCart || !form) return;

    function currentVariantId() {
      const select = form.querySelector('#ProductVariant');
      if (select) return select.value;
      const hiddenInput = form.querySelector('input[name="id"]');
      return hiddenInput ? hiddenInput.value : null;
    }

    function update(cart) {
      const variantId = currentVariantId();
      const items = (cart && cart.items) || [];
      const inCart = variantId && items.some((item) => String(item.variant_id) === String(variantId));
      goToCart.hidden = !inCart;
    }

    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then((res) => res.json())
      .then(update)
      .catch(() => {});
    document.addEventListener('offline:cart-updated', (e) => update(e.detail));
  }

  /* ----- Smooth accordion open/close ----- */
  function animatedAccordions() {
    // Each details tracks its own in-flight animation so rapid clicks
    // can't stack transitionend listeners or race each other.
    const state = new WeakMap();

    const clearAnim = (details, body) => {
      const s = state.get(details);
      if (s && s.onEnd) body.removeEventListener('transitionend', s.onEnd);
      body.style.height = '';
      body.style.overflow = '';
      body.style.transition = '';
      state.set(details, null);
    };

    const openDetails = (details, body) => {
      clearAnim(details, body);
      details.setAttribute('open', '');
      const target = body.scrollHeight;
      body.style.overflow = 'hidden';
      body.style.height = '0px';
      body.style.transition = 'height 260ms cubic-bezier(.2,.7,.2,1)';
      requestAnimationFrame(() => { body.style.height = target + 'px'; });
      const onEnd = (e) => { if (e.propertyName === 'height') clearAnim(details, body); };
      body.addEventListener('transitionend', onEnd);
      state.set(details, { onEnd });
    };

    const closeDetails = (details, body) => {
      clearAnim(details, body);
      const start = body.scrollHeight;
      body.style.overflow = 'hidden';
      body.style.height = start + 'px';
      body.style.transition = 'height 220ms cubic-bezier(.2,.7,.2,1)';
      requestAnimationFrame(() => { body.style.height = '0px'; });
      const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        details.removeAttribute('open');
        clearAnim(details, body);
      };
      body.addEventListener('transitionend', onEnd);
      state.set(details, { onEnd });
    };

    document.querySelectorAll('.accordion').forEach((accordion) => {
      const exclusive = accordion.hasAttribute('data-exclusive');
      accordion.querySelectorAll('details').forEach((details) => {
        const summary = details.querySelector('summary');
        const body = details.querySelector('.accordion-body');
        if (!summary || !body) return;

        summary.addEventListener('click', (e) => {
          e.preventDefault();
          if (details.hasAttribute('open')) {
            closeDetails(details, body);
            return;
          }
          if (exclusive) {
            accordion.querySelectorAll('details[open]').forEach((other) => {
              if (other === details) return;
              const otherBody = other.querySelector('.accordion-body');
              if (otherBody) closeDetails(other, otherBody);
            });
          }
          openDetails(details, body);
        });
      });
    });
  }

  /* ----- Live clock (hero stamp) ----- */
  function heroClock() {
    const els = document.querySelectorAll('[data-live-clock]');
    if (!els.length) return;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      const text = pad(d.getDate()) + ' ' + months[d.getMonth()] + ' · ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      els.forEach((el) => { el.textContent = text; });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ----- Random coordinate stamp (404, etc.) ----- */
  function randomCoord() {
    document.querySelectorAll('[data-random-coord]').forEach((el) => {
      const lat = Math.floor(Math.random() * 90);
      const latM = Math.floor(Math.random() * 60);
      const lng = Math.floor(Math.random() * 180);
      const lngM = Math.floor(Math.random() * 60);
      el.textContent =
        'N ' + String(lat).padStart(2, '0') + '°' + String(latM).padStart(2, '0') + "′ / W " +
        String(lng).padStart(2, '0') + '°' + String(lngM).padStart(2, '0') + '′';
    });
  }

  /* ----- Init ----- */
  function init() {
    header();
    mobileMenu();
    brewTimer();
    cursorCoord();
    goingOffline();
    qtyStepper();
    cartOpeners();
    quickAdd();
    quickView();
    emailPopup();
    productForm();
    pdpCartButton();
    animatedAccordions();
    randomCoord();
    heroClock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
