# Animation plans

From an `improve-animations` audit of Window seat (`/play/places/`) at commit a8f8ac4. Each plan is self-contained; run them with any agent.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Make stepping between passes a quick swap, not a replay](001-pass-step-swap.md) | HIGH | DONE |
| 002 | [Bring the photo in sooner when a pass opens](002-pass-open-timing.md) | MEDIUM | DONE |
| 003 | [Fly the card's plane with a transform, not `left`](003-card-plane-transform.md) | MEDIUM | DONE |
| 004 | [Fade the trip label in as each flight starts](004-now-label-fade.md) | LOW | DONE |
| 005 | [Let the map's plane fade out as it lands](005-plane-landing-fade.md) | LOW | DONE |

## Recommended order

1. **002**, then **001**. Both edit the pass's animation rules in `src/styles/global.css` (around lines 948–956); 002 retimes the first open, 001 adds the stepping rules next to them. Doing 002 first keeps 001's excerpts accurate.
2. **003**. Independent (Ticket markup plus card hover rules).
3. **004** and **005**. Independent of each other; both edit `paint()`/`fly()` in `src/pages/play/places.astro`, so run them one after the other, not in parallel.

Run `npm run gates` after each plan.
