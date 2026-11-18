// JohnLM's request to Claude, in one place. netlify/functions/ask.mjs sends it
// live and evals/johnlm/run.mjs sends exactly the same thing, so the evals
// test the settings visitors get.

export const MODEL = 'claude-opus-5-5';
export const PAGES = new Set(['home', 'play', 'episode', 'rivva', 'kora', 'milkyway', 'pablo', 'notes-ai']);
export const MAX_HISTORY = 6;

export const REFUSAL_ANSWER = "That's not something I can help with here. Ask me about my work, or email etokhanaj@gmail.com.";

// Netlify's AI Gateway injects ANTHROPIC_BASE_URL (and its own token) into
// functions; pin the real API so our key isn't sent to the gateway.
export const clientOptions = (apiKey) => ({ apiKey, authToken: null, baseURL: 'https://api.anthropic.com' });

// The visitor's question, page and recent turns, trimmed and capped.
export function readAsk(body) {
  const question = String(body?.question ?? '').trim().slice(0, 500);
  const page = PAGES.has(body?.page) ? body.page : 'home';
  const history = (Array.isArray(body?.history) ? body.history : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (history.length && history[0].role !== 'user') history.shift();
  return { question, page, history };
}

// The params for client.beta.messages.stream(). `system` is SYSTEM or
// SYSTEM_PUBLIC from bundle.mjs; it is cached, so keep it byte-stable.
export function buildRequest({ system, page, question, history }) {
  return {
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
    ],
    messages: [...history, { role: 'user', content: `<page>${page}</page>\n${question}` }],
  };
}
