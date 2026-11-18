// The Play passport: stamps a visitor collects by exploring the site. Any page
// earns one by dispatching `passport:stamp` with the stamp's id; this script
// keeps progress, shows a small stamp toast, and fills the passport on Play.
// Progress lives in this browser only (localStorage); nothing is sent anywhere.
import { openCard } from './card';

export type Stamp = {
  id: string;
  title: string;
  /** How to earn it. `link` names the words in the hint that go to `href`. */
  hint: string;
  link?: string;
  href?: string;
  color: string;
  icon: string;
  solid?: boolean;
  shape: 'circle' | 'groove' | 'ticket' | 'octagon' | 'square' | 'oval';
};

export const STAMPS: Stamp[] = [
  { id: 'wheels-up', title: 'Wheels up', hint: 'Watch a flight land on Window seat.', link: 'Window seat', href: '/play/places/', color: '#7c3aed', shape: 'circle', icon: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z', solid: true },
  { id: 'boarding-pass', title: 'Boarding pass', hint: 'Open a trip’s boarding pass on Window seat.', link: 'Window seat', href: '/play/places/', color: '#E2603B', shape: 'ticket', icon: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z' },
  { id: 'crate-digger', title: 'Crate digger', hint: 'Play a song on Heavy rotation.', link: 'Heavy rotation', href: '/play/music/', color: '#4F8EF7', shape: 'groove', icon: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { id: 'badge-collector', title: 'Badge collector', hint: 'Tap all five badges above.', color: '#E85D9A', shape: 'octagon', icon: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z', solid: true },
  { id: 'ask', title: 'Ask me anything', hint: 'Ask JohnLM a question.', color: '#9B7BF7', shape: 'square', icon: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z' },
  { id: 'long-haul', title: 'Long haul', hint: 'Open every trip from one year on Window seat.', link: 'Window seat', href: '/play/places/', color: '#2E9E6A', shape: 'oval', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18' },
];

const KEY = 'je-passport';

/** Long haul only counts years with at least this many trips; a one-trip
 *  year would make it the same as Boarding pass. */
export const LONG_HAUL_MIN = 3;

// Each earned stamp with when it was earned (ms). An early draft stored a
// plain list of ids, which still reads, just without dates.
function read(): Map<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as unknown;
    if (Array.isArray(raw)) return new Map(raw.map((id: string) => [id, 0]));
    return new Map(Object.entries(raw as Record<string, number>));
  } catch {
    return new Map();
  }
}

function write(m: Map<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(m)));
  } catch {
    /* private mode or blocked storage: the stamp still shows for this visit */
  }
}

let earned = read();

function icon(st: Stamp) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (st.solid) svg.classList.add('is-solid');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', st.icon);
  svg.append(p);
  return svg;
}

// The toast rises out of the Work/Play dock in the dock's own dark: the stamp,
// what it was, and a dot per stamp so progress reads at a glance. The last
// stamp adds a way to the note.
let toastTimer = 0;
function toast(st: Stamp) {
  let el = document.querySelector<HTMLElement>('.pp-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'pp-toast';
    el.setAttribute('role', 'status');
    // A manual popover, so the toast sits above an open dialog too.
    el.setAttribute('popover', 'manual');
    document.body.append(el);
    const hold = () => clearTimeout(toastTimer);
    const release = () => { toastTimer = window.setTimeout(() => el?.classList.remove('is-on'), 2400); };
    el.addEventListener('pointerenter', hold);
    el.addEventListener('pointerleave', release);
    el.addEventListener('focusin', hold);
    el.addEventListener('focusout', release);
  }
  const done = earned.size === STAMPS.length;
  const ink = document.createElement('span');
  ink.className = 'pp-toast-ink';
  ink.style.setProperty('--c', st.color);
  ink.append(icon(st));
  const text = document.createElement('span');
  text.className = 'pp-toast-text';
  const k = document.createElement('span');
  k.className = 'pp-toast-k';
  k.textContent = done ? 'Passport complete' : `Stamp ${earned.size} of ${STAMPS.length}`;
  const t = document.createElement('span');
  t.className = 'pp-toast-t';
  t.textContent = st.title;
  text.append(k, t);
  const dots = document.createElement('span');
  dots.className = 'pp-toast-dots';
  dots.setAttribute('aria-hidden', 'true');
  for (const s of STAMPS) {
    const d = document.createElement('i');
    if (earned.has(s.id)) d.style.setProperty('--c', s.color);
    if (s.id === st.id) d.className = 'is-new';
    dots.append(d);
  }
  const parts: HTMLElement[] = [ink, text, dots];
  if (done) {
    const go = document.createElement('a');
    go.className = 'pp-toast-go';
    go.href = '/?mode=play#passport';
    go.textContent = 'Read the note';
    parts.push(go);
  }
  el.classList.toggle('is-done', done);
  // Over an open pass or card the dock is hidden and its bottom edge holds the
  // caption and controls, so the toast drops in from the top instead.
  el.classList.toggle('is-top', !!document.querySelector('dialog[open]'));
  el.replaceChildren(...parts);
  el.classList.remove('is-on');
  if (el.showPopover) {
    // Re-showing puts it back on top of anything opened since.
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
  }
  void el.offsetWidth;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el?.classList.remove('is-on'), done ? 6000 : 2800);
}

export function stamp(id: string) {
  const st = STAMPS.find((s) => s.id === id);
  if (!st || earned.has(id)) return;
  earned.set(id, Date.now());
  write(earned);
  toast(st);
  render();
  document.querySelectorAll<HTMLElement>(`[data-stamp="${id}"]`).forEach((li) => {
    li.classList.remove('is-new');
    void li.offsetWidth;
    li.classList.add('is-new');
  });
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// The date line on the stamp itself, as a passport stamp prints it: 13 OCT 26.
function inked(ms: number) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function render() {
  document.querySelectorAll<HTMLElement>('[data-passport]').forEach((root) => {
    root.querySelectorAll<HTMLElement>('[data-stamp]').forEach((b) => {
      const id = b.dataset.stamp ?? '';
      const on = earned.has(id);
      b.classList.toggle('is-earned', on);
      const date = b.querySelector('[data-stamp-date]');
      if (date) date.textContent = on ? inked(earned.get(id) ?? 0) : '';
      const st = STAMPS.find((x) => x.id === id);
      if (st) b.setAttribute('aria-label', `${st.title}, ${on ? 'stamped' : 'not yet'}`);
    });
    const count = root.querySelector('[data-passport-count]');
    if (count) count.textContent = `${earned.size} of ${STAMPS.length}`;
    const done = earned.size === STAMPS.length;
    const note = root.querySelector<HTMLElement>('[data-passport-note]');
    if (note) note.hidden = !done;
    const journey = root.querySelector<HTMLElement>('[data-passport-journey]');
    if (journey) {
      const line = done ? route() : '';
      journey.textContent = line;
      journey.hidden = !line;
    }
  });
}

// For the note: the visitor's own first and last stamp, and when.
function route() {
  const order = [...earned].filter(([, at]) => at).sort((a, b) => a[1] - b[1]);
  if (order.length !== STAMPS.length) return '';
  const name = (id: string) => STAMPS.find((x) => x.id === id)?.title ?? id;
  const day = (ms: number) => new Date(ms).toDateString();
  const when = (ms: number) =>
    day(ms) === day(Date.now()) ? 'today' : `on ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
  const [first, firstAt] = order[0];
  const [last, lastAt] = order[order.length - 1];
  return day(firstAt) === day(lastAt)
    ? `You started with ${name(first)} and finished with ${name(last)}, all ${when(firstAt)}.`
    : `You started with ${name(first)} ${when(firstAt)} and finished with ${name(last)} ${when(lastAt)}.`;
}

// Tap a stamp and it opens up like the Known for badges: when it was stamped,
// or, not yet earned, faint with how to earn it and where.
function explain(b: HTMLButtonElement) {
  const st = STAMPS.find((x) => x.id === b.dataset.stamp);
  const svg = b.querySelector('svg');
  if (!st || !svg) return;
  const at = earned.get(st.id);
  const on = at !== undefined;
  // Long haul names the years that count, which the page works out from the trips.
  const years = st.id === 'long-haul' ? b.closest<HTMLElement>('[data-long-haul]')?.dataset.longHaul?.split(',').filter(Boolean) : null;
  const hint = years?.length
    ? `Open every trip from ${
        years.length > 2 ? `any of ${years.slice(0, -1).join(', ')}, or ${years.at(-1)}` : years.length === 2 ? `either ${years[0]} or ${years[1]}` : years[0]
      } on Window seat.`
    : st.hint;
  let story: (string | Node)[] = [hint];
  const i = st.link ? hint.indexOf(st.link) : -1;
  if (!on && i >= 0 && st.href) {
    const a = document.createElement('a');
    a.className = 'inline';
    a.href = st.href;
    a.textContent = st.link!;
    story = [hint.slice(0, i), a, hint.slice(i + st.link!.length)];
  }
  openCard({
    art: svg.cloneNode(true) as SVGElement,
    title: st.title,
    when: on ? (at ? `Stamped ${new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Stamped') : 'Not yet',
    story,
    color: on ? st.color : '#c9ccd3',
    tilt: on ? getComputedStyle(b).getPropertyValue('--r') : '0deg',
    ink: true,
    locked: !on,
    from: b,
  });
}

export function initPassport() {
  document.addEventListener('passport:stamp', (e) => stamp(String((e as CustomEvent).detail)));
  // Another tab may earn stamps too.
  addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    earned = read();
    render();
  });
  document.querySelectorAll<HTMLButtonElement>('button[data-stamp]').forEach((b) => b.addEventListener('click', () => explain(b)));
  render();
}
