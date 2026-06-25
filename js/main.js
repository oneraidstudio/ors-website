/* ============================================================
   One Raid Studio — interactions & animations
   ============================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- intro: assemble from cubes, then reveal hero ---------- */
  (function intro() {
    var intro = document.getElementById('intro');
    if (!intro || reduceMotion) {
      document.body.classList.remove('intro-lock');
      document.body.classList.add('ready');
      return;
    }
    document.body.classList.add('intro-lock');
    window.setTimeout(function () {
      intro.classList.add('done');
      document.body.classList.remove('intro-lock');
      document.body.classList.add('ready');
    }, 1250);
    intro.addEventListener('transitionend', function () {
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    });
  })();

  /* ---------- cube particle network (hero canvas) ---------- */
  (function particles() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, particles = [], rafId = 0;
    var mouse = { x: -9999, y: -9999, active: false };

    function targetCount() {
      var a = Math.min(window.innerWidth, 1600) * Math.min(window.innerHeight, 1000);
      var c = Math.round(60 + (a / (1600 * 1000)) * 40);
      return Math.max(36, Math.min(100, window.innerWidth < 640 ? 46 : c));
    }
    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed(targetCount());
    }
    function seed(n) {
      particles = [];
      for (var i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          s: 2 + Math.random() * 3.5,
          rot: Math.random() * Math.PI, rs: (Math.random() - 0.5) * 0.003,
          depth: 0.4 + Math.random() * 0.6
        });
      }
    }
    function step() {
      ctx.clearRect(0, 0, W, H);
      var i, j, p, a, b, dx, dy, d2;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        p.x += p.vx; p.y += p.vy; p.rot += p.rs;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        if (mouse.active) {
          dx = mouse.x - p.x; dy = mouse.y - p.y; d2 = dx * dx + dy * dy;
          if (d2 < 180 * 180) {
            var d = Math.sqrt(d2) || 1;
            var force = (1 - d / 180) * 0.06;
            p.vx += (dx / d) * force; p.vy += (dy / d) * force;
          }
        }
        p.vx *= 0.985; p.vy *= 0.985;
        if (Math.abs(p.vx) < 0.04) p.vx += (Math.random() - 0.5) * 0.01;
        if (Math.abs(p.vy) < 0.04) p.vy += (Math.random() - 0.5) * 0.01;
      }
      var MAX = 130, MAX2 = MAX * MAX;
      for (i = 0; i < particles.length; i++) {
        a = particles[i];
        for (j = i + 1; j < particles.length; j++) {
          b = particles[j];
          dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
          if (d2 < MAX2) {
            var dd = Math.sqrt(d2);
            var alpha = (1 - dd / MAX) * 0.22;
            var red = 0;
            if (mouse.active) {
              var mx = (a.x + b.x) * 0.5 - mouse.x, my = (a.y + b.y) * 0.5 - mouse.y;
              var md2 = mx * mx + my * my;
              if (md2 < 160 * 160) red = 1 - Math.sqrt(md2) / 160;
            }
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.lineWidth = 0.7;
            ctx.strokeStyle = red > 0
              ? 'rgba(255, 42, 61, ' + (alpha + red * 0.45) + ')'
              : 'rgba(255, 255, 255, ' + alpha + ')';
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        var near = mouse.active ? Math.hypot(p.x - mouse.x, p.y - mouse.y) : 9999;
        var hot = near < 140 ? (1 - near / 140) : 0;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        var s = p.s, baseAlpha = 0.35 + 0.4 * p.depth;
        if (hot > 0.05) {
          var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 6);
          grd.addColorStop(0, 'rgba(255, 42, 61, ' + (0.35 * hot) + ')');
          grd.addColorStop(1, 'rgba(255, 42, 61, 0)');
          ctx.fillStyle = grd;
          ctx.fillRect(-s * 6, -s * 6, s * 12, s * 12);
        }
        ctx.fillStyle = hot > 0.4 ? 'rgba(255, 42, 61, ' + (0.85 * hot + 0.15) + ')'
                                  : 'rgba(220, 220, 230, ' + baseAlpha + ')';
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.fillStyle = 'rgba(255,255,255, ' + (0.15 + 0.2 * p.depth) + ')';
        ctx.fillRect(-s, -s, s * 2, 1);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
      rafId = requestAnimationFrame(step);
    }
    function onPointer(e) {
      var rect = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      mouse.x = t.clientX - rect.left; mouse.y = t.clientY - rect.top;
      mouse.active = true;
    }
    function onLeave() { mouse.active = false; mouse.x = -9999; mouse.y = -9999; }

    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafId); resize(); rafId = requestAnimationFrame(step);
    });
    canvas.addEventListener('mousemove', onPointer);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove', onPointer, { passive: true });
    canvas.addEventListener('touchend', onLeave);
    resize();
    rafId = requestAnimationFrame(step);
  })();

  /* ---------- nav scroll state + mobile menu ---------- */
  (function nav() {
    var navWrap = document.getElementById('navWrap');
    function onScroll() {
      if (window.scrollY > 12) navWrap.classList.add('is-scrolled');
      else navWrap.classList.remove('is-scrolled');
    }
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  })();

  /* ---------- scroll progress bar ---------- */
  (function progress() {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    }
    document.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---------- generic reveal-on-scroll ---------- */
  (function reveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- word-by-word heading reveal ---------- */
  (function words() {
    var heads = document.querySelectorAll('.reveal-words');
    heads.forEach(function (h) {
      if (h.dataset.split === '1') return;
      h.dataset.split = '1';
      var parts = h.textContent.trim().split(/\s+/);
      h.textContent = '';
      parts.forEach(function (w, i) {
        var span = document.createElement('span');
        span.className = 'word';
        span.style.setProperty('--i', i);
        span.textContent = w;
        h.appendChild(span);
        if (i < parts.length - 1) h.appendChild(document.createTextNode(' '));
      });
    });
    if (reduceMotion || !('IntersectionObserver' in window)) {
      heads.forEach(function (h) { h.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    heads.forEach(function (h) { io.observe(h); });
  })();

  /* ---------- subtle parallax on decorative elements ---------- */
  (function parallax() {
    if (reduceMotion) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;
    var ticking = false;
    function apply() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var offset = (center - vh / 2) * speed;
        el.style.transform = 'translate3d(0,' + (-offset).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', apply);
    apply();
  })();

  /* ---------- magnetic cursor pull on buttons ---------- */
  (function magnetic() {
    if (reduceMotion) return;
    if (window.matchMedia('(hover: none)').matches) return; // skip touch
    var els = document.querySelectorAll('.magnetic');
    els.forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.35;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (mx * strength).toFixed(2) + 'px,' + (my * strength).toFixed(2) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  })();
})();
