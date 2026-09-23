/* AIMZ EDU — 공용 동작.
   메뉴를 눌러도 주소가 바뀌지 않도록, 페이지를 새로 여는 대신 내용만 갈아 끼운다.
   자바스크립트가 막혀 있으면 평범한 링크 이동으로 그대로 동작한다. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 페이지마다 다시 걸어야 하는 것 ---------------- */
  let navLinks = [], secs = [], timers = [], pendingSearch = '';

  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    en.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(en.target);
  }), { threshold: .1 });

  function countUp(el) {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    if (reduced) { el.textContent = end.toLocaleString('ko-KR'); return; }
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('ko-KR');
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* 탭 */
  function activate(tab) {
    $$('.tab', tab.closest('.tabs')).forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      const p = document.getElementById(t.dataset.panel);
      if (p) p.classList.toggle('on', on);
    });
  }
  function openPanel(id, smooth) {
    const tab = id && $(`.tab[data-panel="${CSS.escape(id)}"]`);
    if (!tab) return false;
    activate(tab);
    tab.closest('.tabs').scrollIntoView({ behavior: smooth && !reduced ? 'smooth' : 'auto', block: 'start' });
    return true;
  }

  /* 사진 넘김 */
  function initSlider(sl) {
    const slides = $$('.slide', sl);
    const dotsWrap = $('.s-dots', sl), count = $('.s-count', sl);
    if (!slides.length || !dotsWrap) return;
    const dur = +sl.dataset.interval || 5000;
    sl.style.setProperty('--dur', dur + 'ms');
    let i = 0, timer = null, paused = false;
    const pad = n => String(n).padStart(2, '0');
    dotsWrap.innerHTML = '';
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
      if (!paused && !reduced) { timer = setTimeout(() => go(i + 1), dur); timers.push(timer); }
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
      if (count) count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
      schedule();
    }
    function pause(p) {
      if (paused === p) return;
      paused = p;
      sl.classList.toggle('paused', p);
      if (p) clearTimeout(timer); else go(i);
    }
    $('.s-prev', sl).addEventListener('click', () => go(i - 1));
    $('.s-next', sl).addEventListener('click', () => go(i + 1));
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
    sl._pause = pause;
    go(+sl.dataset.start || 0);
  }

  function initPage() {
    timers.forEach(clearTimeout); timers = [];
    navLinks = $$('.nav a[href^="#"]');
    secs = navLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);

    $$('.tab').forEach(t => t.addEventListener('click', () => activate(t)));

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

    $$('form[data-mailto]').forEach(form => {
      const sel = $('select[name="type"]', form);
      const want = new URLSearchParams(pendingSearch || location.search).get('interest');
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

    $$('.slider').forEach(initSlider);
    $$('.rv').forEach(el => io.observe(el));
    onScroll();
  }

  /* ---------------- 한 번만 거는 것 ---------------- */
  const hdr = $('.hdr');
  function onScroll() {
    if (hdr) hdr.classList.toggle('scrolled', scrollY > 8);
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < 140) cur = s;
    navLinks.forEach(a => a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id));
  }
  addEventListener('scroll', onScroll, { passive: true });

  const burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', () => burger.setAttribute('aria-expanded', nav.classList.toggle('open')));
    nav.addEventListener('click', e => {
      if (e.target.closest('a')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  document.addEventListener('visibilitychange', () => {
    $$('.slider').forEach(sl => sl._pause && sl._pause(document.hidden));
  });

  /* 맨 위로 */
  const top = document.createElement('button');
  top.type = 'button';
  top.className = 'totop';
  top.setAttribute('aria-label', '맨 위로');
  top.textContent = '↑';
  document.body.appendChild(top);
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  const syncTop = () => top.classList.toggle('on', scrollY > innerHeight);
  addEventListener('scroll', syncTop, { passive: true });
  syncTop();

  /* ---------------- 주소를 바꾸지 않는 페이지 이동 ---------------- */
  const PAGES = new Set(['/', '/courses', '/platform', '/safety', '/cases', '/support', '/contact', '/labs', '/instructors']);
  const clean = p => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p) || '/';
  const FIRST = clean(location.pathname);
  let current = FIRST, busy = false;

  /* 검색이나 옛 링크로 /courses 같은 주소에 바로 들어왔을 때도 주소창은 도메인만 보이게 */
  if (FIRST !== '/' && PAGES.has(FIRST)) history.replaceState({ p: FIRST, s: location.search, h: '' }, '', '/');

  async function swap(path, search, hash, push) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch(path + (search || ''), { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const newMain = doc.querySelector('main');
      if (!newMain) throw new Error('main 없음');
      document.title = doc.title;
      document.body.className = doc.body.className;
      const newNav = doc.querySelector('#nav');
      if (nav && newNav) nav.innerHTML = newNav.innerHTML;
      const ft = $('footer'), newFt = doc.querySelector('footer');
      if (ft && newFt) ft.innerHTML = newFt.innerHTML;
      $('main').replaceWith(newMain);
      pendingSearch = search || '';
      initPage();
      current = path;
      /* 주소는 그대로 두고 방문 기록만 남긴다 — 뒤로 가기가 동작한다 */
      if (push) history.pushState({ p: path, s: search || '', h: hash || '' }, '', location.href);
      scrollTo({ top: 0, behavior: 'auto' });
      if (hash) openPanel(decodeURIComponent(hash.slice(1)), false) ||
        (document.getElementById(hash.slice(1)) || {}).scrollIntoView?.({ block: 'start' });
    } catch (e) {
      location.href = path + (search || '') + (hash || '');   /* 실패하면 평소대로 이동 */
    }
    busy = false;
  }

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!a) return;

    /* 같은 페이지 안의 이동 (#course-pro 등) */
    const raw = a.getAttribute('href') || '';
    if (raw.startsWith('#')) {
      const id = decodeURIComponent(raw.slice(1));
      if (openPanel(id, true)) e.preventDefault();
      return;
    }
    if (a.target || a.hasAttribute('download')) return;
    let u;
    try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (u.origin !== location.origin) return;
    const path = clean(u.pathname);
    if (!PAGES.has(path)) return;
    e.preventDefault();
    if (path === current && !u.hash) { scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return; }
    if (path === current && u.hash) { openPanel(decodeURIComponent(u.hash.slice(1)), true); return; }
    swap(path, u.search, u.hash, true);
  });

  addEventListener('popstate', e => {
    const st = e.state;
    const path = st && st.p ? st.p : FIRST;
    if (path !== current) swap(path, st && st.s, st && st.h, false);
  });

  initPage();
  addEventListener('load', () => openPanel(decodeURIComponent(location.hash.slice(1)), false));
})();
