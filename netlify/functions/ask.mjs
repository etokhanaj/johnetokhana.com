// JohnLM: answers questions about John's work from the site's own content.
// Streams the answer as server-sent events. Needs John_Portfolio_key (or ANTHROPIC_API_KEY_JOHN) in
// Netlify (never in git). 20 questions per visitor per day, counted by a
// salted, daily-rotating hash of the IP; questions and answers are logged to
// Netlify Blobs for review, with no other personal data.
import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { SYSTEM } from '../johnlm/bundle.mjs';
import { buildRequest, clientOptions, readAsk, REFUSAL_ANSWER } from '../johnlm/request.mjs';

export const config = { path: '/api/ask' };

const DAILY_LIMIT = 20;
// A ceiling for everyone together, so nobody can run up the bill by changing address.
// JOHNLM_DAILY_CAP in Netlify overrides it.
const cap = Number.parseInt(process.env.JOHNLM_DAILY_CAP ?? '', 10);
const DAILY_CAP = Number.isFinite(cap) ? cap : 400;
const ALLOWED = /(^|\.)johnetokhana\.com$|--johnetokhana-new\.netlify\.app$|^johnetokhana-new\.netlify\.app$|^localhost$|^127\.0\.0\.1$/;

const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  let host = '';
  try { host = new URL(origin).hostname; } catch { /* no or bad Origin: rejected below */ }
  if (!ALLOWED.test(host)) return json({ error: 'origin' }, 403);

  const key = (process.env.John_Portfolio_key || process.env.ANTHROPIC_API_KEY_JOHN || '').trim();
  if (!key) return json({ error: 'offline' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  const { question, page, history } = readAsk(body);
  if (!question) return json({ error: 'empty' }, 400);

  // Daily limit per visitor
  const day = new Date().toISOString().slice(0, 10);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const visitor = createHash('sha256').update(`${ip}|${day}|johnlm`).digest('hex').slice(0, 24);
  const store = getStore('johnlm');
  const totalKey = `total/${day}`;
  const total = Number((await store.get(totalKey)) ?? 0);
  if (total >= DAILY_CAP) return json({ error: 'offline' }, 503);
  const countKey = `count/${day}/${visitor}`;
  const used = Number((await store.get(countKey)) ?? 0);
  if (used >= DAILY_LIMIT) return json({ error: 'limit' }, 429);
  await store.set(countKey, String(used + 1));
  await store.set(totalKey, String(total + 1));

  const system = SYSTEM;

  const client = new Anthropic(clientOptions(key));
  const encoder = new TextEncoder();
  const send = (controller, obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

  const body$ = new ReadableStream({
    async start(controller) {
      let answer = '';
      let usage = null;
      let stop = null;
      try {
        const stream = client.beta.messages.stream(buildRequest({ system, page, question, history }));
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            answer += event.delta.text;
            send(controller, { t: event.delta.text });
          }
        }
        const final = await stream.finalMessage();
        usage = final.usage;
        stop = final.stop_reason;
        if (stop === 'refusal' && !answer) {
          answer = REFUSAL_ANSWER;
          send(controller, { t: answer });
        }
        send(controller, { done: true, left: DAILY_LIMIT - used - 1 });
      } catch (err) {
        console.error('johnlm', err?.status, err?.error?.error?.type, String(err?.error?.error?.message ?? err?.message ?? '').slice(0, 300));
        send(controller, { error: err?.status === 429 ? 'busy' : 'failed' });
      } finally {
        try {
          await store.setJSON(`log/${day}/${Date.now()}-${visitor.slice(0, 8)}`, {
            page, question, answer, stop,
            tokens: usage && { in: usage.input_tokens, cached: usage.cache_read_input_tokens, out: usage.output_tokens },
          });
        } catch { /* logging is best effort */ }
        controller.close();
      }
    },
  });

  return new Response(body$, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform' },
  });
};
