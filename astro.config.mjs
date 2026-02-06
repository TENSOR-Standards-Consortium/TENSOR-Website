import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://tensor-standards-consortium.org';

export default defineConfig({
  site,
  output: 'static',
  integrations: [react(), sitemap()],
});
