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
    if (!el) return;
    function setH() {
      document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
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

  /* ----- Print trigger (Brew page quick card) ----- */
  function printTrigger() {
    document.querySelectorAll('[data-print-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => window.print());
    });
  }

  /* ----- Product form: AJAX add-to-cart ----- */
  function updateCartCount() {
    return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then((res) => res.json())
      .then((cart) => {
        document.querySelectorAll('[data-cart-count]').forEach((el) => {
          el.textContent = cart.item_count;
        });
      })
      .catch(() => {});
  }

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
          return updateCartCount();
        })
        .catch(() => {})
        .finally(() => { if (addBtn) addBtn.disabled = false; });
    });
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
    productForm();
    animatedAccordions();
    printTrigger();
    randomCoord();
    heroClock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
