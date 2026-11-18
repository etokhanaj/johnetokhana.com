// The open-up card on Play, shared by the Known for badges and the passport
// stamps: the art large over a soft wash of its colour, a date, a title and a
// line of story. One dialog lives in the page (dialog[data-kf]).

export type Card = {
  art: SVGElement;
  title: string;
  when?: string;
  story: (string | Node)[];
  color: string;
  tilt?: string;
  /** Ink art (a stamp) rather than a sticker: no lift shadow. */
  ink?: boolean;
  /** A stamp not earned yet: drawn faint with a dashed edge. */
  locked?: boolean;
  from: HTMLElement;
};

let from: HTMLElement | null = null;
let wired = false;

function wire(kf: HTMLDialogElement) {
  if (wired) return;
  wired = true;
  const shut = () => {
    if (!kf.open) return;
    kf.classList.add('is-closing');
    setTimeout(() => {
      kf.close();
      kf.classList.remove('is-closing');
      from?.focus({ preventScroll: true });
    }, 160);
  };
  kf.querySelector('[data-kf-close]')?.addEventListener('click', shut);
  kf.addEventListener('click', (e) => { if (e.target === kf) shut(); });
  kf.addEventListener('cancel', (e) => { e.preventDefault(); shut(); });
}

export function openCard(c: Card) {
  const kf = document.querySelector<HTMLDialogElement>('dialog[data-kf]');
  if (!kf) return;
  wire(kf);
  from = c.from;
  const q = (k: string) => kf.querySelector<HTMLElement>(`[data-kf-${k}]`)!;
  const card = kf.querySelector<HTMLElement>('.kf-card')!;
  card.style.setProperty('--c', c.color);
  card.style.setProperty('--tilt', c.tilt ?? '0deg');
  const art = q('art');
  art.classList.toggle('is-ink', !!c.ink);
  art.classList.toggle('is-locked', !!c.locked);
  art.replaceChildren(c.art);
  q('when').textContent = c.when ?? '';
  q('when').hidden = !c.when;
  q('title').textContent = c.title;
  q('story').replaceChildren(...c.story);
  kf.showModal();
}
