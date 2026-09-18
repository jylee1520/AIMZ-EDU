/* AIMZ LABS · AIMZ EDU brand sites — shared behaviour. Each block is guarded so a page only uses what it contains. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* header shadow + active section link */
  const hdr = $('.hdr');
  const navLinks = $$('.nav a[href^="#"]');
  const secs = navLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  function onScroll() {
    if (hdr) hdr.classList.toggle('scrolled', scrollY > 8);
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < 140) cur = s;
    navLinks.forEach(a => a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id));
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  const burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', () => burger.setAttribute('aria-expanded', nav.classList.toggle('open')));
    nav.addEventListener('click', e => {
      if (e.target.closest('a')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* tabs: .tab[data-panel] toggles the matching .tabpanel inside the same group */
  function activate(tab) {
    $$('.tab', tab.closest('.tabs')).forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      const p = document.getElementById(t.dataset.panel);
      if (p) p.classList.toggle('on', on);
    });
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => activate(t)));

  /* links such as #course-pro or #track-vfx open that tab, then scroll to its tab bar */
  function openPanel(id, smooth) {
    const tab = id && $(`.tab[data-panel="${CSS.escape(id)}"]`);
    if (!tab) return false;
    activate(tab);
    tab.closest('.tabs').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    return true;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (openPanel(id, true)) { e.preventDefault(); history.replaceState(null, '', '#' + id); }
  });
  addEventListener('load', () => openPanel(decodeURIComponent(location.hash.slice(1)), false));

  /* screenshot thumbnails swap the main image of their figure */
  $$('.thumbs').forEach(group => {
    const fig = group.closest('figure');
    const main = $('.main img', fig), cap = $('figcaption', fig);
    $$('button', group).forEach(b => b.addEventListener('click', () => {
      $$('button', group).forEach(x => x.classList.toggle('on', x === b));
      main.src = b.dataset.src;
      main.alt = b.dataset.caption || '';
      if (cap) cap.textContent = b.dataset.caption || '';
    }));
  });

  /* inquiry form → prefilled mail to the address in data-mailto */
  $$('form[data-mailto]').forEach(form => {
    const sel = $('select[name="type"]', form);
    const want = new URLSearchParams(location.search).get('interest');
    if (sel && want && [...sel.options].some(o => o.value === want)) sel.value = want;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const type = sel ? sel.options[sel.selectedIndex].text : '';
      const subject = `[${form.dataset.brand} 문의] ${d.get('org')} · ${type}`;
      const body = `기관·회사명: ${d.get('org')}\n담당자: ${d.get('name')}\n연락처: ${d.get('tel')}\n예상 인원: ${d.get('size')}\n관심 분야: ${type}\n\n${d.get('msg')}`;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });

  /* reveal on scroll + number counters */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countUp = el => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    if (reduced) { el.textContent = end.toLocaleString('ko-KR'); return; }
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('ko-KR');
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  };
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    en.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(en.target);
  }), { threshold: .1 });
  $$('.rv').forEach(el => io.observe(el));
})();

/* hero photo slider — autoplay with progress bars, arrows, dots, swipe, keyboard; pauses on hover/focus/hidden tab.
   data-interval sets the delay (ms); data-start picks the first slide (0-based). */
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.slider').forEach(sl => {
    const slides = [...sl.querySelectorAll('.slide')];
    const dotsWrap = sl.querySelector('.s-dots'), count = sl.querySelector('.s-count');
    const dur = +sl.dataset.interval || 5000;
    sl.style.setProperty('--dur', dur + 'ms');
    let i = 0, timer = null, paused = false;
    const pad = n => String(n).padStart(2, '0');

    const dots = slides.map((s, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `${k + 1}번째 사진 — ${s.querySelector('b') ? s.querySelector('b').textContent : ''}`);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => go(k));
      dotsWrap.appendChild(b);
      return b;
    });

    function schedule() {
      clearTimeout(timer);
      if (!paused && !reduced) timer = setTimeout(() => go(i + 1), dur);
    }
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', k !== i); });
      dots.forEach((d, k) => {
        d.classList.toggle('on', k === i);
        d.classList.toggle('done', k < i);
        d.setAttribute('aria-current', k === i);
        const bar = d.firstChild; bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      });
      count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
      schedule();
    }
    function pause(p) {
      if (paused === p) return;
      paused = p;
      sl.classList.toggle('paused', p);
      if (p) clearTimeout(timer); else go(i);
    }

    sl.querySelector('.s-prev').addEventListener('click', () => go(i - 1));
    sl.querySelector('.s-next').addEventListener('click', () => go(i + 1));
    sl.addEventListener('mouseenter', () => pause(true));
    sl.addEventListener('mouseleave', () => pause(false));
    sl.addEventListener('focusin', () => pause(true));
    sl.addEventListener('focusout', e => { if (!sl.contains(e.relatedTarget)) pause(false); });
    sl.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    });
    let x0 = null;
    sl.addEventListener('pointerdown', e => { x0 = e.clientX; });
    sl.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); else if (!sl.matches(':hover')) pause(false); });
    go(+sl.dataset.start || 0);
  });
})();

/* 긴 페이지에서 맨 위로 돌아가는 단추 — 한 화면 이상 내려가면 나타난다 */
(function () {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'totop';
  b.setAttribute('aria-label', '맨 위로');
  b.textContent = '↑';
  document.body.appendChild(b);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  b.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  const sync = () => b.classList.toggle('on', scrollY > innerHeight);
  addEventListener('scroll', sync, { passive: true });
  sync();
})();
