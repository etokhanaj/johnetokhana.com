# johnetokhana.com

John Etokhana's portfolio: a static [Astro](https://astro.build) site on Netlify, with two small server functions.

## What is here

| Path | What it holds |
| --- | --- |
| `src/pages/` | Home (Work and Play), the Play pages, and the case study route |
| `src/content/work/` | The case studies, written in MDX |
| `src/components/` | Page components; `cs/` holds the case study blocks (figures, charts, the flow diagram) |
| `src/scripts/` | Browser code: the JohnLM chat panel, the command menu, the dock, motion |
| `src/styles/global.css` | All styles and design tokens, light and dark |
| `src/data/site.ts` | The site's data: projects, places, music, links |
| `netlify/functions/ask.mjs` | JohnLM, the chat that answers questions about the work |
| `netlify/functions/now-playing.mjs` | What John is listening to, from Spotify |
| `evals/johnlm/` | Test questions for JohnLM and the checks its answers must pass |
| `tests/` | Unit tests |

## Run it

```sh
npm install
npm run dev      # the site on localhost
npm run gates    # type check, lint, tests and a full build
```

The functions need keys that are set in Netlify, not in this repo. Without them the site still runs: JohnLM says it is offline and the music page uses its saved list.

## JohnLM

JohnLM answers only from what John has written.

1. `scripts/build-johnlm.mjs` runs before each build. It packs three things into one prompt: the rules (`src/content/johnlm/system.md`), a fact file (`src/content/johnlm/facts.md`) and the text of every case study.
2. `netlify/functions/ask.mjs` sends a visitor's question with that prompt to Claude and streams the answer back.
3. Each visitor gets 20 questions a day, and there is a ceiling for all visitors together. Questions and answers are logged for review, with no personal data beyond a daily-rotating hash.
4. `evals/johnlm/` holds questions with hard checks (wording, length, things that must never be said). `npm run evals:johnlm` runs them against the live model; the free checks run in `npm test`.

The names and numbers JohnLM must never say are kept in a local file that is not committed (`evals/johnlm/private.mjs` explains how).

## Screens and recordings

Product screens in the case studies are the real apps on fictional data. Where a state was seeded, the study or its alt text says so.

## About this copy

This is a public copy of the site's code for review. Two things differ from the private repo the site is built from:

- JohnLM's rules and fact file (`src/content/johnlm/system.md` and `facts.md`) are short examples. The live site uses fuller private versions.
- The list of names and numbers JohnLM must never say is not included, so those checks run against placeholder terms.
