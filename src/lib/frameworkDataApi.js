import { fetchApiJson } from './runtimeApi';

const FRAMEWORK_RELEASE_ROOTS = [
  'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/main/',
  'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/master/',
  'https://tensor-standards-consortium.github.io/TENSOR-Framework/',
];
const DEFAULT_RELEASE_ALLOWED_HOSTS = [
  'raw.githubusercontent.com',
  'tensor-standards-consortium.github.io',
  'tensor-standards-consortium.org',
];
const DEFAULT_RELEASE_PATH_PREFIXES = new Map([
  [
    'raw.githubusercontent.com',
    [
      '/tensor-standards-consortium/tensor-framework/main/releases/',
      '/tensor-standards-consortium/tensor-framework/master/releases/',
    ],
  ],
  ['tensor-standards-consortium.github.io', ['/TENSOR-Framework/releases/']],
  ['tensor-standards-consortium.org', ['/assets/releases/', '/releases/']],
]);
const SAME_ORIGIN_RELEASE_PATH_PREFIXES = ['/assets/releases/', '/releases/'];
const REPORT_TYPES = new Set(['math-assurance', 'graph-quality', 'coverage-matrix']);

const RELEASE_MANIFEST_PATH = 'releases/manifest.json';
const METRICS_HISTORY_PATH = 'releases/core/reports/history/math-assurance-history.json';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
}

function readNestedRecord(container, key) {
  const candidate = container?.[key];
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : null;
}

function readNestedValue(container, key) {
  if (!container || typeof container !== 'object' || Array.isArray(container)) {
    return '';
  }

  return typeof container[key] === 'string' ? container[key] : '';
}

function manifestReleaseArray(source) {
  if (Array.isArray(source?.releases)) {
    return source.releases;
  }
  if (Array.isArray(source?.versions)) {
    return source.versions;
  }
  if (Array.isArray(source?.artifacts)) {
    return source.artifacts;
  }
  return [];
}

function sanitizeAssetPath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '';
  }

  const normalized = trimmed.replace(/^\.\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return '';
  }

  return normalized;
}

function parseCsv(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readBuildEnv(name) {
  return import.meta.env?.[name] || '';
}

function tryParseUrl(value, base) {
  try {
    return base ? new URL(value, base) : new URL(value);
  } catch {
    return null;
  }
}

function normalizeHost(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const parsed = tryParseUrl(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  return parsed?.hostname?.toLowerCase() || '';
}

function resolveReleaseAllowedHosts() {
  const hosts = new Set(DEFAULT_RELEASE_ALLOWED_HOSTS.map((host) => host.toLowerCase()));

  const buildTimeValue = readBuildEnv('PUBLIC_RELEASE_ALLOWED_HOSTS') || readBuildEnv('RELEASE_ALLOWED_HOSTS');
  for (const hostValue of parseCsv(buildTimeValue)) {
    const host = normalizeHost(hostValue);
    if (host) {
      hosts.add(host);
    }
  }

  if (typeof document !== 'undefined' && document.body?.dataset?.releaseAllowedHosts) {
    for (const hostValue of parseCsv(document.body.dataset.releaseAllowedHosts)) {
      const host = normalizeHost(hostValue);
      if (host) {
        hosts.add(host);
      }
    }
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    hosts.add(window.location.hostname.toLowerCase());
  }

  return hosts;
}

function releasePathPrefixesForHost(host) {
  const normalizedHost = String(host || '').toLowerCase();
  const configuredPrefixes = DEFAULT_RELEASE_PATH_PREFIXES.get(normalizedHost);
  if (configuredPrefixes) {
    return configuredPrefixes;
  }

  if (typeof window !== 'undefined' && window.location?.hostname?.toLowerCase() === normalizedHost) {
    return SAME_ORIGIN_RELEASE_PATH_PREFIXES;
  }

  return null;
}

function isTrustedReleasePathname(parsed) {
  const prefixes = releasePathPrefixesForHost(parsed.hostname);
  return !prefixes || prefixes.some((prefix) => parsed.pathname.startsWith(prefix));
}

export function isTrustedReleaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const normalized = value.trim();
  if (normalized.startsWith('//')) {
    return false;
  }

  if (normalized.startsWith('/')) {
    const parsedRelative = tryParseUrl(normalized, 'https://tensor.local');
    return Boolean(parsedRelative && isTrustedReleasePathname(parsedRelative));
  }

  const parsed = tryParseUrl(normalized);
  if (!parsed) {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const allowedHosts = resolveReleaseAllowedHosts();
  return allowedHosts.has(parsed.hostname.toLowerCase()) && isTrustedReleasePathname(parsed);
}

function parseReportType(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return REPORT_TYPES.has(normalized) ? normalized : 'math-assurance';
}

function withAcceptHeader(init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };
  return {
    ...init,
    headers,
  };
}

function parseVersion(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim();
  return /^\d+\.\d{8}[a-z]?$/.test(normalized) ? normalized : '';
}

function resolveTimestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildVersionScore(version) {
  const normalized = parseVersion(version);
  if (!normalized) {
    return 0;
  }

  const [majorRaw, releaseRaw] = normalized.split('.');
  const major = Number.parseInt(majorRaw, 10);
  const releaseMatch = String(releaseRaw || '').match(/^(\d{8})([a-z]?)$/i);
  if (!Number.isFinite(major) || !releaseMatch) {
    return 0;
  }

  const releaseDate = Number.parseInt(releaseMatch[1], 10);
  const suffix = String(releaseMatch[2] || '').toLowerCase();
  const suffixScore = suffix ? suffix.charCodeAt(0) - 96 : 0;

  if (!Number.isFinite(releaseDate)) {
    return 0;
  }

  return major * 1_000_000_000_000 + releaseDate * 100 + Math.max(0, suffixScore);
}

function latestVersionFromReleases(releases, key) {
  if (!Array.isArray(releases) || releases.length === 0) {
    return '';
  }

  let bestVersion = '';
  let bestScore = 0;

  for (const release of releases) {
    const version = parseVersion(release?.[key]);
    if (!version) {
      continue;
    }

    const score = buildVersionScore(version);
    if (score > bestScore) {
      bestVersion = version;
      bestScore = score;
    }
  }

  return bestVersion;
}

function rankManifestFreshness(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    return { versionScore: 0, generatedAtScore: 0, releaseCount: 0 };
  }

  const versionScore = Math.max(
    buildVersionScore(manifest.latestGraphVersion),
    buildVersionScore(manifest.latestSchemaVersion)
  );
  const generatedAtScore = resolveTimestamp(manifest.generatedAt);
  const releaseCount = manifestReleaseArray(manifest).length;

  return {
    versionScore,
    generatedAtScore,
    releaseCount,
  };
}

function isManifestFresher(candidate, current) {
  const left = rankManifestFreshness(candidate);
  const right = rankManifestFreshness(current);

  if (left.versionScore !== right.versionScore) {
    return left.versionScore > right.versionScore;
  }
  if (left.generatedAtScore !== right.generatedAtScore) {
    return left.generatedAtScore > right.generatedAtScore;
  }
  if (left.releaseCount !== right.releaseCount) {
    return left.releaseCount > right.releaseCount;
  }

  return false;
}

export function buildFrameworkAssetUrls(assetPath) {
  const normalized = sanitizeAssetPath(assetPath);
  if (!normalized) {
    return [];
  }

  return unique(
    FRAMEWORK_RELEASE_ROOTS.map((root) => {
      try {
        const candidate = new URL(normalized, root).toString();
        return isTrustedReleaseUrl(candidate) ? candidate : '';
      } catch {
        return '';
      }
    })
  );
}

function extractReleaseAssetInfo(release, kind) {
  const root = release && typeof release === 'object' && !Array.isArray(release) ? release : {};
  const kindRecord = readNestedRecord(root, kind);
  const assetsRecord = readNestedRecord(readNestedRecord(root, 'assets'), kind);
  const pathsRecord = readNestedRecord(root, 'paths');
  const urlsRecord = readNestedRecord(root, 'urls');
  const filesRecord = readNestedRecord(root, 'files');
  const linksRecord = readNestedRecord(root, 'links');

  const version = parseVersion(
    pickString(
      root?.[`${kind}Version`],
      root?.version,
      root?.releaseVersion,
      kindRecord?.version,
      assetsRecord?.version
    )
  );
  const path = pickString(
    root?.[`${kind}Path`],
    kindRecord?.path,
    kindRecord?.assetPath,
    kindRecord?.file,
    assetsRecord?.path,
    assetsRecord?.assetPath,
    assetsRecord?.file,
    readNestedValue(pathsRecord, kind),
    readNestedValue(filesRecord, kind)
  );
  const url = pickString(
    root?.[`${kind}Url`],
    kindRecord?.url,
    kindRecord?.href,
    assetsRecord?.url,
    assetsRecord?.href,
    readNestedValue(urlsRecord, kind),
    readNestedValue(linksRecord, kind)
  );

  return {
    version: version || null,
    path: path || null,
    url: url || null,
  };
}

function mapReleaseWithPortableUrls(release) {
  if (!release || typeof release !== 'object') {
    return release;
  }

  const graphAsset = extractReleaseAssetInfo(release, 'graph');
  const schemaAsset = extractReleaseAssetInfo(release, 'schema');
  const graphPath = sanitizeAssetPath(graphAsset.path);
  const schemaPath = sanitizeAssetPath(schemaAsset.path);
  const graphUrls = unique([graphAsset.url, ...buildFrameworkAssetUrls(graphPath)]).filter(isTrustedReleaseUrl);
  const schemaUrls = unique([schemaAsset.url, ...buildFrameworkAssetUrls(schemaPath)]).filter(isTrustedReleaseUrl);

  return {
    ...release,
    graphVersion: graphAsset.version,
    schemaVersion: schemaAsset.version,
    graphPath: graphPath || graphAsset.path || null,
    schemaPath: schemaPath || schemaAsset.path || null,
    graphUrl: graphUrls[0] || null,
    schemaUrl: schemaUrls[0] || null,
  };
}

function normalizeReleaseManifest(payload, sourceName) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const releases = manifestReleaseArray(source).map(mapReleaseWithPortableUrls).filter(Boolean);
  const latestGraphVersion =
    parseVersion(source.latestGraphVersion) || latestVersionFromReleases(releases, 'graphVersion') || null;
  const latestSchemaVersion =
    parseVersion(source.latestSchemaVersion) || latestVersionFromReleases(releases, 'schemaVersion') || null;
  const manifestUrlCandidate = pickString(
    source.manifestUrl,
    readNestedValue(readNestedRecord(source, 'urls'), 'manifest'),
    readNestedValue(readNestedRecord(source, 'links'), 'manifest')
  );

  return {
    channel: typeof source.channel === 'string' ? source.channel : 'stable',
    generatedAt: source.generatedAt || null,
    latestGraphVersion,
    latestSchemaVersion,
    releases,
    source: source.source || null,
    sourceName: source.sourceName || source.source || sourceName || null,
    manifestUrl: isTrustedReleaseUrl(manifestUrlCandidate) ? manifestUrlCandidate : null,
  };
}

async function fetchJsonFromSources(sources, init = {}) {
  const requestInit = withAcceptHeader(init);
  let lastError = null;

  for (const source of sources) {
    if (!source?.url) {
      continue;
    }

    if (!isTrustedReleaseUrl(source.url)) {
      lastError = new Error(`${source.label} blocked by release URL policy`);
      continue;
    }

    try {
      const response = await fetch(source.url, requestInit);
      if (!response.ok) {
        throw new Error(`${source.label} returned ${response.status}`);
      }

      const data = await response.json();
      return {
        data,
        requestUrl: source.url,
        sourceName: source.label,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No fallback sources resolved');
}

async function fetchFreshestManifestFromSources(sources, init = {}) {
  const requestInit = withAcceptHeader({
    cache: init.cache || 'no-store',
    ...init,
  });
  let freshest = null;
  let lastError = null;

  for (const source of sources) {
    if (!source?.url) {
      continue;
    }

    if (!isTrustedReleaseUrl(source.url)) {
      lastError = new Error(`${source.label} blocked by release URL policy`);
      continue;
    }

    try {
      const response = await fetch(source.url, requestInit);
      if (!response.ok) {
        throw new Error(`${source.label} returned ${response.status}`);
      }

      const payload = await response.json();
      const normalized = normalizeReleaseManifest(payload, source.url);
      const candidate = {
        data: normalized,
        requestUrl: source.url,
        sourceName: source.label,
      };

      if (!freshest || isManifestFresher(candidate.data, freshest.data)) {
        freshest = candidate;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (freshest) {
    return freshest;
  }

  throw lastError || new Error('No release manifest sources resolved');
}

async function fetchApiFirst(path, init = {}) {
  try {
    const result = await fetchApiJson(path, withAcceptHeader(init));
    return {
      ok: true,
      data: result.data,
      requestUrl: result.requestUrl,
      sourceName: 'Worker API',
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
}

function normalizeHistory(payload) {
  if (payload?.report && Array.isArray(payload.report.series)) {
    return payload.report;
  }

  if (payload && Array.isArray(payload.series)) {
    return payload;
  }

  return {
    generatedAt: null,
    series: [],
    deltas: [],
  };
}

function normalizeReport(payload) {
  if (payload?.report && payload.report.summary) {
    return payload.report;
  }

  if (payload?.summary) {
    return payload;
  }

  return null;
}

function latestHistoryVersion(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return '';
  }

  const copy = [...series].sort(
    (left, right) => resolveTimestamp(left?.generatedAt) - resolveTimestamp(right?.generatedAt)
  );
  return parseVersion(copy[copy.length - 1]?.version || '');
}

export async function fetchReleaseManifest(init = {}) {
  const apiResult = await fetchApiFirst('/api/releases', init);
  if (apiResult.ok) {
    return {
      data: normalizeReleaseManifest(apiResult.data, apiResult.requestUrl),
      requestUrl: apiResult.requestUrl,
    };
  }

  const fallbackSources = [
    ...buildFrameworkAssetUrls(RELEASE_MANIFEST_PATH).map((url) => ({
      url,
      label: `Framework release manifest (${new URL(url).host})`,
    })),
    {
      url: '/assets/releases/manifest.json',
      label: 'Static release manifest',
    },
  ];

  const fallbackResult = await fetchFreshestManifestFromSources(fallbackSources, init);
  return {
    data: fallbackResult.data,
    requestUrl: fallbackResult.requestUrl,
  };
}

export async function fetchVersionChannel(init = {}) {
  const apiResult = await fetchApiFirst('/api/version', init);
  if (apiResult.ok) {
    return {
      data: apiResult.data,
      requestUrl: apiResult.requestUrl,
    };
  }

  const releaseResult = await fetchReleaseManifest(init);
  return {
    data: {
      latestGraphVersion: releaseResult.data.latestGraphVersion,
      latestSchemaVersion: releaseResult.data.latestSchemaVersion,
      sourceName: releaseResult.data.sourceName || releaseResult.requestUrl,
      sourceType: 'fallback',
      manifestUrl: releaseResult.requestUrl,
    },
    requestUrl: releaseResult.requestUrl,
  };
}

export async function fetchMetricsHistoryChannel(init = {}) {
  const apiResult = await fetchApiFirst('/api/metrics/history', init);
  if (apiResult.ok) {
    return {
      data: apiResult.data,
      requestUrl: apiResult.requestUrl,
    };
  }

  const fallbackSources = buildFrameworkAssetUrls(METRICS_HISTORY_PATH).map((url) => ({
    url,
    label: `Framework metrics history (${new URL(url).host})`,
  }));

  const fallbackResult = await fetchJsonFromSources(fallbackSources, init);
  return {
    data: {
      ...fallbackResult.data,
      manifestSource: fallbackResult.requestUrl,
      sourceType: 'fallback',
    },
    requestUrl: fallbackResult.requestUrl,
  };
}

export async function fetchMetricsReportChannel(version, type, init = {}) {
  const normalizedVersion = parseVersion(version);
  if (!normalizedVersion) {
    throw new Error(`Invalid release version: ${version}`);
  }

  const reportType = parseReportType(type);
  const path = `releases/core/reports/v${normalizedVersion}/${reportType}.json`;
  const apiPath = `/api/metrics/report?version=${encodeURIComponent(normalizedVersion)}&type=${encodeURIComponent(reportType)}`;

  const apiResult = await fetchApiFirst(apiPath, init);
  if (apiResult.ok) {
    return {
      data: apiResult.data,
      requestUrl: apiResult.requestUrl,
    };
  }

  const fallbackSources = buildFrameworkAssetUrls(path).map((url) => ({
    url,
    label: `Framework metrics ${normalizedVersion} ${reportType} (${new URL(url).host})`,
  }));

  const fallbackResult = await fetchJsonFromSources(fallbackSources, init);
  return {
    data: {
      ...fallbackResult.data,
      manifestSource: fallbackResult.requestUrl,
      sourceType: 'fallback',
      resolvedVersion: normalizedVersion,
    },
    requestUrl: fallbackResult.requestUrl,
  };
}

export async function fetchMetricsLatestChannel(init = {}) {
  const apiResult = await fetchApiFirst('/api/metrics/latest', init);
  if (apiResult.ok) {
    return {
      data: apiResult.data,
      requestUrl: apiResult.requestUrl,
    };
  }

  const [releaseResult, historyResult] = await Promise.all([
    fetchReleaseManifest(init),
    fetchMetricsHistoryChannel(init),
  ]);

  const history = normalizeHistory(historyResult.data);
  const fallbackVersion =
    parseVersion(releaseResult.data.latestGraphVersion) || latestHistoryVersion(history.series);

  if (!fallbackVersion) {
    throw new Error('No latest release version available for metrics lookup');
  }

  const reportResult = await fetchMetricsReportChannel(fallbackVersion, 'math-assurance', init);
  const report = normalizeReport(reportResult.data);
  if (!report) {
    throw new Error('Latest metrics unavailable');
  }

  return {
    data: {
      resolvedVersion: fallbackVersion,
      generatedAt: report.generatedAt || history.generatedAt || null,
      report,
      manifestSource:
        releaseResult.data.sourceName ||
        reportResult.data?.manifestSource ||
        historyResult.data?.manifestSource ||
        reportResult.requestUrl,
      sourceType: 'fallback',
    },
    requestUrl: reportResult.requestUrl,
  };
}
