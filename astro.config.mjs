// @ts-check
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/content.ts';

const require = createRequire(import.meta.url);

/**
 * Font faces of a pinned @fontsource-variable package, read from its own CSS, so the build
 * needs no network and ships the same files the OG image generator uses.
 * (fontProviders.npm() would do this, but in Astro 7.4 it hands file:// URLs to fetch().)
 * @param {string} pkg  e.g. '@fontsource-variable/jost'
 * @param {string[]} subsets  e.g. ['latin', 'latin-ext']
 */
function fontsourceFaces(pkg, subsets) {
  const css = require.resolve(pkg);
  const faces = readFileSync(css, 'utf8').split('@font-face').slice(1);
  const variants = faces.flatMap((face) => {
    const file = /url\(\.\/(files\/[^)]+\.woff2)\)/.exec(face)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
    // Files are named <family>-<subset>-wght-normal.woff2; "latin" must not match "latin-ext".
    if (!file || !range || !subsets.some((subset) => file.endsWith(`-${subset}-wght-normal.woff2`))) return [];
    return [
      {
        src: /** @type {[string]} */ ([join(dirname(css), file)]),
        weight: '100 900',
        style: /** @type {const} */ ('normal'),
        unicodeRange: /** @type {[string]} */ ([range]),
      },
    ];
  });
  const [first, ...rest] = variants;
  if (!first) throw new Error(`${pkg}: no font files for subsets ${subsets.join(', ')}`);
  return /** @type {[typeof first, ...typeof rest]} */ ([first, ...rest]);
}

const subsets = ['latin', 'latin-ext'];

// https://astro.build/config
export default defineConfig({
  site: site.url,
  build: {
    // The whole stylesheet is a few kB: inlining it removes the only render-blocking request.
    inlineStylesheets: 'always',
  },
  // No Markdown on the site; Shiki's inline styles would also conflict with the CSP.
  markdown: { syntaxHighlight: false },
  security: {
    // Emits a <meta> CSP with hashes of the inline styles. frame-ancestors only works as an
    // HTTP header, so it lives in public/_headers. connect-src lets tools such as Lighthouse
    // fetch robots.txt and llms.txt from the page; the page itself makes no requests.
    csp: {
      directives: [
        "default-src 'none'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
      ],
    },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Jost',
      cssVariable: '--font-jost',
      fallbacks: ['sans-serif'],
      options: { variants: fontsourceFaces('@fontsource-variable/jost', subsets) },
    },
    {
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--font-atkinson',
      fallbacks: ['sans-serif'],
      options: { variants: fontsourceFaces('@fontsource-variable/atkinson-hyperlegible-next', subsets) },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
