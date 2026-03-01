// Generates PWA icons from an SVG source using sharp
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '..', 'public', 'icons');

await mkdir(outDir, { recursive: true });

// Orange circle with paw SVG
const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#f97316"/>
  <!-- cat face -->
  <circle cx="256" cy="256" r="150" fill="#fff6ed"/>
  <!-- eyes -->
  <ellipse cx="206" cy="230" rx="22" ry="28" fill="#1f2937"/>
  <ellipse cx="306" cy="230" rx="22" ry="28" fill="#1f2937"/>
  <ellipse cx="212" cy="224" rx="8" ry="10" fill="#fff"/>
  <ellipse cx="312" cy="224" rx="8" ry="10" fill="#fff"/>
  <!-- nose -->
  <ellipse cx="256" cy="275" rx="14" ry="10" fill="#f97316"/>
  <!-- mouth -->
  <path d="M242 287 Q256 300 270 287" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>
  <!-- whiskers left -->
  <line x1="150" y1="265" x2="235" y2="275" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/>
  <line x1="148" y1="280" x2="235" y2="280" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/>
  <!-- whiskers right -->
  <line x1="362" y1="265" x2="277" y2="275" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/>
  <line x1="364" y1="280" x2="277" y2="280" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/>
  <!-- ears -->
  <polygon points="140,140 180,220 100,210" fill="#f97316"/>
  <polygon points="372,140 332,220 412,210" fill="#f97316"/>
  <polygon points="148,148 178,210 114,202" fill="#fde68a"/>
  <polygon points="364,148 334,210 398,202" fill="#fde68a"/>
</svg>`;

const svgBuf = Buffer.from(svgSrc);

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(join(outDir, name));
  console.log(`✓ ${name}`);
}

// favicon.ico (32x32 PNG with .ico extension — works in browsers)
await sharp(svgBuf).resize(32, 32).png().toFile(join(__dir, '..', 'public', 'favicon.ico'));
console.log('✓ favicon.ico');

console.log('Icons generated!');
