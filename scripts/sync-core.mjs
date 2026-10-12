#!/usr/bin/env node
// The framework repository is the source of truth. This script never fetches or executes source files.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBSITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '0.1.0-draft.1';
const CORE = `core/v${VERSION}`;
const PUBLIC_CORE = `public/core/${VERSION}`;
const FOUNDING = 'proposals/founding-core-v0.1.0';
const LEGACY = 'releases/core/graphs/v0.20260206e/tensor.core.graph.json';
const LEGACY_TARGET = 'public/legacy/0.20260206e/tensor.core.graph.json';
const LEGACY_SHA256 = 'dfc3f1a965c01b6f7ade253e426e69abcbad688fab20d9d00065d71c777c010c';
const REVIEW = 'review/2026-10-11.1';
const WORKING = ['tensor.core.graph.json', 'entry-evidence-criteria.json', 'source/entry_nodes.json', 'coverage-inventory.json',
  'reviews/2026-10-12-restoration/README.md', 'reviews/2026-10-12-restoration/analysis.json'];
const WORKING_TARGET = 'public/graphs/working';
const REVIEW_DOCS = ['stewardship.md', 'review-process.md', 'graph-coverage-roadmap.md', 'legacy-migration.md'];
const MANIFEST = `${PUBLIC_CORE}/provenance.json`;
const RUNTIME = ['index.mjs', 'schemas.mjs', 'json.mjs', 'schema-validator.mjs'];
const DOCUMENTS = ['README.md', 'binding.md', 'coverage.md'];
const FOUNDING_FILES = [
  'README.md', 'VALIDATION.md', '00-charter.md', '01-core-contract.md', '02-governance.md',
  '03-standards-crosswalk.md', '04-reference-cases-and-conformance.md', '05-review-plan.md',
  '06-change-and-decision-register.md', 'architecture.mmd', 'examples/README.md',
  'examples/case-a.definition.json', 'examples/case-a.record.json',
  'examples/case-b.definition.json', 'examples/case-b.record.json',
  'examples/manifest.json', 'examples/check_authoring.py',
];
const LICENSE_TARGETS = ['src/vendor/tensor-core/LICENSE', `${PUBLIC_CORE}/LICENSE`];
const OWNED_ROOTS = ['src/vendor/tensor-core', PUBLIC_CORE, 'public/founding', 'public/legacy/0.20260206e', 'public/review/2026-10-11.1', 'public/docs', WORKING_TARGET];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new Error(message); };
const lexicalOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value) || value.split('/').some((part) => !part || part === '.' || part === '..' || !/^[A-Za-z0-9._-]+$/.test(part))) fail(`Unsafe relative path: ${String(value)}`);
  return value;
}

async function safePath(root, relative, { missing = false } = {}) {
  safeRelative(relative);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) fail('Source and destination roots must be real directories.');
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) fail(`Symbolic links are not permitted: ${relative}`);
    } catch (error) {
      if (missing && error.code === 'ENOENT') continue;
      throw error;
    }
  }
  return current;
}

function allowedTarget(relative) {
  safeRelative(relative);
  if (!OWNED_ROOTS.some((root) => relative.startsWith(`${root}/`))) fail(`Path is outside generated artifact directories: ${relative}`);
  return relative;
}

async function listFiles(root, relative) {
  const folder = await safePath(root, relative);
  const files = [];
  for (const item of (await readdir(folder, { withFileTypes: true })).sort((a, b) => lexicalOrder(a.name, b.name))) {
    const child = safeRelative(`${relative}/${item.name}`);
    if (item.isSymbolicLink()) fail(`Symbolic links are not permitted: ${child}`);
    if (item.isDirectory()) files.push(...await listFiles(root, child));
    else if (item.isFile()) files.push(child);
    else fail(`Only regular files are permitted: ${child}`);
  }
  return files;
}

function parseArgs() {
  const result = { check: false };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--check') result.check = true;
    else if (['--framework', '--founding'].includes(args[index])) {
      const key = args[index].slice(2);
      const value = args[++index];
      if (!value || !path.isAbsolute(value)) fail(`--${key} requires an absolute local directory.`);
      if (result[key]) fail(`Duplicate --${key} argument.`);
      result[key] = path.normalize(value);
    } else fail(`Unknown argument: ${args[index]}`);
  }
  if (!result.check && !result.framework) fail('Usage: node scripts/sync-core.mjs --framework /absolute/framework-checkout [--check]');
  if (result.founding && !result.framework) fail('--founding requires --framework.');
  return result;
}

async function sourceSnapshot(options) {
  const source = options.framework;
  const foundingRoot = options.founding ?? source;
  const foundingPrefix = options.founding ? '' : `${FOUNDING}/`;
  const pairs = [
    ...RUNTIME.map((name) => ({ source: `${CORE}/${name}`, target: `src/vendor/tensor-core/${name}` })),
    ...LICENSE_TARGETS.map((target) => ({ source: 'LICENSE', target })),
    ...DOCUMENTS.map((name) => ({ source: `${CORE}/${name}`, target: `${PUBLIC_CORE}/${name}` })),
    ...FOUNDING_FILES.map((name) => ({ source: `${FOUNDING}/${name}`, readRoot: foundingRoot, readPath: `${foundingPrefix}${name}`, target: `public/founding/${name}` })),
    { source: LEGACY, target: LEGACY_TARGET },
    ...WORKING.map((name) => ({ source: `drafts/core/${name}`, target: `${WORKING_TARGET}/${name}` })),
  ];
  for (const filename of await listFiles(source, REVIEW)) {
    pairs.push({ source: filename, target: `public/${filename}` });
  }
  for (const name of REVIEW_DOCS) pairs.push({ source: `docs/${name}`, target: `public/docs/${name}` });
  for (const folder of ['schemas', 'examples']) {
    for (const filename of await listFiles(source, `${CORE}/${folder}`)) {
      if (!/\.(json|md)$/.test(filename)) fail(`Unexpected public Core artifact: ${filename}`);
      pairs.push({ source: filename, target: `${PUBLIC_CORE}/${filename.slice(CORE.length + 1)}` });
    }
  }
  pairs.sort((a, b) => lexicalOrder(a.target, b.target));
  for (const file of pairs) {
    allowedTarget(file.target);
    file.bytes = await readFile(await safePath(file.readRoot ?? source, file.readPath ?? file.source));
  }
  if (hash(pairs.find((file) => file.source === LEGACY).bytes) !== LEGACY_SHA256) fail('Published legacy graph does not match its pinned SHA-256. No files were written.');
  const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (path.resolve(git('rev-parse', '--show-toplevel')) !== source) fail('--framework must identify the root of its Git checkout.');
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)tensor-standards-consortium\/tensor-framework(?:\.git)?\/?$/i.test(git('remote', 'get-url', 'origin'))) fail('Framework origin must be the TENSOR Standards Consortium framework repository.');
  const head = git('rev-parse', 'HEAD');
  if (!/^[0-9a-f]{40}$/.test(head)) fail('Framework HEAD must be a full Git commit hash.');
  const manifest = {
    format: 'tensor-website-source-manifest',
    manifestVersion: 1,
    bindingVersion: VERSION,
    sourceRepository: 'https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework',
    sourceCommit: head,
    sourceDirty: Boolean(git('status', '--porcelain', '--untracked-files=all')),
    foundingSource: options.founding ? 'external-draft-bootstrap' : 'framework-repository',
    files: pairs.map(({ source: filename, target, bytes }) => ({ source: filename, target, sha256: hash(bytes), bytes: bytes.byteLength })),
  };
  return { pairs, manifest };
}

async function checkManifest() {
  const manifest = JSON.parse(await readFile(await safePath(WEBSITE, MANIFEST), 'utf8'));
  if (manifest.format !== 'tensor-website-source-manifest' || manifest.manifestVersion !== 1 || manifest.bindingVersion !== VERSION || manifest.sourceRepository !== 'https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework' || !/^[0-9a-f]{40}$/.test(manifest.sourceCommit) || typeof manifest.sourceDirty !== 'boolean' || !['framework-repository', 'external-draft-bootstrap'].includes(manifest.foundingSource) || !Array.isArray(manifest.files)) fail('Invalid generated provenance manifest.');
  const seen = new Set();
  for (const file of manifest.files) {
    allowedTarget(file.target);
    safeRelative(file.source);
    if (file.target === MANIFEST || seen.has(file.target) || !/^[0-9a-f]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) fail('Invalid or duplicate artifact in provenance manifest.');
    seen.add(file.target);
    const bytes = await readFile(await safePath(WEBSITE, file.target));
    if (bytes.byteLength !== file.bytes || hash(bytes) !== file.sha256) fail(`Generated artifact differs from its recorded source: ${file.target}`);
  }
  for (const required of [...WORKING.map((name) => `${WORKING_TARGET}/${name}`), ...RUNTIME.map((name) => `src/vendor/tensor-core/${name}`), ...LICENSE_TARGETS, ...DOCUMENTS.map((name) => `${PUBLIC_CORE}/${name}`), ...FOUNDING_FILES.map((name) => `public/founding/${name}`), ...['README.md', 'manifest.json', 'source.tar.gz', 'review-package.zip', 'verify-snapshot.py', 'validation.json', 'walkthrough.md', 'review-form.md'].map((name) => `public/${REVIEW}/${name}`), ...REVIEW_DOCS.map((name) => `public/docs/${name}`), ...['bundle', 'definition', 'record'].map((name) => `${PUBLIC_CORE}/schemas/${name}.schema.json`), ...['case-a', 'case-b'].map((name) => `${PUBLIC_CORE}/examples/${name}.bundle.json`), LEGACY_TARGET]) {
    if (!seen.has(required)) fail(`Required generated artifact is absent: ${required}`);
  }
  if (manifest.files.find((file) => file.target === LEGACY_TARGET)?.sha256 !== LEGACY_SHA256) fail('Legacy graph SHA-256 does not match the published release.');
  for (const root of OWNED_ROOTS) {
    for (const filename of await listFiles(WEBSITE, root)) {
      if (filename !== MANIFEST && !seen.has(filename)) fail(`Unrecorded file in generated directory: ${filename}`);
    }
  }
  return manifest;
}

try {
  const options = parseArgs();
  if (options.check) {
    const actual = await checkManifest();
    if (options.framework) {
      const expected = await sourceSnapshot(options);
      if (JSON.stringify(actual) !== JSON.stringify(expected.manifest)) fail('Generated artifacts or provenance differ from the supplied framework checkout. Run the sync command.');
    }
    console.log(`Verified ${actual.files.length} generated files against SHA-256 provenance${options.framework ? ' and the framework checkout' : ' (offline)'}. Source ${actual.sourceCommit}${actual.sourceDirty ? ' with uncommitted changes' : ''}.`);
  } else {
    const { pairs, manifest } = await sourceSnapshot(options);
    // Validate every destination before the first write. Unexpected files are reported by --check, never deleted.
    for (const file of [...pairs, { target: MANIFEST }]) await safePath(WEBSITE, file.target, { missing: true });
    for (const file of pairs) {
      const destination = await safePath(WEBSITE, file.target, { missing: true });
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.bytes);
    }
    await writeFile(await safePath(WEBSITE, MANIFEST, { missing: true }), `${JSON.stringify(manifest, null, 2)}\n`);
    await checkManifest();
    console.log(`Synced ${pairs.length} files from framework commit ${manifest.sourceCommit}${manifest.sourceDirty ? ' with uncommitted changes' : ''}.`);
    if (options.founding) console.warn('Bootstrap founding source used. Resync from the framework repository before release.');
  }
} catch (error) {
  console.error(`Core artifact sync failed: ${error.message}`);
  process.exitCode = 1;
}
