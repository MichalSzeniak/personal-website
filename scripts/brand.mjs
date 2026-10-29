// @ts-check
// Generates favicons and the Open Graph image from the logo sources in src/assets/brand
// and the copy in src/content.ts. Run with `npm run brand` after changing either.
// og.png needs a local Chrome (set CHROME_PATH to use another binary).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { chromium } from 'playwright-core';
import { content, defaultLocale, site } from '../src/content.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const brandDir = join(root, 'src/assets/brand');
const publicDir = join(root, 'public');
const require = createRequire(import.meta.url);

// Site palette (keep in sync with the design tokens).
const color = {
  paper: '#F1EEE6',
  ink: '#1B1B18',
  graphite: '#5E5B53',
  grid: '#DAD5C8',
  accent: '#2340C4',
  inkDark: '#EDEAE2',
};

/**
 * @typedef {object} Logo
 * @property {string} viewBox
 * @property {string} body  Inner markup of the <svg> (the single <path>).
 * @property {string} d     Path data of that <path>.
 */

/**
 * Reads a logo source. They are kept as one bare <path> filled with currentColor.
 * @param {string} name
 * @returns {Logo}
 */
function readLogo(name) {
  const svg = readFileSync(join(brandDir, name), 'utf8');
  const match = svg.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
  const d = svg.match(/\sd="([^"]+)"/)?.[1];
  if (!match || !d) throw new Error(`${name}: expected <svg viewBox> with a single <path d>`);
  return { viewBox: match[1], body: match[2].trim(), d };
}

/**
 * Rasterises an SVG at its own width/height.
 * @param {string} svg
 * @param {string} file  Output path relative to public/.
 */
function writePng(svg, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
  writeFileSync(join(publicDir, file), png);
  return png;
}

/**
 * Wraps a PNG in a single-image ICO container, for clients that request /favicon.ico blindly.
 * @param {Buffer} png  Square PNG of at most 256 px.
 * @param {number} size
 */
function writeIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18); // image data offset
  writeFileSync(join(publicDir, 'favicon.ico'), Buffer.concat([header, png]));
}

/** @param {string} text */
const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/**
 * Favicon for browsers that support SVG. It cannot inherit currentColor,
 * so the fill follows the colour scheme through an embedded style.
 * @param {Logo} mono
 */
function faviconSvg(mono) {
  const style = `path{fill:${color.ink}}@media(prefers-color-scheme:dark){path{fill:${color.inkDark}}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mono.viewBox}"><style>${style}</style>${mono.body}</svg>\n`;
}

/**
 * 32×32 fallback: ink monogram on a paper tile, so it reads on light and dark tab bars.
 * At 2 px per cell the monogram is exactly 32 px wide, which would leave the outer stems
 * touching the tile edge (and vanishing on a dark bar). Both letters are therefore moved
 * 1 px inwards, narrowing the gap between them from 4 px to 2 px; the letters themselves
 * stay on whole pixels. Tile radius = 2 cells, the logo's corner rule.
 * @param {Logo} mono
 */
function favicon32(mono) {
  const [m, s, ...rest] = mono.d.split(/(?=M)/);
  if (!s || rest.length) throw new Error('monogram.svg: expected two subpaths (M, S)');
  const letter = (/** @type {string} */ d, /** @type {number} */ dx) =>
    `<path transform="translate(${dx} 0) scale(2)" d="${d}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <rect width="32" height="32" rx="4" fill="${color.paper}"/>
    <g fill="${color.ink}">${letter(m, 1)}${letter(s, -1)}</g>
  </svg>`;
}

/**
 * 180×180 iOS icon: full-bleed paper (iOS rounds the corners), monogram on a 20×20 grid
 * of 9 px cells with a 2-cell margin, so every edge lands on a whole pixel.
 * @param {Logo} mono
 */
function appleTouchIcon(mono) {
  const cell = 9;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
    <rect width="180" height="180" fill="${color.paper}"/>
    <svg x="${2 * cell}" y="${2 * cell}" width="${16 * cell}" height="${16 * cell}" viewBox="${mono.viewBox}" fill="${color.ink}">${mono.body}</svg>
  </svg>`;
}

/**
 * Fontsource CSS with its relative font URLs made absolute, for a page opened from a temp dir.
 * @param {string} pkg
 */
function fontCss(pkg) {
  const css = require.resolve(pkg);
  const base = pathToFileURL(dirname(css)).href;
  return readFileSync(css, 'utf8').replaceAll('url(./', `url(${base}/`);
}

/**
 * 1200×630 Open Graph card on squared paper (30 px cells, 40×21 grid).
 * Text boxes are trimmed to cap height so baselines sit on grid lines: `--baseline` is the
 * grid row, `data-cap` the cap height in px, turned into a font size once fonts have loaded.
 * @param {Logo} wordmark
 */
function ogHtml(wordmark) {
  const t = content[defaultLocale];
  const [first, ...rest] = t.hero.name.split(' ');
  return `<!doctype html>
<html lang="${t.lang}">
<meta charset="utf-8">
<style>
${fontCss('@fontsource-variable/jost')}
${fontCss('@fontsource-variable/atkinson-hyperlegible-next')}
* { margin: 0; }
body {
  position: relative;
  width: 1200px;
  height: 630px;
  overflow: hidden;
  color: ${color.ink};
  background:
    linear-gradient(to right, ${color.grid} 1px, transparent 1px) 0 0 / 30px 30px,
    linear-gradient(to bottom, ${color.grid} 1px, transparent 1px) 0 0 / 30px 30px,
    ${color.paper};
  font-family: 'Atkinson Hyperlegible Next Variable', sans-serif;
}
/* 5 px per logo cell: 7×2 grid cells, bottom on the footer baseline. */
.wordmark { position: absolute; right: 60px; top: 510px; width: 210px; height: 60px; fill: ${color.ink}; }
[data-cap] {
  position: absolute;
  left: 60px;
  top: calc(var(--baseline) * 30px);
  translate: 0 -100%;
  text-box: trim-both cap alphabetic;
  white-space: nowrap;
}
.jost { font-family: 'Jost Variable', sans-serif; }
.name { font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
.role { font-weight: 500; }
.lead { color: ${color.graphite}; }
.domain { font-weight: 500; color: ${color.accent}; }
</style>
<svg class="wordmark" viewBox="${wordmark.viewBox}" aria-hidden="true">${wordmark.body}</svg>
<h1>
  <span class="jost name" data-cap="90" style="--baseline: 5">${escapeHtml(first)}</span>
  <span class="jost name" data-cap="90" style="--baseline: 9">${escapeHtml(rest.join(' '))}</span>
</h1>
<p class="jost role" data-cap="30" style="--baseline: 12">${escapeHtml(t.hero.role)}</p>
<p class="lead" data-cap="21" style="--baseline: 14">${escapeHtml(t.meta.ogTagline)}</p>
<p class="jost domain" data-cap="21" style="--baseline: 19">${new URL(site.url).host}</p>
</html>`;
}

/**
 * Screenshots the OG template in Chrome.
 * @param {string} html
 * @param {string} file
 */
async function writeOg(html, file) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-'));
  const page = join(dir, 'og.html');
  writeFileSync(page, html);
  const executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(executablePath ? { executablePath } : { channel: 'chrome' });
  try {
    const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await tab.goto(pathToFileURL(page).href);
    await tab.evaluate(async () => {
      await document.fonts.ready;
      // A missing font file would silently fall back to a system face.
      const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replaceAll('"', ''));
      for (const family of ['Jost Variable', 'Atkinson Hyperlegible Next Variable']) {
        if (!loaded.includes(family)) throw new Error(`OG font not loaded: ${family}`);
      }
      for (const el of document.querySelectorAll('[data-cap]')) {
        if (!(el instanceof HTMLElement)) continue;
        // With the box trimmed to cap height, its height at 100px gives the cap-height ratio.
        el.style.fontSize = '100px';
        const ratio = el.getBoundingClientRect().height / 100;
        el.style.fontSize = `${Number(el.dataset.cap) / ratio}px`;
      }
      const overflow = [...document.querySelectorAll('[data-cap]')].find(
        (el) => el.getBoundingClientRect().right > 1200 - 60,
      );
      if (overflow) throw new Error(`OG text overflows the right margin: ${overflow.textContent}`);
    });
    await tab.screenshot({ path: join(publicDir, file) });
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const monogram = readLogo('monogram.svg');
const wordmark = readLogo('wordmark.svg');

writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg(monogram));
writeIco(writePng(favicon32(monogram), 'favicon-32.png'), 32);
writePng(appleTouchIcon(monogram), 'apple-touch-icon.png');
await writeOg(ogHtml(wordmark), 'og.png');

console.log('brand: favicon.svg, favicon-32.png, favicon.ico, apple-touch-icon.png, og.png -> public/');
