// Generates the PWA icon + splash set (plain Node, no image libraries).
// Renders the PatentePro brand: navy with a white car glyph.
// Re-run whenever the brand changes: node scripts/generate-pwa-icons.mjs
// (or replace the PNGs in public/ directly, keeping the same filenames).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(OUT, { recursive: true });

// ─── Minimal PNG encoder (RGBA, 8-bit) ───────────────────────────────────────
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Brand drawing ───────────────────────────────────────────────────────────
const BRAND = [0x1a, 0x3a, 0x5c, 0xff]; // #1a3a5c
const WHITE = [0xff, 0xff, 0xff, 0xff];
const CLEAR = [0, 0, 0, 0];

const roundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const circle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// The white car glyph in a transparent 100×100 design space
const glyphAt = (px, py) => {
  if (roundRect(px, py, 16, 44, 84, 66, 9)) return WHITE;   // body
  if (roundRect(px, py, 30, 30, 70, 48, 6)) return WHITE;   // cabin
  if (roundRect(px, py, 34, 34, 48, 44, 3)) return CLEAR;   // window L
  if (roundRect(px, py, 52, 34, 66, 44, 3)) return CLEAR;   // window R
  if (circle(px, py, 32, 68, 8)) return WHITE;              // wheel L
  if (circle(px, py, 68, 68, 8)) return WHITE;              // wheel R
  if (circle(px, py, 32, 68, 3.5)) return CLEAR;
  if (circle(px, py, 68, 68, 3.5)) return CLEAR;
  return null;
};

// Square icon: navy background + centered glyph ("hole" pixels show navy)
function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const u = size / 100;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const g = glyphAt(x / u, y / u);
      const color = g === WHITE ? WHITE : BRAND;
      const i = (y * size + x) * 4;
      buf[i] = color[0]; buf[i + 1] = color[1]; buf[i + 2] = color[2]; buf[i + 3] = color[3];
    }
  }
  return buf;
}

// Splash: navy background + white glyph centered, sized relative to the
// smaller edge — looks like a native launch screen at any device size.
function renderSplash(width, height) {
  const buf = Buffer.alloc(width * height * 4);
  const glyphSide = Math.round(Math.min(width, height) * 0.3);
  const u = glyphSide / 100;
  const offX = Math.round((width - glyphSide) / 2);
  const offY = Math.round((height - glyphSide) / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const inGlyph = x >= offX && x < offX + glyphSide && y >= offY && y < offY + glyphSide;
      const g = inGlyph ? glyphAt((x - offX) / u, (y - offY) / u) : null;
      const color = g === WHITE ? WHITE : BRAND;
      buf[i] = color[0]; buf[i + 1] = color[1]; buf[i + 2] = color[2]; buf[i + 3] = color[3];
    }
  }
  return buf;
}

// ─── Outputs ─────────────────────────────────────────────────────────────────
for (const [name, size] of [['pwa-192x192.png', 192], ['pwa-512x512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(join(OUT, name), encodePng(size, size, renderIcon(size)));
  console.log(`wrote public/${name} (${size}x${size})`);
}

// iOS launch images (portrait) — iOS ignores the web manifest and needs one
// image per device class, matched via media queries in index.html.
const IOS_SPLASHES = [
  ['apple-splash-750x1334.png', 750, 1334],    // iPhone SE / 8
  ['apple-splash-828x1792.png', 828, 1792],    // iPhone XR / 11
  ['apple-splash-1170x2532.png', 1170, 2532],  // iPhone 12 / 13 / 14
  ['apple-splash-1179x2556.png', 1179, 2556],  // iPhone 14 Pro / 15 / 16
  ['apple-splash-1284x2778.png', 1284, 2778],  // iPhone 12/13 Pro Max / 14 Plus
  ['apple-splash-1290x2778.png', 1290, 2778],  // iPhone 14/15/16 Pro Max
  ['apple-splash-2048x2732.png', 2048, 2732],  // iPad
];
for (const [name, w, h] of IOS_SPLASHES) {
  writeFileSync(join(OUT, name), encodePng(w, h, renderSplash(w, h)));
  console.log(`wrote public/${name} (${w}x${h})`);
}
