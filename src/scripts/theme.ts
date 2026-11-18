// Light and dark. The site follows the system by default; the button on home
// cycles System → Light → Dark and remembers a choice in this browser. The
// first-paint script in Base.astro applies a saved choice before anything draws.

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'theme';
const ORDER: Theme[] = ['system', 'light', 'dark'];
const LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const BG = { light: '#f9f9f9', dark: '#111214' };

function saved(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

const dark = matchMedia('(prefers-color-scheme: dark)');

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;
  // The browser chrome follows the page, whichever way it was decided.
  const shown = t === 'system' ? (dark.matches ? 'dark' : 'light') : t;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = BG[shown]));
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    b.dataset.choice = t;
    const next = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    b.setAttribute('aria-label', `Theme: ${LABEL[t]}. Switch to ${LABEL[next]}`);
    b.title = `Theme: ${LABEL[t]}`;
  });
}

export function initTheme() {
  let current = saved();
  apply(current);
  dark.addEventListener('change', () => apply(current));
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    const tip = b.parentElement?.querySelector<HTMLElement>('[data-theme-tip]');
    let timer = 0;
    b.addEventListener('click', () => {
      current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      try {
        if (current === 'system') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, current);
      } catch {
        /* storage blocked: the choice lasts for this page */
      }
      // A quick cross-fade between themes, where the browser can do it.
      const swap = () => apply(current);
      if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(swap);
      else swap();
      if (tip) {
        tip.textContent = LABEL[current];
        tip.classList.add('is-on');
        clearTimeout(timer);
        timer = window.setTimeout(() => tip.classList.remove('is-on'), 1400);
      }
    });
  });
  // Another tab changed it.
  addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return;
    current = saved();
    apply(current);
  });
}
