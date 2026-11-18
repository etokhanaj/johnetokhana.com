// Play entrance, first visit only: sticker copies fall across the whole
// screen, land on the bottom edge with one small bounce, rest a beat, then
// drop away. Transform-only, removed when done.
export function rain() {
  const source = [...document.querySelectorAll<SVGSVGElement>('[data-for="play"] .sticker svg')];
  if (!source.length) return;
  const layer = document.createElement('div');
  layer.className = 'rain';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const W = innerWidth;
  const H = innerHeight;
  // One sticker per ~300px of width, so a wide screen fills edge to edge
  const n = Math.min(8, Math.max(3, Math.round(W / 300)));
  const slot = W / n;
  const bits = Array.from({ length: n }, (_, i) => {
    const el = document.createElement('div');
    el.appendChild(source[i % source.length].cloneNode(true));
    layer.appendChild(el);
    const size = (W < 600 ? 110 : 150) + Math.random() * 50;
    el.style.width = el.style.height = `${size}px`;
    return {
      el,
      x: Math.min(W - size, Math.max(0, i * slot + Math.random() * Math.max(0, slot - size * 0.6))),
      y: -size - Math.random() * H * 0.25,
      vx: (Math.random() - 0.5) * 80,
      vy: Math.random() * 120,
      r: (Math.random() - 0.5) * 50,
      vr: (Math.random() - 0.5) * 220,
      floor: H - size * 0.92,
      phase: 'fall' as 'fall' | 'rest' | 'drop',
      bounced: false,
      restUntil: 0,
      restFor: 650 + Math.random() * 550,
    };
  });

  let last = performance.now();
  const g = 1600; // px/s²
  function frame(now: number) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    let alive = 0;
    for (const b of bits) {
      if (b.phase === 'rest') {
        if (now >= b.restUntil) b.phase = 'drop';
      } else {
        b.vy += g * dt;
        b.y += b.vy * dt;
        b.x += b.vx * dt;
        b.r += b.vr * dt;
        if (b.phase === 'fall' && b.y >= b.floor) {
          b.y = b.floor;
          if (!b.bounced && b.vy > 300) {
            b.bounced = true;
            b.vy *= -0.32;
            b.vr *= 0.4;
            b.vx *= 0.5;
          } else {
            b.phase = 'rest';
            b.restUntil = now + b.restFor;
            b.vx = b.vy = b.vr = 0;
          }
        }
      }
      if (b.y < H + 40) alive++;
      b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.r.toFixed(1)}deg)`;
    }
    if (alive) requestAnimationFrame(frame);
    else layer.remove();
  }
  requestAnimationFrame(frame);
}
