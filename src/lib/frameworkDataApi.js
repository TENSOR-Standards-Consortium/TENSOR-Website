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

const RELEASE_MANIFEST_PATH = 'releases/manifest.json';
const METRICS_HISTORY_PATH = 'releases/core/reports/history/math-assurance-history.json';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sanitizeAssetPath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
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

function tryParseUrl(value) {
  try {
    return new URL(value);
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

  const buildTimeValue =
    import.meta.env.PUBLIC_RELEASE_ALLOWED_HOSTS || import.meta.env.RELEASE_ALLOWED_HOSTS || '';
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

export function isTrustedReleaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const normalized = value.trim();
  if (normalized.startsWith('/')) {
    return true;
  }

  const parsed = tryParseUrl(normalized);
  if (!parsed) {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const allowedHosts = resolveReleaseAllowedHosts();
  return allowedHosts.has(parsed.hostname.toLowerCase());
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

function rankManifestFreshness(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    return { versionScore: 0, generatedAtScore: 0, releaseCount: 0 };
  }

  const versionScore = Math.max(
    buildVersionScore(manifest.latestGraphVersion),
    buildVersionScore(manifest.latestSchemaVersion)
  );
  const generatedAtScore = resolveTimestamp(manifest.generatedAt);
  const releaseCount = Array.isArray(manifest.releases) ? manifest.releases.length : 0;

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

function mapReleaseWithPortableUrls(release) {
  if (!release || typeof release !== 'object') {
    return release;
  }

  const graphPath = sanitizeAssetPath(release.graphPath);
  const schemaPath = sanitizeAssetPath(release.schemaPath);
  const graphUrls = unique([release.graphUrl, ...buildFrameworkAssetUrls(graphPath)]).filter(isTrustedReleaseUrl);
  const schemaUrls = unique([release.schemaUrl, ...buildFrameworkAssetUrls(schemaPath)]).filter(isTrustedReleaseUrl);

  return {
    ...release,
    graphPath: graphPath || release.graphPath || null,
    schemaPath: schemaPath || release.schemaPath || null,
    graphUrl: graphUrls[0] || null,
    schemaUrl: schemaUrls[0] || null,
  };
}

function normalizeReleaseManifest(payload, sourceName) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const releases = Array.isArray(source.releases) ? source.releases.map(mapReleaseWithPortableUrls) : [];

  return {
    channel: typeof source.channel === 'string' ? source.channel : 'stable',
    generatedAt: source.generatedAt || null,
    latestGraphVersion: parseVersion(source.latestGraphVersion) || null,
    latestSchemaVersion: parseVersion(source.latestSchemaVersion) || null,
    releases,
    source: source.source || null,
    sourceName: source.sourceName || source.source || sourceName || null,
    manifestUrl: isTrustedReleaseUrl(source.manifestUrl || '') ? source.manifestUrl : null,
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

  const reportType = typeof type === 'string' && type.trim() ? type.trim() : 'math-assurance';
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
