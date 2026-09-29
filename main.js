(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Preloader ---------- */
  const loader = $('#loader');
  const countEl = $('#count');
  const bar = $('#bar');
  document.body.classList.add('is-loading');

  const start = () => {
    document.body.classList.remove('is-loading');
    loader.classList.add('is-done');
    setTimeout(() => {
      $$('.hero .line__in, .hero .reveal').forEach(el => el.classList.add('is-in'));
      observe();
    }, 500);
  };

  if (reduce) {
    document.body.classList.remove('is-loading');
    observe();
  } else {
    let n = 0;
    const t0 = performance.now();
    const tick = now => {
      n = Math.min(100, Math.round(((now - t0) / 1400) * 100));
      countEl.textContent = String(n).padStart(3, '0');
      bar.style.width = n + '%';
      n < 100 ? requestAnimationFrame(tick) : setTimeout(start, 200);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Scroll reveals ---------- */
  function observe() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    $$('.reveal, .section-head h2, .contact__mail .line__in').forEach(el => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
    // headings are block-level h2s; give them a line-style reveal
    $$('.section-head h2').forEach(h => h.classList.add('reveal'));
  }

  /* ---------- Column grid lights up under cursor ---------- */
  const cols = $$('.grid i');
  const tag = $('#tag');
  let mx = 0, my = 0, tx = 0, ty = 0;

  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    const i = Math.min(cols.length - 1, Math.floor((mx / innerWidth) * cols.length));
    cols.forEach((c, k) => c.classList.toggle('is-lit', k === i));
  }, { passive: true });
  document.addEventListener('pointerleave', () => cols.forEach(c => c.classList.remove('is-lit')));

  /* ---------- Cursor tag ---------- */
  const follow = () => {
    tx += (mx - tx) * 0.18;
    ty += (my - ty) * 0.18;
    tag.style.transform = `translate(${tx + 18}px, ${ty + 18}px)`;
    requestAnimationFrame(follow);
  };
  if (!reduce) follow();

  $$('[data-tag]').forEach(el => {
    el.addEventListener('pointerenter', () => { tag.textContent = el.dataset.tag; tag.classList.add('is-on'); });
    el.addEventListener('pointerleave', () => tag.classList.remove('is-on'));
  });

  /* ---------- Variable-font name: cursor x drives width + weight ---------- */
  const varyEls = $$('.hero__name .line__in, .contact__mail .line__in');
  if (!reduce) {
    addEventListener('pointermove', e => {
      const k = e.clientX / innerWidth;             // 0..1 across the screen
      const w = 75 + k * 25;                        // wdth 75..100
      const wt = 300 + (1 - Math.abs(k - 0.5) * 2) * 500; // heaviest in the middle
      varyEls.forEach(el => {
        el.style.setProperty('--w', w.toFixed(1));
        el.style.setProperty('--wt', Math.round(wt));
      });
    }, { passive: true });
  }
})();
