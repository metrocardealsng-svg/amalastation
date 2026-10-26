/* Amala Station: food showcase.
   GSAP ScrollTrigger scrubs 120 video frames and slides a 3D card rail sideways.
   You can scroll, or swipe / drag left and right. The page colour follows the dish.
   Plates and cards feed the same order as the menu. */
(() => {
  'use strict';
  const A = window.Amala;
  if (!A || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const FRAME_COUNT = 120, FPS = 12;
  const frameSrc = i => `assets/feast/f${String(i + 1).padStart(3, '0')}.webp`;

  /* Bright palette per dish: [top, bottom, accent]. Top bar, background, buttons, ring and dots all follow it. */
  const THEMES = [
    ['#FFA41F', '#D6F0CC', '#6CCB8A'], ['#FF8A24', '#FFD5A3', '#FF9A3D'], ['#FFB02E', '#E4F3B5', '#B5E26B'],
    ['#FF7A2F', '#FFC6AD', '#FF8F5B'], ['#FF9A2A', '#FFDFA6', '#FFB84A'], ['#FFB63A', '#FFF2CB', '#FFD45C'],
    ['#58BC74', '#D2F0DB', '#7AD695'],
  ];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

  /* Step k = dish k. Time (s) in the video when that dish is fully settled. */
  const STEPS = [
    { id: 'amala', t: 0.9 }, { id: 'pbeans', t: 2.75 }, { id: 'eba', t: 4.25 }, { id: 'jollof', t: 5.6 },
    { id: 'spag', t: 6.8 }, { id: 'wrb', t: 8.3 }, { id: 'extras', t: 9.7 },
  ];
  const N = STEPS.length;
  const SHORT = {
    amala:  { title: 'Amala, Ewedu and Gbegiri', sub: 'With 6 assorted meats' },
    pbeans: { title: 'Porridge Beans', sub: 'With plantain and 4 assorted' },
    eba:    { title: 'Eba or Fufu with Soup', sub: 'Afang or egusi, with 4 assorted' },
    jollof: { title: 'Jollof or Coconut Rice', sub: 'With plantain and 3 beef' },
    spag:   { title: 'Spaghetti', sub: 'With croaker or chicken' },
    wrb:    { title: 'White Rice and Beans', sub: 'With plantain and 4 assorted' },
    extras: { title: 'Make it bigger', sub: 'Turkey, croaker, ponmo, moimoi, drinks and more' },
  };
  const PLATE = { x: 0.72, y: 0.47, r: 0.20 };

  const feast = $('#feast'), stage = $('.feast-stage'), vidBox = $('#feast-video');
  const canvas = $('#feast-canvas'), ctx = canvas.getContext('2d');
  const hotspot = $('#hotspot'), hsLabel = $('#hs-label');
  const rail = $('#rail'), railWrap = $('#rail-wrap'), dotsEl = $('#feast-dots');
  const hint = $('#swipe-hint'), prevBtn = $('#f-prev'), nextBtn = $('#f-next');
  const root = document.documentElement;

  /* ---------- Cards ---------- */
  const dishData = id => A.dishes.find(d => d.id === id);
  STEPS.forEach((st, k) => {
    const d = dishData(st.id), copy = SHORT[st.id];
    const li = document.createElement('li');
    li.className = 'fcard'; li.dataset.k = k;
    if (d) {
      const opts = (d.opts || []).map((g, gi) => `
        <fieldset class="fopts"><legend>${g.label}</legend>${g.choices.map(c => `
          <label class="fopt"><input type="radio" name="f-${d.id}-${gi}" value="${c}" data-gi="${gi}"><span>${c}</span></label>`).join('')}
        </fieldset>`).join('');
      li.dataset.id = d.id;
      li.innerHTML = `<img class="fthumb" src="assets/feast/dish${k}.webp" width="320" height="320" alt="" loading="lazy">
        <div class="fbody"><h3>${copy.title}</h3><p class="fsub">${copy.sub}</p>${opts}
          <div class="fbuy"><span class="fprice">${A.naira(d.price)}</span><span class="fctl"></span></div></div>`;
    } else {
      li.innerHTML = `<img class="fthumb" src="assets/feast/dish${k}.webp" width="320" height="320" alt="" loading="lazy">
        <div class="fbody"><h3>${copy.title}</h3><p class="fsub">${copy.sub}</p>
          <div class="fbuy"><span class="fprice">From ₦300</span><a class="btn btn-primary add" href="#extras-block">Pick extras</a></div></div>`;
    }
    rail.appendChild(li);
    dotsEl.appendChild(document.createElement('li'));
  });
  const cards = [...rail.children], dots = [...dotsEl.children];

  function ctl(d) {
    const q = A.qty(d.id);
    return q === 0
      ? `<button type="button" class="btn btn-primary add" data-act="inc" aria-label="Add ${d.name} to order">Add to order</button>`
      : `<div class="stepper" role="group" aria-label="${d.name} quantity">
           <button type="button" data-act="dec" aria-label="Remove one">−</button><output>${q}</output>
           <button type="button" data-act="inc" aria-label="Add one">+</button></div>`;
  }
  function syncCards() {
    cards.forEach(c => {
      const id = c.dataset.id; if (!id) return;
      const d = dishData(id), box = $('.fctl', c), q = A.qty(id);
      if (box.dataset.q !== String(q) || !box.firstElementChild) {
        const f = c.contains(document.activeElement) ? document.activeElement.dataset.act : null;
        box.innerHTML = ctl(d); box.dataset.q = q;
        if (f) { const b = $(`[data-act="${f}"]`, box) || $('button', box); if (b) b.focus({ preventScroll: true }); }
      }
      (d.opts || []).forEach((g, gi) => {
        const val = A.getChoice(id, gi);
        c.querySelectorAll(`input[data-gi="${gi}"]`).forEach(r => { r.checked = r.value === val; });
      });
    });
    updateHotspot(active);
  }
  A.onChange(syncCards);

  const cardThumb = c => c && c.querySelector('.fthumb');
  rail.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const card = b.closest('.fcard'), id = card.dataset.id;
    if (b.dataset.act === 'inc') { A.add(id); fly(cardThumb(card)); } else A.dec(id);
  });
  rail.addEventListener('change', e => {
    const r = e.target.closest('input[data-gi]'); if (!r) return;
    A.setChoice(r.closest('.fcard').dataset.id, +r.dataset.gi, r.value);
  });
  cards.forEach((c, k) => c.addEventListener('click', e => {
    if (c.classList.contains('is-active') || e.target.closest('button,a,label,input')) return;
    goStep(k);
  }));

  /* ---------- Tap the plate ---------- */
  let active = 0;
  function updateHotspot(k) {
    const st = STEPS[k], d = dishData(st.id);
    hotspot.hidden = !d || reduce;
    if (!d) return;
    const q = A.qty(d.id);
    hsLabel.textContent = q ? `${q} in order · tap for 1 more` : `Tap to order · ${A.naira(d.price)}`;
    hotspot.setAttribute('aria-label', `Add ${A.lineName(d.id)} to your order, ${A.naira(d.price)}`);
  }
  hotspot.addEventListener('click', () => {
    const d = dishData(STEPS[active].id); if (!d) return;
    A.add(d.id); fly(cardThumb(cards[active]) || hotspot);
    gsap.fromTo(hotspot, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)' });
  });

  function fly(fromEl) {
    if (!fromEl || reduce) return;
    requestAnimationFrame(() => {
      const from = fromEl.getBoundingClientRect();
      const to = (A.basketEl && !A.basketEl.hidden ? A.basketEl : $('.nav-cta')).getBoundingClientRect();
      const g = document.createElement('div'); g.className = 'fly';
      Object.assign(g.style, { left: (from.left + from.width / 2 - 32) + 'px', top: (from.top + from.height / 2 - 32) + 'px' });
      if (fromEl.tagName === 'IMG') g.style.backgroundImage = `url("${fromEl.currentSrc || fromEl.src}")`;
      document.body.appendChild(g);
      gsap.to(g, {
        x: to.left + to.width * 0.25 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale: 0.35, opacity: 0.9, duration: 0.7, ease: 'power3.in',
        onComplete: () => { g.remove(); gsap.fromTo(A.basketEl, { scale: 1.04 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); },
      });
    });
  }

  /* ---------- Frames ---------- */
  const frames = new Array(FRAME_COUNT), ready = new Array(FRAME_COUNT).fill(false);
  let started = false, dirty = true, lastFrame = -1;
  const order = (() => { const seen = new Set(), out = []; for (const s of [FRAME_COUNT, 12, 6, 3, 1]) for (let i = 0; i < FRAME_COUNT; i += s) if (!seen.has(i)) { seen.add(i); out.push(i); } return out; })();
  const loadFrame = i => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => { frames[i] = im; ready[i] = true; dirty = true; res(); }; im.onerror = res; im.src = frameSrc(i); });
  async function loadAll() {
    if (started) return; started = true;
    const q = order.slice(); const w = async () => { while (q.length) await loadFrame(q.shift()); };
    await Promise.all([w(), w(), w(), w(), w()]);
  }
  const lazy = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { loadAll(); lazy.disconnect(); } }, { rootMargin: '300% 0px' });
  lazy.observe(feast);
  addEventListener('hero-frames-loaded', () => { if (!(navigator.connection && navigator.connection.saveData)) loadAll(); }, { once: true });

  const nearest = i => {
    if (ready[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) { if (i - d >= 0 && ready[i - d]) return frames[i - d]; if (i + d < FRAME_COUNT && ready[i + d]) return frames[i + d]; }
    return null;
  };
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
  }
  const px = document.createElement('canvas'); px.width = px.height = 1;
  const pctx = px.getContext('2d', { willReadFrequently: true });
  function edge(im, y0, y1) {
    pctx.drawImage(im, im.naturalWidth * 0.3, im.naturalHeight * y0, im.naturalWidth * 0.4, im.naturalHeight * (y1 - y0), 0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`;
  }
  function drawFrame(i) {
    const im = nearest(i); if (!im) return;
    size();
    const cw = canvas.width, ch = canvas.height;
    const s = Math.min(cw / im.naturalWidth, ch / im.naturalHeight);   // always the whole picture, never cropped
    const w = im.naturalWidth * s, h = im.naturalHeight * s, ox = (cw - w) / 2, oy = (ch - h) / 2;
    if (w < cw - 1 || h < ch - 1) {                                    // spare space takes the frame's own colours
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, edge(im, 0, 0.03)); g.addColorStop(1, edge(im, 0.97, 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(im, ox, oy, w, h);
    const k = cw / canvas.clientWidth, r = PLATE.r * w / k, x = (ox + PLATE.x * w) / k, y = (oy + PLATE.y * h) / k;
    hotspot.style.cssText = `left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px`;
  }

  /* ---------- Scroll → state ---------- */
  const anchors = STEPS.map((s, i) => ({ p: (i + 0.5) / N, t: s.t }));
  function timeAt(p) {
    if (p <= anchors[0].p) return gsap.utils.mapRange(0, anchors[0].p, 0, anchors[0].t, p);
    for (let i = 0; i < N - 1; i++) if (p <= anchors[i + 1].p) return gsap.utils.mapRange(anchors[i].p, anchors[i + 1].p, anchors[i].t, anchors[i + 1].t, p);
    return gsap.utils.mapRange(anchors[N - 1].p, 1, anchors[N - 1].t, 9.98, p);
  }
  const state = { p: 0 };
  let cardW = 0, gap = 0, wrapW = 0;
  function measure() {
    cardW = cards[0].offsetWidth; gap = parseFloat(getComputedStyle(rail).columnGap) || 0; wrapW = railWrap.clientWidth; dirty = true;
  }
  const runway = () => feast.offsetHeight - stage.offsetHeight;
  const stepY = k => feast.offsetTop + ((k + 0.5) / N) * runway();

  let feastActive = false;
  function render() {
    const p = state.p, t = timeAt(p);
    const f = clamp(Math.round(t * FPS), 0, FRAME_COUNT - 1);
    if (f !== lastFrame || dirty) { drawFrame(f); lastFrame = f; dirty = false; }

    const pos = clamp(p * N - 0.5, 0, N - 1);
    const i = Math.min(N - 2, Math.floor(pos)), tt = pos - i;
    const a = mix(THEMES[i][0], THEMES[i + 1][0], tt), b = mix(THEMES[i][1], THEMES[i + 1][1], tt), c = mix(THEMES[i][2], THEMES[i + 1][2], tt);
    stage.style.setProperty('--ta', a); stage.style.setProperty('--tb', b); stage.style.setProperty('--acc', c);
    root.style.setProperty('--feast-a', a); root.style.setProperty('--feast-acc', c);
    if (feastActive) A.setTheme('feast', a);

    gsap.set(rail, { x: (wrapW - cardW) / 2 - pos * (cardW + gap) });
    cards.forEach((c, k) => {
      const d = clamp(k - pos, -1.4, 1.4), ad = Math.min(Math.abs(d), 1);
      gsap.set(c, { scale: 1 - 0.2 * ad, opacity: 1 - 0.55 * ad, rotationY: -d * 26 * (ad ? 1 : 0), z: -170 * ad, zIndex: Math.round(10 - ad * 5), transformOrigin: '50% 60%' });
      c.classList.toggle('is-active', Math.abs(k - pos) < 0.5);
    });
    const a2 = Math.round(pos);
    if (a2 !== active) { active = a2; updateHotspot(active); hint.classList.add('is-gone'); }
    dots.forEach((d, j) => d.classList.toggle('on', j === active));
    prevBtn.disabled = active === 0; nextBtn.disabled = active === N - 1;
  }

  function goStep(k, dur = 0.8) {
    k = clamp(k, 0, N - 1);
    const html = document.documentElement; html.style.scrollBehavior = 'auto';
    gsap.to(window, { scrollTo: { y: stepY(k), autoKill: false }, duration: dur, ease: 'power3.inOut', overwrite: true, onComplete: () => { html.style.scrollBehavior = ''; } });
  }
  prevBtn.addEventListener('click', () => goStep(active - 1));
  nextBtn.addEventListener('click', () => goStep(active + 1));

  function setActive(on) { feastActive = on; root.classList.toggle('is-feast', on); A.setTheme('feast', on ? root.style.getPropertyValue('--feast-a') || THEMES[0][0] : null); }

  /* ---------- Swipe / drag: the cards follow your finger, the video scrubs with them ---------- */
  let startY = 0, startPos = 0;
  const posNow = () => clamp(((scrollY - feast.offsetTop) / runway()) * N - 0.5, 0, N - 1);
  A.swipe([vidBox, railWrap, $('.feast-head')], {
    onStart() { gsap.killTweensOf(window); startY = scrollY; startPos = posNow(); hint.classList.add('is-gone'); },
    onMove(dx) {
      const perPx = runway() / N / (cardW + gap);
      scrollTo({ top: clamp(startY - dx * perPx, feast.offsetTop, feast.offsetTop + runway()), behavior: 'instant' });
    },
    onEnd(dx, v) {
      const from = Math.round(startPos);
      let target = Math.round(posNow() - (v * 220) / (cardW + gap));
      if (Math.abs(dx) > 40 && target === from) target = from + (dx < 0 ? 1 : -1);
      goStep(target, 0.6);
    },
  });
  // trackpad sideways flick
  let wheelAt = 0;
  stage.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.4 && Math.abs(e.deltaX) > 12) {
      e.preventDefault();
      const now = performance.now();
      if (now - wheelAt > 550) { wheelAt = now; goStep(active + (e.deltaX > 0 ? 1 : -1)); }
    }
  }, { passive: false });

  /* ---------- Depth layers ---------- */
  function leaves(layer, n, [minS, maxS], opacity, blur) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'), size = gsap.utils.random(minS, maxS);
      s.style.cssText = `left:${gsap.utils.random(0, 100)}%;top:${gsap.utils.random(4, 92)}%;width:${size}px;height:${size * 1.9}px;opacity:${opacity * gsap.utils.random(0.6, 1)};filter:blur(${blur}px);transform:rotate(${gsap.utils.random(0, 360)}deg)`;
      layer.appendChild(s);
    }
  }
  const small = matchMedia('(max-width:899px)').matches;
  leaves($('.layer-back'), small ? 10 : 16, [10, 16], 0.55, 0);
  leaves($('.layer-mid'), small ? 8 : 12, [16, 26], 0.75, 0.4);
  leaves($('.layer-front'), small ? 4 : 6, [34, 54], 0.5, 3);

  /* ---------- Boot ---------- */
  if (reduce) {
    feast.classList.add('is-static'); measure(); loadFrame(0).then(() => drawFrame(0)); syncCards(); return;
  }
  measure(); syncCards();
  addEventListener('resize', () => { measure(); ScrollTrigger.refresh(); });
  new ResizeObserver(() => { measure(); render(); }).observe(railWrap);

  const sc = { trigger: feast, start: 'top top', end: 'bottom bottom', scrub: true };
  const layerMove = (sel, dist) => gsap.fromTo(sel, { xPercent: 0 }, { xPercent: -dist, ease: 'none', scrollTrigger: sc });
  layerMove('.layer-back', 15); layerMove('.layer-mid', 35); layerMove('.layer-front', 50);
  gsap.fromTo(vidBox, { scale: 0.98 }, { scale: 1.01, ease: 'none', scrollTrigger: sc });
  gsap.to(state, { p: 1, ease: 'none', onUpdate: render, scrollTrigger: { ...sc, scrub: 0.6, onToggle: self => setActive(self.isActive) } });
  gsap.from('.feast-head > *', { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: feast, start: 'top 70%' } });

  state.p = 0; render(); ScrollTrigger.refresh();
})();
