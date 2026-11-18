// LLM judge for JohnLM answers. Scores accuracy, coherence and rules 0 to 5
// against facts.md and the relevant case study. It never throws and never
// fails a case on its own: hard checks decide pass or fail, the judge adds a
// score the run's gate reads (mean >= 4, no accuracy below 3).
import { readFileSync, existsSync } from 'node:fs';

export const JUDGE_MODEL = 'claude-sonnet-5-5';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const RUBRIC = `You grade answers from JohnLM, the chat on John Etokhana's portfolio. JohnLM speaks as John, in the first person, and may only use the facts and case studies below.

Score each dimension 0 to 5 (5 exemplary, 3 acceptable, 0 to 1 broken):
- accuracy: every claim is traceable to the facts or the case study; shipped versus not shipped is right; team or protocol results are not claimed as John's; nothing marked "(unverified, do not state)" or under "Things not to say" appears. One invented or wrong claim caps this at 2.
- coherence: one consistent story across turns, with the same names, roles and numbers; no contradiction of an earlier turn; it answers what was asked.
- rules: follows the assistant's rules and style below (public rules, refusals, people by role, no em dashes, plain words, 40 to 160 words unless detail was asked for, 2 or 3 specific follow-ups in [[follow-up: ...]] format at the end).

Give a one-line reason (under 200 characters) naming what drove the lowest score.`;

const SCHEMA = {
  type: 'object',
  properties: {
    accuracy: { type: 'integer' },
    coherence: { type: 'integer' },
    rules: { type: 'integer' },
    reason: { type: 'string' },
  },
  required: ['accuracy', 'coherence', 'rules', 'reason'],
  additionalProperties: false,
};

const clamp = (n) => Math.max(0, Math.min(5, Math.round(Number(n) || 0)));

// The judge's system prompt: rubric, the assistant's rules (system.md up to
// its knowledge placeholders), the facts and the public Episode summary.
// For public cases pass the facts the public JohnLM saw (from SYSTEM_PUBLIC),
// so the judge doesn't mark the public essay's Episode examples as leaks.
// Byte-stable within a mode, so each version is cached after its first call.
export function judgeSystem(root = '.', publicFacts = '') {
  const rules = read(`${root}/src/content/johnlm/system.md`).split(/^<facts>$/m)[0].trim();
  const facts = publicFacts || read(`${root}/src/content/johnlm/facts.md`);
  const episodePublic = read(`${root}/src/content/johnlm/episode-public.md`);
  return `${RUBRIC}\n\n<assistant_rules>\n${rules}\n</assistant_rules>\n\n<facts>\n${facts}\n</facts>\n\n<episode_public_summary>\n${episodePublic}\n</episode_public_summary>`;
}

const STUDIES = new Set(['episode', 'rivva', 'kora', 'milkyway', 'pablo']);

export function caseStudy(kase, root = '.') {
  const name = kase.study ?? (STUDIES.has(kase.page) ? kase.page : null);
  if (!name) return '';
  return read(`${root}/src/content/work/${name}.mdx`).replace(/^import .*$/gm, '').trim();
}

export function judgePrompt(kase, answers, root = '.') {
  const study = caseStudy(kase, root);
  const transcript = kase.turns
    .map((q, i) => `Visitor (turn ${i + 1}): ${q}\n\nJohnLM (turn ${i + 1}):\n${answers[i] ?? '(no answer)'}`)
    .join('\n\n---\n\n');
  return [
    `Mode: ${kase.mode === 'public' ? 'PUBLIC (Episode case study locked)' : 'FULL (Episode case study unlocked)'}`,
    `Page: ${kase.page}`,
    `What a good answer does: ${kase.criteria}`,
    study ? `<case_study>\n${study}\n</case_study>` : 'No case study for this page; use the facts.',
    `<transcript>\n${transcript}\n</transcript>`,
    'Score the JohnLM answers above.',
  ].join('\n\n');
}

// Returns { accuracy, coherence, rules, mean, reason, usage } or undefined.
export async function judge(client, system, kase, answers, root = '.') {
  try {
    const res = await client.beta.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: judgePrompt(kase, answers, root) }],
    });
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const out = JSON.parse(text);
    const scores = { accuracy: clamp(out.accuracy), coherence: clamp(out.coherence), rules: clamp(out.rules) };
    const mean = Math.round(((scores.accuracy + scores.coherence + scores.rules) / 3) * 100) / 100;
    return { ...scores, mean, reason: String(out.reason ?? '').replace(/\s+/g, ' ').slice(0, 300), usage: res.usage };
  } catch (err) {
    console.warn(`  judge failed for ${kase.id}: ${err?.status ?? ''} ${String(err?.message ?? err).slice(0, 200)}`);
    return undefined;
  }
}
