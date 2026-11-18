import { execSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { PRIVATE } from '../evals/johnlm/private.mjs';
import { EXAMPLE } from './example-mode';

let SYSTEM = '';
let SYSTEM_PUBLIC = '';

beforeAll(async () => {
  execSync('node scripts/build-johnlm.mjs', { stdio: 'ignore' });
  ({ SYSTEM, SYSTEM_PUBLIC } = await import('../netlify/johnlm/bundle.mjs'));
});

describe("JohnLM's knowledge", () => {
  it('gives every visitor the Episode case study, now that it is public', () => {
    expect(SYSTEM).toContain('## Case study: episode');
    expect(SYSTEM_PUBLIC).toBe(SYSTEM);
    expect(SYSTEM).not.toMatch(/passcode/i);
  });

  it('keeps a highlighted line and the text after it', () => {
    expect(SYSTEM).not.toMatch(/<\/?Led>/);
    expect(SYSTEM).toContain('I owned the design direction for Pablo, our decentralised exchange: an app for swapping');
  });

  it.skipIf(EXAMPLE)('keeps the rules that hold in every case in the public version', () => {
    expect(SYSTEM_PUBLIC).toContain('paid contract work');
    expect(SYSTEM_PUBLIC).toContain("Rivva's CTO");
    expect(SYSTEM_PUBLIC).toMatch(/never say the numbers are in the case study/i);
  });

  it('never carries private numbers or names', () => {
    for (const text of [SYSTEM, SYSTEM_PUBLIC]) {
      expect(text).not.toMatch(PRIVATE);
    }
  });
});
