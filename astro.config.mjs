// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

import mdx from '@astrojs/mdx';

// The Netlify adapter's dev emulation needs a local Edge Functions server we don't run.
// Every page is static today, so dev runs without it; builds still target Netlify.
const isDev = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://johnetokhana.com', // canonical URLs and link previews
  integrations: [react(), mdx()],
  devToolbar: { enabled: false }, // it sits under the dock in local preview and reads as part of the site
  adapter: isDev ? undefined : netlify(),
  // Local preview has no functions, so JohnLM's questions go to the live answer service,
  // which accepts localhost. They count towards the day's 20 and are logged like any other.
  vite: { server: { proxy: isDev ? { '/api/ask': { target: 'https://johnetokhana.com', changeOrigin: true } } : {} } },
});