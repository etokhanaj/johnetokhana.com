// JohnLM's answer engine, used by the chat panel (scripts/chat): one turn per question (a thinking orb, the answer streaming in, then
// follow-up questions), with the last few turns sent back as history.

export type Turn = { role: 'user' | 'assistant'; content: string };

// The server reads at most this much of a question (netlify/johnlm/request.mjs)
const MAX = 500;

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Small, safe markdown: paragraphs, bullet lists, **bold**, [links](https://…).
export function render(md: string) {
  const inline = (t: string) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_m, txt, href) => {
        const ext = href.startsWith('http');
        return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`;
      })
      // Email addresses become links, except inside a link that was just made
      .split(/(<a [^>]*>.*?<\/a>)/)
      .map((part, i) => (i % 2 ? part : part.replace(/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '$1<a href="mailto:$2">$2</a>')))
      .join('');
  return md
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

// Pulls [[follow-up: …]] markers out of the answer.
export function split(text: string) {
  const follow: string[] = [];
  const body = text.replace(/\[\[\s*follow-?up:\s*([^\]]+?)\s*\]\]/gi, (_m, q) => {
    follow.push(q.trim());
    return '';
  });
  // Hide a marker that is still streaming in
  return { body: body.replace(/\[\[[^\]]*$/, ''), follow };
}

export function pageKey() {
  const p = location.pathname.replace(/\/+$/, '');
  if (!p) return document.documentElement.dataset.mode === 'play' ? 'play' : 'home';
  const m = p.match(/^\/work\/([a-z-]+)/);
  if (m) return m[1];
  if (p.startsWith('/notes-ai')) return 'notes-ai';
  return 'home';
}

// The thinking orb Episode uses, loaded only when someone asks.
let orbLib: Promise<{ mount: (el: HTMLElement) => () => void }> | null = null;
export function loadOrb() {
  orbLib ??= Promise.all([import('react'), import('react-dom/client'), import('thinking-orbs')]).then(([react, dom, orbs]) => ({
    mount(el: HTMLElement) {
      const root = dom.createRoot(el);
      root.render(react.createElement(orbs.ThinkingOrb, { state: 'working', size: 20, theme: 'light' }));
      return () => root.unmount();
    },
  }));
  return orbLib;
}

export type AskHooks = {
  onStart?: () => void; // a question is about to be sent
  onEnd?: () => void; // the turn finished, answered or not
  onLeft?: (left: number) => void; // questions left today
  reveal?: (turn: HTMLElement) => void; // bring the new turn into view
  onTurn?: (question: string, answer: string, follow: string[], about: string) => void; // a turn was answered in full
};

// `seed` is an earlier conversation to carry on from (the panel keeps one per tab).
// `email` is where a question goes when JohnLM can't answer it.
export function createAsker(thread: HTMLElement, page: () => string, hooks: AskHooks = {}, seed: Turn[] = [], email = '') {
  let history: Turn[] = seed.slice(-6);
  let busy = false;
  let ctrl: AbortController | null = null; // the request in flight, so it can be stopped

  // `about` is a passage from the page the question refers to: shown above the
  // question as a quote, and sent along with it.
  async function ask(question: string, about = '') {
    question = question.trim();
    if (!question || busy) return;
    // The question is kept whole; the passage gives way when the two together run long
    const wrap = (passage: string) => `About this passage from the page: "${passage}"\n\n${question}`;
    const room = MAX - wrap('').length;
    const sent = about && room >= 20 ? wrap(about.length > room ? `${about.slice(0, room - 1)}…` : about) : question;
    busy = true;
    document.dispatchEvent(new CustomEvent('passport:stamp', { detail: 'ask' }));
    hooks.onStart?.();
    thread.querySelectorAll('.pa-turn.is-err').forEach((t) => t.remove());
    // Only the latest answer offers follow-ups; earlier ones would be stale
    thread.querySelectorAll('.pa-follow').forEach((f) => f.replaceChildren());

    const turn = document.createElement('div');
    turn.className = 'pa-turn';
    turn.innerHTML = `${about ? `<div class="pa-quote">${esc(about)}</div>` : ''}<div class="pa-q">${esc(question)}</div>
      <div class="pa-think" role="status"><span class="pa-orb" aria-hidden="true"></span><span class="pa-tl">Thinking…</span></div>
      <div class="pa-a"></div><div class="pa-follow"></div>`;
    thread.appendChild(turn);
    (hooks.reveal ?? ((t: HTMLElement) => t.scrollIntoView({ block: 'nearest' })))(turn);
    const think = turn.querySelector<HTMLElement>('.pa-think')!;
    const out = turn.querySelector<HTMLElement>('.pa-a')!;
    const follow = turn.querySelector<HTMLElement>('.pa-follow')!;
    let unmount: (() => void) | null = null;
    loadOrb().then((o) => { if (!think.classList.contains('done')) unmount = o.mount(think.querySelector('.pa-orb')!); }).catch(() => {});

    let text = '';
    let left: number | null = null;
    const stopThinking = () => {
      if (think.classList.contains('done')) return;
      think.classList.add('done');
      unmount?.();
      think.hidden = true;
    };
    // When JohnLM can't answer, the question isn't lost: it can be tried again, or sent to
    // John by email with the question already written. The address is copied as well,
    // because a mail link does nothing on a device with no mail app set up.
    const fail = (msg: string, retry = true) => {
      stopThinking();
      turn.classList.add('is-err');
      out.innerHTML = `<p class="pa-err">${msg}</p>`;
      if (retry) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pa-act pa-act--retry';
        b.textContent = 'Try again';
        b.addEventListener('click', () => ask(question, about));
        follow.appendChild(b);
      }
      if (!email) return;
      const a = document.createElement('a');
      a.className = 'pa-act pa-act--mail';
      a.textContent = 'Email John this question';
      a.href = `mailto:${email}?subject=${encodeURIComponent('A question from your site')}&body=${encodeURIComponent(`Hi John,\n\nI wanted to ask:\n\n${question}\n`)}`;
      a.addEventListener('click', () => {
        navigator.clipboard?.writeText(email).catch(() => {});
        a.textContent = `${email} (copied)`;
      });
      follow.appendChild(a);
    };

    // The end of a turn, whether it ran to the end or was stopped part-way
    const finish = () => {
      stopThinking();
      const { body, follow: next } = split(text);
      out.innerHTML = render(body);
      history.push({ role: 'user', content: sent }, { role: 'assistant', content: body.trim() });
      history = history.slice(-6);
      if (next.length) follow.insertAdjacentHTML('beforeend', '<p class="pa-also">You could also ask</p>');
      next.slice(0, 3).forEach((q) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pa-next';
        b.innerHTML = `<span>${esc(q)}</span>`;
        b.addEventListener('click', () => ask(q));
        follow.appendChild(b);
      });
      hooks.onTurn?.(question, body.trim(), next.slice(0, 3), about);
      if (left !== null) hooks.onLeft?.(left);
    };

    try {
      ctrl = new AbortController();
      const res = await fetch('/api/ask', {
        signal: ctrl.signal,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: sent, page: page(), history }),
      });
      if (!res.ok || !res.body) {
        const code = res.status === 429 ? 'limit' : res.status === 503 ? 'offline' : 'failed';
        throw new Error(code);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const ev of events) {
          const line = ev.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const data = JSON.parse(line.slice(6));
          if (data.t) {
            stopThinking();
            text += data.t;
            out.innerHTML = render(split(text).body);
          } else if (data.done) {
            left = data.left ?? null;
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      }
      finish();
    } catch (e) {
      // Stopped by the visitor: keep what was written so far, or drop an empty turn
      if ((e as Error).name === 'AbortError') {
        if (text.trim()) finish();
        else turn.remove();
        return;
      }
      const code = (e as Error).message;
      if (code === 'limit') fail("That's today's 20 questions. Come back tomorrow, or send John yours by email.", false);
      else if (code === 'offline') fail('JohnLM is offline right now. You can send John your question by email.', false);
      else if (code === 'busy') fail('Lots of questions right now. Give it a minute, or send John yours by email.');
      else fail("I couldn't answer that just now. Try again, or send John your question by email.");
    } finally {
      busy = false;
      ctrl = null;
      hooks.onEnd?.();
    }
  }

  return {
    ask,
    get busy() { return busy; },
    reset() { history = []; },
    /** Stop the answer being written. What has arrived so far stays. */
    stop() { ctrl?.abort(); },
    /** Forget the last question and its answer, so it can be asked again differently. */
    undo() { history = history.slice(0, -2); },
  };
}
