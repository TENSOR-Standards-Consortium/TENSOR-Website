const LOCAL_RELEASE_MANIFEST_PATH = '/assets/releases/manifest.json';
const LEGACY_GRAPH_PATH = '/assets/data/tensor-core.json';
const LEGACY_SCHEMA_PATH = '/assets/data/core.schema.json';
const REPORT_TYPES = new Set(['math-assurance', 'graph-quality', 'coverage-matrix']);
const TELEMETRY_LEVELS = new Set(['info', 'warn', 'error']);
const TELEMETRY_MAX_PAYLOAD_BYTES = 8_000;
const TELEMETRY_MAX_DETAILS_BYTES = 4_000;
const REMOTE_JSON_MAX_BYTES = 2_000_000;

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

const REMOTE_MANIFEST_SOURCES = [
  {
    name: 'Framework repo (raw main)',
    manifestUrl:
      'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/main/releases/manifest.json',
    rootUrl: 'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/main/',
  },
  {
    name: 'Framework repo (raw master)',
    manifestUrl:
      'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/master/releases/manifest.json',
    rootUrl: 'https://raw.githubusercontent.com/tensor-standards-consortium/tensor-framework/master/',
  },
  {
    name: 'Framework Pages',
    manifestUrl: 'https://tensor-standards-consortium.github.io/TENSOR-Framework/releases/manifest.json',
    rootUrl: 'https://tensor-standards-consortium.github.io/TENSOR-Framework/',
  },
];

const PUBLIC_API_CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'content-type,accept',
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseCsv(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
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

function normalizeOrigin(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const parsed = tryParseUrl(value.trim());
  if (!parsed) {
    return '';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '';
  }

  return parsed.origin;
}

function getReleaseAllowedHosts(env, requestUrl) {
  const hosts = new Set(DEFAULT_RELEASE_ALLOWED_HOSTS.map((host) => host.toLowerCase()));

  for (const value of parseCsv(env?.RELEASE_ALLOWED_HOSTS)) {
    const host = normalizeHost(value);
    if (host) {
      hosts.add(host);
    }
  }

  const requestHost = tryParseUrl(requestUrl)?.hostname?.toLowerCase();
  if (requestHost) {
    hosts.add(requestHost);
  }

  return hosts;
}

function getTelemetryAllowedOrigins(env, requestUrl) {
  const requestedOrigins = parseCsv(env?.TELEMETRY_ALLOWED_ORIGINS)
    .map(normalizeOrigin)
    .filter(Boolean);

  if (requestedOrigins.length > 0) {
    return new Set(requestedOrigins);
  }

  return new Set([new URL(requestUrl).origin]);
}

function isAllowedTelemetryOrigin(request, env, requestUrl) {
  const originHeader = request.headers.get('origin');
  if (!originHeader) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(originHeader);
  if (!normalizedOrigin) {
    return false;
  }

  const allowedOrigins = getTelemetryAllowedOrigins(env, requestUrl);
  return allowedOrigins.has(normalizedOrigin);
}

function buildTelemetryCorsHeaders(request, env, requestUrl) {
  const originHeader = request.headers.get('origin');
  const normalizedOrigin = normalizeOrigin(originHeader);
  const requestOrigin = new URL(requestUrl).origin;

  if (normalizedOrigin && isAllowedTelemetryOrigin(request, env, requestUrl)) {
    return {
      'access-control-allow-origin': normalizedOrigin,
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'content-type,accept',
      vary: 'Origin',
    };
  }

  if (!originHeader) {
    return {
      'access-control-allow-origin': requestOrigin,
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'content-type,accept',
      vary: 'Origin',
    };
  }

  return null;
}

function releasePathPrefixesForHost(host, requestHost = '') {
  const normalizedHost = String(host || '').toLowerCase();
  const configuredPrefixes = DEFAULT_RELEASE_PATH_PREFIXES.get(normalizedHost);
  if (configuredPrefixes) {
    return configuredPrefixes;
  }

  if (requestHost && requestHost === normalizedHost) {
    return SAME_ORIGIN_RELEASE_PATH_PREFIXES;
  }

  return SAME_ORIGIN_RELEASE_PATH_PREFIXES;
}

function isTrustedReleasePathname(parsed, requestHost = '') {
  return releasePathPrefixesForHost(parsed.hostname, requestHost).some((prefix) =>
    parsed.pathname.startsWith(prefix)
  );
}

function validateTrustedHttpsUrl(value, allowedHosts, requestUrl = '') {
  if (typeof value !== 'string' || !value.trim()) {
    return {
      ok: false,
      reason: 'invalid-url',
    };
  }

  const parsed = tryParseUrl(value.trim());
  if (!parsed) {
    return {
      ok: false,
      reason: 'invalid-url',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      reason: `non-https:${parsed.protocol}`,
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!allowedHosts.has(host)) {
    return {
      ok: false,
      reason: `host-not-allowed:${host}`,
    };
  }

  const requestHost = tryParseUrl(requestUrl)?.hostname?.toLowerCase() || '';
  if (!isTrustedReleasePathname(parsed, requestHost)) {
    return {
      ok: false,
      reason: `path-not-allowed:${host}${parsed.pathname}`,
    };
  }

  return {
    ok: true,
    value: parsed.toString(),
  };
}

function noteBlockedSource(blockedReasons, reason) {
  if (!blockedReasons || !reason) {
    return;
  }

  blockedReasons.add(reason);
}

function sourceGuardMeta(blockedReasons) {
  const reasons = [...blockedReasons];
  return {
    sourceBlockedCount: reasons.length,
    blockedReasons: reasons.slice(0, 20),
  };
}

function pushTrustedUrl(urls, candidateUrl, allowedHosts, blockedReasons, requestUrl = '') {
  const result = validateTrustedHttpsUrl(candidateUrl, allowedHosts, requestUrl);
  if (!result.ok) {
    noteBlockedSource(blockedReasons, result.reason);
    return;
  }

  urls.push(result.value);
}

function jsonResponse(payload, status = 200, headers = {}, corsHeaders = PUBLIC_API_CORS_HEADERS) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-content-type-options': 'nosniff',
      ...(corsHeaders || {}),
      ...headers,
    },
  });
}

function graphNodeData(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return {};
  }

  if (node.data && typeof node.data === 'object' && !Array.isArray(node.data)) {
    return node.data;
  }

  return node;
}

function graphEdgeData(edge) {
  if (!edge || typeof edge !== 'object' || Array.isArray(edge)) {
    return {};
  }

  if (edge.data && typeof edge.data === 'object' && !Array.isArray(edge.data)) {
    return edge.data;
  }

  return edge;
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

function getManifestReleases(manifest) {
  if (Array.isArray(manifest?.releases)) {
    return manifest.releases;
  }

  if (Array.isArray(manifest?.versions)) {
    return manifest.versions;
  }

  if (Array.isArray(manifest?.artifacts)) {
    return manifest.artifacts;
  }

  return [];
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

function extractReleaseAssetInfo(release, kind) {
  const root = release && typeof release === 'object' && !Array.isArray(release) ? release : {};
  const kindRecord = readNestedRecord(root, kind);
  const assetsRecord = readNestedRecord(readNestedRecord(root, 'assets'), kind);
  const pathsRecord = readNestedRecord(root, 'paths');
  const urlsRecord = readNestedRecord(root, 'urls');
  const filesRecord = readNestedRecord(root, 'files');
  const linksRecord = readNestedRecord(root, 'links');

  const version = sanitizeVersion(
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

function normalizeManifestRelease(release) {
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    return null;
  }

  const graph = extractReleaseAssetInfo(release, 'graph');
  const schema = extractReleaseAssetInfo(release, 'schema');

  return {
    ...release,
    graphVersion: graph.version,
    schemaVersion: schema.version,
    graphPath: graph.path,
    schemaPath: schema.path,
    graphUrl: graph.url,
    schemaUrl: schema.url,
  };
}

function listNormalizedManifestReleases(manifest) {
  return getManifestReleases(manifest).map(normalizeManifestRelease).filter(Boolean);
}

function summarizeGraph(graph) {
  const categoryCounts = {};
  const decisionCounts = { yes: 0, no: 0, unknown: 0 };

  for (const node of graph.nodes ?? []) {
    const category = graphNodeData(node).category ?? 'Uncategorized';
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  for (const edge of graph.edges ?? []) {
    const decision = graphEdgeData(edge).decision;
    if (decision in decisionCounts) {
      decisionCounts[decision] += 1;
    }
  }

  return {
    nodes: graph.nodes?.length ?? 0,
    edges: graph.edges?.length ?? 0,
    categoryCounts,
    decisionCounts,
  };
}

function sanitizeVersion(rawValue) {
  if (typeof rawValue !== 'string') {
    return '';
  }

  const value = rawValue.trim();
  if (!value) {
    return '';
  }

  if (!/^\d+\.\d{8}[a-z]?$/.test(value)) {
    return '';
  }

  return value;
}

function buildVersionScore(version) {
  const normalized = sanitizeVersion(version);
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

function latestReleaseVersion(manifest, kind, releases = listNormalizedManifestReleases(manifest)) {
  const explicit = sanitizeVersion(
    kind === 'graph' ? manifest?.latestGraphVersion : manifest?.latestSchemaVersion
  );
  if (explicit) {
    return explicit;
  }

  const key = kind === 'graph' ? 'graphVersion' : 'schemaVersion';
  let bestVersion = '';
  let bestScore = 0;

  for (const release of releases) {
    const version = sanitizeVersion(release?.[key]);
    if (!version) {
      continue;
    }

    const score = buildVersionScore(version);
    if (score > bestScore) {
      bestScore = score;
      bestVersion = version;
    }
  }

  return bestVersion || null;
}

function normalizeAssetPath(path) {
  if (typeof path !== 'string') {
    return '';
  }

  const trimmed = path.trim();
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

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function toAbsoluteUrl(rootUrl, path) {
  const normalized = normalizeAssetPath(path);
  if (!normalized) {
    return '';
  }

  return new URL(normalized, rootUrl).toString();
}

async function fetchRemoteJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 300,
    },
  });

  if (!response.ok) {
    throw new Error(`Remote request failed (${response.status}) for ${url}`);
  }

  const contentLength = Number.parseInt(response.headers.get('content-length') || '', 10);
  if (Number.isFinite(contentLength) && contentLength > REMOTE_JSON_MAX_BYTES) {
    throw new Error(`Remote JSON exceeds ${REMOTE_JSON_MAX_BYTES} bytes for ${url}`);
  }

  const text = await response.text();
  if (text.length > REMOTE_JSON_MAX_BYTES) {
    throw new Error(`Remote JSON exceeds ${REMOTE_JSON_MAX_BYTES} bytes for ${url}`);
  }

  return JSON.parse(text);
}

async function loadLocalAssetJson(env, requestUrl, assetPath) {
  const assetUrl = new URL(assetPath, requestUrl);
  const assetResponse = await env.STATIC_ASSETS.fetch(assetUrl.toString());

  if (!assetResponse.ok) {
    throw new Error(`Could not load ${assetPath} (${assetResponse.status})`);
  }

  return assetResponse.json();
}

async function loadManifestContext(env, requestUrl, allowedHosts, blockedReasons) {
  for (const source of REMOTE_MANIFEST_SOURCES) {
    const manifestCheck = validateTrustedHttpsUrl(source.manifestUrl, allowedHosts, requestUrl);
    const rootCheck = validateTrustedHttpsUrl(`${source.rootUrl}releases/`, allowedHosts, requestUrl);
    if (!manifestCheck.ok) {
      noteBlockedSource(blockedReasons, `manifest-source:${source.name}:${manifestCheck.reason}`);
      continue;
    }
    if (!rootCheck.ok) {
      noteBlockedSource(blockedReasons, `manifest-root:${source.name}:${rootCheck.reason}`);
      continue;
    }

    try {
      const manifest = await fetchRemoteJson(manifestCheck.value);
      if (listNormalizedManifestReleases(manifest).length > 0) {
        return {
          manifest,
          source: 'remote',
          sourceName: source.name,
          sourceRootUrl: source.rootUrl,
          manifestUrl: manifestCheck.value,
        };
      }
    } catch {
      // Try the next source.
    }
  }

  try {
    const manifest = await loadLocalAssetJson(env, requestUrl, LOCAL_RELEASE_MANIFEST_PATH);
    if (listNormalizedManifestReleases(manifest).length > 0) {
      return {
        manifest,
        source: 'local',
        sourceName: 'Local release snapshot',
        sourceRootUrl: new URL('/', requestUrl).toString(),
        manifestUrl: new URL(LOCAL_RELEASE_MANIFEST_PATH, requestUrl).toString(),
      };
    }
  } catch {
    // No local fallback available.
  }

  return null;
}

function findReleaseByVersion(releases, kind, version) {
  if (!Array.isArray(releases) || releases.length === 0) {
    return null;
  }

  const key = kind === 'graph' ? 'graphVersion' : 'schemaVersion';
  return releases.find((release) => sanitizeVersion(release?.[key]) === version) || null;
}

function buildReleaseAssetUrls(release, kind, manifestContext, allowedHosts, blockedReasons, requestUrl = '') {
  if (!release) {
    return [];
  }

  const assetInfo = extractReleaseAssetInfo(release, kind);
  const urls = [];
  if (isHttpUrl(assetInfo.url)) {
    pushTrustedUrl(urls, assetInfo.url, allowedHosts, blockedReasons, requestUrl);
  }

  const pathValue = assetInfo.path;
  if (typeof pathValue === 'string' && pathValue.trim()) {
    if (isHttpUrl(pathValue)) {
      pushTrustedUrl(urls, pathValue, allowedHosts, blockedReasons, requestUrl);
    } else {
      const normalized = normalizeAssetPath(pathValue);
      if (normalized) {
        if (manifestContext?.sourceRootUrl) {
          pushTrustedUrl(
            urls,
            toAbsoluteUrl(manifestContext.sourceRootUrl, normalized),
            allowedHosts,
            blockedReasons,
            requestUrl
          );
        }

        if (manifestContext?.manifestUrl) {
          try {
            pushTrustedUrl(
              urls,
              new URL(pathValue, manifestContext.manifestUrl).toString(),
              allowedHosts,
              blockedReasons,
              requestUrl
            );
          } catch {
            noteBlockedSource(blockedReasons, 'invalid-manifest-relative-url');
          }
        }

        for (const source of REMOTE_MANIFEST_SOURCES) {
          pushTrustedUrl(
            urls,
            toAbsoluteUrl(source.rootUrl, normalized),
            allowedHosts,
            blockedReasons,
            requestUrl
          );
        }
      }
    }
  }

  return unique(urls);
}

function buildLocalFallbackPaths(kind, version) {
  const paths = [];
  if (sanitizeVersion(version)) {
    if (kind === 'graph') {
      paths.push(`/assets/releases/graphs/tensor-core-${version}.json`);
    } else {
      paths.push(`/assets/releases/schemas/core.schema.${version}.json`);
    }
  }

  paths.push(kind === 'graph' ? LEGACY_GRAPH_PATH : LEGACY_SCHEMA_PATH);
  return unique(paths);
}

function parseReportType(rawValue) {
  if (typeof rawValue !== 'string') {
    return '';
  }

  const value = rawValue.trim().toLowerCase();
  if (!REPORT_TYPES.has(value)) {
    return '';
  }

  return value;
}

function buildReportCandidates(manifestContext, reportPaths, allowedHosts, blockedReasons, requestUrl = '') {
  const remoteUrls = [];
  const localPaths = [];

  for (const reportPath of reportPaths) {
    if (!reportPath) {
      continue;
    }

    if (isHttpUrl(reportPath)) {
      pushTrustedUrl(remoteUrls, reportPath, allowedHosts, blockedReasons, requestUrl);
      continue;
    }

    const normalized = normalizeAssetPath(reportPath);
    if (!normalized) {
      continue;
    }

    if (manifestContext?.sourceRootUrl) {
      pushTrustedUrl(
        remoteUrls,
        toAbsoluteUrl(manifestContext.sourceRootUrl, normalized),
        allowedHosts,
        blockedReasons,
        requestUrl
      );
    }

    if (manifestContext?.manifestUrl) {
      try {
        pushTrustedUrl(
          remoteUrls,
          new URL(reportPath, manifestContext.manifestUrl).toString(),
          allowedHosts,
          blockedReasons,
          requestUrl
        );
      } catch {
        noteBlockedSource(blockedReasons, 'invalid-report-relative-url');
      }
    }

    for (const source of REMOTE_MANIFEST_SOURCES) {
      pushTrustedUrl(
        remoteUrls,
        toAbsoluteUrl(source.rootUrl, normalized),
        allowedHosts,
        blockedReasons,
        requestUrl
      );
    }

    localPaths.push(`/${normalized}`);
    if (normalized.startsWith('releases/')) {
      localPaths.push(`/assets/${normalized}`);
    }
  }

  return {
    remoteUrls: unique(remoteUrls),
    localPaths: unique(localPaths),
  };
}

function resolveReleaseAsset(manifestContext, kind, requestedVersion, allowedHosts, blockedReasons, requestUrl = '') {
  const requested = sanitizeVersion(requestedVersion);
  const manifest = manifestContext?.manifest;
  const releases = listNormalizedManifestReleases(manifest);
  const latestVersion = latestReleaseVersion(manifest, kind, releases);
  const effectiveVersion = requested || latestVersion || null;

  const release = effectiveVersion ? findReleaseByVersion(releases, kind, effectiveVersion) : null;

  if (requested && releases.length > 0 && !release) {
    return {
      error: `Requested ${kind} version ${requested} was not found in the release manifest`,
      status: 404,
    };
  }

  return {
    requestedVersion: requested || null,
    version: effectiveVersion,
    release,
    pathHint: release ? extractReleaseAssetInfo(release, kind).path || null : null,
    remoteUrls: buildReleaseAssetUrls(release, kind, manifestContext, allowedHosts, blockedReasons, requestUrl),
    localPaths: buildLocalFallbackPaths(kind, effectiveVersion),
  };
}

async function loadJsonByCandidates(env, requestUrl, remoteUrls, localPaths) {
  let lastError = null;

  for (const url of remoteUrls) {
    try {
      const data = await fetchRemoteJson(url);
      return {
        data,
        sourceType: 'remote',
        source: url,
      };
    } catch (error) {
      lastError = error;
    }
  }

  for (const path of localPaths) {
    try {
      const data = await loadLocalAssetJson(env, requestUrl, path);
      return {
        data,
        sourceType: 'local',
        source: path,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No candidate sources available');
}

function unwrapGraphPayload(data) {
  if (data?.graph && Array.isArray(data.graph.nodes) && Array.isArray(data.graph.edges)) {
    return data.graph;
  }

  if (Array.isArray(data?.nodes) && Array.isArray(data?.edges)) {
    return data;
  }

  throw new Error('Graph payload is invalid');
}

function unwrapSchemaPayload(data) {
  if (data?.schema && data.schema.$schema) {
    return data.schema;
  }

  if (data?.$schema) {
    return data;
  }

  throw new Error('Schema payload is invalid');
}

function decorateRelease(release, manifestContext, allowedHosts, blockedReasons, requestUrl = '') {
  return {
    ...release,
    graphUrl:
      buildReleaseAssetUrls(release, 'graph', manifestContext, allowedHosts, blockedReasons, requestUrl)[0] ||
      null,
    schemaUrl:
      buildReleaseAssetUrls(release, 'schema', manifestContext, allowedHosts, blockedReasons, requestUrl)[0] ||
      null,
  };
}

function computeGraphDiff(previousGraph, nextGraph) {
  const previousNodes = new Map(
    (previousGraph.nodes ?? [])
      .map((node) => [graphNodeData(node).id, graphNodeData(node)])
      .filter(([nodeId]) => Boolean(nodeId))
  );
  const nextNodes = new Map(
    (nextGraph.nodes ?? [])
      .map((node) => [graphNodeData(node).id, graphNodeData(node)])
      .filter(([nodeId]) => Boolean(nodeId))
  );

  const previousEdges = new Map(
    (previousGraph.edges ?? [])
      .map((edge) => [graphEdgeData(edge).id, graphEdgeData(edge)])
      .filter(([edgeId]) => Boolean(edgeId))
  );
  const nextEdges = new Map(
    (nextGraph.edges ?? [])
      .map((edge) => [graphEdgeData(edge).id, graphEdgeData(edge)])
      .filter(([edgeId]) => Boolean(edgeId))
  );

  const addedNodes = [];
  const removedNodes = [];
  const changedNodes = [];

  for (const [nodeId, node] of nextNodes.entries()) {
    if (!previousNodes.has(nodeId)) {
      addedNodes.push(nodeId);
      continue;
    }

    const previous = previousNodes.get(nodeId);
    const before = JSON.stringify(previous ?? {});
    const after = JSON.stringify(node ?? {});
    if (before !== after) {
      changedNodes.push(nodeId);
    }
  }

  for (const nodeId of previousNodes.keys()) {
    if (!nextNodes.has(nodeId)) {
      removedNodes.push(nodeId);
    }
  }

  const addedEdges = [];
  const removedEdges = [];

  for (const edgeId of nextEdges.keys()) {
    if (!previousEdges.has(edgeId)) {
      addedEdges.push(edgeId);
    }
  }

  for (const edgeId of previousEdges.keys()) {
    if (!nextEdges.has(edgeId)) {
      removedEdges.push(edgeId);
    }
  }

  return {
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
  };
}

function withNoStore(response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function sanitizeTelemetryString(value, fallback, maxLength = 120, pattern = /^[a-z0-9_./:-]+$/i) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return fallback;
  }

  if (!pattern.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function sanitizeTelemetryDetails(value, depth = 0) {
  if (depth > 2) {
    return '[truncated]';
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.length > 256 ? `${value.slice(0, 253)}...` : value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeTelemetryDetails(entry, depth + 1));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 20);
    const normalized = {};
    for (const [key, entry] of entries) {
      const safeKey = sanitizeTelemetryString(key, 'field', 64, /^[a-z0-9_.-]+$/i);
      normalized[safeKey] = sanitizeTelemetryDetails(entry, depth + 1);
    }
    return normalized;
  }

  return null;
}

function sanitizeTelemetryPayload(payload) {
  const safePayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const levelRaw = sanitizeTelemetryString(safePayload.level, 'info', 16, /^[a-z]+$/i).toLowerCase();
  const details = sanitizeTelemetryDetails(safePayload.details ?? {});
  const serializedDetails = JSON.stringify(details);

  return {
    type: sanitizeTelemetryString(safePayload.type, 'client-event', 80),
    level: TELEMETRY_LEVELS.has(levelRaw) ? levelRaw : 'info',
    page: sanitizeTelemetryString(safePayload.page, 'unknown', 200, /^[-a-z0-9_./:?=&%#]+$/i),
    details:
      serializedDetails.length <= TELEMETRY_MAX_DETAILS_BYTES
        ? details
        : { truncated: true, message: 'details-payload-truncated' },
  };
}

function buildSourceMeta(blockedReasons) {
  return sourceGuardMeta(blockedReasons);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/telemetry') {
        if (!isAllowedTelemetryOrigin(request, env, request.url)) {
          return new Response(null, {
            status: 403,
            headers: {
              'cache-control': 'no-store',
            },
          });
        }

        const telemetryCorsHeaders = buildTelemetryCorsHeaders(request, env, request.url);
        return new Response(null, {
          status: 204,
          headers: {
            ...telemetryCorsHeaders,
            'access-control-max-age': '86400',
          },
        });
      }

      return new Response(null, {
        status: 204,
        headers: {
          ...PUBLIC_API_CORS_HEADERS,
          'access-control-max-age': '86400',
        },
      });
    }

    if (url.pathname === '/api/health') {
      return jsonResponse({
        ok: true,
        service: 'tensor-website',
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === '/api/telemetry' && request.method === 'POST') {
      const telemetryCorsHeaders = buildTelemetryCorsHeaders(request, env, request.url);

      if (!isAllowedTelemetryOrigin(request, env, request.url)) {
        return jsonResponse(
          {
            error: 'Telemetry origin not allowed',
            code: 'TELEMETRY_ORIGIN_NOT_ALLOWED',
          },
          403,
          { 'cache-control': 'no-store' },
          telemetryCorsHeaders
        );
      }

      const contentType = String(request.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        return jsonResponse(
          {
            error: 'Telemetry content type must be application/json',
            code: 'TELEMETRY_UNSUPPORTED_CONTENT_TYPE',
          },
          415,
          { 'cache-control': 'no-store' },
          telemetryCorsHeaders
        );
      }

      const contentLength = Number.parseInt(request.headers.get('content-length') || '', 10);
      if (Number.isFinite(contentLength) && contentLength > TELEMETRY_MAX_PAYLOAD_BYTES) {
        return jsonResponse(
          {
            error: 'Telemetry payload too large',
            code: 'TELEMETRY_PAYLOAD_TOO_LARGE',
          },
          413,
          { 'cache-control': 'no-store' },
          telemetryCorsHeaders
        );
      }

      const rawPayload = await request.text();
      if (rawPayload.length > TELEMETRY_MAX_PAYLOAD_BYTES) {
        return jsonResponse(
          {
            error: 'Telemetry payload too large',
            code: 'TELEMETRY_PAYLOAD_TOO_LARGE',
          },
          413,
          { 'cache-control': 'no-store' },
          telemetryCorsHeaders
        );
      }

      let payload = {};
      if (rawPayload.trim().length > 0) {
        try {
          payload = JSON.parse(rawPayload);
        } catch {
          return jsonResponse(
            {
              error: 'Telemetry payload is invalid JSON',
              code: 'TELEMETRY_INVALID_JSON',
            },
            400,
            { 'cache-control': 'no-store' },
            telemetryCorsHeaders
          );
        }
      }

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return jsonResponse(
          {
            error: 'Telemetry payload must be an object',
            code: 'TELEMETRY_INVALID_PAYLOAD',
          },
          400,
          { 'cache-control': 'no-store' },
          telemetryCorsHeaders
        );
      }

      const sanitized = sanitizeTelemetryPayload(payload);
      const event = {
        ts: new Date().toISOString(),
        type: sanitized.type,
        level: sanitized.level,
        page: sanitized.page,
        details: sanitized.details,
        userAgent: sanitizeTelemetryString(request.headers.get('user-agent') || '', 'unknown', 300, /./),
      };

      console.log(`[telemetry] ${JSON.stringify(event)}`);
      return jsonResponse({ ok: true }, 202, { 'cache-control': 'no-store' }, telemetryCorsHeaders);
    }

    if (url.pathname === '/api/releases') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const releases = listNormalizedManifestReleases(manifestContext?.manifest);
        const latestGraphVersion = latestReleaseVersion(manifestContext?.manifest, 'graph', releases);
        const latestSchemaVersion = latestReleaseVersion(manifestContext?.manifest, 'schema', releases);
        if (!manifestContext) {
          return jsonResponse(
            {
              channel: 'tensor-core',
              generatedAt: new Date().toISOString(),
              latestGraphVersion: null,
              latestSchemaVersion: null,
              releases: [],
              source: 'unavailable',
              ...buildSourceMeta(blockedReasons),
            },
            503,
            { 'cache-control': 'no-store' }
          );
        }

        return jsonResponse({
          ...manifestContext.manifest,
          source: manifestContext.source,
          sourceName: manifestContext.sourceName,
          manifestUrl: manifestContext.manifestUrl,
          latestGraphVersion,
          latestSchemaVersion,
          releases: releases.map((release) =>
            decorateRelease(release, manifestContext, allowedHosts, blockedReasons, request.url)
          ),
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Release manifest unavailable', error);
        return jsonResponse(
          {
            error: 'Release manifest unavailable',
            code: 'RELEASE_MANIFEST_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/version') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        if (!manifestContext) {
          return jsonResponse(
            {
              latestGraphVersion: null,
              latestSchemaVersion: null,
              source: 'unavailable',
              ...buildSourceMeta(blockedReasons),
            },
            503,
            { 'cache-control': 'no-store' }
          );
        }

        const releases = listNormalizedManifestReleases(manifestContext.manifest);
        return jsonResponse({
          latestGraphVersion: latestReleaseVersion(manifestContext.manifest, 'graph', releases),
          latestSchemaVersion: latestReleaseVersion(manifestContext.manifest, 'schema', releases),
          generatedAt: manifestContext.manifest?.generatedAt || null,
          source: manifestContext.source,
          sourceName: manifestContext.sourceName,
          manifestUrl: manifestContext.manifestUrl,
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Version endpoint unavailable', error);
        return jsonResponse(
          {
            error: 'Version endpoint unavailable',
            code: 'VERSION_ENDPOINT_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/metrics/latest') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const reportType = parseReportType(url.searchParams.get('type')) || 'math-assurance';
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const latestVersion = latestReleaseVersion(manifestContext?.manifest, 'graph') || null;

        const reportPaths = [];
        if (reportType === 'math-assurance') {
          reportPaths.push('releases/core/reports/latest/math-assurance.json');
        }
        if (latestVersion) {
          reportPaths.push(`releases/core/reports/v${latestVersion}/${reportType}.json`);
        }

        if (reportPaths.length === 0) {
          return jsonResponse(
            {
              error: 'No latest release version available for metrics lookup',
              code: 'METRICS_LATEST_VERSION_UNAVAILABLE',
              ...buildSourceMeta(blockedReasons),
            },
            503,
            { 'cache-control': 'no-store' }
          );
        }

        const candidates = buildReportCandidates(
          manifestContext,
          reportPaths,
          allowedHosts,
          blockedReasons,
          request.url
        );
        const loaded = await loadJsonByCandidates(
          env,
          request.url,
          candidates.remoteUrls,
          candidates.localPaths
        );

        return jsonResponse({
          type: reportType,
          report: loaded.data,
          requestedVersion: null,
          resolvedVersion: sanitizeVersion(loaded.data?.version) || latestVersion,
          sourcePath: loaded.sourceType === 'local' ? loaded.source : null,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Latest metrics unavailable', error);
        return jsonResponse(
          {
            error: 'Latest metrics unavailable',
            code: 'LATEST_METRICS_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/metrics/history') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const candidates = buildReportCandidates(
          manifestContext,
          ['releases/core/reports/history/math-assurance-history.json'],
          allowedHosts,
          blockedReasons,
          request.url
        );
        const loaded = await loadJsonByCandidates(
          env,
          request.url,
          candidates.remoteUrls,
          candidates.localPaths
        );

        return jsonResponse({
          type: 'math-assurance-history',
          report: loaded.data,
          sourcePath: loaded.sourceType === 'local' ? loaded.source : null,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Metrics history unavailable', error);
        return jsonResponse(
          {
            error: 'Metrics history unavailable',
            code: 'METRICS_HISTORY_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/metrics/report') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const requestedVersion = sanitizeVersion(url.searchParams.get('version'));
        if (!requestedVersion) {
          return jsonResponse(
            {
              error: 'version query parameter is required',
              code: 'METRICS_VERSION_REQUIRED',
            },
            400,
            { 'cache-control': 'no-store' }
          );
        }

        const reportType = parseReportType(url.searchParams.get('type')) || 'math-assurance';
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const candidates = buildReportCandidates(
          manifestContext,
          [`releases/core/reports/v${requestedVersion}/${reportType}.json`],
          allowedHosts,
          blockedReasons,
          request.url
        );
        const loaded = await loadJsonByCandidates(
          env,
          request.url,
          candidates.remoteUrls,
          candidates.localPaths
        );

        return jsonResponse({
          type: reportType,
          report: loaded.data,
          requestedVersion,
          resolvedVersion: sanitizeVersion(loaded.data?.version) || requestedVersion,
          sourcePath: loaded.sourceType === 'local' ? loaded.source : null,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Version metrics unavailable', error);
        return jsonResponse(
          {
            error: 'Version metrics unavailable',
            code: 'VERSION_METRICS_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/graph') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const asset = resolveReleaseAsset(
          manifestContext,
          'graph',
          url.searchParams.get('version'),
          allowedHosts,
          blockedReasons,
          request.url
        );
        if (asset.error) {
          return jsonResponse(
            {
              error: asset.error,
              ...buildSourceMeta(blockedReasons),
            },
            asset.status,
            { 'cache-control': 'no-store' }
          );
        }

        const loaded = await loadJsonByCandidates(env, request.url, asset.remoteUrls, asset.localPaths);
        const graph = unwrapGraphPayload(loaded.data);

        return jsonResponse({
          graph,
          stats: summarizeGraph(graph),
          requestedVersion: asset.requestedVersion,
          resolvedVersion: asset.version || graph.version || null,
          release: asset.release
            ? decorateRelease(asset.release, manifestContext, allowedHosts, blockedReasons, request.url)
            : null,
          sourcePath: asset.pathHint || loaded.source,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Graph data unavailable', error);
        return jsonResponse(
          {
            error: 'Graph data unavailable',
            code: 'GRAPH_DATA_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/schema') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const asset = resolveReleaseAsset(
          manifestContext,
          'schema',
          url.searchParams.get('version'),
          allowedHosts,
          blockedReasons,
          request.url
        );
        if (asset.error) {
          return jsonResponse(
            {
              error: asset.error,
              ...buildSourceMeta(blockedReasons),
            },
            asset.status,
            { 'cache-control': 'no-store' }
          );
        }

        const loaded = await loadJsonByCandidates(env, request.url, asset.remoteUrls, asset.localPaths);
        const schema = unwrapSchemaPayload(loaded.data);

        return jsonResponse({
          schema,
          requestedVersion: asset.requestedVersion,
          resolvedVersion: asset.version || null,
          release: asset.release
            ? decorateRelease(asset.release, manifestContext, allowedHosts, blockedReasons, request.url)
            : null,
          sourcePath: asset.pathHint || loaded.source,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Schema data unavailable', error);
        return jsonResponse(
          {
            error: 'Schema data unavailable',
            code: 'SCHEMA_DATA_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/diff') {
      const allowedHosts = getReleaseAllowedHosts(env, request.url);
      const blockedReasons = new Set();

      try {
        const fromVersion = sanitizeVersion(url.searchParams.get('from'));
        const toVersion = sanitizeVersion(url.searchParams.get('to'));

        if (!fromVersion || !toVersion) {
          return jsonResponse(
            {
              error: 'from and to query parameters are required versions',
              code: 'DIFF_VERSIONS_REQUIRED',
            },
            400,
            { 'cache-control': 'no-store' }
          );
        }

        const manifestContext = await loadManifestContext(env, request.url, allowedHosts, blockedReasons);
        const fromAsset = resolveReleaseAsset(
          manifestContext,
          'graph',
          fromVersion,
          allowedHosts,
          blockedReasons,
          request.url
        );
        const toAsset = resolveReleaseAsset(
          manifestContext,
          'graph',
          toVersion,
          allowedHosts,
          blockedReasons,
          request.url
        );

        if (fromAsset.error || toAsset.error) {
          return jsonResponse(
            {
              error: fromAsset.error || toAsset.error,
              ...buildSourceMeta(blockedReasons),
            },
            404,
            { 'cache-control': 'no-store' }
          );
        }

        const [fromLoaded, toLoaded] = await Promise.all([
          loadJsonByCandidates(env, request.url, fromAsset.remoteUrls, fromAsset.localPaths),
          loadJsonByCandidates(env, request.url, toAsset.remoteUrls, toAsset.localPaths),
        ]);

        const fromGraph = unwrapGraphPayload(fromLoaded.data);
        const toGraph = unwrapGraphPayload(toLoaded.data);

        return jsonResponse({
          from: {
            version: fromAsset.version,
            release: fromAsset.release
              ? decorateRelease(fromAsset.release, manifestContext, allowedHosts, blockedReasons, request.url)
              : null,
            sourceUrl: fromLoaded.sourceType === 'remote' ? fromLoaded.source : null,
          },
          to: {
            version: toAsset.version,
            release: toAsset.release
              ? decorateRelease(toAsset.release, manifestContext, allowedHosts, blockedReasons, request.url)
              : null,
            sourceUrl: toLoaded.sourceType === 'remote' ? toLoaded.source : null,
          },
          diff: computeGraphDiff(fromGraph, toGraph),
          ...buildSourceMeta(blockedReasons),
        });
      } catch (error) {
        console.error('Diff computation unavailable', error);
        return jsonResponse(
          {
            error: 'Diff computation unavailable',
            code: 'DIFF_COMPUTATION_UNAVAILABLE',
            ...buildSourceMeta(blockedReasons),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    return withNoStore(await env.STATIC_ASSETS.fetch(request));
  },
};
