# 004 — Fade the trip label in as each flight starts

- **Status**: DONE
- **Commit**: a8f8ac4
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 2 files, ~8 lines

## Problem

Under Window seat's map, the label (e.g. "Sep 2021 · Lagos to Zanzibar") swaps its text instantly every 2.8 seconds while the map animates the next flight. The jump reads as a glitch beside the smooth flight; a short fade-up ties the label to the route being drawn.

```js
/* src/pages/play/places.astro:214 — current (inside paint) */
    if (nowEl) nowEl.textContent = li.dataset.now || '';
```

```css
/* src/styles/global.css:906 — current */
.ws-now { flex: 1; min-width: 0; margin: 0 4px; font-size: 14px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
```

## Target

- When the text actually changes, it fades up over 160ms with `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`, from `opacity: 0; transform: translateY(4px)`.
- No animation when the text is unchanged, and none with reduced motion.

```css
/* target */
.ws-now.is-new { animation: wsNow 160ms var(--ease-out); }
@keyframes wsNow { from { opacity: 0; transform: translateY(4px); } }
```

## Repo conventions to follow

- `still` (a `matchMedia('(prefers-reduced-motion: reduce)').matches` boolean) is already defined at the top of the page script; branch on it.
- Class toggle + forced reflow to restart a keyframe is the existing pattern (e.g. `ring.classList.remove('is-on'); void ring.getBoundingClientRect(); ring.classList.add('is-on');` in `land()`).

## Steps

1. In `src/pages/play/places.astro`, replace line 214 with:
   ```js
    const label = li.dataset.now || '';
    if (nowEl && nowEl.textContent !== label) {
      nowEl.textContent = label;
      if (!still) {
        nowEl.classList.remove('is-new');
        void nowEl.offsetWidth;
        nowEl.classList.add('is-new');
      }
    }
   ```
2. In `src/styles/global.css`, directly after the `.ws-now { … }` rule (906), add the two lines from **Target**.

## Boundaries

- Do NOT change `aria-live="polite"` on the label or its markup.
- Do NOT animate anything else in `paint()`.
- If the code doesn't match (drift since a8f8ac4), STOP and report.

## Verification

- **Mechanical**: `npm run gates` passes.
- **Feel check** (`npm run dev`, `/play/places/`):
  - As each new flight starts, the label rises 4px and fades in, in time with the plane taking off.
  - Picking the same card again does not re-animate the label.
  - Reduced motion: the label simply changes.
- **Done when**: label changes animate for 160ms and identical updates don't.
