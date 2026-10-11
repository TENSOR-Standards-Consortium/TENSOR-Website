import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import astroConfig from '../astro.config.mjs';

const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
function walk(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) walk(child, callback);
  if (node.content) walk(node.content, callback);
}
const text = (node) => (node.childNodes || []).map((child) => child.value || '').join('');
const hash = (source) => `'sha256-${createHash('sha256').update(source).digest('base64')}'`;
// JavaScript MIME essences recognized by the HTML specification, plus the
// browser's executable/module-resolution inline script categories.
const scriptTypes = new Set([
  '', 'module', 'importmap', 'speculationrules',
  'application/ecmascript', 'application/javascript', 'application/x-ecmascript', 'application/x-javascript',
  'text/ecmascript', 'text/javascript', 'text/javascript1.0', 'text/javascript1.1', 'text/javascript1.2',
  'text/javascript1.3', 'text/javascript1.4', 'text/javascript1.5', 'text/jscript', 'text/livescript',
  'text/x-ecmascript', 'text/x-javascript',
]);

export function validateHtml(html, name = 'page') {
  const errors = [];
  const document = parse(html, { sourceCodeLocationInfo: true });
  const nodes = [];
  walk(document, (node) => nodes.push(node));
  const policies = nodes.filter((node) => node.tagName === 'meta' && attrs(node)['http-equiv']?.toLowerCase() === 'content-security-policy');
  if (policies.length !== 1) return [`${name}: expected exactly one built CSP meta policy, found ${policies.length}`];
  if (policies[0].parentNode?.tagName !== 'head') errors.push(`${name}: CSP meta must be inside head`);
  const csp = attrs(policies[0]).content || '';
  const directives = new Map();
  for (const part of csp.split(';').filter((part) => part.trim())) {
    const [key, ...values] = part.trim().split(/\s+/);
    const directive = key.toLowerCase();
    if (directives.has(directive)) errors.push(`${name}: duplicate CSP directive ${directive}`);
    else directives.set(directive, values); // Browsers honor the first instance.
  }
  const scriptSources = directives.get('script-src-elem') || directives.get('script-src') || directives.get('default-src') || [];
  const styleSources = directives.get('style-src-elem') || directives.get('style-src') || directives.get('default-src') || [];
  for (const keyword of ["'unsafe-inline'", "'unsafe-eval'", '*', 'data:']) {
    if (scriptSources.includes(keyword)) errors.push(`${name}: prohibited script source ${keyword}`);
  }
  if (!scriptSources.includes("'self'")) errors.push(`${name}: script policy must allow bundled self-hosted scripts`);
  if (!(directives.get('object-src') || []).includes("'none'")) errors.push(`${name}: object-src must be none`);
  const policyPosition = policies[0].sourceCodeLocation?.startOffset ?? Infinity;
  for (const node of nodes) {
    const attributes = attrs(node);
    if (Object.keys(attributes).some((key) => /^on[a-z]/i.test(key))) errors.push(`${name}: inline event handler on ${node.tagName}`);
    if (node.tagName === 'script') {
      const type = (attributes.type || '').trim().toLowerCase().split(';')[0];
      if (type === 'application/ld+json') {
        try { JSON.parse(text(node)); } catch { errors.push(`${name}: invalid JSON-LD`); }
        continue;
      }
      if (!scriptTypes.has(type)) continue;
      if (policyPosition > (node.sourceCodeLocation?.startOffset ?? 0)) errors.push(`${name}: executable script precedes CSP`);
      if (attributes.src) {
        const url = new URL(attributes.src, 'https://tensor.invalid/');
        if (url.origin !== 'https://tensor.invalid' && !scriptSources.includes(url.origin)) errors.push(`${name}: script source is not permitted: ${attributes.src}`);
      } else if (text(node).trim() && !scriptSources.includes(hash(text(node)))) {
        errors.push(`${name}: inline script is missing its exact-byte CSP hash`);
      }
    }
    if (node.tagName === 'style' && text(node).trim() && !styleSources.includes(hash(text(node)))) {
      errors.push(`${name}: inline style is missing its exact-byte CSP hash`);
    }
  }
  return errors;
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

export function validateRobots(source, site) {
  const sitemap = new URL('sitemap-index.xml', site).href;
  const declared = [...source.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map((match) => match[1]);
  return declared.length === 1 && declared[0] === sitemap
    ? []
    : [`robots.txt: expected one sitemap at the configured canonical site: ${sitemap}`];
}

export async function checkBuild(directory = resolve('dist')) {
  const files = await htmlFiles(directory);
  if (!files.length) throw new Error('No built HTML found. Run npm run build first.');
  const errors = [];
  for (const file of files) errors.push(...validateHtml(await readFile(file, 'utf8'), relative(directory, file)));
  errors.push(...validateRobots(await readFile(resolve(directory, 'robots.txt'), 'utf8'), astroConfig.site));
  const headers = await readFile(resolve(directory, '_headers'), 'utf8');
  if (!headers.includes("Content-Security-Policy: frame-ancestors 'self'")) errors.push('_headers: missing frame-ancestors header');
  if (/Content-Security-Policy:.*(?:script-src|default-src)/.test(headers)) errors.push('_headers: a second script/default policy would intersect the built page hashes');
  if (headers.split('\n').some((line) => line.length > 2000)) errors.push('_headers: Cloudflare line limit exceeded');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Built security checks passed: ${files.length} HTML pages, exact script/style hashes, JSON-LD, hosting headers, and canonical robots sitemap.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkBuild(process.argv[2] ? resolve(process.argv[2]) : undefined);
