// Free checks on the JohnLM eval suite: no API calls. The paid run is
// `npm run evals:johnlm` (evals/johnlm/README.md).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cases } from '../evals/johnlm/cases.mjs';
import { SAMPLE } from '../evals/johnlm/private.mjs';
import { EXAMPLE } from './example-mode';
import { body, checkCase, followUpProblem, globalFailures } from '../evals/johnlm/checks.mjs';
import { judgePrompt, judgeSystem } from '../evals/johnlm/judge.mjs';
import { buildRequest, clientOptions, PAGES, readAsk } from '../netlify/johnlm/request.mjs';

// ask.mjs talks to Anthropic and Netlify Blobs; stand both in so the test can
// see exactly what the live endpoint would send.
const sent = vi.hoisted(() => ({ params: [] as unknown[], options: [] as unknown[] }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    beta = {
      messages: {
        stream: (params: unknown) => {
          sent.params.push(params);
          return {
            async *[Symbol.asyncIterator]() {
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello.' } };
            },
            finalMessage: async () => ({ usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }),
          };
        },
      },
    };
    constructor(options: unknown) {
      sent.options.push(options);
    }
  },
}));

vi.mock('@netlify/blobs', () => ({
  getStore: () => {
    const data = new Map<string, string>();
    return {
      get: async (k: string) => data.get(k) ?? null,
      set: async (k: string, v: string) => void data.set(k, v),
      setJSON: async () => {},
    };
  },
}));

let SYSTEM = '';
let SYSTEM_PUBLIC = '';

beforeAll(async () => {
  execSync('node scripts/build-johnlm.mjs', { stdio: 'ignore' });
  ({ SYSTEM, SYSTEM_PUBLIC } = await import('../netlify/johnlm/bundle.mjs'));
});

const followUps = '\n\n[[follow-up: What did you get wrong at Kora?]]\n[[follow-up: How did you shorten onboarding?]]';
const goodAnswer = `Three years, joining as a product designer and leaving as a senior product designer. I designed the checkout, merchant onboarding and the tools merchants used to track their money, and I created Kora's first design system. One question ran through all of it: does this person know where their money is? Kora processed $300M+ while I was there. It has since passed $1B.${followUps}`;

describe('JohnLM eval cases', () => {
  it('have unique ids, a mode, a known page and questions', () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(cases.length).toBeGreaterThanOrEqual(30);
    for (const c of cases) {
      expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(['public', 'full']).toContain(c.mode);
      expect(PAGES.has(c.page)).toBe(true);
      expect(c.turns.length).toBeGreaterThan(0);
      for (const t of c.turns) expect(typeof t === 'string' && t.length > 0 && t.length <= 500).toBe(true);
      expect(c.criteria.trim().length).toBeGreaterThan(0);
      expect(c.criteria).not.toContain('\n');
      if ('study' in c && c.study) expect(['episode', 'rivva', 'kora', 'milkyway', 'pablo']).toContain(c.study);
    }
  });

  it('use compiled patterns without stateful flags', () => {
    for (const c of cases) {
      for (const re of [...(c.mustMatch ?? []), ...(c.mustNotMatch ?? [])]) {
        expect(re).toBeInstanceOf(RegExp);
        expect(re.global || re.sticky).toBe(false);
        expect(() => new RegExp(re.source, re.flags)).not.toThrow();
      }
    }
  });

  it('hold back about a quarter as holdout', () => {
    const share = cases.filter((c) => c.holdout).length / cases.length;
    expect(share).toBeGreaterThanOrEqual(0.2);
    expect(share).toBeLessThanOrEqual(0.3);
  });

  it('give public and full cases the same knowledge now that Episode is public', () => {
    expect(SYSTEM_PUBLIC).toBe(SYSTEM);
  });
});

describe('JohnLM hard checks', () => {
  it('pass a good answer', () => {
    expect(globalFailures(goodAnswer)).toEqual([]);
    expect(body(goodAnswer)).not.toContain('follow-up');
  });

  it('catch each rule', () => {
    expect(globalFailures(goodAnswer.replace('Three years,', 'Three years \u2014'))).toContain('em dash');
    expect(globalFailures(goodAnswer.replace('Three years', 'Great question. Three years')).join()).toMatch(/banned/);
    expect(globalFailures(goodAnswer.replace('Three years', 'Eight years')).join()).toMatch(/career/);
    expect(globalFailures(goodAnswer.replace('Three years', 'Three years in Berlin')).join()).toMatch(/Berlin/);
    expect(globalFailures(goodAnswer.replace('Three years', 'Activation was 4.5\u00d7 higher. Three years')).join()).toMatch(/multiplier/);
    expect(globalFailures(goodAnswer.replace('Three years', 'Activation was 3x higher. Three years')).join()).toMatch(/multiplier/);
    expect(globalFailures(goodAnswer.replace('Three years', `${SAMPLE} and I spent three years`)).join()).toMatch(/private/);
    expect(globalFailures(`Short answer.${followUps}`).join()).toMatch(/words/);
  });

  it('want 2 or 3 follow-ups at the very end, in format', () => {
    expect(followUpProblem(goodAnswer)).toBeNull();
    expect(followUpProblem('An answer.')).toBe('no follow-ups');
    expect(followUpProblem('An answer.\n[[follow-up: One?]]')).toMatch(/want 2 or 3/);
    expect(followUpProblem(`${goodAnswer}\nAnything else?`)).toMatch(/last lines/);
    expect(followUpProblem('An answer.\n[[followup: One?]]\n[[follow-up: Two?]]')).toMatch(/format/);
  });

  it('apply a case: mustMatch to the last body, mustNotMatch to every turn', () => {
    const kase = { mustMatch: [/\$300M/], mustNotMatch: [/theatre/i] };
    expect(checkCase(kase, [goodAnswer])).toEqual([]);
    expect(checkCase(kase, [`${goodAnswer.replace('$300M+', 'a lot')}`]).join()).toMatch(/does not match/);
    expect(checkCase(kase, [goodAnswer.replace('Kora', 'the theatre'), goodAnswer]).join()).toMatch(/turn 1: matches/);
    // a follow-up question can't satisfy mustMatch
    const onlyInFollowUp = { mustMatch: [/onboarding\?/] };
    expect(checkCase(onlyInFollowUp, [goodAnswer]).join()).toMatch(/does not match/);
  });

  it('straighten curly quotes before matching', () => {
    expect(checkCase({ mustMatch: [/Kora's first/] }, [goodAnswer.replace("Kora's", 'Kora\u2019s')])).toEqual([]);
  });
});

describe.skipIf(EXAMPLE)('JohnLM judge prompt', () => {
  it('carries the rules, facts and the case study', () => {
    const system = judgeSystem('.');
    expect(system).toContain('## Public rules');
    expect(system).toContain('## Rivva');
    expect(system).not.toContain('{{FACTS}}');
    const kase = cases.find((c) => c.mode === 'public' && c.page === 'kora')!;
    const prompt = judgePrompt(kase, ['An answer.'], '.');
    expect(prompt).toContain('PUBLIC');
    expect(prompt).toContain('<case_study>');
  });

  it('judges public cases against the facts JohnLM was given', () => {
    const publicFacts = SYSTEM_PUBLIC.match(/<facts>\n([\s\S]*?)\n<\/facts>/)![1];
    const system = judgeSystem('.', publicFacts);
    expect(system).toContain('117 controls');
    expect(system).toContain('## Episode');
  });
});

describe('the live request', () => {
  const ask = async (cookie = '') => {
    sent.params.length = 0;
    sent.options.length = 0;
    const { default: handler } = await import('../netlify/functions/ask.mjs');
    const payload = {
      question: '  Why did you remove the button?  ',
      page: 'kora',
      history: [
        { role: 'assistant', content: 'dropped: history must start with the visitor' },
        { role: 'user', content: 'What did you do at Kora?' },
        { role: 'assistant', content: 'I designed the checkout.' },
      ],
    };
    const req = new Request('http://localhost/api/ask', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(payload),
    });
    const res = await handler(req, { ip: '203.0.113.7' });
    await res.text();
    return { payload, params: sent.params[0], options: sent.options[0] };
  };

  it('is built by the shared helper, with the settings ask.mjs has always used', async () => {
    process.env.John_Portfolio_key = 'test-key-not-real';
    const { payload, params, options } = await ask();
    expect(options).toEqual(clientOptions('test-key-not-real'));
    expect(params).toEqual(buildRequest({ system: SYSTEM_PUBLIC, ...readAsk(payload) }));
    expect(params).toEqual({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM_PUBLIC, cache_control: { type: 'ephemeral' } }],
      messages: [
        { role: 'user', content: 'What did you do at Kora?' },
        { role: 'assistant', content: 'I designed the checkout.' },
        { role: 'user', content: '<page>kora</page>\nWhy did you remove the button?' },
      ],
    });
  });

  it('gives every visitor the full knowledge, Episode included', async () => {
    process.env.John_Portfolio_key = 'test-key-not-real';
    const { params } = await ask();
    expect((params as { system: { text: string }[] }).system[0].text).toBe(SYSTEM);
  });

  it('is what the eval runner sends too', () => {
    const runner = readFileSync('evals/johnlm/run.mjs', 'utf8');
    expect(runner).toContain("from '../../netlify/johnlm/request.mjs'");
    expect(runner).toMatch(/client\.beta\.messages\.stream\(buildRequest\(/);
    expect(runner).not.toMatch(/model:\s*'claude/);
  });

  it('carries a multi-turn eval the way the site does: raw question, answer without follow-ups', async () => {
    const { converse } = await import('../evals/johnlm/run.mjs');
    const seen: { messages: { role: string; content: string }[] }[] = [];
    const client = {
      beta: {
        messages: {
          stream: (p: { messages: { role: string; content: string }[] }) => {
            seen.push(p);
            return {
              finalMessage: async () => ({
                content: [{ type: 'text', text: goodAnswer }],
                stop_reason: 'end_turn',
                usage: { input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 20000, cache_creation_input_tokens: 0 },
              }),
            };
          },
        },
      },
    };
    const { answers, usd } = await converse(client, 'SYSTEM', { page: 'kora', turns: ['First?', 'Second?'] });
    expect(answers).toEqual([goodAnswer, goodAnswer]);
    expect(seen[1].messages).toEqual([
      { role: 'user', content: 'First?' },
      { role: 'assistant', content: body(goodAnswer) },
      { role: 'user', content: '<page>kora</page>\nSecond?' },
    ]);
    // 2 x (100 x $4 + 200 x $20 + 20,000 x $0.20) per million
    expect(usd).toBeCloseTo(2 * (100 * 4 + 200 * 20 + 20000 * 0.2) / 1e6, 8);
  });
});

describe('the daily ceiling', () => {
  it('turns visitors away once the whole day is used up, without calling the model', async () => {
    vi.resetModules();
    process.env.John_Portfolio_key = 'test-key-not-real';
    process.env.JOHNLM_DAILY_CAP = '0';
    sent.params.length = 0;
    const { default: handler } = await import('../netlify/functions/ask.mjs');
    const req = new Request('http://localhost/api/ask', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'Hello?', page: 'home', history: [] }),
    });
    const res = await handler(req, { ip: '203.0.113.9' });
    expect(res.status).toBe(503);
    expect(sent.params.length).toBe(0);
    delete process.env.JOHNLM_DAILY_CAP;
    vi.resetModules();
  });
});
