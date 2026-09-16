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

  /* self-check → recommended course (opens its tab) */
  const sc = $('#selfCheck');
  if (sc) {
    const fs = $$('fieldset', sc), res = $('#checkResult');
    sc.addEventListener('change', () => {
      const scores = fs.map(f => $$('input:checked', f).length);
      const max = Math.max(...scores);
      fs.forEach((f, i) => f.classList.toggle('best', max > 0 && scores[i] === max));
      if (!max) { res.innerHTML = '<span>항목을 체크하면 추천 과정을 알려드립니다.</span>'; return; }
      const f = fs[scores.indexOf(max)];
      res.innerHTML = `<span>추천 과정: <b>${f.dataset.course}</b> — ${max}개 항목 해당</span><a class="btn btn-accent btn-sm" href="#${f.dataset.panel}">과정 상세 보기 →</a>`;
    });
  }

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
