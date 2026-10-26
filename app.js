/* Amala Station: scroll walkthrough + menu + WhatsApp order builder.
   No build step, no dependencies. */
(() => {
  'use strict';

  const WHATSAPP = '2348065971529';
  const naira = n => '₦' + n.toLocaleString('en-NG');
  const $ = (s, r = document) => r.querySelector(s);

  /* =====================================================
     1. Scroll-scrubbed walkthrough
     ===================================================== */
  const FRAME_COUNT = 96;
  const frameSrc = i => `assets/frames/f${String(i + 1).padStart(3, '0')}.webp`;

  const tour = $('.tour');
  const stage = $('.tour-stage');
  const canvas = $('#tour-canvas');
  const ctx = canvas.getContext('2d');
  const bar = $('#tour-bar');
  const hint = $('#tour-hint');
  const caps = [...document.querySelectorAll('.cap')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const frames = new Array(FRAME_COUNT);
  const ready = new Array(FRAME_COUNT).fill(false);

  // Load coarse frames first (every 16th, 8th, 4th...) so scrubbing works early.
  const loadOrder = (() => {
    const seen = new Set(), out = [];
    for (const step of [FRAME_COUNT, 16, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAME_COUNT; i += step) {
        if (!seen.has(i)) { seen.add(i); out.push(i); }
      }
    }
    return out;
  })();

  function loadFrame(i) {
    return new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; ready[i] = true; resolve(); };
      img.onerror = resolve;
      img.src = frameSrc(i);
    });
  }

  async function loadAll() {
    await loadFrame(0);
    needsDraw = true; requestTick();
    const queue = loadOrder.filter(i => i !== 0);
    const worker = async () => {
      while (queue.length) {
        await loadFrame(queue.shift());
        needsDraw = true; requestTick();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    window.dispatchEvent(new Event('hero-frames-loaded'));
  }

  function nearestReady(i) {
    if (ready[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && ready[i - d]) return frames[i - d];
      if (i + d < FRAME_COUNT && ready[i + d]) return frames[i + d];
    }
    return null;
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
  }

  function draw(index) {
    const img = nearestReady(index);
    if (!img) return;
    sizeCanvas();
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  let target = 0;        // 0..1 from scroll
  let current = 0;       // smoothed
  let needsDraw = true;
  let ticking = false;
  let lastIndex = -1;

  function readScroll() {
    const total = tour.offsetHeight - stage.offsetHeight;
    const top = tour.getBoundingClientRect().top;
    target = total > 0 ? Math.min(1, Math.max(0, -top / total)) : 0;
  }

  function updateCaptions(p) {
    let on = 0;
    caps.forEach((c, i) => {
      if (p >= +c.dataset.from && p < +c.dataset.to) on = i;
    });
    caps.forEach((c, i) => c.classList.toggle('is-on', i === on));
    hint.classList.toggle('is-gone', p > 0.02);
    bar.style.transform = `scaleY(${p})`;
  }

  function tick() {
    ticking = false;
    readScroll();
    const diff = target - current;
    current = Math.abs(diff) < 0.0008 ? target : current + diff * 0.22;
    const index = Math.round(current * (FRAME_COUNT - 1));
    if (index !== lastIndex || needsDraw) {
      draw(index);
      lastIndex = index;
      needsDraw = false;
    }
    updateCaptions(target);
    if (current !== target) requestTick();
  }

  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }

  function startTour() {
    if (reduceMotion.matches) {
      // Static: show the signboard frame, captions are stacked by CSS.
      const still = Math.round(0.27 * (FRAME_COUNT - 1));
      loadFrame(still).then(() => { draw(still); });
      return;
    }
    addEventListener('scroll', requestTick, { passive: true });
    addEventListener('resize', () => { needsDraw = true; requestTick(); });
    loadAll();
    requestTick();
  }
  startTour();

  /* =====================================================
     2. Menu data (from the printed menu)
     ===================================================== */
  const MAINS = [
    { id: 'spag',   name: 'Spaghetti with Croaker or Chicken', price: 6000,
      opts: [{ label: 'Protein', choices: ['Croaker', 'Chicken'] }] },
    { id: 'wrb',    name: 'White Rice, Beans, Plantain and 4 Assorted', price: 5000 },
    { id: 'jollof', name: 'Jollof Rice or Coconut Rice with Plantain and 3 Beef', price: 5500,
      opts: [{ label: 'Rice', choices: ['Jollof Rice', 'Coconut Rice'] }] },
    { id: 'amala',  name: 'Amala, Ewedu and Gbegiri with 6 Assorted', price: 5000 },
    { id: 'pbeans', name: 'Porridge Beans with Plantain and 4 Assorted', price: 4500 },
    { id: 'eba',    name: 'Eba or Fufu with Afang Soup or Egusi and 4 Assorted', price: 5000,
      opts: [{ label: 'Swallow', choices: ['Eba', 'Fufu'] }, { label: 'Soup', choices: ['Afang Soup', 'Egusi'] }] },
  ];

  const EXTRAS = [
    { id: 'x-turkey',  name: 'Turkey', price: 4000 },
    { id: 'x-chicken', name: 'Chicken', price: 3000 },
    { id: 'x-croaker', name: 'Croaker', price: 3500 },
    { id: 'x-shiny',   name: 'Shiny', price: 3000 },
    { id: 'x-plantain',name: 'Plantain', price: 500 },
    { id: 'x-assorted',name: 'Assorted', price: 500 },
    { id: 'x-beef',    name: 'Beef', price: 1000 },
    { id: 'x-ponmo',   name: 'Ponmo', price: 500 },
    { id: 'x-cow',     name: 'Cowhead or Cowleg', price: 3000,
      opts: [{ label: 'Cut', choices: ['Cowhead', 'Cowleg'] }] },
    { id: 'x-moimoi',  name: 'Moimoi', price: 1000 },
    { id: 'x-amala',   name: 'Amala', price: 500 },
    { id: 'x-garri',   name: 'Garri', price: 500 },
    { id: 'x-fufu',    name: 'Fufu', price: 500 },
    { id: 'x-pack',    name: 'Pack', price: 300 },
    { id: 'x-water',   name: 'Water', price: 300 },
  ];

  /* =====================================================
     3. Order state
     ===================================================== */
  const lines = new Map(); // key -> { name, detail, price, qty }
  const choice = new Map(); // `${itemId}:${group}` -> chosen option (UI state)

  const keyFor = (item, picks) => item.id + '|' + picks.join('|');
  const picksFor = item => (item.opts || []).map((g, gi) => choice.get(`${item.id}:${gi}`) || g.choices[0]);

  function lineText(item, picks) {
    if (!item.opts) return { name: item.name, detail: '' };
    // Replace the "A or B" wording with the actual pick for a clean order line.
    let name = item.name;
    item.opts.forEach((g, gi) => {
      const re = new RegExp(g.choices.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+or\\s+'), 'i');
      name = name.replace(re, picks[gi]);
    });
    return { name, detail: '' };
  }

  function change(item, delta) {
    const picks = picksFor(item);
    const key = keyFor(item, picks);
    const existing = lines.get(key);
    const qty = Math.max(0, (existing ? existing.qty : 0) + delta);
    if (qty === 0) lines.delete(key);
    else {
      const { name } = lineText(item, picks);
      lines.set(key, { item, picks, name, price: item.price, qty });
    }
    refresh();
  }

  const qtyFor = item => {
    const l = lines.get(keyFor(item, picksFor(item)));
    return l ? l.qty : 0;
  };

  /* =====================================================
     4. Render menu
     ===================================================== */
  function buyControls(item) {
    const q = qtyFor(item);
    if (q === 0) {
      return `<button type="button" class="btn btn-primary add" data-act="inc" aria-label="Add ${item.name} to order">Add</button>`;
    }
    return `<div class="stepper" role="group" aria-label="${item.name} quantity">
      <button type="button" data-act="dec" aria-label="Remove one">−</button>
      <output aria-live="polite">${q}</output>
      <button type="button" data-act="inc" aria-label="Add one">+</button>
    </div>`;
  }

  function dishHTML(item) {
    const opts = (item.opts || []).map((g, gi) => {
      const sel = choice.get(`${item.id}:${gi}`) || g.choices[0];
      return `<fieldset class="opt-group"><legend>${g.label}</legend>${g.choices.map(c =>
        `<label class="opt"><input type="radio" name="${item.id}-${gi}" value="${c}" data-gi="${gi}" ${c === sel ? 'checked' : ''}><span>${c}</span></label>`
      ).join('')}</fieldset>`;
    }).join('');
    return `<li class="dish" data-id="${item.id}">
      <h4 class="dish-name">${item.name}</h4>
      <div class="dish-buy"><span class="dish-price">${naira(item.price)}</span><span class="buy">${buyControls(item)}</span></div>
      ${opts ? `<div class="opts">${opts}</div>` : ''}
    </li>`;
  }

  /* Offers are ordered like dishes but are not listed in the main menu. */
  const OFFERS = [{ id: 'chop', name: 'Chop Life: Jollof Rice with Chicken, Salad and a Pet Coke', price: 4500 }];
  const index = new Map([...MAINS, ...EXTRAS, ...OFFERS].map(i => [i.id, i]));
  $('#mains').innerHTML = MAINS.map(dishHTML).join('');
  $('#extras').innerHTML = EXTRAS.map(dishHTML).join('');

  function onMenuClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const row = btn.closest('.dish');
    change(index.get(row.dataset.id), btn.dataset.act === 'inc' ? 1 : -1);
  }
  function onMenuChange(e) {
    const r = e.target.closest('input[type=radio][data-gi]');
    if (!r) return;
    const row = r.closest('.dish');
    choice.set(`${row.dataset.id}:${r.dataset.gi}`, r.value);
    refresh();
  }
  ['#mains', '#extras'].forEach(sel => {
    $(sel).addEventListener('click', onMenuClick);
    $(sel).addEventListener('change', onMenuChange);
  });

  /* =====================================================
     5. Basket bar + order sheet
     ===================================================== */
  const basket = $('#basket');
  const dialog = $('#order');
  const orderLines = $('#order-lines');
  const sendLink = $('#send');
  const nameInput = $('#f-name');
  const addrInput = $('#f-addr');
  const addrField = $('#addr-field');
  const note = $('#order-note');

  const totals = () => {
    let count = 0, sum = 0;
    lines.forEach(l => { count += l.qty; sum += l.qty * l.price; });
    return { count, sum };
  };

  function refresh() {
    // menu rows
    document.querySelectorAll('.dish').forEach(row => {
      row.querySelector('.buy').innerHTML = buyControls(index.get(row.dataset.id));
    });
    // keep option pills in sync everywhere (menu rows and showcase cards)
    document.querySelectorAll('.dish input[type=radio][data-gi]').forEach(r => {
      const id = r.closest('.dish').dataset.id;
      r.checked = (choice.get(`${id}:${r.dataset.gi}`) || index.get(id).opts[+r.dataset.gi].choices[0]) === r.value;
    });
    // basket bar
    const { count, sum } = totals();
    basket.hidden = count === 0;
    $('#basket-count').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    $('#basket-total').textContent = naira(sum);
    // sheet
    if (dialog.open) renderSheet();
    if (count === 0 && dialog.open) dialog.close();
    // keep keyboard focus where the person was
    restoreFocus();
    listeners.forEach(fn => fn());
  }

  const listeners = [];
  let lastFocus = null;
  document.addEventListener('focusin', e => {
    const b = e.target.closest && e.target.closest('.dish button[data-act]');
    lastFocus = b ? { id: b.closest('.dish').dataset.id, act: b.dataset.act } : null;
  });
  function restoreFocus() {
    if (!lastFocus) return;
    const row = document.querySelector(`.dish[data-id="${lastFocus.id}"]`);
    const el = row && (row.querySelector(`button[data-act="${lastFocus.act}"]`) || row.querySelector('button[data-act]'));
    if (el) el.focus({ preventScroll: true });
  }

  function renderSheet() {
    orderLines.innerHTML = [...lines.entries()].map(([key, l]) => `
      <li class="line" data-key="${key}">
        <div><div class="line-name">${l.name}</div><div class="line-sub">${naira(l.price)} each</div></div>
        <div class="line-end">
          <div class="stepper" role="group" aria-label="${l.name} quantity">
            <button type="button" data-act="dec" aria-label="Remove one">−</button>
            <output>${l.qty}</output>
            <button type="button" data-act="inc" aria-label="Add one">+</button>
          </div>
          <span class="line-price">${naira(l.qty * l.price)}</span>
        </div>
      </li>`).join('');
    $('#order-total').textContent = naira(totals().sum);
    updateSend();
  }

  orderLines.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const key = btn.closest('.line').dataset.key;
    const l = lines.get(key);
    if (!l) return;
    l.qty += btn.dataset.act === 'inc' ? 1 : -1;
    if (l.qty <= 0) lines.delete(key);
    lastFocus = null;
    refresh();
  });

  const how = () => (document.querySelector('input[name=how]:checked') || {}).value || 'Dine in';

  function message() {
    const rows = [...lines.values()].map(l => `• ${l.qty} x ${l.name} (${naira(l.qty * l.price)})`);
    const parts = [
      'Hello Amala Station, I would like to order:',
      '',
      ...rows,
      '',
      `Total: ${naira(totals().sum)}`,
      `Order type: ${how()}`,
    ];
    if (nameInput.value.trim()) parts.push(`Name: ${nameInput.value.trim()}`);
    if (how() === 'Delivery' && addrInput.value.trim()) parts.push(`Delivery address: ${addrInput.value.trim()}`);
    return parts.join('\n');
  }

  function updateSend() {
    const delivery = how() === 'Delivery';
    addrField.hidden = !delivery;
    note.textContent = !isOpen()
      ? "We're closed right now. Send your order anyway and we'll confirm it when we open."
      : delivery ? 'Delivery is available. We confirm any delivery fee on WhatsApp.' : 'Your order opens in WhatsApp. We confirm it there.';
    const empty = lines.size === 0;
    sendLink.classList.toggle('is-disabled', empty);
    sendLink.setAttribute('aria-disabled', String(empty));
    sendLink.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message())}`;
  }

  $('#basket-open').addEventListener('click', () => { renderSheet(); dialog.showModal(); });
  $('#clear').addEventListener('click', () => { lines.clear(); lastFocus = null; refresh(); });
  ['input', 'change'].forEach(ev => $('#order-form').addEventListener(ev, updateSend));
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  /* Public API so other sections (the food showcase) can feed the same order. */
  /* Opening hours: Monday to Saturday, 8:00am to 9:00pm, Lagos time */
  function lagos() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(p => [p.type, p.value]));
    return { day: parts.weekday, mins: (+parts.hour % 24) * 60 + +parts.minute };
  }
  const isOpen = () => { const t = lagos(); return t.day !== 'Sun' && t.mins >= 480 && t.mins < 1260; };
  function hoursText() {
    const t = lagos();
    if (isOpen()) return { open: true, text: 'Open now' };
    if (t.day !== 'Sun' && t.day !== 'Sat' && t.mins >= 1260) return { open: false, text: 'Closed · opens 8:00am tomorrow' };
    if (t.day === 'Sat' && t.mins >= 1260 || t.day === 'Sun') return { open: false, text: 'Closed · opens Monday 8:00am' };
    return { open: false, text: 'Closed · opens 8:00am' };
  }
  const badge = document.getElementById('open-badge');
  if (badge) { const h = hoursText(); badge.hidden = false; badge.textContent = h.text; badge.classList.toggle('is-closed', !h.open); }

  /* shared helpers for the scroll sections */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeDefault = themeMeta ? themeMeta.content : '#F7941D';
  const themes = {};
  let lastDrag = -1e9;
  document.addEventListener('click', e => {           // a drag must never count as a tap
    if (performance.now() - lastDrag < 150) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  function swipe(els, h) {
    els.forEach(el => {
      el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        el._sw = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, lt: e.timeStamp, v: 0, on: false };
      });
      el.addEventListener('pointermove', e => {
        const st = el._sw; if (!st || st.id !== e.pointerId) return;
        const dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (!st.on) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dx) > Math.abs(dy) * 1.2) {
            st.on = true;
            try { el.setPointerCapture(e.pointerId); } catch (_) {}
            h.onStart && h.onStart();
          } else { el._sw = null; return; }
        }
        const dt = e.timeStamp - st.lt;
        if (dt > 0) st.v = 0.7 * st.v + 0.3 * ((e.clientX - st.lx) / dt);
        st.lx = e.clientX; st.lt = e.timeStamp;
        h.onMove(dx);
      });
      const end = e => {
        const st = el._sw; if (!st || st.id !== e.pointerId) return;
        el._sw = null;
        if (st.on) { lastDrag = performance.now(); h.onEnd(e.clientX - st.x, st.v); }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  }

  window.Amala = {
    swipe,
    setTheme: (key, color) => {
      if (color) themes[key] = color; else delete themes[key];
      if (themeMeta) themeMeta.content = themes.cater || themes.feast || themeDefault;
    },
    dishes: MAINS, naira,
    add: id => change(index.get(id), 1),
    dec: id => change(index.get(id), -1),
    qty: id => qtyFor(index.get(id)),
    getChoice: (id, gi) => choice.get(`${id}:${gi}`) || index.get(id).opts[gi].choices[0],
    setChoice: (id, gi, val) => { choice.set(`${id}:${gi}`, val); refresh(); },
    lineName: id => lineText(index.get(id), picksFor(index.get(id))).name,
    onChange: fn => listeners.push(fn),
    basketEl: basket,
    openOrder: () => { if (lines.size) { renderSheet(); if (!dialog.open) dialog.showModal(); } },
  };

  document.addEventListener('click', e => {                       // copy buttons (account number)
    const b = e.target.closest('button.copy'); if (!b) return;
    const txt = b.dataset.copy, done = () => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (_) {} t.remove(); done(); }
  });

  $('#year').textContent = new Date().getFullYear();
  refresh();
})();
