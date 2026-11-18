// The names and numbers JohnLM must never say. The real list is in
// private.local.json, which is not committed. Without it the checks use
// private.example.json, so the suite still runs; the answers are then only
// checked against placeholder terms.
import { existsSync, readFileSync } from 'node:fs';

const at = (file) => new URL(file, import.meta.url);
export const USING_EXAMPLE_LIST = !existsSync(at('./private.local.json'));
const list = JSON.parse(readFileSync(at(USING_EXAMPLE_LIST ? './private.example.json' : './private.local.json'), 'utf8'));
const any = (terms, flags = 'i') => new RegExp(terms.join('|'), flags);

export const PRIVATE = any(list.terms);
export const CEO_NAME = list.ceo.map((term) => new RegExp(term, 'i'));
export const TEAM_NAMES = new RegExp(`\\b(${list.team.join('|')})\\b`, 'i');
export const RETIRED_FIGURES = any(list.retired);
/** One term from the list, for tests that check a private term is caught. */
export const SAMPLE = list.sample;
