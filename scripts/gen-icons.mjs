// Génère les icônes PNG de l'app (sans dépendance) : node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const C1 = [30, 24, 78]; // indigo profond
const C2 = [124, 72, 176]; // violet doux
const MOON = [255, 240, 208]; // lueur dorée

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const smooth = (edge, d, w = 0.006) => Math.min(1, Math.max(0, 0.5 - (d - edge) / w));

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function pixel(x, y, rounded) {
  if (rounded && sdRoundRect(x, y, 0.5, 0.5, 0.5, 0.5, 0.22) > 0) return [0, 0, 0, 0];
  // Fond : dégradé diagonal + halo doux autour de la lune
  const t = Math.min(1, Math.max(0, (x * 0.6 + y * 0.9) / 1.5));
  let col = mix(C1, C2, t);
  const dMoonCenter = Math.hypot(x - 0.47, y - 0.5);
  const halo = Math.max(0, 1 - dMoonCenter / 0.42) ** 2 * 0.35;
  col = mix(col, MOON, halo);
  // Croissant : grand disque moins un disque décalé
  const big = Math.hypot(x - 0.46, y - 0.52) - 0.25;
  const cut = Math.hypot(x - 0.575, y - 0.45) - 0.215;
  const moonCover = Math.min(smooth(0, big), smooth(0, -cut));
  col = mix(col, MOON, moonCover);
  // Petite étoile à quatre branches
  const sx = Math.abs(x - 0.7);
  const sy = Math.abs(y - 0.3);
  const star = Math.min(1, Math.max(0, 1 - (sx ** 0.7 + sy ** 0.7) ** (1 / 0.7) / 0.06));
  col = mix(col, [255, 255, 255], star * 0.95);
  return [...col, 255];
}

function render(size, { rounded, scale }) {
  const SS = 3;
  const data = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    data[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          let x = (px + (sx + 0.5) / SS) / size;
          let y = (py + (sy + 0.5) / SS) / size;
          if (scale) {
            x = 0.5 + (x - 0.5) / scale;
            y = 0.5 + (y - 0.5) / scale;
          }
          const [cr, cg, cb, ca] = pixel(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)), rounded);
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
        }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      const n = SS * SS;
      data[o] = a ? Math.round(r / a) : 0;
      data[o + 1] = a ? Math.round(g / a) : 0;
      data[o + 2] = a ? Math.round(b / a) : 0;
      data[o + 3] = Math.round(a / n);
    }
  }
  return png(size, data);
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tb));
  return Buffer.concat([len, tb, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size, opts] of [
  ['icon-192.png', 192, { rounded: true }],
  ['icon-512.png', 512, { rounded: true }],
  ['apple-touch-icon.png', 180, { rounded: false }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 0.8 }],
]) {
  writeFileSync(join(OUT, name), render(size, opts));
  console.log('écrit', name);
}

writeFileSync(
  join(OUT, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e184e"/><stop offset="1" stop-color="#7c48b0"/></linearGradient>
    <radialGradient id="h" cx="0.47" cy="0.5" r="0.45"><stop offset="0" stop-color="#fff0d0" stop-opacity="0.4"/><stop offset="1" stop-color="#fff0d0" stop-opacity="0"/></radialGradient>
    <mask id="m"><rect width="100" height="100" fill="#fff"/><circle cx="57.5" cy="45" r="21.5" fill="#000"/></mask>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <rect width="100" height="100" rx="22" fill="url(#h)"/>
  <circle cx="46" cy="52" r="25" fill="#fff0d0" mask="url(#m)"/>
  <path d="M70 22 L71.6 28.4 L78 30 L71.6 31.6 L70 38 L68.4 31.6 L62 30 L68.4 28.4 Z" fill="#fff"/>
</svg>
`,
);
console.log('écrit icon.svg');
