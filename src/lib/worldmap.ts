// The dotted world map behind Window seat, made at build time with
// dotted-map. The dots ship as one static SVG path (/play/world-dots.svg);
// the page only needs the viewBox and where each airport lands on it.
import DottedMap from 'dotted-map';

// Wide enough for San Francisco to Seoul, cropped above and below.
const map = new DottedMap({ height: 60, grid: 'diagonal', region: { lat: { min: -38, max: 64 }, lng: { min: -128, max: 150 } } });

const raw = map.getSVG({ radius: 0.2, color: '#000', shape: 'circle' });
export const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 134 60';
const [, , w, h] = viewBox.split(' ').map(Number);
export const size = { w, h };

/** Every land dot as one path of zero-length strokes, drawn round. */
export function dotsSvg(color = '#d6d9df') {
  const d = map.getPoints().map((p) => `M${+p.x.toFixed(2)} ${+p.y.toFixed(2)}h0`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}" stroke="${color}" stroke-width="0.46" stroke-linecap="round"/></svg>`;
}

/** Where a place sits on the map, snapped to its nearest dot. */
export function pin(lat: number, lng: number) {
  const p = map.getPin({ lat, lng });
  return p ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2) } : null;
}
