// Re-authorise Spotify (run it yourself; see HANDOFF.md): opens Spotify's
// consent page, catches the redirect on 127.0.0.1:8888, swaps the code for a
// refresh token with the user-top-read scope, and saves it to Netlify and
// site/.env. Never prints the token or the secret.
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_SECRET;
const redirect = 'http://127.0.0.1:8888/callback';
if (!id || !secret) { console.error('missing client id or secret'); process.exit(1); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.writeHead(400).end('No code. Try the link again.'); return; }
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
    });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) throw new Error(`exchange failed: ${r.status} ${j.error ?? ''}`);
    execFileSync('netlify', ['env:set', 'SPOTIFY_REFRESH_TOKEN', j.refresh_token], { cwd: SITE, stdio: 'ignore' }); // same 'all' context as before
    const envPath = `${SITE}/.env`;
    const env = readFileSync(envPath, 'utf8').replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, `SPOTIFY_REFRESH_TOKEN=${j.refresh_token}`);
    writeFileSync(envPath, env, { mode: 0o600 });
    console.log(`saved: scopes = ${j.scope}`);
    res.writeHead(200, { 'content-type': 'text/html' }).end('<p style="font:16px system-ui;padding:40px">Done. You can close this tab.</p>');
  } catch (e) {
    console.error(String(e.message));
    res.writeHead(500).end('Something went wrong. Tell Claude.');
  }
  server.close(() => process.exit(0)); // done either way; don't wait for the timeout
});
const scopes = 'user-read-currently-playing user-read-recently-played user-top-read';
const auth = `https://accounts.spotify.com/authorize?${new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope: scopes, show_dialog: 'true' })}`;
server.listen(8888, '127.0.0.1', () => {
  console.log('Opening Spotify in your browser. Approve, then come back here.');
  execFileSync('open', [auth]);
});
setTimeout(() => { console.log('timed out'); process.exit(0); }, 15 * 60 * 1000);
