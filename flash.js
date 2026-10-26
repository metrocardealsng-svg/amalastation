/* Amala Station: flash sale ("Chop Life") and the CEO message. */
(() => {
  'use strict';
  const A = window.Amala; if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Set an end time to show a countdown and hide the offer when it is over.
     Example: '2026-11-30T23:59:00+01:00'. Leave null to keep the offer open. */
  const FLASH_ENDS_AT = null;

  const section = $('#offer'), count = $('#flash-count');
  if (FLASH_ENDS_AT) {
    const end = new Date(FLASH_ENDS_AT).getTime();
    if (Date.now() >= end) { section.hidden = true; return; }
    count.hidden = false;
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) { section.hidden = true; return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
      count.textContent = `Ends in ${d ? d + 'd ' : ''}${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    };
    tick(); setInterval(tick, 1000);
  }

  /* Order now: add the plate, then open the order sheet ready to send. */
  const orderBtn = $('#flash-order');
  orderBtn.addEventListener('click', () => {
    if (A.qty('chop') === 0) A.add('chop');
    A.openOrder();
  });
  const label = () => { const q = A.qty('chop'); orderBtn.textContent = q ? `Review order · ${q} in basket` : 'Order now · ₦4,500'; };
  A.onChange(label); label();

  /* CEO video: tap to play with sound. */
  const box = $('#ceo-video'), v = $('#ceo-v'), play = $('#ceo-play'), note = $('#ceo-note');
  const fail = () => { note.hidden = false; box.classList.remove('is-playing'); };
  if (window.__noVideo) { v.removeAttribute('src'); v.querySelector('source') && v.querySelector('source').remove(); note.textContent = "Preview mode: this video plays on the live site."; note.hidden = false; }
  play.addEventListener('click', () => {
    if (window.__noVideo) return;
    v.muted = false; v.controls = true; box.classList.add('is-playing');
    const p = v.play(); if (p && p.catch) p.catch(fail);
    setTimeout(() => { if (v.paused && v.currentTime < 0.2) fail(); }, 3500);
  });
  v.addEventListener('error', fail, true);
  new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting && !v.paused) v.pause(); }); }, { threshold: 0.2 }).observe(box);

  /* Motion, same GSAP as the rest of the site. */
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const trig = { trigger: '.flash-banner', start: 'top 80%' };
  gsap.from('.flash-copy > *', { y: 28, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', scrollTrigger: trig });
  gsap.from('.flash-poster', { y: 70, rotate: -8, opacity: 0, duration: 0.95, ease: 'power3.out', scrollTrigger: trig });
  gsap.from('.flash-badge', { scale: 0, rotate: -50, duration: 0.7, delay: 0.35, ease: 'back.out(2.4)', scrollTrigger: trig });
  gsap.to('.flash-poster', { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.flash-banner', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.ceo-video', { y: 50, opacity: 0, scale: 0.95, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.ceo', start: 'top 80%' } });
  gsap.from('.ceo-copy > *', { y: 24, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.ceo', start: 'top 75%' } });
})();
