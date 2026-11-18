// Home tile logos replay a small gesture of their own on a loop, each at its
// own pace so neighbours never move together, and always come back to the
// same resting logo. Hover (or keyboard focus) pauses the loop and brings up
// the screen as before. Loops run only while a tile is on screen and the tab
// is visible, never with reduced motion. The gestures live in global.css
// under .lg-replay.

// How often each logo moves, and when it first moves after scrolling in. The
// draw-in entrance takes about 1.4s, so the first loop waits for it to finish
// and rest before moving again.
const PLANS: Record<string, { every: number; offset: number }> = {
  episode: { every: 7000, offset: 4000 },
  milkyway: { every: 11000, offset: 5200 },
  kora: { every: 8000, offset: 6400 },
  rivva: { every: 9000, offset: 7600 },
  pablo: { every: 10000, offset: 8800 },
};

export function initTiles() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll<HTMLAnchorElement>('.cards a.thumb').forEach((tile) => {
    const plan = PLANS[tile.pathname.split('/').filter(Boolean)[1]];
    if (!plan) return;
    let visible = false;
    let held = false; // hovered or focused
    let timer = 0;

    const beat = () => {
      if (!visible || held || document.hidden) return;
      tile.classList.remove('lg-replay');
      void tile.offsetWidth; // restart the keyframes
      tile.classList.add('lg-replay');
    };
    const stop = () => window.clearTimeout(timer);
    const start = (delay: number) => {
      stop();
      const run = () => {
        beat();
        timer = window.setTimeout(run, plan.every);
      };
      timer = window.setTimeout(run, delay);
    };

    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !held) start(plan.offset);
        else stop();
      },
      { threshold: 0.5 },
    ).observe(tile);

    const hold = () => { held = true; stop(); };
    const release = () => { held = false; if (visible) start(plan.every / 2); };
    tile.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold(); });
    tile.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') release(); });
    tile.addEventListener('focus', hold);
    tile.addEventListener('blur', release);
  });
}
