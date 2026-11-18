// JohnLM's chat panel: where a conversation lives once a question is asked.
// It is a full-height panel on the right; the page moves over to make room, so
// a visitor can read an answer and the page it is about together. On a phone it
// is a sheet from the bottom. The conversation is kept for the tab, so
// following a link in an answer carries it to the next page.
//
// The dock's Ask button opens it. Questions also arrive from the ⌘K palette and
// the box on a case study (the `johnlm:ask` event), and from a passage picked
// on a case study.
import { createAsker, esc, pageKey, render, type Turn } from './ask';

const KEY = 'johnlm';
type SavedTurn = { q: string; a: string; follow: string[]; page?: string; about?: string };
type Saved = { turns: SavedTurn[]; open: boolean };

const load = (): Saved => {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    return { turns: Array.isArray(s.turns) ? s.turns : [], open: !!s.open };
  } catch {
    return { turns: [], open: false }; // storage blocked: the chat just isn't remembered
  }
};

/** Is there a conversation to go back to? The palette offers it when there is. */
export const hasChat = () => load().turns.length > 0;

export function initChat() {
  const panel = document.querySelector<HTMLElement>('[data-chat]');
  if (!panel) return;
  const body = panel.querySelector<HTMLElement>('[data-chat-body]')!;
  const thread = panel.querySelector<HTMLElement>('[data-chat-thread]')!;
  const empty = panel.querySelector<HTMLElement>('[data-chat-empty]')!;
  const chipBox = panel.querySelector<HTMLElement>('[data-chat-chips]')!;
  const form = panel.querySelector<HTMLFormElement>('[data-chat-form]')!;
  const input = panel.querySelector<HTMLTextAreaElement>('[data-chat-input]')!;
  const send = panel.querySelector<HTMLButtonElement>('[data-chat-send]')!;
  const left = panel.querySelector<HTMLElement>('[data-chat-left]')!;
  const clear = panel.querySelector<HTMLButtonElement>('[data-chat-clear]')!;
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-chat-toggle]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  const saved = load();
  const save = () => {
    try { sessionStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage blocked */ }
  };

  const end = panel.querySelector<HTMLElement>('[data-chat-end]')!;
  let isOpen = false;
  let hideTimer = 0;
  let opener: HTMLElement | null = null;

  const sync = () => {
    const any = saved.turns.length > 0; // a failed question isn't kept, so it doesn't count
    empty.hidden = thread.children.length > 0;
    clear.hidden = !any;
    end.hidden = !any;
    // The dock's Ask button is the way in; a dot on it says a conversation is waiting
    toggles.forEach((t) => {
      t.classList.toggle('has-thread', any);
      t.setAttribute('aria-expanded', String(isOpen));
      t.setAttribute('aria-label', isOpen ? 'Close the JohnLM chat' : any ? 'Back to your JohnLM conversation' : 'Ask JohnLM a question');
    });
  };

  // Making or giving back room re-centres the page 200px over in one step. Start it where it
  // was and let it slide to where it now belongs, so the move reads as a push, not a jump.
  const page = document.querySelector<HTMLElement>('main');
  const slide = (from: number) => {
    if (still || !page || !matchMedia('(min-width: 1000px)').matches) return;
    page.style.transition = 'none';
    page.style.translate = `${from}px 0`;
    void page.offsetWidth;
    page.style.transition = '';
    page.style.translate = '';
  };

  function open(focus = true, animate = true) {
    clearTimeout(hideTimer);
    if (!isOpen) {
      if (document.activeElement instanceof HTMLElement && !panel!.contains(document.activeElement)) opener = document.activeElement;
      panel!.hidden = false;
      if (animate && !still) void panel!.offsetWidth; // so the entrance runs from the closed state
      else { panel!.classList.add('no-anim'); requestAnimationFrame(() => requestAnimationFrame(() => panel!.classList.remove('no-anim'))); }
      panel!.classList.add('is-open');
      root.classList.add('has-chat'); // the page makes room (see global.css)
      if (animate) slide(200);
      isOpen = true;
      saved.open = true;
      save();
      sync();
    }
    if (focus) input.focus({ preventScroll: true });
  }

  function close(returnFocus = true) {
    if (!isOpen) return;
    const within = panel!.contains(document.activeElement);
    isOpen = false;
    saved.open = false;
    save();
    panel!.classList.remove('is-open');
    root.classList.remove('has-chat');
    slide(-200);
    hideTimer = window.setTimeout(() => { panel!.hidden = true; }, still ? 0 : 180);
    sync();
    if (returnFocus && within) (opener?.isConnected ? opener : toggles[0])?.focus({ preventScroll: true });
  }

  // A new question jumps to the top of the panel, with room below for the
  // answer to stream into
  const reveal = (t: HTMLElement) => {
    thread.querySelectorAll<HTMLElement>('.pa-turn').forEach((x) => (x.style.minHeight = ''));
    if (!t.previousElementSibling) return;
    requestAnimationFrame(() => {
      const pad = parseFloat(getComputedStyle(body).paddingTop) || 0;
      t.style.minHeight = `${body.clientHeight - pad * 2}px`;
      body.scrollTo({ top: t.offsetTop - thread.offsetTop, behavior: still ? 'auto' : 'smooth' });
    });
  };

  const seed: Turn[] = saved.turns.flatMap((t) => [{ role: 'user', content: t.q }, { role: 'assistant', content: t.a }] as Turn[]);
  const here = pageKey();
  const article = document.querySelector<HTMLElement>('.cs-body');

  // Where on this page an answer's facts are shown: the passages that share its figures
  // (43%, $1m, 1,000). Only real matches get a link, named by the heading they sit under.
  const cite = (turn: HTMLElement, answer: string) => {
    if (!article) return;
    const figures = [...new Set((answer.match(/[$£€]?\d[\d,.]*(?:%|[kmbKMB]\b)?/g) ?? []).map((x) => x.replace(/[.,]+$/, '')))].filter((x) => x.length > 1 && !/^(19|20)\d\d$/.test(x));
    if (!figures.length) return;
    const tests = figures.map((f) => new RegExp(`(^|[^\\d.,$£€])${f.replace(/[.$]/g, '\\$&')}(?![\\d%a-zA-Z]|[.,]\\d)`));
    const hits = [...article.querySelectorAll<HTMLElement>('p, li, figcaption, blockquote, td')]
      .map((el) => ({ el, n: tests.filter((t) => t.test(el.textContent ?? '')).length }))
      .filter((h) => h.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 2);
    if (!hits.length) return;
    const heading = (el: HTMLElement) => {
      for (let n: Element | null = el; n && n !== article; n = n.previousElementSibling ?? n.parentElement) if (/^H[2-4]$/.test(n.tagName)) return n.textContent?.trim();
    };
    const row = document.createElement('div');
    row.className = 'pa-cite';
    row.innerHTML = '<p class="pa-also">On this page</p>';
    const seen = new Set<string>();
    hits.forEach(({ el }) => {
      const name = heading(el) ?? 'Show me';
      if (seen.has(name)) return;
      seen.add(name);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pa-src';
      b.textContent = name;
      b.addEventListener('click', () => {
        if (matchMedia('(max-width: 640px)').matches) close(false); // the sheet would cover it
        el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
        el.classList.add('is-cited');
        setTimeout(() => el.classList.remove('is-cited'), 2400);
      });
      row.appendChild(b);
    });
    turn.querySelector('.pa-follow')?.before(row);
  };

  // A passage picked on the page that the next question is about
  const quote = panel.querySelector<HTMLElement>('[data-chat-quote]')!;
  let about = '';
  const setQuote = (t: string) => {
    about = t;
    quote.hidden = !t;
    quote.querySelector('[data-chat-quote-text]')!.textContent = t;
    input.placeholder = t ? 'Ask about this passage' : 'Ask a question';
  };
  quote.querySelector('[data-chat-quote-x]')!.addEventListener('click', () => { setQuote(''); input.focus({ preventScroll: true }); });

  // While an answer is being written, the send button is a stop button
  const setStop = (on: boolean) => {
    send.classList.toggle('is-stop', on);
    send.setAttribute('aria-label', on ? 'Stop the answer' : 'Send');
    send.disabled = on ? false : !input.value.trim();
  };

  const asker = createAsker(thread, pageKey, {
    onStart: () => { empty.hidden = true; thread.querySelectorAll('.pa-edit').forEach((b) => b.remove()); setStop(true); },
    onEnd: () => { setStop(false); sync(); },
    onLeft: (n) => { if (n <= 5) left.textContent = `${n} question${n === 1 ? '' : 's'} left today.`; },
    onTurn: (q, a, follow, passage) => {
      saved.turns.push({ q, a, follow, page: here, about: passage || undefined });
      saved.turns = saved.turns.slice(-12);
      save();
      cite(thread.lastElementChild as HTMLElement, a);
      editable(thread.lastElementChild as HTMLElement);
    },
    reveal,
  }, seed, panel.dataset.email);

  // The last question can be edited and asked again, as in Episode's chat: its turn is
  // taken back (from the screen, the saved conversation and the engine's memory) and re-asked.
  const editable = (turn: HTMLElement) => {
    const bubble = turn.querySelector<HTMLElement>('.pa-q');
    if (!bubble) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pa-edit';
    btn.setAttribute('aria-label', 'Edit your message');
    btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 3.5l2 2M3 13l.6-2.8 7.4-7.4 2.2 2.2-7.4 7.4z" /></svg>';
    // The pencil sits in a row with the bubble, just to its left
    const row = document.createElement('div');
    row.className = 'pa-qrow';
    bubble.before(row);
    row.append(btn, bubble);
    btn.addEventListener('click', () => {
      if (asker.busy) return;
      const form = document.createElement('form');
      form.className = 'pa-editor';
      form.innerHTML = '<textarea rows="1" maxlength="500" aria-label="Edit your message"></textarea><div><button type="button">Cancel</button><button type="submit">Send</button></div>';
      const field = form.querySelector('textarea')!;
      field.value = bubble.textContent ?? '';
      const cancel = () => { form.remove(); bubble.hidden = false; btn.hidden = false; btn.focus({ preventScroll: true }); };
      form.querySelector('button')!.addEventListener('click', cancel);
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); cancel(); }
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = field.value.trim();
        if (!q) return;
        const last = saved.turns.pop();
        save();
        asker.undo();
        turn.remove();
        if (last?.about) setQuote(last.about);
        ask(q);
      });
      bubble.hidden = true;
      btn.hidden = true;
      bubble.after(form);
      field.focus({ preventScroll: true });
      field.setSelectionRange(field.value.length, field.value.length);
    });
  };

  const ask = (q: string) => {
    if (!q.trim() || asker.busy) return;
    open(true);
    input.value = '';
    send.disabled = true;
    asker.ask(q, about);
    setQuote('');
  };

  const followBtn = (q: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pa-next';
    b.innerHTML = `<span>${esc(q)}</span>`;
    b.addEventListener('click', () => ask(q));
    return b;
  };

  // The greeting and the suggested questions are about the page the visitor is on
  const labels: Record<string, string> = JSON.parse(panel.dataset.labels || '{}');
  const hello = panel.querySelector<HTMLElement>('[data-chat-hello]')!;
  // A chip in the box names the page the answers will lean on
  const ctxChip = panel.querySelector<HTMLElement>('[data-chat-ctx]')!;
  const about0 = labels[here] ?? (here === 'play' ? 'Play' : '');
  ctxChip.textContent = about0;
  ctxChip.hidden = !about0;
  if (labels[here]) hello.textContent = `Ask me about John's work on ${labels[here]}. I answer from what's on this site.`;
  else if (here === 'play') hello.textContent = "Ask me about John away from work. I answer from what's on this site.";
  const chips: Record<string, string[]> = JSON.parse(panel.dataset.chips || '{}');
  (chips[here] ?? chips.home ?? []).slice(0, 4).forEach((q) => chipBox.appendChild(followBtn(q)));

  // Put an earlier conversation back as it was
  saved.turns.forEach((t, i) => {
    const turn = document.createElement('div');
    turn.className = 'pa-turn';
    turn.innerHTML = `${t.about ? `<div class="pa-quote">${esc(t.about)}</div>` : ''}<div class="pa-q">${esc(t.q)}</div><div class="pa-a">${render(t.a)}</div><div class="pa-follow"></div>`;
    if (i === saved.turns.length - 1 && t.follow.length) {
      const f = turn.querySelector('.pa-follow')!;
      f.insertAdjacentHTML('beforeend', '<p class="pa-also">You could also ask</p>');
      t.follow.forEach((q) => f.appendChild(followBtn(q)));
    }
    thread.appendChild(turn);
    if (t.page === here) cite(turn, t.a);
    if (i === saved.turns.length - 1) editable(turn);
  });

  // The way out leads to John: the conversation as an email to him, or copied
  const transcript = () => saved.turns.map((t) => `Q: ${t.q}\nA: ${t.a}`).join('\n\n');
  end.querySelector<HTMLAnchorElement>('[data-chat-mail]')!.addEventListener('click', (e) => {
    const body = `Hi John,\n\nI asked JohnLM about your work and wanted to follow up.\n\nMy conversation:\n\n${transcript()}`.slice(0, 1600);
    (e.currentTarget as HTMLAnchorElement).href = `mailto:${panel.dataset.email}?subject=${encodeURIComponent('A question from your site')}&body=${encodeURIComponent(body)}`;
  });
  const copy = end.querySelector<HTMLButtonElement>('[data-chat-copy]')!;
  copy.addEventListener('click', () => {
    navigator.clipboard?.writeText(transcript()).then(() => {
      copy.textContent = 'Copied';
      setTimeout(() => (copy.textContent = 'Copy the conversation'), 1600);
    }).catch(() => {});
  });

  // Select to ask: pick a passage in a case study and ask about it. Pointer devices only;
  // on touch the system's own selection menu sits in the same place.
  if (article && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'ask-sel';
    pick.textContent = 'Ask about this';
    pick.hidden = true;
    document.body.append(pick);
    let picked = '';
    const place = () => {
      const sel = getSelection();
      const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!sel || sel.isCollapsed || text.length < 12 || !article.contains(sel.anchorNode)) { pick.hidden = true; return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      picked = text.slice(0, 280);
      pick.style.left = `${Math.min(Math.max(r.left + r.width / 2, 70), innerWidth - 70)}px`;
      pick.style.top = `${Math.max(r.top - 42, 8)}px`;
      pick.hidden = false;
    };
    article.addEventListener('pointerup', () => setTimeout(place, 0));
    document.addEventListener('selectionchange', () => { if (getSelection()?.isCollapsed) pick.hidden = true; });
    addEventListener('scroll', () => { pick.hidden = true; }, { passive: true });
    pick.addEventListener('pointerdown', (e) => e.preventDefault()); // keep the selection until the click
    pick.addEventListener('click', () => {
      pick.hidden = true;
      getSelection()?.removeAllRanges();
      setQuote(picked);
      open(true);
    });
  }

  document.addEventListener('johnlm:ask', (e) => ask((e as CustomEvent<string>).detail));
  document.addEventListener('johnlm:open', () => open(true));
  document.querySelectorAll('[data-chat-open]').forEach((b) => b.addEventListener('click', () => open(true)));
  toggles.forEach((t) => t.addEventListener('click', () => (isOpen ? close() : open(true))));
  panel.querySelector('[data-chat-min]')?.addEventListener('click', () => close());
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  input.addEventListener('input', () => { if (!asker.busy) send.disabled = !input.value.trim(); });
  // Enter sends; Shift+Enter starts a new line
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); if (asker.busy) asker.stop(); else ask(input.value); });
  clear.addEventListener('click', () => {
    if (asker.busy) return;
    saved.turns = [];
    save();
    asker.reset();
    thread.replaceChildren();
    left.textContent = '';
    sync();
    input.focus({ preventScroll: true });
  });

  sync();
  // Carried over from the last page: back open, without stealing focus or replaying the entrance.
  // Not on a phone, where the sheet would cover the page the visitor just chose; the dot on
  // the Ask button says the conversation is waiting.
  if (saved.open && saved.turns.length && !matchMedia('(max-width: 640px)').matches) {
    open(false, false);
    requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
  } else {
    root.classList.remove('has-chat');
    if (saved.open) { saved.open = false; save(); }
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('chat-instant')));
}
