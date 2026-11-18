// Netlify Function: John's current (or most recent) Spotify track.
// Needs three environment variables set in the Netlify dashboard, never in git:
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (or JOHN_MUSIC_SPOTIFY), SPOTIFY_REFRESH_TOKEN
// The refresh token comes from a one-time authorisation with the scopes
// user-read-currently-playing and user-read-recently-played (see HANDOFF.md).
// Returns { title, artist, href, image, live, played?, recent: [up to 15 recent
// tracks, each with played (ISO time)], top: [up to 5 tracks of the month],
// lately: [the 5 most played of the last 50 plays] }.
// Each track also has cover, uri, album, released (year) and length (ms) for the music page.
// or 204 when not configured.
//
// Every page polls this, so it is easy to run Spotify's quota dry (it answers
// 429 and asks us to wait, sometimes for hours). So: the CDN shares one answer
// between all visitors for a minute, top tracks are asked for every few hours,
// and the last good answer is kept in Blobs and served whenever Spotify says no.
import { getStore } from '@netlify/blobs';

const TOP_EVERY = 6 * 60 * 60 * 1000;

export default async () => {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  const secret = process.env.SPOTIFY_CLIENT_SECRET || process.env.JOHN_MUSIC_SPOTIFY;
  if (!id || !secret || !refresh) return new Response(null, { status: 204 });

  const store = getStore('spotify');
  const last = (await store.get('last', { type: 'json' }).catch(() => null)) ?? {};
  // Without Spotify, what we had last time stands in, no longer live.
  const fallback = () => (last.title ? json({ ...strip(last), live: false }) : new Response(null, { status: 204 }));

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  if (!tokenRes.ok) return fallback();
  const { access_token } = await tokenRes.json();
  const auth = { Authorization: `Bearer ${access_token}` };
  // When Spotify answers 429 it says how long to wait; each endpoint keeps its
  // own wait, so a long one on top tracks doesn't freeze what's playing now.
  const waits = { ...last.waits };
  const get = async (key, url) => {
    if (Date.now() < (waits[key] ?? 0)) return null;
    const r = await fetch(url, { headers: auth });
    if (r.status === 429) waits[key] = Date.now() + (Number(r.headers.get('retry-after')) || 60) * 1000;
    return r;
  };

  const pick = (t, live, played) => ({
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    href: t.external_urls?.spotify,
    image: t.album?.images?.[t.album.images.length > 1 ? 1 : 0]?.url,
    cover: t.album?.images?.[0]?.url, // the large one, for the music page
    uri: t.uri,
    album: t.album?.name,
    released: t.album?.release_date?.slice(0, 4),
    length: t.duration_ms,
    live,
    ...(played && { played }),
  });

  // The last 50 plays: the 15 most recent different songs (newest first), and
  // the five played most often, which stands in for top tracks until the
  // token has the user-top-read scope.
  const recentRes = await get('recent', 'https://api.spotify.com/v1/me/player/recently-played?limit=50');
  const recent = [];
  const counts = new Map();
  if (recentRes?.ok) {
    const j = await recentRes.json();
    for (const item of j.items ?? []) {
      const t = pick(item.track, false, item.played_at);
      const key = `${t.title}|${t.artist}`;
      const seen = counts.get(key);
      if (seen) seen.plays++;
      else counts.set(key, { ...t, plays: 1 });
      if (recent.length < 15 && !recent.some((r) => r.title === t.title && r.artist === t.artist)) recent.push(t);
    }
  }
  const lately = [...counts.values()].sort((a, b) => b.plays - a.plays || Date.parse(b.played) - Date.parse(a.played)).slice(0, 5);

  // Top tracks for the last ~4 weeks (needs the user-top-read scope). They
  // barely move, so ask every few hours and keep the last list in between.
  let top = last.top ?? [];
  let topAt = last.topAt ?? 0;
  if (!top.length || Date.now() - topAt > TOP_EVERY) {
    const topRes = await get('top', 'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5');
    const fresh = topRes?.ok ? ((await topRes.json()).items ?? []).map((t) => pick(t, false)) : [];
    if (fresh.length) [top, topAt] = [fresh, Date.now()];
  }

  // Spotify's top tracks carry no play time; take it from the last 50 plays
  // when the song is among them (counts holds the newest play per song).
  top = top.map((t) => ({ ...t, played: counts.get(`${t.title}|${t.artist}`)?.played ?? t.played }));

  let current = null;
  const now = await get('now', 'https://api.spotify.com/v1/me/player/currently-playing');
  if (now?.status === 200) {
    const j = await now.json();
    if (j?.item && j.currently_playing_type === 'track') current = pick(j.item, !!j.is_playing);
  }
  current ??= recent[0] ?? (last.title ? { ...strip(last), live: false } : null);
  if (!current) return new Response(null, { status: 204 });

  const body = { ...current, recent: recent.length ? recent : last.recent ?? [], top, lately: lately.length ? lately : last.lately ?? [] };
  await store.setJSON('last', { ...body, topAt, waits }).catch(() => {});
  return json(body);
};

// The stored copy carries bookkeeping the page doesn't need.
const strip = ({ topAt: _topAt, waits: _waits, ...rest }) => rest;

const json = (body) =>
  new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=30',
      // One answer for every visitor for a minute, so Spotify is asked at most
      // about once a minute however many pages are open.
      'netlify-cdn-cache-control': 'public, durable, s-maxage=60, stale-while-revalidate=300',
    },
  });
