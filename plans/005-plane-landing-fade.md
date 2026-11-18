# 005 — Let the map's plane fade out as it lands

- **Status**: DONE
- **Commit**: a8f8ac4
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 1 file, ~10 lines

## Problem

On Window seat's map, the plane flies each route and then vanishes in a single frame the instant it reaches the destination (`visibility: hidden`), while the landing ring pulses and the photo print pops up. The disappearance reads as a cut rather than an arrival.

```js
/* src/pages/play/places.astro:182-198 — current (fly) */
  const fly = (a, li) => {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    craft?.setAttribute('visibility', 'visible');
    const frame = (now) => {
      /* … moves the plane along the arc … */
      if (t < 1) raf = requestAnimationFrame(frame);
      else { craft?.setAttribute('visibility', 'hidden'); land(li, false); }
    };
    raf = requestAnimationFrame(frame);
  };
```

```js
/* src/pages/play/places.astro:200-202 — current (start of paint) */
  const paint = (k, flying) => {
    cancelAnimationFrame(raf);
    craft?.setAttribute('visibility', 'hidden');
```

## Target

- On landing, the plane (`craft`, an SVG `<g>`) fades from opacity 1 to 0 over 160ms with `cubic-bezier(0.23, 1, 0.32, 1)` (the `--ease-out` token's value; WAAPI needs the literal), then is hidden. The ring and print still trigger at the same moment.
- Any new flight or a pick cancels a fade in progress so the plane never appears half-faded.
- Opacity only; do not scale the `<g>` (its `transform` attribute holds the position, and a scale would move it).

## Repo conventions to follow

- The page script drives this plane with JS (rAF), since the path is dynamic; WAAPI (`element.animate`) is the right tool for this short fade.
- The ease-out curve value is `cubic-bezier(0.23, 1, 0.32, 1)` (`--ease-out` in `src/styles/global.css`).

## Steps

1. In `src/pages/play/places.astro`, inside `fly()`, replace
   `craft?.setAttribute('visibility', 'visible');`
   with
   ```js
    craft?.getAnimations().forEach((x) => x.cancel());
    craft?.setAttribute('visibility', 'visible');
   ```
2. In the same function, replace
   `else { craft?.setAttribute('visibility', 'hidden'); land(li, false); }`
   with
   ```js
      else {
        land(li, false);
        const out = craft?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
        if (out) out.onfinish = () => craft.setAttribute('visibility', 'hidden');
        else craft?.setAttribute('visibility', 'hidden');
      }
   ```
3. At the start of `paint()`, replace
   `craft?.setAttribute('visibility', 'hidden');`
   with
   ```js
    craft?.getAnimations().forEach((x) => x.cancel());
    craft?.setAttribute('visibility', 'hidden');
   ```

## Boundaries

- Do NOT change the flight itself (`DRAW`, `ease`, the arc drawing) or `land()`.
- Reduced motion already skips the replay (no `fly()` calls); no extra handling needed.
- If the code doesn't match (drift since a8f8ac4), STOP and report.

## Verification

- **Mechanical**: `npm run gates` passes. The console shows no errors during a full replay loop.
- **Feel check** (`npm run dev`, `/play/places/`, let the replay run):
  - The plane reaches the destination and fades out quickly as the ring pulses; no single-frame cut.
  - Press › mid-flight and mid-fade: the plane never shows half-faded on the next route.
  - DevTools → Animations at 10%: a 160ms opacity fade on the plane at each landing.
- **Done when**: every landing fades the plane, and picks or new flights cancel the fade cleanly.
