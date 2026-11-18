// Heavy rotation: my top five lately, one at a time on a big cover, with a
// ranked row to move through and Spotify's embed doing the playing (its
// iFrame API lets our own play and next buttons drive it). It starts playing
// on arrival. Browsers allow that once someone has clicked on the site, like
// the entry on Play; when one still blocks it, the first tap anywhere starts.

type Song = {
  title: string;
  artist: string;
  href?: string;
  image?: string;
  cover?: string;
  uri?: string;
  album?: string;
  released?: string;
  length?: number;
  played?: string;
};

type Controller = {
  loadUri: (uri: string) => void;
  play: () => void;
  togglePlay: () => void;
  addListener: (event: 'playback_update', cb: (e: { data: { isPaused: boolean } }) => void) => void;
};
type IFrameAPI = { createController: (el: HTMLElement, opts: { uri: string; width: string; height: number }, cb: (c: Controller) => void) => void };
declare global {
  interface Window { onSpotifyIframeApiReady?: (api: IFrameAPI) => void }
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ago(iso?: string) {
  if (!iso) return '–';
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (s > -60) return 'Just now';
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week']];
  let [size, unit] = steps[0];
  for (const st of steps) if (-s >= st[0]) [size, unit] = st;
  const text = rtf.format(Math.round(s / size), unit);
  return text[0].toUpperCase() + text.slice(1);
}

function length(ms?: number) {
  if (!ms) return '–';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function initMusic() {
  const found = document.querySelector<HTMLElement>('[data-mx]');
  if (!found) return;
  const stage: HTMLElement = found;
  const $ = <T extends Element>(sel: string) => stage.querySelector<T>(sel)!;
  const img = $<HTMLImageElement>('[data-mx-img]');
  const label = $<HTMLImageElement>('[data-mx-label]');
  const title = $<HTMLElement>('[data-mx-title]');
  const artist = $<HTMLElement>('[data-mx-artist]');
  const album = $<HTMLElement>('[data-mx-album]');
  const released = $<HTMLElement>('[data-mx-released]');
  const len = $<HTMLElement>('[data-mx-length]');
  const when = $<HTMLElement>('[data-mx-when]');
  const playBtn = $<HTMLButtonElement>('[data-mx-play]');
  const ranks = $<HTMLOListElement>('[data-mx-ranks]');
  const embedHost = $<HTMLElement>('[data-mx-embed]');
  const note = $<HTMLElement>('[data-mx-note]');
  const listLabel = $<HTMLElement>('[data-mx-list-label]');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The built-in favourites aren't a ranking, so they come in a new order on
  // every visit; Spotify's own list, when it loads, keeps its order.
  let songs: Song[] = shuffle(JSON.parse(stage.closest<HTMLElement>('[data-songs]')?.dataset.songs || '[]'));
  let index = 0;
  let controller: Controller | null = null;
  let playing = false;
  let wantPlay = false;
  let loaded = '';

  function renderRanks() {
    ranks.replaceChildren(
      ...songs.map((s, i) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mx-rank';
        b.setAttribute('aria-label', `Play ${s.title} by ${s.artist}`);
        const art = document.createElement('span');
        art.className = 'mx-rank-art';
        if (s.image) {
          const im = document.createElement('img');
          im.src = s.image;
          im.alt = '';
          im.loading = 'lazy';
          im.referrerPolicy = 'no-referrer';
          art.append(im);
        }
        const n = document.createElement('span');
        n.className = 'mx-rank-n';
        n.textContent = `#${i + 1}`;
        const t = document.createElement('span');
        t.className = 'mx-rank-t';
        t.textContent = s.title;
        const a = document.createElement('span');
        a.className = 'mx-rank-a';
        a.textContent = s.artist;
        b.append(art, n, t, a);
        b.addEventListener('click', () => select(i, true));
        li.append(b);
        return li;
      }),
    );
  }

  function select(i: number, thenPlay = false) {
    if (!songs.length) return;
    index = (i + songs.length) % songs.length;
    const s = songs[index];
    const swap = () => {
      img.src = s.cover || s.image || '';
      label.src = s.image || s.cover || '';
      title.textContent = s.title;
      artist.textContent = s.artist;
      album.textContent = s.album || '–';
      released.textContent = s.released || '–';
      len.textContent = length(s.length);
      when.textContent = ago(s.played);
      // No play time (the built-in favourites, or a top song not in the last
      // 50 plays): leave the row out rather than show a dash.
      when.parentElement!.hidden = !s.played;
    };
    if (still) swap();
    else {
      stage.classList.add('is-swapping');
      setTimeout(() => { swap(); stage.classList.remove('is-swapping'); }, 160);
    }
    [...ranks.querySelectorAll<HTMLButtonElement>('.mx-rank')].forEach((d, k) => {
      d.classList.toggle('is-on', k === index);
      if (k === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    const card = ranks.querySelectorAll<HTMLElement>('.mx-rank')[index];
    if (card) ranks.scrollTo({ left: card.offsetLeft - ranks.offsetLeft - 8, behavior: still ? 'auto' : 'smooth' });
    if (thenPlay) start();
  }

  function start() {
    const s = songs[index];
    if (!s?.uri) {
      if (s?.href) window.open(s.href, '_blank', 'noopener');
      return;
    }
    wantPlay = true;
    stage.classList.add('is-started'); // reveals the player
    if (!controller) return loadEmbed(); // plays once the player is ready
    if (loaded !== s.uri) {
      controller.loadUri(s.uri);
      loaded = s.uri;
    }
    controller.play();
  }

  let embedLoading = false;
  function loadEmbed() {
    if (embedLoading || !songs[index]?.uri) return;
    embedLoading = true;
    window.onSpotifyIframeApiReady = (api) => {
      api.createController(embedHost, { uri: songs[index].uri!, width: '100%', height: 80 }, (c) => {
        controller = c;
        loaded = songs[index].uri!;
        c.addListener('playback_update', (e) => {
          playing = !e.data.isPaused;
          if (playing) document.dispatchEvent(new CustomEvent('passport:stamp', { detail: 'crate-digger' }));
          stage.classList.toggle('is-playing', playing);
          if (playing) stage.classList.remove('needs-tap');
          playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        });
        if (wantPlay) c.play();
      });
    };
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.head.append(script);
  }

  playBtn.addEventListener('click', () => {
    if (controller && loaded === songs[index]?.uri) controller.togglePlay();
    else start();
  });
  $<HTMLButtonElement>('[data-mx-prev]').addEventListener('click', () => select(index - 1, playing));
  $<HTMLButtonElement>('[data-mx-next]').addEventListener('click', () => select(index + 1, playing));
  stage.addEventListener('keydown', (e) => {
    if (!(e.target instanceof HTMLElement) || !e.target.closest('.mx-ranks')) return;
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    select(index + step, playing);
    ranks.querySelectorAll<HTMLButtonElement>('.mx-rank')[index]?.focus();
  });

  // Arriving: the record slides out and the first song starts. If the browser
  // blocks sound, ask for one tap; any tap or key on the page then starts it.
  stage.classList.add('is-out');
  const stopListening = () => {
    document.removeEventListener('pointerdown', tapToStart);
    document.removeEventListener('keydown', tapToStart);
  };
  function tapToStart(e: Event) {
    if (playing) return stopListening();
    if (e.target instanceof Element && e.target.closest('button, a')) return; // their own action wins
    start();
    stopListening();
  }
  const askForTap = () => setTimeout(() => {
    if (playing) return;
    stage.classList.add('needs-tap');
    document.addEventListener('pointerdown', tapToStart);
    document.addEventListener('keydown', tapToStart);
  }, 2500);

  // The built-in favourites carry only a Spotify link; the player needs the uri.
  const playable = (s: Song): Song => {
    const id = s.uri ? null : s.href?.match(/open\.spotify\.com\/track\/(\w+)/)?.[1];
    return id ? { ...s, uri: `spotify:track:${id}` } : s;
  };

  function show(list: Song[]) {
    songs = list.map(playable);
    renderRanks();
    select(0);
  }
  show(songs);
  const begin = () => { start(); askForTap(); };
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return begin();
  fetch('/.netlify/functions/now-playing', { headers: { accept: 'application/json' } })
    .then((r) => (r.status === 200 ? r.json() : null))
    .then((d) => {
      // Spotify's top five of the month when allowed, else the five most played lately
      const list: Song[] = d?.top?.length ? d.top : d?.lately?.length ? d.lately : (d?.recent ?? []).slice(0, 5);
      if (list.length) {
        show(list);
        listLabel.textContent = 'Top five lately';
      }
      else note.textContent = 'Spotify isn’t answering right now, so these are a few favourites.';
    })
    .catch(() => {})
    .finally(begin);
}
