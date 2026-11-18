# 002 — Bring the photo in sooner when a pass opens

- **Status**: DONE
- **Commit**: a8f8ac4
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 5 lines

## Problem

When a Window seat pass opens, the photo is the content people came for, but it lands about 0.8s after opening (220ms delay + 560ms) and about 1s in browsers that run the card-to-pass morph (420ms delay + 560ms). Modal content should settle within the 200–500ms modal budget. The stub tear (640ms) also outlasts the open.

```css
/* src/styles/global.css:948-952 — current */
.ws-detail.is-showing .ws-photo { animation: wsPhoto 560ms var(--ease-out) 220ms both; }
.ws-detail.is-morph.is-showing .ws-photo { animation-delay: 420ms; }
.ws-ticket-big { position: relative; z-index: 1; }
.ws-detail.is-showing .ws-ticket-big .tk-stub { animation: wsTear 640ms var(--ease-out) 140ms both; }
.ws-detail.is-morph.is-showing .ws-ticket-big .tk-stub { animation-delay: 380ms; }
```

```css
/* src/styles/global.css:970 — current */
@keyframes wsPhoto { from { opacity: 0; transform: translateY(28%) scale(0.96); } to { opacity: 1; transform: none; } }
```

## Target

- Photo: 380ms, `var(--ease-out)`, starting 80ms in (300ms when the morph runs, so it starts as the 420ms morph settles).
- Stub tear: 480ms, `var(--ease-out)`, starting 60ms in (260ms with the morph).
- The photo rises a shorter distance: `translateY(14%)` instead of 28%.
- `--ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)`, already a token on `:root`.

```css
/* target */
.ws-detail.is-showing .ws-photo { animation: wsPhoto 380ms var(--ease-out) 80ms both; }
.ws-detail.is-morph.is-showing .ws-photo { animation-delay: 300ms; }
.ws-ticket-big { position: relative; z-index: 1; }
.ws-detail.is-showing .ws-ticket-big .tk-stub { animation: wsTear 480ms var(--ease-out) 60ms both; }
.ws-detail.is-morph.is-showing .ws-ticket-big .tk-stub { animation-delay: 260ms; }
@keyframes wsPhoto { from { opacity: 0; transform: translateY(14%) scale(0.96); } to { opacity: 1; transform: none; } }
```

## Repo conventions to follow

- Use the `--ease-out` token; durations are written inline in ms as elsewhere in `global.css` (e.g. `dialog.ws-detail[open]:not(.is-morph) { animation: wsIn 260ms var(--ease-out); }` at line 941).

## Steps

1. In `src/styles/global.css`, replace lines 948–952 (shown above) with the first five lines of **Target**.
2. Replace the `@keyframes wsPhoto` line (970) with the last line of **Target**.

## Boundaries

- Do NOT touch the view-transition rules (`::view-transition-group(ws-pass)`), `wsIn`, or the stepping rules (Plan 001).
- Motion values only; no markup or script changes.
- If the code doesn't match (drift since a8f8ac4), STOP and report.

## Verification

- **Mechanical**: `npm run gates` passes with 0 errors and 0 warnings.
- **Feel check** (`npm run dev`, `/play/places/`, open a trip with a photo, e.g. Zanzibar, the first card):
  - The photo is fully in view within about half a second of tapping.
  - In Chrome (which runs the morph), the photo starts rising as the pass finishes growing, not after a pause.
  - The stub tears quickly and settles before the photo does.
  - DevTools → Animations at 10%: photo 380ms, stub 480ms, no gap between morph end and photo start.
  - Reduced motion: the photo appears instantly and the stub shows torn (existing reduced-motion rules, unchanged).
- **Done when**: photo and stub animations match the Target values exactly.
