(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const narrow = matchMedia('(max-width: 860px)');
  $('#year').textContent = new Date().getFullYear();

  // ---- links that open a new tab say so to screen readers ----
  $$('a[target="_blank"]').forEach((a) => {
    const note = ' (opens in a new tab)';
    if (a.hasAttribute('aria-label')) a.setAttribute('aria-label', a.getAttribute('aria-label') + note);
    else a.insertAdjacentHTML('beforeend', `<span class="sr-only">${note}</span>`);
  });

  // ---- pause every looping animation (WCAG 2.2.2), remembered on this device ----
  const motionBtn = $('#motionToggle');
  function setPaused(on) {
    body.classList.toggle('paused', on);
    motionBtn.dataset.paused = on;
    try { localStorage.setItem('motionPaused', on ? '1' : ''); } catch {}
  }
  motionBtn.addEventListener('click', () => setPaused(!body.classList.contains('paused')));
  try { if (localStorage.getItem('motionPaused')) setPaused(true); } catch {}

  // ---- reveal on scroll, staggered within each parent ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 0.08}s`);
    io.observe(el);
  });

  // ---- page tone follows the section in the middle of the screen ----
  const toned = $$('[data-bg]');
  const navLinks = $$('[data-nav]');
  const navFor = { work: 'work', chess: 'work', touchline: 'work', heldtime: 'work', about: 'about', build: 'build', accessibility: 'accessibility', contact: 'contact' };
  function sectionAtMiddle() {
    const mid = innerHeight / 2;
    return toned.find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  }

  // ---- nav: hide on the way down, show on the way up, progress line ----
  const nav = $('#nav'), progress = $('#progress');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 40);
    if (!body.classList.contains('menu-open')) {
      nav.classList.toggle('hidden', y > lastY && y > 300);
      // a nav holding keyboard focus stays on screen (see .nav.hidden:not(:focus-within))
      body.classList.toggle('nav-hidden', nav.classList.contains('hidden') && !nav.matches(':focus-within'));
    }
    lastY = y;
    document.documentElement.style.setProperty('--sy', Math.min(y, 1200));

    const sec = sectionAtMiddle();
    if (sec) {
      const tone = sec.dataset.bg === 'ink' ? '' : sec.dataset.bg;
      if ((body.dataset.tone || '') !== tone) tone ? (body.dataset.tone = tone) : delete body.dataset.tone;
      const key = navFor[sec.id];
      navLinks.forEach((a) => {
        const on = a.dataset.nav === key;
        a.classList.toggle('active', on);
        on ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
      });
    }
    horizontal();
    phoneParallax();
  }

  // ---- mobile menu ----
  // while it's open, the page behind is inert so focus stays in the menu (and the burger to close it)
  const burger = $('#burger'), sheet = $('#sheet');
  const behind = [$('main'), $('footer'), $('.skip'), $('.nav-mark')];
  function setMenu(open, returnFocus = true) {
    if (open === body.classList.contains('menu-open')) return;
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    sheet.setAttribute('aria-hidden', !open);
    behind.forEach((el) => { el.inert = open; });
    if (open) setTimeout(() => $('a', sheet).focus(), 50);
    else if (returnFocus) burger.focus();
  }
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('a', sheet).forEach((a) => a.addEventListener('click', () => setMenu(false, false)));
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setMenu(false);
    preview?.classList.remove('on');
  });
  narrow.addEventListener('change', () => { if (!narrow.matches) setMenu(false, false); });

  // ---- work index: a preview that follows the cursor ----
  const preview = $('#hoverPreview');
  if (finePointer && preview) {
    const img = $('img', preview);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16;
      preview.style.setProperty('--x', `${x}px`); preview.style.setProperty('--y', `${y}px`);
      raf = preview.classList.contains('on') || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    $$('.index-list a').forEach((a) => {
      a.addEventListener('mouseenter', () => { img.src = a.dataset.preview; preview.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); });
      a.addEventListener('mouseleave', () => preview.classList.remove('on'));
    });
    addEventListener('mousemove', (e) => { tx = e.clientX + 28; ty = e.clientY - 110; });
  }

  // ---- chess: theme switcher ----
  const chess = $('#chess'), grid = $('.scene-grid', chess);
  const themeNames = { wood: 'wood', neon: 'neon', minimal: 'minimal' };
  function setTheme(theme) {
    if (chess.dataset.theme === theme) return;
    $$('[data-theme-btn]', chess).forEach((b) => b.setAttribute('aria-pressed', b.dataset.themeBtn === theme));
    chess.dataset.theme = theme;
    grid.classList.add('swapping');
    setTimeout(() => {
      $$('.shot', grid).forEach((s) => {
        const im = $('img', s);
        im.src = `assets/shots/chess/${theme}-${s.dataset.scene}.webp`;
        im.alt = im.alt.replace(/(wood|neon|minimal) theme/, `${themeNames[theme]} theme`);
      });
      grid.classList.remove('swapping');
    }, 280);
  }
  $$('[data-theme-btn]', chess).forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeBtn)));
  // warm the cache for the other themes once the page has settled
  addEventListener('load', () => setTimeout(() => {
    ['neon', 'minimal'].forEach((t) => ['game', 'starting', 'brb', 'ending'].forEach((s) => { new Image().src = `assets/shots/chess/${t}-${s}.webp`; }));
  }, 1500));

  // ---- touchline: vertical scroll drives a horizontal track ----
  const hs = $('#hs'), track = $('#hsTrack'), bar = $('#hsBar'), label = $('#hsLabel'), count = $('#hsCount');
  const slides = $$('.slide', track);
  let travel = 0;
  function sizeHorizontal() {
    if (narrow.matches) { hs.style.height = ''; travel = 0; stripScrolled(); return; }
    travel = Math.max(0, track.scrollWidth - innerWidth);
    hs.style.height = `${innerHeight + travel}px`;
  }
  function setMeter(p) {
    bar.style.transform = `scaleX(${p})`;
    const i = Math.min(slides.length - 1, Math.round(p * (slides.length - 1)));
    count.textContent = String(i + 1).padStart(2, '0');
  }

  // ---- touchline: style switcher, the same idea as the chess themes ----
  const touchline = $('#touchline');
  const presetNames = { broadcast: 'Broadcast', aurora: 'Aurora', bold: 'Bold' };
  function setPreset(preset) {
    if (touchline.dataset.preset === preset) return;
    $$('[data-preset-btn]', touchline).forEach((b) => b.setAttribute('aria-pressed', b.dataset.presetBtn === preset));
    touchline.dataset.preset = preset;
    label.textContent = presetNames[preset];
    track.classList.add('swapping');
    setTimeout(() => {
      slides.forEach((s) => {
        const im = $('img', s);
        im.src = `assets/shots/stream/${preset}-${s.dataset.mode}.webp`;
        im.alt = im.alt.replace(/(Broadcast|Aurora|Bold) preset/, `${presetNames[preset]} preset`);
        $('figcaption b', s).textContent = presetNames[preset];
      });
      track.classList.remove('swapping');
    }, 280);
  }
  $$('[data-preset-btn]', touchline).forEach((b) => b.addEventListener('click', () => setPreset(b.dataset.presetBtn)));
  addEventListener('load', () => setTimeout(() => {
    ['aurora', 'bold'].forEach((p) => slides.forEach((s) => { new Image().src = `assets/shots/stream/${p}-${s.dataset.mode}.webp`; }));
  }, 2000));
  function horizontal() {
    if (narrow.matches || !travel) return;
    const r = hs.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / travel));
    track.style.transform = `translate3d(${-p * travel}px,0,0)`;
    setMeter(p);
  }
  // keyboard focus on a slide the track hasn't reached yet: scroll the page to that slide
  track.addEventListener('focusin', (e) => {
    if (narrow.matches || !travel) return;
    const i = slides.indexOf(e.target.closest('.slide'));
    if (i < 0) return;
    const top = hs.getBoundingClientRect().top + scrollY;
    const p = Math.min(1, (slides[i].offsetLeft - slides[0].offsetLeft) / travel);
    scrollTo({ top: top + p * travel, behavior: 'instant' });
  });

  // narrow screens: the strip scrolls on its own (swipe, arrows, or drag with a mouse)
  const arrows = $$('[data-hs]');
  function stripScrolled() {
    const max = track.scrollWidth - track.clientWidth;
    setMeter(max > 0 ? track.scrollLeft / max : 0);
    arrows[0].disabled = track.scrollLeft <= 2;
    arrows[1].disabled = track.scrollLeft >= max - 2;
  }
  track.addEventListener('scroll', () => { if (narrow.matches) stripScrolled(); }, { passive: true });
  arrows.forEach((b) => b.addEventListener('click', () => {
    const step = slides[1].offsetLeft - slides[0].offsetLeft;
    track.scrollBy({ left: step * +b.dataset.hs, behavior: 'smooth' });
  }));
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (!narrow.matches || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; track.classList.add('dragging'); }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return;
    track.classList.remove('dragging');
    track.dataset.justDragged = '1';
    setTimeout(() => delete track.dataset.justDragged, 0);
    // settle on the nearest slide once snapping is back on
    const step = slides[1].offsetLeft - slides[0].offsetLeft;
    track.scrollTo({ left: Math.round(track.scrollLeft / step) * step, behavior: 'smooth' });
  });
  track.addEventListener('dragstart', (e) => e.preventDefault());
  // a drag that ends over a screenshot shouldn't open it
  track.addEventListener('click', (e) => {
    if (track.classList.contains('dragging') || track.dataset.justDragged) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // ---- held time: the phone drifts against the scroll ----
  const devices = $('.devices'), phone = $('.phone');
  function phoneParallax() {
    if (!devices) return;
    const r = devices.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    phone.style.setProperty('--py', (p * 60).toFixed(1));
  }

  // ---- services: glow follows the pointer ----
  $$('.card').forEach((c) => c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  // ---- lightbox ----
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let group = [], at = 0;
  function caption(btn) {
    const fig = btn.closest('figure');
    return fig ? $('figcaption', fig).textContent.replace(/\s+/g, ' ').trim() : '';
  }
  function show(i) {
    at = (i + group.length) % group.length;
    const im = $('img', group[at]);
    lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt;
    lbCap.textContent = `${caption(group[at])}  ·  ${at + 1} / ${group.length}`;
  }
  $$('.shot').forEach((btn) => btn.addEventListener('click', () => {
    group = $$(`.shot[data-group="${btn.dataset.group}"]`);
    show(group.indexOf(btn));
    lb.showModal();
  }));
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) lb.close();
    else if (act === 'prev') show(at - 1);
    else if (act === 'next') show(at + 1);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });

  // ---- wire up ----
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  const resize = () => { sizeHorizontal(); onScroll(); };
  addEventListener('resize', resize);
  addEventListener('load', resize);
  narrow.addEventListener('change', () => { track.style.transform = ''; resize(); });
  resize();
})();
