/** @type {import('astro').APIRoute} */
export const GET = ({ site }) => {
  if (!site) throw new Error('The canonical site must be configured to generate robots.txt');
  const sitemap = new URL('sitemap-index.xml', site);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
