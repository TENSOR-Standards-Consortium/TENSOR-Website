import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://tensor-website.pages.dev';

export default defineConfig({
  site,
  output: 'static',
  integrations: [react(), sitemap()],
  security: {
    // Astro computes a separate hash policy for each built page. The hosting
    // header adds frame-ancestors, which browsers do not support in a CSP meta.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self' https://tensor-standards-consortium.org https://raw.githubusercontent.com https://tensor-standards-consortium.github.io",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: {
        // Cytoscape 3.33.3 inserts exactly this trusted renderer stylesheet:
        // .__________cytoscape_container { position: relative; }
        // The hosting regression test derives the hash from the pinned package.
        hashes: ['sha256-pgvDUBa4IjFA2yuSJ2cqcyxmNYJMborsd0ORcRv9vw8='],
        resources: [
          "'self'", 'https://fonts.googleapis.com',
          // React's data-driven bar widths and Cytoscape use element styles.
          // This does not allow inline script or inline event handlers.
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
});
