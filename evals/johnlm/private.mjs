// The names and numbers JohnLM must never say. The real list is in
// private.local.json, which is not committed; without it the checks run
// against the placeholders in private.example.json.
import { existsSync, readFileSync } from 'node:fs';

const at = (file) => new URL(file, import.meta.url);
const file = existsSync(at('./private.local.json')) ? './private.local.json' : './private.example.json';
const list = JSON.parse(readFileSync(at(file), 'utf8'));
const any = (terms) => new RegExp(terms.join('|'), 'i');

export const PRIVATE = any(list.terms);
export const CEO_NAME = list.ceo.map((term) => new RegExp(term, 'i'));
export const TEAM_NAMES = new RegExp(`\\b(${list.team.join('|')})\\b`, 'i');
export const RETIRED_FIGURES = any(list.retired);
// One term from the list, for tests that check a private term is caught
export const SAMPLE = list.sample;
