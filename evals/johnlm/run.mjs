// Runs JohnLM's golden cases against the live request settings.
//
//   read -s JOHNLM_KEY && export JOHNLM_KEY && npm run evals:johnlm
//
// EVALS_ONLY=id1,id2    run only these cases (the trend line is tagged `only`)
// EVALS_JUDGE=1         also score each case with the judge (judge.mjs)
// EVALS_SHOW_RESPONSE=1 print the answer of every failing case
//
// Paid: every run calls the API. The key is read from JOHNLM_KEY only and is
// never printed, logged or written anywhere.
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildRequest, clientOptions, MAX_HISTORY, MODEL, readAsk, REFUSAL_ANSWER } from '../../netlify/johnlm/request.mjs';
import { cases as allCases } from './cases.mjs';
import { body, checkCase } from './checks.mjs';
import { judge, judgeSystem, JUDGE_MODEL } from './judge.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// USD per million tokens. Check these against anthropic.com/pricing before
// trusting the cost line: they were right when this was written (Oct 2026).
// Cache writes are 1.25x input (5-minute TTL); cache reads are 0.1x input.
const PRICES = {
  [MODEL]: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  [JUDGE_MODEL]: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
};

const cost = (model, u) => {
  const p = PRICES[model];
  if (!p || !u) return 0;
  return ((u.input_tokens ?? 0) * p.input + (u.output_tokens ?? 0) * p.output
    + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6;
};

const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const mean = (xs) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

// One visitor conversation, the way src/scripts/ask.ts holds it: the raw
// question, then the answer with its follow-ups stripped.
export async function converse(client, system, kase) {
  let history = [];
  const answers = [];
  let usd = 0;
  const tokens = { in: 0, cacheRead: 0, cacheWrite: 0, out: 0 };
  for (const turn of kase.turns) {
    const { question, page, history: clean } = readAsk({ question: turn, page: kase.page, history });
    const stream = client.beta.messages.stream(buildRequest({ system, page, question, history: clean }));
    const final = await stream.finalMessage();
    let answer = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (final.stop_reason === 'refusal' && !answer) answer = REFUSAL_ANSWER;
    answers.push(answer);
    const u = final.usage;
    usd += cost(MODEL, u);
    tokens.in += u?.input_tokens ?? 0;
    tokens.cacheRead += u?.cache_read_input_tokens ?? 0;
    tokens.cacheWrite += u?.cache_creation_input_tokens ?? 0;
    tokens.out += u?.output_tokens ?? 0;
    history.push({ role: 'user', content: turn }, { role: 'assistant', content: body(answer) });
    history = history.slice(-MAX_HISTORY);
  }
  return { answers, usd, tokens };
}

async function main() {
  const key = (process.env.JOHNLM_KEY || '').trim();
  if (!key) {
    console.error('JOHNLM_KEY is not set. Run: read -s JOHNLM_KEY && export JOHNLM_KEY && npm run evals:johnlm');
    process.exit(1);
  }

  // Rebuild the bundle so the evals see the current content
  execSync('node scripts/build-johnlm.mjs', { cwd: ROOT, stdio: 'inherit' });
  const { SYSTEM, SYSTEM_PUBLIC } = await import(`${pathToFileURL(resolve(ROOT, 'netlify/johnlm/bundle.mjs')).href}?t=${Date.now()}`);

  const only = (process.env.EVALS_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  const useJudge = process.env.EVALS_JUDGE === '1';
  const show = process.env.EVALS_SHOW_RESPONSE === '1';
  const unknown = only.filter((id) => !allCases.some((c) => c.id === id));
  if (unknown.length) {
    console.error(`No case with id: ${unknown.join(', ')}`);
    process.exit(1);
  }
  // Grouped by mode (stable within a mode) so each system prompt stays cached
  const picked = allCases.filter((c) => !only.length || only.includes(c.id));
  const cases = [...picked.filter((c) => c.mode === 'full'), ...picked.filter((c) => c.mode === 'public')];

  const client = new Anthropic(clientOptions(key));
  const publicFacts = (SYSTEM_PUBLIC.match(/<facts>\n([\s\S]*?)\n<\/facts>/) ?? [])[1];
  if (useJudge && !publicFacts) throw new Error('evals: could not find the facts in SYSTEM_PUBLIC');
  const jsys = useJudge ? { full: judgeSystem(ROOT), public: judgeSystem(ROOT, publicFacts) } : {};
  console.log(`JohnLM evals: ${cases.length} cases on ${MODEL}, judge ${useJudge ? `on (${JUDGE_MODEL})` : 'off'}\n`);

  const results = [];
  for (const kase of cases) {
    const started = Date.now();
    const r = { id: kase.id, mode: kase.mode, holdout: !!kase.holdout, turns: kase.turns, answers: [], failures: [], usd: 0, judgeUsd: 0 };
    try {
      const { answers, usd, tokens } = await converse(client, kase.mode === 'full' ? SYSTEM : SYSTEM_PUBLIC, kase);
      Object.assign(r, { answers, usd, tokens, failures: checkCase(kase, answers) });
      if (useJudge) {
        const verdict = await judge(client, jsys[kase.mode], kase, answers, ROOT);
        if (verdict) {
          r.judge = { accuracy: verdict.accuracy, coherence: verdict.coherence, rules: verdict.rules, mean: verdict.mean, reason: verdict.reason };
          r.judgeUsd = cost(JUDGE_MODEL, verdict.usage);
        }
      }
    } catch (err) {
      r.failures.push(`request failed: ${err?.status ?? ''} ${err?.error?.error?.type ?? ''} ${String(err?.error?.error?.message ?? err?.message ?? '').slice(0, 200)}`.replace(/\s+/g, ' ').trim());
    }
    r.ms = Date.now() - started;
    results.push(r);

    const j = r.judge ? `  judge a${r.judge.accuracy} c${r.judge.coherence} r${r.judge.rules}` : '';
    console.log(`${r.failures.length ? 'FAIL' : 'pass'}  ${kase.id}${kase.holdout ? ' (holdout)' : ''}  ${(r.ms / 1000).toFixed(1)}s${j}`);
    for (const f of r.failures) console.log(`      ${f}`);
    if (r.judge?.reason) console.log(`      judge: ${r.judge.reason}`);
    if (show && r.failures.length) r.answers.forEach((a, i) => console.log(`      --- answer ${i + 1} ---\n${a.replace(/^/gm, '      ')}`));
  }

  // Summary and gate
  const passed = results.filter((r) => !r.failures.length);
  const hold = results.filter((r) => r.holdout);
  const judged = results.filter((r) => r.judge);
  const judgeMean = {
    accuracy: mean(judged.map((r) => r.judge.accuracy)),
    coherence: mean(judged.map((r) => r.judge.coherence)),
    rules: mean(judged.map((r) => r.judge.rules)),
    overall: mean(judged.map((r) => r.judge.mean)),
  };
  const minAccuracy = judged.length ? Math.min(...judged.map((r) => r.judge.accuracy)) : null;
  const answersUsd = results.reduce((a, r) => a + r.usd, 0);
  const judgeUsd = results.reduce((a, r) => a + r.judgeUsd, 0);
  const hardOk = passed.length === results.length;
  const judgeOk = !useJudge || (judged.length === results.length && judgeMean.overall >= 4 && minAccuracy >= 3);
  const gate = hardOk && judgeOk;

  console.log(`\n${'case'.padEnd(40)} ${'hard'.padEnd(5)} judge`);
  for (const r of results) {
    const j = r.judge ? `${r.judge.accuracy}/${r.judge.coherence}/${r.judge.rules}` : '-';
    console.log(`${(r.id + (r.holdout ? '*' : '')).padEnd(40)} ${(r.failures.length ? 'FAIL' : 'pass').padEnd(5)} ${j}`);
  }
  console.log('(* holdout; judge is accuracy/coherence/rules)\n');
  console.log(`Hard checks: ${passed.length}/${results.length} passed (holdout ${hold.filter((r) => !r.failures.length).length}/${hold.length})`);
  if (useJudge) {
    console.log(`Judge: mean ${judgeMean.overall ?? '-'} (accuracy ${judgeMean.accuracy ?? '-'}, coherence ${judgeMean.coherence ?? '-'}, rules ${judgeMean.rules ?? '-'}), lowest accuracy ${minAccuracy ?? '-'}, ${judged.length}/${results.length} scored`);
  }
  console.log(`Cost (estimate): $${round(answersUsd + judgeUsd, 3)} ($${round(answersUsd, 3)} answers, $${round(judgeUsd, 3)} judge)`);
  console.log(`Gate: ${gate ? 'PASS' : 'FAIL'}${useJudge ? '' : ' (hard checks only; set EVALS_JUDGE=1 for the full gate)'}`);

  // last-run.md: every answer and failure, for reading (gitignored)
  const sha = git('rev-parse --short HEAD');
  const dirty = git('status --porcelain') !== '';
  const ranAt = new Date().toISOString();
  const md = [
    `# JohnLM eval run, ${ranAt}`,
    '',
    `${sha}${dirty ? ' (uncommitted changes)' : ''} · ${MODEL} · judge ${useJudge ? JUDGE_MODEL : 'off'} · gate ${gate ? 'PASS' : 'FAIL'}`,
    `Hard checks ${passed.length}/${results.length}${useJudge ? ` · judge mean ${judgeMean.overall ?? '-'}, lowest accuracy ${minAccuracy ?? '-'}` : ''} · about $${round(answersUsd + judgeUsd, 3)}`,
    '',
    ...results.flatMap((r) => [
      `## ${r.failures.length ? 'FAIL' : 'pass'} · ${r.id} (${r.mode}${r.holdout ? ', holdout' : ''})`,
      '',
      ...(r.failures.length ? [...r.failures.map((f) => `- ${f}`), ''] : []),
      ...(r.judge ? [`Judge: accuracy ${r.judge.accuracy}, coherence ${r.judge.coherence}, rules ${r.judge.rules}. ${r.judge.reason}`, ''] : []),
      ...r.turns.flatMap((q, i) => [`**Q${i + 1}:** ${q}`, '', ...(r.answers[i] ? [r.answers[i].replace(/^/gm, '> '), ''] : ['_(no answer)_', ''])]),
    ]),
  ].join('\n');
  writeFileSync(resolve(HERE, 'last-run.md'), md);

  // trend.jsonl: one line per run (tracked)
  const line = {
    ranAt,
    sha,
    dirty,
    model: MODEL,
    ...(only.length ? { only } : {}),
    judge: useJudge ? JUDGE_MODEL : null,
    passed: passed.length,
    total: results.length,
    holdout: { passed: hold.filter((r) => !r.failures.length).length, total: hold.length },
    judgeMean: useJudge ? judgeMean : null,
    minAccuracy,
    gate,
    costUsd: { answers: round(answersUsd, 4), judge: round(judgeUsd, 4), total: round(answersUsd + judgeUsd, 4) },
    failed: results.filter((r) => r.failures.length).map((r) => r.id),
  };
  appendFileSync(resolve(HERE, 'trend.jsonl'), `${JSON.stringify(line)}\n`);
  console.log('\nWrote evals/johnlm/last-run.md and a line to evals/johnlm/trend.jsonl');
  process.exit(gate ? 0 : 1);
}

// Run only when called as a script, so tests can import converse()
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error('johnlm evals:', String(err?.message ?? err).slice(0, 300));
    process.exit(1);
  });
}
