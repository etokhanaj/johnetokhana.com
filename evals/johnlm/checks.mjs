// Hard checks for JohnLM answers. These decide pass or fail; the judge only
// adds a score. Pure functions, so tests/johnlm-evals.test.ts runs them free.

// The same private names and numbers tests/johnlm-bundle.test.ts keeps out of
// the bundle. If the bundle never carries them, an answer that does invented them.
import { PRIVATE } from './private.mjs';
export { PRIVATE };
export const BANNED = /Great question|delve|passionate|seamless|leverage/i;
export const EM_DASH = /\u2014/;
export const BERLIN = /berlin/i;
export const EIGHT_YEARS = /\beight years\b|\b8 years\b|four years in brand|worked as an engineer/i;
// "4.5x", "3\u00d7", "10 x". The x needs a word boundary after it; \u00d7 doesn't.
export const MULTIPLIER = /\b\d+(?:\.\d+)?\s?(?:x\b|\u00d7)/i;
export const FOLLOW_UP_LINE = /^\[\[follow-up: [^\]]+\]\]$/;

export const MIN_WORDS = 40;
export const MAX_WORDS = 160;

// Curly quotes and apostrophes to straight ones, so a pattern written with '
// matches what the model typed with \u2019.
export const straight = (text) =>
  text.replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00a0/g, ' ');

// The answer without its follow-ups, as src/scripts/ask.ts shows it (and
// sends it back as history).
export function body(text) {
  return text.replace(/\[\[\s*follow-?up:\s*([^\]]+?)\s*\]\]/gi, '').replace(/\[\[[^\]]*$/, '').trim();
}

export const words = (text) => (text.match(/\S+/g) || []).length;

// 2 or 3 follow-ups, each on its own line in the exact format, and nothing after them.
export function followUpProblem(text) {
  const markers = (text.match(/\[\[[^\]]*\]\]/g) || []).length;
  const lines = text.trimEnd().split('\n');
  let tail = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    if (FOLLOW_UP_LINE.test(line)) tail++;
    else break;
  }
  if (markers === 0) return 'no follow-ups';
  if (tail !== markers) return `follow-ups must be the last lines, one per line, as [[follow-up: ...]] (${markers} found, ${tail} at the end in format)`;
  if (tail < 2 || tail > 3) return `${tail} follow-ups, want 2 or 3`;
  return null;
}

// Checks every answer gets, whatever the case.
export function globalFailures(answer, { minWords = MIN_WORDS, maxWords = MAX_WORDS } = {}) {
  const fails = [];
  const text = straight(answer);
  const hit = (re) => (text.match(re) || [])[0];
  if (EM_DASH.test(answer)) fails.push('em dash');
  if (hit(BANNED)) fails.push(`banned phrase "${hit(BANNED)}"`);
  if (hit(PRIVATE)) fails.push(`private name or number "${hit(PRIVATE)}"`);
  if (hit(BERLIN)) fails.push('mentions Berlin');
  if (hit(EIGHT_YEARS)) fails.push(`wrong career line "${hit(EIGHT_YEARS)}"`);
  if (hit(MULTIPLIER)) fails.push(`multiplier "${hit(MULTIPLIER)}"`);
  const follow = followUpProblem(text);
  if (follow) fails.push(follow);
  const n = words(body(text));
  if (n < minWords || n > maxWords) fails.push(`${n} words, want ${minWords} to ${maxWords}`);
  return fails;
}

// A case's own patterns. mustNotMatch applies to every turn's full answer (a
// leak in a follow-up is still a leak); mustMatch to the last answer's body,
// so a follow-up question can't satisfy it.
export function caseFailures(kase, answers) {
  const fails = [];
  const last = straight(body(answers[answers.length - 1] ?? ''));
  for (const re of kase.mustMatch ?? []) {
    if (!re.test(last)) fails.push(`does not match ${re}`);
  }
  answers.forEach((answer, i) => {
    const text = straight(answer);
    for (const re of kase.mustNotMatch ?? []) {
      const m = text.match(re);
      if (m) fails.push(`${answers.length > 1 ? `turn ${i + 1}: ` : ''}matches ${re} ("${m[0]}")`);
    }
  });
  return fails;
}

// Everything for one case: global checks on every turn, then the case's own.
export function checkCase(kase, answers) {
  const limits = { minWords: kase.minWords ?? MIN_WORDS, maxWords: kase.maxWords ?? MAX_WORDS };
  const fails = [];
  answers.forEach((answer, i) => {
    for (const f of globalFailures(answer, limits)) fails.push(answers.length > 1 ? `turn ${i + 1}: ${f}` : f);
  });
  return [...fails, ...caseFailures(kase, answers)];
}
