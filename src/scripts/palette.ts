// ⌘K palette: open with ⌘K / Ctrl+K or the pill button. Typing filters the
// commands; the first row asks JohnLM. A question closes the palette and goes
// to the chat panel (scripts/chat), where the conversation lives beside the
// page. Arrow keys move, Enter runs, Esc closes (native <dialog>).
import { esc, pageKey } from './ask';
import { hasChat } from './chat';


export function initPalette() {
  const dlg = document.querySelector<HTMLDialogElement>('[data-palette]');
  if (!dlg) return;
  const input = dlg.querySelector<HTMLInputElement>('[data-pal-input]')!;
  const ask = dlg.querySelector<HTMLElement>('[data-pal-ask]')!;
  const resume = dlg.querySelector<HTMLElement>('[data-pal-resume]')!;
  const askGroup = dlg.querySelector<HTMLElement>('[data-pal-askgroup]')!;
  const askQ = dlg.querySelector<HTMLElement>('[data-pal-q]')!;
  const chipBox = dlg.querySelector<HTMLElement>('[data-pal-chips]')!;
  const chipGroup = dlg.querySelector<HTMLElement>('[data-pal-chipgroup]')!;
  const chips: Record<string, string[]> = JSON.parse(dlg.dataset.chips || '{}');
  let sel = 0;

  // Suggested questions for the page the visitor is on
  const pageChips = chips[pageKey()] ?? chips.home ?? [];
  pageChips.forEach((q) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pal-item';
    b.setAttribute('role', 'option');
    b.dataset.palItem = '';
    b.dataset.group = 'Ask JohnLM';
    b.dataset.askQ = q;
    b.innerHTML = `<svg class="pi" viewBox="0 0 16 16" aria-hidden="true">${chipBox.dataset.icon ?? ''}</svg>${esc(q)}`;
    chipBox.appendChild(b);
  });
  chipGroup.dataset.group = 'Ask JohnLM';
  if (!pageChips.length) chipGroup.hidden = true;

  const items = () => [...dlg.querySelectorAll<HTMLElement>('[data-pal-item]')];
  const groups = () => [...dlg.querySelectorAll<HTMLElement>('.pal-group[data-group]')];
  items().forEach((el, i) => (el.id = `pal-opt-${i}`));
  const visible = () => items().filter((i) => !i.hidden && i.getAttribute('aria-disabled') !== 'true');

  function select(i: number) {
    const v = visible();
    if (!v.length) return;
    sel = (i + v.length) % v.length;
    items().forEach((x) => x.removeAttribute('aria-selected'));
    v[sel].setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', v[sel].id);
    v[sel].scrollIntoView({ block: 'nearest' });
  }

  function filter() {
    const q = input.value.trim().toLowerCase();
    items().forEach((i) => {
      if (i === ask) return;
      i.hidden = i.dataset.off === '1' || (!!q && !i.textContent!.toLowerCase().includes(q));
    });
    groups().forEach((g) => {
      const name = g.dataset.group!;
      g.hidden = !items().some((i) => i.dataset.group === name && !i.hidden);
    });
    ask.hidden = !q;
    askGroup.hidden = true;
    // One "Ask JohnLM" label: matching suggestions sit under the typed question
    if (q) chipGroup.hidden = true;
    askQ.textContent = q ? input.value.trim() : '';
    select(0);
  }

  function tick() {
    const t = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).format(new Date());
    const c = dlg!.querySelector<HTMLElement>('[data-pal-clock]');
    if (c) c.textContent = `London, ${t.replace(' ', '')}`;
  }

  function showList() {
    input.value = '';
    tick();
    resume.dataset.off = hasChat() ? '' : '1';
    filter();
  }

  // Questions are answered in the chat panel, beside the page
  function askJohnLM(question: string) {
    if (!question.trim()) return;
    dlg!.close();
    document.dispatchEvent(new CustomEvent('johnlm:ask', { detail: question }));
  }

  function open() {
    if (dlg!.open) return;
    showList();
    dlg!.showModal();
    input.focus();
  }

  function run(el: HTMLElement) {
    if (el.getAttribute('aria-disabled') === 'true') return;
    if (el === ask) return void askJohnLM(input.value);
    if (el === resume) { dlg!.close(); document.dispatchEvent(new CustomEvent('johnlm:open')); return; }
    if (el.dataset.askQ) return void askJohnLM(el.dataset.askQ);
    if (el.dataset.action === 'copy-email') {
      navigator.clipboard?.writeText(el.dataset.email!);
      const hint = el.querySelector('.hint');
      if (hint) hint.textContent = 'Copied!';
      setTimeout(() => dlg!.close(), 600);
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      dlg!.close();
      if (el.target === '_blank') window.open(el.href, '_blank', 'noopener');
      else location.href = el.href;
    }
  }

  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', open));
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dlg.open) dlg.close();
      else open();
    }
  });
  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const v = visible()[sel]; if (v) run(v); }
  });
  dlg.addEventListener('click', (e) => {
    const it = (e.target as HTMLElement).closest<HTMLElement>('[data-pal-item]');
    if (it) { e.preventDefault(); run(it); return; }
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('mousemove', (e) => {
    const it = (e.target as HTMLElement).closest<HTMLElement>('[data-pal-item]');
    if (it) select(visible().indexOf(it));
  });
}
