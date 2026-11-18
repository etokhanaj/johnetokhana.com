// Work | Play pill. On the home page it swaps the content in place; elsewhere
// it navigates home in that mode. Mode lives in sessionStorage, so a new visit
// always opens on Work.
import { rain } from './rain';

type Mode = 'work' | 'play';

export function initDock() {
  const seg = document.querySelector<HTMLElement>('.seg');
  if (!seg) return;
  const ind = seg.querySelector<HTMLElement>('.thumb-ind')!;
  const btns = [...seg.querySelectorAll<HTMLButtonElement>('[data-mode-btn]')];
  const isHome = document.body.hasAttribute('data-home');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onPlayPage = location.pathname.startsWith('/play/');
  const current = (): Mode => (onPlayPage || (isHome && document.documentElement.dataset.mode === 'play') ? 'play' : 'work');

  function place(mode: Mode, animate: boolean) {
    const b = btns.find((x) => x.dataset.modeBtn === mode)!;
    if (!animate) ind.style.transition = 'none';
    ind.style.width = `${b.offsetWidth}px`;
    ind.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (!animate) requestAnimationFrame(() => (ind.style.transition = ''));
  }

  function enter(mode: Mode) {
    const root = document.documentElement;
    root.dataset.mode = mode;
    try {
      sessionStorage.setItem('mode', mode);
    } catch { /* storage blocked: the mode just isn't remembered */ }
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    url.hash = '';
    history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    // Fresh entrance for whatever is now visible
    document.querySelectorAll<HTMLElement>(`[data-for="${mode}"]`).forEach((block) => {
      block.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => el.classList.add('in'));
      if (reduce) return;
      block.classList.remove('mode-in', 'play-in');
      [...block.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i)));
      void block.offsetWidth;
      block.classList.add('mode-in');
      if (mode === 'play') block.classList.add('play-in');
    });
    if (mode === 'play' && !reduce) {
      // The sticker rain is a first-visit moment, not something every switch repeats
      let seen = false;
      try { seen = sessionStorage.getItem('rained') === '1'; sessionStorage.setItem('rained', '1'); } catch { /* storage blocked: rain each time */ }
      if (!seen) rain();
    }
  }

  place(current(), false);
  addEventListener('resize', () => place(current(), false));
  document.fonts?.ready.then(() => place(current(), false));

  btns.forEach((b) =>
    b.addEventListener('click', () => {
      const mode = b.dataset.modeBtn as Mode;
      if (!isHome) {
        location.href = `/?mode=${mode}`;
        return;
      }
      if (mode === current()) return;
      place(mode, true);
      enter(mode);
    }),
  );

  // Arriving on Play from another page still gets the entrance, then goes to
  // any section the link named (the passport toast links to #passport).
  if (isHome && current() === 'play' && new URLSearchParams(location.search).get('mode') === 'play') {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    requestAnimationFrame(() => {
      enter('play');
      target?.scrollIntoView({ block: 'start' });
    });
  }
}
