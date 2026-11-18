# JohnLM evals

Golden questions for JohnLM, sent through the exact request the live chat sends (`netlify/johnlm/request.mjs`, shared with `netlify/functions/ask.mjs`): same model, effort, max tokens, fallback beta, cached system prompt and `<page>` prefix. Multi-turn cases carry history the way the site does: the raw question, then the answer with its follow-ups stripped.

## What it checks

**Hard checks decide pass or fail.** Every answer, every turn:

- no em dashes
- none of "Great question", "delve", "passionate", "seamless", "leverage"
- 2 or 3 `[[follow-up: …]]` lines, at the very end
- 40 to 160 words without the follow-ups (a case can widen this, e.g. when detail is asked for)
- no private names or numbers (the list in `private.local.json`, which is not committed; see `private.mjs`), no Berlin, no "eight years", "four years in brand" or "worked as an engineer", no multipliers like 4.5x

Then each case's own patterns (`cases.mjs`): `mustMatch` against the last answer, `mustNotMatch` against every answer. The 38 cases cover Episode with and without the passcode, Rivva, Kora, MilkyWay, refusals, tone and unknowns. About a quarter are marked `holdout`. Don't tune the prompt against those directly. They show whether a fix generalises.

**The judge only adds a score** (`EVALS_JUDGE=1`). Claude Sonnet 5.5 reads facts.md, the system rules and the case study, then scores accuracy, coherence, and rules and tone, 0 to 5 each, with a one-line reason. A failed judge call never fails a case.

**Gate:** every hard check passes. With the judge on, the mean judge score must also be at least 4, with no accuracy score below 3. The run exits 1 when the gate fails.

## Run it

Paid: it calls the API with your key. The key is read from `JOHNLM_KEY` only. It is never printed, logged or written to a file.

```sh
read -s JOHNLM_KEY && export JOHNLM_KEY && npm run evals:johnlm
EVALS_JUDGE=1 npm run evals:johnlm                 # with the judge
EVALS_ONLY=episode-impact,kora-results npm run evals:johnlm
EVALS_SHOW_RESPONSE=1 npm run evals:johnlm         # print failing answers
```

It rebuilds the bundle first, then runs the cases one at a time, grouped by mode so each system prompt stays cached. It prints a pass/fail table and writes:

- `last-run.md`: every answer and failure (gitignored; answers are long)
- `trend.jsonl`: one line per run (date, git sha, pass counts, holdout, judge means, gate, cost). Tracked, so commit it after a run you want to keep. A filtered run is tagged `only`.

`npm test` runs the free checks (`tests/johnlm-evals.test.ts`): the cases parse, the patterns compile, the hard checks work, and the shared helper builds the same request `ask.mjs` sends.

## Cost

These are estimates. Check the prices in `run.mjs` against anthropic.com/pricing. A full run is about 40 requests on Claude Opus 5.5, against cached system prompts of roughly 20k (full) and 16k (public) tokens: about **$0.50 to $1**. The judge adds about **$0.50**. The real figure for each run is printed at the end and stored in `trend.jsonl`.
