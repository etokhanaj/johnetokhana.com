# 003 — Fly the card's plane with a transform, not `left`

- **Status**: DONE
- **Commit**: a8f8ac4
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files, ~10 lines

> Executed. One deviation: the mover plane rule also sets `transform: none`, because the full ticket's `.tk-plane` rule (`global.css`, `transform: translateX(-50%)`) would otherwise shift the card plane by half its width.

## Problem

On Window seat's carousel cards, hovering (or focusing) a card flies the small plane along the dotted route. The plane moves by animating `left`, a layout property, for 720ms on every card hover. It is the only non-transform animation on the page.

```astro
<!-- src/components/Ticket.astro:50-54 — current (compact card) -->
          <span class="tk-path" aria-hidden="true">
            {flight ? <svg class="tk-plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" /></svg> : <span class="tk-dot"></span>}
            <span class="tk-line"></span>
            <span class="tk-end-dot"></span>
          </span>
```

```css
/* src/styles/global.css:856-860 — current */
.tk--compact .tk-path > svg.tk-plane { position: absolute; left: 0; top: 50%; z-index: 1; transform: translateY(-50%); display: block; width: 5.6cqi; height: 5.6cqi; overflow: visible; fill: var(--accent); stroke: none; transition: left 720ms var(--ease-in-out); }
.tk--compact .tk-dot { position: absolute; left: 1cqi; top: 50%; transform: translateY(-50%); width: 2.2cqi; height: 2.2cqi; }
.tk--compact .tk-line { position: absolute; left: 2cqi; right: 1cqi; top: 50%; border-top: 0.45cqi dotted #b9b2a2; }
.tk--compact .tk-line::after { /* … */ transition: transform 720ms var(--ease-in-out); }
.tk--compact .tk-end-dot { /* … */ transition: background-color 240ms var(--ease), scale 240ms var(--ease-spring); }
```

```css
/* src/styles/global.css:932-936 — current */
@media (prefers-reduced-motion: no-preference) {
  .ws-ticket:is(:hover, :focus-visible) .tk-path > svg.tk-plane { left: calc(100% - 7.4cqi); }
  .ws-ticket:is(:hover, :focus-visible) .tk-line::after { transform: scaleX(1); }
  .ws-ticket:is(:hover, :focus-visible) .tk-end-dot { background: var(--accent); scale: 1.5; transition-delay: 560ms; }
}
```

(Line 857 is the `.tk--compact .tk-dot` rule; confirm by searching `tk--compact .tk-dot`.)

## Target

- Wrap the plane (or dot) in a `tk-mover` span that spans the run: from the left of the path to `7.4cqi` before its right edge.
- Animate the mover's `translate` from `0 -50%` to `100% -50%`. `100%` of the mover's own width equals the current travel distance (`100% - 7.4cqi` of the path), so the plane lands exactly where it does today.
- Duration 600ms with `var(--ease-in-out)` = `cubic-bezier(0.77, 0, 0.175, 1)` (on-screen movement), for the plane and the line fill alike. Destination dot delay 470ms (was 560ms) so it still lights as the plane arrives.

```css
/* target */
.tk--compact .tk-mover { position: absolute; left: 0; right: 7.4cqi; top: 50%; z-index: 1; height: 5.6cqi; translate: 0 -50%; transition: translate 600ms var(--ease-in-out); }
.tk--compact .tk-mover > svg.tk-plane { position: absolute; left: 0; top: 0; display: block; width: 5.6cqi; height: 5.6cqi; overflow: visible; fill: var(--accent); stroke: none; }
.tk--compact .tk-mover > .tk-dot { position: absolute; left: 1cqi; top: 50%; transform: translateY(-50%); width: 2.2cqi; height: 2.2cqi; }
/* .tk-line::after keeps its rule but uses 600ms: */
.tk--compact .tk-line::after { /* unchanged except */ transition: transform 600ms var(--ease-in-out); }

@media (prefers-reduced-motion: no-preference) {
  .ws-ticket:is(:hover, :focus-visible) .tk-mover { translate: 100% -50%; }
  .ws-ticket:is(:hover, :focus-visible) .tk-line::after { transform: scaleX(1); }
  .ws-ticket:is(:hover, :focus-visible) .tk-end-dot { background: var(--accent); scale: 1.5; transition-delay: 470ms; }
}
```

## Repo conventions to follow

- The page already moves things with the individual `translate` property (e.g. `.ws-ticket:hover { translate: 0 -3px; }` at `global.css:926`). Use `translate`, not `transform`, on the mover.
- Tokens: `--ease-in-out` on `:root` in `global.css`.

## Steps

1. In `src/components/Ticket.astro` (compact branch, line 51), wrap the plane/dot expression in a mover span:
   ```astro
            <span class="tk-mover">{flight ? <svg class="tk-plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" /></svg> : <span class="tk-dot"></span>}</span>
   ```
   Do NOT change the full ticket's markup (the non-compact branch further down the file, around line 80).
2. In `src/styles/global.css`, replace the `.tk--compact .tk-path > svg.tk-plane` rule (856) and the `.tk--compact .tk-dot` rule (857) with the three `.tk-mover` rules from **Target**.
3. In the `.tk--compact .tk-line::after` rule (859), change only `transition: transform 720ms var(--ease-in-out);` to `transition: transform 600ms var(--ease-in-out);`.
4. Replace the three hover lines inside `@media (prefers-reduced-motion: no-preference)` (933–935) with the three lines from **Target**.

## Boundaries

- Do NOT touch the full-size ticket styles (`.tk-path > svg:first-child`, `.tk-plane` outside `.tk--compact`).
- Do NOT change the Play page fan (`.fan.fan--ticket`); it uses compact tickets but has no hover flight.
- No new dependencies. If the code doesn't match (drift since a8f8ac4), STOP and report.

## Verification

- **Mechanical**: `npm run gates` passes. In DevTools → Performance, record a card hover: no Layout events during the plane's flight.
- **Feel check** (`npm run dev`, `/play/places/`):
  - Hover the middle card: the plane flies from the origin code to just before the destination dot, as before, and the violet line fills behind it at the same pace.
  - The destination dot lights as the plane arrives, not before.
  - Move the mouse off mid-flight: the plane reverses smoothly from where it is (transition, not restart).
  - Cards without a start (if any) show the dot still; nothing moves oddly.
  - Reduced motion: no flight.
- **Done when**: the plane's movement is a `translate` transition and its end position matches the old one at desktop and phone widths.
