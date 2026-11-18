// Tappable prototypes inside the phone frame on a case study. Each is a set of
// real screens from Figma with tap areas, timed steps (loaders) and swipes, so
// a visitor can walk the flow instead of reading about it. Data: src/data/protos.json.

type Hot = { x: number; y: number; w: number; h: number; to: string; label: string };
type Screen = { id: string; src?: string; alt: string; hot?: Hot[]; auto?: { ms: number; to: string }; swipe?: { left?: string; right?: string }; enter?: 'push' | 'fade' | 'sheet'; end?: boolean };
type Proto = { name: string; start: string; screens: Screen[]; w?: number; h?: number };

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

function mount(root: HTMLElement) {
  const proto = JSON.parse(root.dataset.proto || '{}') as Proto;
  // Tap areas are in the screen's own points (Rivva's 375 by 812 unless set).
  const W = proto.w ?? 375;
  const H = proto.h ?? 812;
  const base = root.dataset.base || '';
  const byId = new Map(proto.screens.map((s) => [s.id, s]));
  const srcOf = (s: Screen) => `${base}${s.src ?? s.id}.jpg`;
  const stage = root.querySelector<HTMLElement>('[data-proto-stage]')!;
  const hots = root.querySelector<HTMLElement>('[data-proto-hots]')!;
  const fig = root.closest('[data-proto-wrap], figure');
  const restart = fig?.querySelector<HTMLButtonElement>('[data-proto-restart]');
  const live = fig?.querySelector<HTMLElement>('[data-proto-live]');
  let current: Screen | undefined;
  let timer = 0;
  let warmed = false;

  // Fetch every screen once the visitor starts, so steps never wait on the network.
  const warm = () => {
    if (warmed) return;
    warmed = true;
    proto.screens.forEach((s) => { const i = new Image(); i.src = srcOf(s); });
  };

  function show(id: string, first = false) {
    const s = byId.get(id);
    if (!s) return;
    clearTimeout(timer);
    const img = document.createElement('img');
    img.src = srcOf(s);
    img.alt = s.alt;
    img.draggable = false;
    img.decoding = 'async';
    const enter = first || still ? 'none' : s.enter ?? 'push';
    img.className = `proto-scr is-${enter}`;
    const old = [...stage.children];
    stage.append(img);
    const settle = () => old.forEach((o) => o.remove());
    if (enter === 'none') settle();
    else img.addEventListener('animationend', settle, { once: true });
    current = s;
    hots.replaceChildren(
      ...(s.hot ?? []).map((h) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'proto-hot';
        b.setAttribute('aria-label', h.label);
        b.style.cssText = `left:${(h.x / W) * 100}%;top:${(h.y / H) * 100}%;width:${(h.w / W) * 100}%;height:${(h.h / H) * 100}%`;
        b.addEventListener('click', (e) => { e.stopPropagation(); warm(); show(h.to); });
        return b;
      }),
    );
    if (live && !first) live.textContent = s.alt;
    if (s.auto) timer = window.setTimeout(() => show(s.auto!.to), still ? 300 : s.auto.ms);
    if (restart) restart.hidden = !s.end && id === proto.start;
  }

  // A tap that misses shows where the tap areas are.
  stage.parentElement!.addEventListener('click', () => {
    warm();
    hots.classList.remove('is-hint');
    void hots.offsetWidth;
    hots.classList.add('is-hint');
  });

  // Swipe a card left or right.
  let x0 = 0;
  let y0 = 0;
  root.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  root.addEventListener('pointerup', (e) => {
    const dx = e.clientX - x0;
    if (!current?.swipe || Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(e.clientY - y0)) return;
    const to = dx < 0 ? current.swipe.left : current.swipe.right;
    if (to) { warm(); show(to); }
  });

  restart?.addEventListener('click', () => show(proto.start));
  show(proto.start, true);
}

export function initProtos() {
  document.querySelectorAll<HTMLElement>('[data-proto]').forEach(mount);
}
