/* Amala Station: catering and events.
   Five short reels sit on a 3D rail. Scroll or swipe sideways, the centre reel plays,
   the others rest. The caption and the WhatsApp quote button follow the reel. */
(() => {
  'use strict';
  const A = window.Amala;
  if (!A || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Edit the words here. Files live in assets/catering. If a phone will not play the video, the reel runs as a photo reel (the _0 to _7 images). */
  const CLIPS = [
    { file: 'fest',      label: 'Outdoor festivals',          text: 'Hot food served fast at open-air events and brand festivals.' },
    { file: 'night',     label: 'Outdoor events',             text: 'Concerts, launches and street parties. We set up, serve and clear.' },
    { file: 'indoor',    label: 'Indoor events',              text: 'Parties and dinners, plated or buffet, hot and on time.' },
    { file: 'wedding',   label: 'Weddings and celebrations',  text: 'Weddings, birthdays and naming ceremonies, done with care.' },
    { file: 'corporate', label: 'Corporate and outdoor service', text: 'Corporate breakfast, team lunches and tented events at your venue.' },
  ];
  /* [top, bottom, accent] per reel: the whole section changes colour as you move */
  const THEMES = [['#F2FBF4', '#BFE8CC', '#6CCB8A'], ['#FFF3E0', '#FFC98A', '#FF9A2A'], ['#FFFFFF', '#FFD9B0', '#FFB347'],
                  ['#FFF5E8', '#FFC2A0', '#FF8F5B'], ['#FFF8EE', '#FFB88A', '#FFA03A']];
  const hexv = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixc = (a, b, t) => '#' + hexv(a).map((v, i) => Math.round(v + (hexv(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const N = CLIPS.length;

  const section = $('#catering'), stage = $('.cater-stage'), wrap = $('#cater-wrap'), track = $('#cater-track');
  const dotsEl = $('#cater-dots'), copy = $('#cater-copy'), labelEl = $('#cater-label'), descEl = $('#cater-desc'), quote = $('#cater-quote');

  const cards = CLIPS.map((c, k) => {
    const li = document.createElement('li');
    li.className = 'ccard';
    li.innerHTML = `<video muted loop playsinline webkit-playsinline preload="none" poster="assets/catering/${c.file}.webp" aria-label="${c.label}" ${reduce ? 'controls' : ''}></video>
      <div class="cslides" aria-hidden="true"></div>`;
    track.appendChild(li);
    dotsEl.appendChild(document.createElement('li'));
    return li;
  });
  const vids = cards.map(c => c.querySelector('video'));
  const dots = [...dotsEl.children];

  const srcOf = f => (window.__catSrc ? window.__catSrc(f) : `assets/catering/${f}.mp4`);
  function load(k) {
    const v = vids[k]; if (!v || v.dataset.ready) return;
    if (window.__noVideo) return;
    v.dataset.ready = '1'; v.muted = true; v.defaultMuted = true; v.setAttribute('playsinline', '');
    v.src = srcOf(CLIPS[k].file); v.preload = 'auto'; v.load();
  }
  /* If a phone or viewer won't play the video, the same reel runs as a slow photo reel. */
  const SLIDES = 8, slideTimers = [], slideIdx = [];
  const slideSrc = (f, i) => (window.__slideSrc ? window.__slideSrc(f, i) : `assets/catering/${f}_${i}.webp`);
  function runSlides(k) {
    clearInterval(slideTimers[k]);
    const imgs = cards[k].querySelectorAll('.cslides img'); if (imgs.length < 2) return;
    slideTimers[k] = setInterval(() => {
      imgs[slideIdx[k]].classList.remove('on');
      slideIdx[k] = (slideIdx[k] + 1) % imgs.length; imgs[slideIdx[k]].classList.add('on');
    }, 1700);
  }
  function toSlides(k) {
    const c = cards[k];
    if (!c.classList.contains('is-slides')) {
      c.classList.add('is-slides'); vids[k].pause();
      const box = c.querySelector('.cslides');
      for (let i = 0; i < SLIDES; i++) { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = slideSrc(CLIPS[k].file, i); box.appendChild(im); }
      box.firstChild.classList.add('on'); slideIdx[k] = 0;
    }
    if (active === k) runSlides(k);
  }
  function tryPlay(k) {
    const v = vids[k]; if (!v || reduce) return;
    if (window.__noVideo) return toSlides(k);
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => toSlides(k));
    setTimeout(() => { if (active === k && !cards[k].classList.contains('is-slides') && (v.paused || v.currentTime < 0.2)) toSlides(k); }, 2800);
  }
  vids.forEach((v, k) => v.addEventListener('error', () => toSlides(k)));

  new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { load(0); load(1); if (reduce) vids.forEach((_, k) => load(k)); io.disconnect(); } }, { rootMargin: '250% 0px' }).observe(section);

  let active = -1;
  function setActive(k) {
    if (k === active) return;
    active = k;
    vids.forEach((v, i) => {
      if (i === k) { load(i); if (cards[i].classList.contains('is-slides')) runSlides(i); else tryPlay(i); }
      else { if (Math.abs(i - k) === 1) load(i); v.pause(); clearInterval(slideTimers[i]); }
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === k));
    copy.classList.add('swap');
    setTimeout(() => {
      labelEl.textContent = CLIPS[k].label; descEl.textContent = CLIPS[k].text;
      copy.classList.remove('swap');
    }, 180);
    const msg = `Hello Amala Station, I would like a catering quote.\nEvent type: ${CLIPS[k].label}\nDate:\nNumber of guests:\nVenue:`;
    quote.href = `https://wa.me/2348065971529?text=${encodeURIComponent(msg)}`;
  }
  labelEl.textContent = CLIPS[0].label; descEl.textContent = CLIPS[0].text;
  quote.href = `https://wa.me/2348065971529?text=${encodeURIComponent('Hello Amala Station, I would like a catering quote.\nEvent type: ' + CLIPS[0].label + '\nDate:\nNumber of guests:\nVenue:')}`;

  if (reduce) { section.classList.add('is-static'); if (window.__noVideo) cards.forEach((_, k) => toSlides(k)); return; }

  const state = { p: 0 };
  let cardW = 0, gap = 0, wrapW = 0;
  const measure = () => { cardW = cards[0].offsetWidth; gap = parseFloat(getComputedStyle(track).columnGap) || 0; wrapW = wrap.clientWidth; };
  const runway = () => section.offsetHeight - stage.offsetHeight;
  const stepY = k => section.offsetTop + ((k + 0.5) / N) * runway();

  function render() {
    const pos = clamp(state.p * N - 0.5, 0, N - 1);
    gsap.set(track, { x: (wrapW - cardW) / 2 - pos * (cardW + gap) });
    const i0 = Math.min(N - 2, Math.floor(pos)), tt = pos - i0;
    stage.style.setProperty('--ca', mixc(THEMES[i0][0], THEMES[i0 + 1][0], tt));
    stage.style.setProperty('--cb', mixc(THEMES[i0][1], THEMES[i0 + 1][1], tt));
    stage.style.setProperty('--cacc', mixc(THEMES[i0][2], THEMES[i0 + 1][2], tt));
    cards.forEach((c, k) => {
      const d = clamp(k - pos, -1.4, 1.4), ad = Math.min(Math.abs(d), 1);
      gsap.set(c, { scale: 1 - 0.16 * ad, opacity: 1 - 0.5 * ad, rotationY: -d * 24 * (ad ? 1 : 0), z: -150 * ad, zIndex: Math.round(10 - ad * 5), transformOrigin: '50% 50%' });
    });
    setActive(Math.round(pos));
  }

  function goStep(k, dur = 0.8) {
    k = clamp(k, 0, N - 1);
    const html = document.documentElement; html.style.scrollBehavior = 'auto';
    gsap.to(window, { scrollTo: { y: stepY(k), autoKill: false }, duration: dur, ease: 'power3.inOut', overwrite: true, onComplete: () => { html.style.scrollBehavior = ''; } });
  }
  cards.forEach((c, k) => c.addEventListener('click', () => { if (k !== active) goStep(k); }));

  let startY = 0, startPos = 0;
  const posNow = () => clamp(((scrollY - section.offsetTop) / runway()) * N - 0.5, 0, N - 1);
  A.swipe([wrap, $('.cater-head')], {
    onStart() { gsap.killTweensOf(window); startY = scrollY; startPos = posNow(); },
    onMove(dx) { scrollTo({ top: clamp(startY - dx * runway() / N / (cardW + gap), section.offsetTop, section.offsetTop + runway()), behavior: 'instant' }); },
    onEnd(dx, v) {
      const from = Math.round(startPos);
      let target = Math.round(posNow() - (v * 220) / (cardW + gap));
      if (Math.abs(dx) > 40 && target === from) target = from + (dx < 0 ? 1 : -1);
      goStep(target, 0.6);
    },
  });

  measure();
  addEventListener('resize', () => { measure(); ScrollTrigger.refresh(); });
  // cards size themselves from the available height, so re-measure whenever they change
  new ResizeObserver(() => { measure(); render(); }).observe(cards[0]);
  const sc = { trigger: section, start: 'top top', end: 'bottom bottom', scrub: true };
  gsap.fromTo('.blob-a', { xPercent: 0, yPercent: 0 }, { xPercent: 30, yPercent: 10, ease: 'none', scrollTrigger: sc });
  gsap.fromTo('.blob-b', { xPercent: 0, yPercent: 0 }, { xPercent: -35, yPercent: -12, ease: 'none', scrollTrigger: sc });
  gsap.to(state, { p: 1, ease: 'none', onUpdate: render, scrollTrigger: { ...sc, scrub: 0.6, onToggle: self => A.setTheme('cater', self.isActive ? '#FFF3E0' : null) } });
  gsap.from('.cater-head > *', { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 70%' } });

  state.p = 0; render(); ScrollTrigger.refresh();
})();
