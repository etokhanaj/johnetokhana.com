// The public copy of this repo ships example knowledge files for JohnLM.
// Tests that assert on the real files' wording are skipped there.
import { readFileSync } from 'node:fs';

export const EXAMPLE = readFileSync('src/content/johnlm/facts.md', 'utf8').includes('example knowledge file');
