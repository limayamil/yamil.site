// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://yamil.me',
  integrations: [sitemap()],
  // This is a single-page site, so there is no shared navigation cache to win
  // back from a separate stylesheet. Inlining removes the only render-blocking
  // request from the critical path without increasing the transferred CSS.
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
