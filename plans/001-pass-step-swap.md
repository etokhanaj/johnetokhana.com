# 001 — Make stepping between passes a quick swap, not a replay

- **Status**: DONE
- **Commit**: a8f8ac4
- **Severity**: HIGH
- **Category**: Purpose & frequency / Interruptibility
- **Estimated scope**: 2 files, ~25 lines

> Executed. One deviation: the reduced-motion rule is written `.ws-detail.is-swap[data-dir] .ws-ticket-big` so it outranks the `[data-dir="next|prev"]` slide rules (as written in step 4 it lost on specificity).

## Problem

On Window seat (`/play/places/`), the open boarding pass has previous/next buttons and the ← → keys. Each step calls `fill()`, which re-adds `is-showing` to the dialog. That replays the whole opening sequence on every press: the pass slides in over 380ms, the stub tears again over 640ms (after 140ms), and the photo rises again over 560ms (after 220ms). These are `@keyframes`, so each press restarts them from zero; pressing quickly makes the pass flicker and jump. A repeated, keyboard-driven action must not carry the full flourish.

```js
/* src/pages/play/places.astro:331-336 — current (inside fill) */
      dlg.dataset.dir = dir || '';
      dlg.classList.remove('is-showing');
      void dlg.offsetWidth;
      dlg.classList.add('is-showing');
    };
```

```js
/* src/pages/play/places.astro:358-363 — current */
    const step = (d) => {
      if (list.length < 2) return;
      k = (k + d + list.length) % list.length;
      dlg.classList.remove('is-morph');
      fill(btnAt(k), d > 0 ? 'next' : 'prev');
    };
```

```css
/* src/styles/global.css:953-956 — current */
.ws-detail.is-showing[data-dir="next"] .ws-ticket-big { animation: wsFromNext 380ms var(--ease-out); }
.ws-detail.is-showing[data-dir="prev"] .ws-ticket-big { animation: wsFromPrev 380ms var(--ease-out); }
@keyframes wsFromNext { from { opacity: 0; transform: translateX(28px); } }
@keyframes wsFromPrev { from { opacity: 0; transform: translateX(-28px); } }
```

## Target

- The first open keeps its full sequence (unchanged).
- A step swaps content with a 160ms fade-and-shift: the pass moves in 12px from the side you're heading, the photo and caption fade in. The stub is already torn and the photo does not rise.
- Easing: `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)` (already defined in `src/styles/global.css` `:root`).

```css
/* target */
.ws-detail.is-step .ws-ticket-big .tk-stub { animation: none; transform: translate(3%, 2%) rotate(5deg); }
.ws-detail.is-step .ws-photo { animation: none; }
.ws-detail.is-swap[data-dir="next"] .ws-ticket-big { animation: wsFromNext 160ms var(--ease-out); }
.ws-detail.is-swap[data-dir="prev"] .ws-ticket-big { animation: wsFromPrev 160ms var(--ease-out); }
.ws-detail.is-swap .ws-photo, .ws-detail.is-swap .ws-caption { animation: wsSwap 160ms var(--ease-out); }
@keyframes wsFromNext { from { opacity: 0; transform: translateX(12px); } }
@keyframes wsFromPrev { from { opacity: 0; transform: translateX(-12px); } }
@keyframes wsSwap { from { opacity: 0; } }
```

## Repo conventions to follow

- Easing tokens are on `:root` in `src/styles/global.css` (`--ease-out`, `--ease-in-out`, `--ease-drawer`, `--ease-spring`). Use the token, never a hand-typed curve.
- Restarting a keyframe by toggling a class with a forced reflow is the existing pattern: see `fill()` above (`classList.remove(...)`, `void dlg.offsetWidth`, `classList.add(...)`).

## Steps

1. In `src/pages/play/places.astro`, replace the four lines at the end of `fill()` (shown above) with:
   ```js
      dlg.dataset.dir = dir || '';
      if (dir) {
        // Stepping: a quick swap. The stub stays torn and the photo doesn't rise again.
        dlg.classList.add('is-step');
        dlg.classList.remove('is-swap');
        void dlg.offsetWidth;
        dlg.classList.add('is-swap');
        return;
      }
      dlg.classList.remove('is-step', 'is-swap', 'is-showing');
      void dlg.offsetWidth;
      dlg.classList.add('is-showing');
    };
   ```
2. In the same file, in `close()`, change the `done` line from
   `dlg.classList.remove('is-morph', 'is-showing');` to
   `dlg.classList.remove('is-morph', 'is-showing', 'is-step', 'is-swap');`
3. In `src/styles/global.css`, replace the four lines at 953–956 (shown above) with the eight lines in **Target**, in that order. The `is-swap` photo rule must come after the `is-step` photo rule.
4. In the `@media (prefers-reduced-motion: reduce)` block near the end of the Window seat styles (currently around line 971), add:
   ```css
     .ws-detail.is-swap .ws-ticket-big { animation: wsSwap 160ms var(--ease-out); }
   ```
   (Reduced motion keeps the fade and drops the sideways shift.)

## Boundaries

- Do NOT change the first-open sequence (`is-showing`, `wsTear`, `wsPhoto`, the view transition). Plan 002 retimes it separately.
- Do NOT change markup or the `step()`/`open()` logic beyond the steps above.
- Do NOT add dependencies.
- If the code you find doesn't match the excerpts (drift since a8f8ac4), STOP and report.

## Verification

- **Mechanical**: `npm run gates` (type check, lint, tests, build) passes with 0 errors and 0 warnings.
- **Feel check** (`npm run dev`, open `/play/places/`, tap the middle ticket):
  - The first open still slides in, tears the stub and raises the photo.
  - Press → ten times quickly: each pass appears within a blink, never re-tears, never flickers from a restarted long animation.
  - The stub is shown torn on every stepped pass.
  - DevTools → Animations at 10%: the stepped pass moves only 12px and the photo only fades.
  - Rendering → emulate `prefers-reduced-motion: reduce`: stepping fades with no sideways movement.
- **Done when**: stepping shows no animation longer than 160ms, and the first open is unchanged.
