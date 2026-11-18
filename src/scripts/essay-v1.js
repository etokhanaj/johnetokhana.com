import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ThinkingOrb } from 'thinking-orbs';

/* Claude demos: a message, a thinking orb, tool steps that run and tick,
   then the reply streams in word by word. Like Episode's agent chat. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const demos = [...document.querySelectorAll('.essay-v1 .claude')];
  if (!demos.length) return;

  const orbs = new Map();
  const mountOrb = (el, state, size) => {
    const root = createRoot(el);
    root.render(createElement(ThinkingOrb, { state, size, theme: 'light' }));
    orbs.set(el, root);
  };
  const unmountOrb = (el) => { const r = orbs.get(el); if (r) { r.unmount(); orbs.delete(el); } };

  // Wrap each word of a message in a span so it can stream in.
  const wordify = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.appendChild(s); }
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
    };
    walk(el);
    return [...el.querySelectorAll('.w')];
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const play = async (demo) => {
    const kids = [...demo.children];
    const think = demo.querySelector('.think-row');
    const started = performance.now();
    let ran = 0;
    const label = () => {
      const secs = Math.max(1, Math.round((performance.now() - started) / 1000));
      return `Worked ${secs}s` + (ran ? ` · ${ran} step${ran > 1 ? 's' : ''}` : '');
    };
    for (const k of kids) {
      if (k.classList.contains('think-row')) {
        k.classList.add('in');
        mountOrb(k.querySelector('.orb'), 'working', 20);
        await wait(1100);
        continue;
      }
      if (k.classList.contains('tool')) {
        const ok = k.querySelector('.ok');
        const spin = document.createElement('span'); spin.className = 'orb-sm';
        ok.before(spin); mountOrb(spin, 'searching', 20);
        k.classList.add('in', 'running');
        await wait(900);
        unmountOrb(spin); spin.remove(); k.classList.remove('running');
        ran += 1;
        await wait(150);
        continue;
      }
      if (k.classList.contains('msg')) {
        if (think && !think.classList.contains('done')) {
          unmountOrb(think.querySelector('.orb'));
          think.classList.add('done');
          think.querySelector('.tl').textContent = label();
        }
        const words = wordify(k);
        k.classList.add('in');
        for (const w of words) { w.classList.add('on'); await wait(28); }
        await wait(220);
        continue;
      }
      k.classList.add('in');
      await wait(380);
    }
    if (think && think.classList.contains('done')) think.querySelector('.tl').textContent = label();
  };

  if (reduce) {
    demos.forEach((d) => {
      d.classList.add('js-stream');
      [...d.children].forEach((k) => k.classList.add('in'));
      const t = d.querySelector('.think-row');
      if (t) { t.classList.add('done'); t.querySelector('.tl').textContent = 'Worked'; }
    });
    return;
  }
  demos.forEach((d) => d.classList.add('js-stream'));
  const io = new IntersectionObserver((es, o) => {
    es.forEach((e) => { if (e.isIntersecting) { play(e.target); o.unobserve(e.target); } });
  }, { threshold: 0.3 });
  demos.forEach((d) => io.observe(d));
})();

/* Nia demo (vignette 5): stream the chat in, then play the confirm flow */
  (function () {
    var nia = document.querySelector('.nia');
    if (!nia) return;
    var kids = [].slice.call(nia.children);
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // leave the whole thread visible, no motion
    // hide the streamable rows up front (inline = always wins)
    kids.forEach(function (k) {
      k.style.opacity = '0';
      k.style.transform = 'translateY(9px)';
      k.style.transition = 'opacity .5s var(--ease), transform .5s var(--ease)';
    });
    var played = false;
    function run() {
      if (played) return; played = true;
      var t = 200;
      kids.forEach(function (k) {
        var gap = k.classList.contains('m') ? 660 : k.classList.contains('card') ? 680 : 460;
        setTimeout(function () { k.style.opacity = '1'; k.style.transform = 'none'; }, t);
        t += gap;
      });
      // confirm flow, once the whole thread has streamed in
      setTimeout(function () {
        var btn = nia.querySelector('.confirm');
        var btns = nia.querySelector('.btns');
        var note = nia.querySelector('.note');
        var applied = nia.querySelector('.applied');
        var card = nia.querySelector('.card');
        var label = nia.querySelector('.ct .cl');
        var icon = nia.querySelector('.ct .ci');
        if (btn) btn.classList.add('press');
        setTimeout(function () {
          if (btns) btns.classList.add('gone');
          if (note) note.classList.add('gone');
          if (card) card.classList.add('resolved');
          if (label) label.textContent = '2 changes applied';
          if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#5fd48c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6"/></svg>';
          setTimeout(function () { if (applied) applied.classList.add('show'); }, 260);
        }, 560);
      }, t + 640);
    }
    // trigger when in view — IntersectionObserver, with a scroll/load fallback so it can never stay hidden
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es, o) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); o.unobserve(e.target); } });
      }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
      obs.observe(nia);
    }
    function inView() {
      var r = nia.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top < vh * 0.82 && r.bottom > 60;
    }
    function check() { if (inView()) { run(); window.removeEventListener('scroll', check); } }
    window.addEventListener('scroll', check, { passive: true });
    check();
  })();

/* Point 1: real Yada screens crossfade in the simulator, only while on screen */
(function () {
  var seq = document.querySelector('.essay-v1 [data-seq]');
  if (!seq || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var on = false;
  new IntersectionObserver(function (es) { on = es[0].isIntersecting; }, { threshold: 0.3 }).observe(seq);
  setInterval(function () {
    if (!on || document.hidden) return;
    var imgs = [].slice.call(seq.querySelectorAll('img'));
    var i = imgs.findIndex(function (im) { return im.classList.contains('on'); });
    imgs[i].classList.remove('on');
    imgs[(i + 1) % imgs.length].classList.add('on');
  }, 2200);
})();
