/* ===========================================================================
   ONE RAID STUDIO — portfolio.js
   Gallery filters, variable-size card grid, and the lightbox.
   =========================================================================== */
(function () {
  'use strict';

  var gallery = document.querySelector('.gallery');
  if (!gallery) return;

  /* ------------------------------------------------------ card sizing
     data-span="2x1" spans two columns. For that to mean anything the row
     height has to equal the column width, which CSS can't work out on its
     own here — percentages in grid-auto-rows resolve against height, not
     width. So read the resolved column track and feed it back as --row.  */
  function sizeRows() {
    var track = getComputedStyle(gallery).gridTemplateColumns.split(' ')[0];
    var col = parseFloat(track);
    if (!col) return;
    var next = Math.round(col) + 'px';
    if (gallery.style.getPropertyValue('--row') !== next) {
      gallery.style.setProperty('--row', next);
    }
  }
  sizeRows();
  if ('ResizeObserver' in window) new ResizeObserver(sizeRows).observe(gallery);
  else window.addEventListener('resize', sizeRows, { passive: true });

  /* --------------------------------------------------------- filters */
  var btns = document.querySelectorAll('.filter');
  var count = document.querySelector('[data-filter-count]');
  var empty = document.querySelector('.gallery__empty');

  /* Labels are read off the buttons themselves rather than kept in a list
     here, so a category can never be half-registered. To add one: drop in a
     <button class="filter" data-filter="key">Label</button> and tag tiles
     with data-cat="key". Nothing in this file or the CSS needs touching. */
  var LABELS = {};
  for (var b = 0; b < btns.length; b++) {
    LABELS[btns[b].getAttribute('data-filter')] =
      (btns[b].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function valid(key) {
    return Object.prototype.hasOwnProperty.call(LABELS, key) ? key : 'all';
  }

  function visibleShots() {
    return Array.prototype.filter.call(
      gallery.querySelectorAll('.shot'),
      function (s) { return !s.hasAttribute('data-hidden'); }
    );
  }

  function apply(filter, push) {
    filter = valid(filter);
    gallery.setAttribute('data-filter', filter);

    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-filter') === filter;
      btns[i].classList.toggle('is-on', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    // Non-matching tiles are marked here instead of by a per-category CSS
    // selector, which had to be extended by hand for every new filter.
    var shots = gallery.querySelectorAll('.shot');
    for (var s = 0; s < shots.length; s++) {
      if (filter === 'all' || shots[s].getAttribute('data-cat') === filter) {
        shots[s].removeAttribute('data-hidden');
      } else {
        shots[s].setAttribute('data-hidden', '');
      }
    }

    var shown = visibleShots().length;
    if (count) count.textContent = shown + (shown === 1 ? ' piece' : ' pieces') + ' — ' + LABELS[filter];
    if (empty) empty.hidden = shown > 0;

    if (push && window.history && history.replaceState) {
      history.replaceState({ filter: filter }, '',
        filter === 'all' ? location.pathname : location.pathname + '?filter=' + filter);
    }
  }

  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      apply(this.getAttribute('data-filter'), true);
    });
  }
  window.addEventListener('popstate', function () {
    apply(new URLSearchParams(location.search).get('filter') || 'all', false);
  });
  apply(new URLSearchParams(location.search).get('filter') || 'all', false);

  /* -------------------------------------------------------- lightbox */
  var box = document.querySelector('.lightbox');
  if (!box) return;

  var lbImg = box.querySelector('[data-lb-img]');
  var lbMedia = box.querySelector('.lightbox__media');
  var lbTitle = box.querySelector('[data-lb-title]');
  var lbDesc = box.querySelector('[data-lb-desc]');
  var lbCat = box.querySelector('[data-lb-cat]');
  var lbCounter = box.querySelector('[data-lb-counter]');
  var lbClose = box.querySelector('.lightbox__close');
  var lbPrev = box.querySelector('.lightbox__nav--prev');
  var lbNext = box.querySelector('.lightbox__nav--next');

  var list = [];
  var index = 0;
  var lastFocus = null;

  // Same placeholder behaviour as the tiles: a missing file shows a labelled
  // frame rather than a broken image.
  lbImg.addEventListener('error', function () {
    lbMedia.setAttribute('data-empty', '');
    lbImg.style.display = 'none';
  });

  function lock(on) {
    if (window.ORS && window.ORS.lockShell) window.ORS.lockShell(on);
    else document.body.classList.toggle('is-locked', on);
  }

  function show(i) {
    if (!list.length) return;
    index = (i + list.length) % list.length;
    var shot = list[index];
    var btn = shot.querySelector('.shot__btn');
    var img = btn.querySelector('img');

    // Reset the placeholder state so a previously-missing image doesn't
    // leave its label behind on the next one.
    lbMedia.removeAttribute('data-empty');
    lbMedia.setAttribute('data-label', (btn.getAttribute('data-title') || '') + ' — image not added yet');
    lbImg.style.display = '';
    lbImg.src = img ? img.getAttribute('src') : '';
    lbImg.alt = img ? (img.getAttribute('alt') || '') : '';

    lbTitle.textContent = btn.getAttribute('data-title') || '';
    // The description lives in a visually-hidden <p> inside the figure rather
    // than a data-desc attribute — attribute text is invisible to crawlers and
    // to screen readers, so the copy is in the DOM and read from there.
    var descEl = shot.querySelector('.shot__desc');
    lbDesc.textContent = descEl ? descEl.textContent.trim() : '';
    lbCat.textContent = LABELS[shot.getAttribute('data-cat')] || '';
    lbCounter.textContent = (index + 1) + ' / ' + list.length;
  }

  function open(shot) {
    list = visibleShots();
    var start = list.indexOf(shot);
    if (start < 0) { list = [shot]; start = 0; }
    lastFocus = document.activeElement;
    box.classList.add('is-open');
    lock(true);
    show(start);
    lbClose.focus();
  }

  function close() {
    if (!box.classList.contains('is-open')) return;
    box.classList.remove('is-open');
    lock(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  gallery.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.shot__btn');
    if (btn) open(btn.closest('.shot'));
  });

  box.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    if (t.closest('[data-lb-close]')) { close(); return; }
    if (t.closest('.lightbox__nav--prev')) { show(index - 1); return; }
    if (t.closest('.lightbox__nav--next')) { show(index + 1); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); return; }
    if (e.key !== 'Tab') return;

    var items = Array.prototype.filter.call(
      box.querySelectorAll('button, a[href]'),
      function (el) { return el.offsetParent !== null; }
    );
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
