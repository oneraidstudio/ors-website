/* ===========================================================================
   ONE RAID STUDIO — main.js
   Shared behaviour: motion modes, sticky header, reveal, drawer, copy-email.
   No dependencies. Runs at the end of <body>.
   =========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var root = document.documentElement;

  /* ------------------------------------------------------- boot screen
     Held for a short minimum so it can't flash on a warm cache, then
     dismissed once the page and the web fonts are in. Hard-capped at 4s
     so a stalled asset never keeps it up; base.css also carries an 8s
     CSS failsafe for the case where this script never runs at all.     */
  (function () {
    var boot = document.querySelector('.boot');
    if (!boot) return;
    var fill = boot.querySelector('.boot__bar i');
    var label = boot.querySelector('.boot__label');
    var MIN = 200, MAX = 10000, opened = Date.now(), settled = false;

    // Count what the browser is actually fetching for first paint: the eager
    // images, the web fonts, and the load event itself. Lazy images are left
    // out on purpose — they don't fetch until you scroll, so waiting on them
    // would stall the bar forever.
    var imgs = Array.prototype.filter.call(document.images, function (img) {
      return img.getAttribute('loading') !== 'lazy';
    });
    var sheets = document.styleSheets.length;   // render-blocking: already in
    var total = imgs.length + sheets + 2;       // + web fonts + the load event
    var loaded = sheets;

    function paint() {
      var pct = Math.min(100, Math.round(loaded / total * 100));
      if (fill) fill.style.width = pct + '%';
      if (label) label.textContent = 'Loading ' + pct + '%';
    }

    function dismiss() {
      if (settled) return;
      settled = true;
      loaded = total; paint();
      setTimeout(function () {
        boot.classList.add('is-done');
        setTimeout(function () {
          if (boot.parentNode) boot.parentNode.removeChild(boot);
        }, 700);
      }, Math.max(0, MIN - (Date.now() - opened)));
    }

    function step() {
      loaded++;
      paint();
      if (loaded >= total) dismiss();
    }

    paint();
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.complete) { step(); return; }
        var fired = false;
        var once = function () { if (fired) return; fired = true; step(); };
        img.addEventListener('load', once);
        img.addEventListener('error', once);
      })(imgs[i]);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(step);
    else step();
    if (document.readyState === 'complete') step();
    else window.addEventListener('load', step);

    setTimeout(dismiss, MAX);   // hard ceiling if an asset never resolves
  })();

  /* ------------------------------------------------------ motion modes
     max    — everything, including ambient loops
     subtle — no ambient loops; hover + reveal transitions stay
     zero   — nothing moves                                              */
  var io = null;

  function motion() {
    return body.getAttribute('data-motion') || 'max';
  }

  function armReveal() {
    if (io) { io.disconnect(); io = null; }

    var els = document.querySelectorAll('.reveal');
    var i;

    if (motion() === 'zero' || !('IntersectionObserver' in window)) {
      for (i = 0; i < els.length; i++) els[i].classList.add('is-in');
      return;
    }

    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    // Only arm what is still below the fold; anything already on screen
    // stays visible so a slow observer can never hide first paint.
    var fold = window.innerHeight * 0.9;
    for (i = 0; i < els.length; i++) {
      if (els[i].getBoundingClientRect().top > fold) {
        els[i].classList.add('is-armed');
        io.observe(els[i]);
      } else {
        els[i].classList.add('is-in');
      }
    }
  }

  function setMotion(mode, persist) {
    body.setAttribute('data-motion', mode);
    // Kill any easing pass before the scroll-behavior below changes under it.
    stopSmooth();
    // 'auto' when the JS easing engine drives anchors, native smooth otherwise.
    root.style.scrollBehavior =
      (mode === 'max' && finePointer && !prefersReduced) ? 'auto'
      : mode === 'zero' ? 'auto' : 'smooth';

    if (persist) {
      try { localStorage.setItem('ors-motion', mode); } catch (e) {}
    }

    var btns = document.querySelectorAll('[data-motion-btn]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-motion-btn') === mode;
      btns[i].classList.toggle('is-on', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    if (mode !== 'max' && cube) cube.style.transform = '';
    armReveal();
  }

  var cube = document.querySelector('[data-parallax]');
  var saved = null;
  try { saved = localStorage.getItem('ors-motion'); } catch (e) {}
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches;

  setMotion(saved || (prefersReduced ? 'zero' : 'max'), false);

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-motion-btn]');
    if (btn) setMotion(btn.getAttribute('data-motion-btn'), true);
  });

  /* --------------------------------------------------- sticky header
     A sentinel + IntersectionObserver beats a scroll listener: no work
     happens on the main thread between the two state changes.          */
  var hdr = document.querySelector('.hdr');
  if (hdr) {
    if ('IntersectionObserver' in window) {
      var sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
      body.insertBefore(sentinel, body.firstChild);
      new IntersectionObserver(function (entries) {
        hdr.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      }).observe(sentinel);
    } else {
      window.addEventListener('scroll', function () {
        hdr.classList.toggle('is-scrolled', window.scrollY > 24);
      }, { passive: true });
    }
  }

  /* ------------------------------------------------------ hero parallax
     Pointer-driven, rAF-batched, and skipped entirely on touch devices
     where there is no cursor to follow.                                 */
  if (cube && finePointer) {
    var pending = false;
    var px = 0;
    var py = 0;

    window.addEventListener('mousemove', function (e) {
      if (motion() !== 'max') return;
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        cube.style.transform =
          'translate3d(' + (px * 20).toFixed(1) + 'px,' + (py * 14).toFixed(1) + 'px,0)' +
          ' rotateX(' + (-py * 5).toFixed(1) + 'deg) rotateY(' + (px * 7).toFixed(1) + 'deg)';
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------ drawer */
  var drawer = document.querySelector('.drawer');
  var burger = document.querySelector('.burger');
  var shell = [
    document.querySelector('.hdr'),
    document.querySelector('#main'),
    document.querySelector('.footer')
  ];
  var lastFocus = null;

  function focusable() {
    if (!drawer) return [];
    return Array.prototype.filter.call(
      drawer.querySelectorAll('a[href], button:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function setShellInert(on) {
    shell.forEach(function (el) {
      if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    body.classList.add('is-locked');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    setShellInert(true);
    // Land on the close button, not whatever happens to be first in the DOM.
    // The brand link now leads the drawer head, and a reflexive Enter on open
    // would navigate away instead of dismissing the menu.
    var items = focusable();
    var close = drawer.querySelector('[data-drawer-close]');
    if (close) close.focus();
    else if (items.length) items[0].focus();
  }

  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    body.classList.remove('is-locked');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    setShellInert(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    if (t.closest('.burger')) { openDrawer(); return; }
    if (t.closest('[data-drawer-close]') || t.closest('.drawer__link')) closeDrawer();
  });

  document.addEventListener('keydown', function (e) {
    if (!drawer || !drawer.classList.contains('is-open')) return;

    if (e.key === 'Escape') { closeDrawer(); return; }

    // Trap Tab inside the open drawer.
    if (e.key !== 'Tab') return;
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Close the drawer if the viewport grows past the breakpoint while open.
  if (window.matchMedia) {
    var wide = window.matchMedia('(min-width: 961px)');
    var onWide = function (e) { if (e.matches) closeDrawer(); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* --------------------------------------------------- smooth scrolling
     Eased wheel scrolling, only where it belongs: a real pointer, Max
     motion, and nothing modal open. Touch is never hijacked — the OS
     already does momentum there and overriding it feels wrong. When the
     engine is off, CSS scroll-behavior handles anchors natively.        */
  var sTarget = window.scrollY;
  var sRaf = null;
  var EASE_AMOUNT = 0.18;

  function smoothOn() {
    return motion() === 'max' && finePointer && !prefersReduced &&
           !body.classList.contains('is-locked');
  }
  function maxScroll() {
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }
  // (1) Always scroll instantly, whatever scroll-behavior says, so the lerp
  //     can never be re-smoothed by CSS underneath itself.
  function sJump(y) {
    try { window.scrollTo({ top: y, left: window.scrollX, behavior: 'instant' }); }
    catch (err) { window.scrollTo(0, y); }
  }
  // (2) Bail the moment the engine is switched off, and resync the target.
  function stopSmooth() {
    if (sRaf) cancelAnimationFrame(sRaf);
    sRaf = null;
    sTarget = window.scrollY;
  }
  function sStep() {
    if (!smoothOn()) { stopSmooth(); return; }
    var cur = window.scrollY;
    var delta = sTarget - cur;
    if (Math.abs(delta) < 0.5) { sJump(sTarget); sRaf = null; return; }
    sJump(cur + delta * EASE_AMOUNT);
    sRaf = requestAnimationFrame(sStep);
  }
  function scrollToY(y) {
    sTarget = Math.max(0, Math.min(y, maxScroll()));
    if (!sRaf) sRaf = requestAnimationFrame(sStep);
  }

  window.addEventListener('wheel', function (e) {
    if (!smoothOn() || e.ctrlKey) return;
    // Let modals and any other scroll container handle their own wheel.
    if (e.target.closest && e.target.closest('.drawer, .lightbox')) return;
    e.preventDefault();
    var step = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    scrollToY(sTarget + step);
  }, { passive: false });

  // Keep the target honest when something else scrolls: keyboard, scrollbar
  // drag, browser restore.
  window.addEventListener('scroll', function () {
    if (!sRaf) sTarget = window.scrollY;
  }, { passive: true });

  // Anchors go through the same engine so there is only ever one scroller.
  document.addEventListener('click', function (e) {
    if (!smoothOn()) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-pending')) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    scrollToY(el.getBoundingClientRect().top + window.scrollY - offset);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    // Move focus so keyboard and screen-reader users land where the page did.
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------- marquee
     The strip has to be at least twice the viewport wide or the -50%
     translate lands on empty space and snaps — which is what the reset
     was. Clone the sequence until it covers any screen, then derive the
     duration from the measured width so the speed is identical whether
     you're on a phone or an ultrawide.                                  */
  var track = document.querySelector('[data-marquee]');
  if (track && track.firstElementChild) {
    var seq = track.firstElementChild;
    var SEC_PER_SEQ = 18; // one sequence-width of travel per 18s of runtime

    var fitMarquee = function () {
      // Natural text width is fractional. Left alone, every copy lands on a
      // sub-pixel boundary and the -50% wrap resamples slightly differently
      // from the start frame — a faint shimmer at the loop point. Pinning the
      // sequence to a whole pixel makes the wrap frame bit-identical.
      seq.style.width = '';
      var w = Math.ceil(seq.getBoundingClientRect().width);
      if (!w) return;
      seq.style.width = w + 'px';

      // -50% travels half the track, so the copy count must be even.
      var need = Math.ceil((window.innerWidth * 2) / w);
      if (need % 2) need++;
      if (need < 2) need = 2;

      while (track.children.length > 1) track.removeChild(track.lastElementChild);
      for (var n = 1; n < need; n++) track.appendChild(seq.cloneNode(true));
      track.style.animationDuration = (SEC_PER_SEQ * need) + 's';
    };

    fitMarquee();
    // Web fonts change the measured width, so re-fit once they land.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMarquee);
    var mqT;
    window.addEventListener('resize', function () {
      clearTimeout(mqT);
      mqT = setTimeout(fitMarquee, 200);
    }, { passive: true });
  }

  /* Shared with portfolio.js so the lightbox locks the page the same way
     the drawer does, instead of reimplementing it. */
  window.ORS = window.ORS || {};
  window.ORS.lockShell = function (on) {
    setShellInert(on);
    body.classList.toggle('is-locked', on);
  };

  /* ------------------------------------------------ process rail (touch)
     On pointer devices the rail under the process cards fills on hover, in
     CSS. Touch screens have no hover, so each checkpoint lights as its card
     scrolls into view instead. The class is always added — services.css only
     honours it inside @media (hover:none), so the two behaviours can't both
     be live, and a rotation or resize re-decides without any JS involved. */
  var procItems = document.querySelectorAll('.proc__item');
  if (procItems.length && 'IntersectionObserver' in window) {
    var procObs = new IntersectionObserver(function (entries) {
      for (var pe = 0; pe < entries.length; pe++) {
        if (!entries[pe].isIntersecting) continue;
        entries[pe].target.classList.add('is-reached');
        procObs.unobserve(entries[pe].target);
      }
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0.35 });
    for (var pi = 0; pi < procItems.length; pi++) procObs.observe(procItems[pi]);
  }

  /* ------------------------------------------------------------- year
     Footer copyright. Marked up as <span data-year>2026</span> so the page
     still shows a sensible year with JS off. */
  var years = document.querySelectorAll('[data-year]');
  for (var yi = 0; yi < years.length; yi++) {
    years[yi].textContent = new Date().getFullYear();
  }

  /* -------------------------------------------------------- copy email */
  var copyBtn = document.querySelector('[data-copy-email]');
  var status = document.querySelector('[data-copy-status]');

  function announce(msg) {
    if (!status) return;
    status.textContent = msg;
    clearTimeout(announce._t);
    announce._t = setTimeout(function () { status.textContent = ''; }, 2600);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-copy-email');
      var done = function () { announce('Copied ' + email); };
      var failed = function () { announce('Copy failed — the address is ' + email); };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, failed);
        return;
      }
      // Fallback for non-secure contexts, where the Clipboard API is absent.
      try {
        var ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy') ? done() : failed();
        document.body.removeChild(ta);
      } catch (err) {
        failed();
      }
    });
  }
})();
