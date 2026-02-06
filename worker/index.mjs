const LOCAL_RELEASE_MANIFEST_PATH = '/assets/releases/manifest.json';
const LEGACY_GRAPH_PATH = '/assets/data/tensor-core.json';
const LEGACY_SCHEMA_PATH = '/assets/data/core.schema.json';
const REPORT_TYPES = new Set(['math-assurance', 'graph-quality', 'coverage-matrix']);

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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,accept',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function summarizeGraph(graph) {
  const categoryCounts = {};
  const decisionCounts = { yes: 0, no: 0, unknown: 0 };

  for (const node of graph.nodes ?? []) {
    const category = node?.data?.category ?? 'Uncategorized';
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  for (const edge of graph.edges ?? []) {
    const decision = edge?.data?.decision;
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

function normalizeAssetPath(path) {
  if (typeof path !== 'string') {
    return '';
  }

  return path.trim().replace(/^\.\//, '').replace(/^\/+/, '');
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

  return response.json();
}

async function loadLocalAssetJson(env, requestUrl, assetPath) {
  const assetUrl = new URL(assetPath, requestUrl);
  const assetResponse = await env.STATIC_ASSETS.fetch(assetUrl.toString());

  if (!assetResponse.ok) {
    throw new Error(`Could not load ${assetPath} (${assetResponse.status})`);
  }

  return assetResponse.json();
}

async function loadManifestContext(env, requestUrl) {
  for (const source of REMOTE_MANIFEST_SOURCES) {
    try {
      const manifest = await fetchRemoteJson(source.manifestUrl);
      if (Array.isArray(manifest?.releases)) {
        return {
          manifest,
          source: 'remote',
          sourceName: source.name,
          sourceRootUrl: source.rootUrl,
          manifestUrl: source.manifestUrl,
        };
      }
    } catch {
      // Try the next source.
    }
  }

  try {
    const manifest = await loadLocalAssetJson(env, requestUrl, LOCAL_RELEASE_MANIFEST_PATH);
    if (Array.isArray(manifest?.releases)) {
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

function findReleaseByVersion(manifest, kind, version) {
  if (!manifest) {
    return null;
  }

  const key = kind === 'graph' ? 'graphVersion' : 'schemaVersion';
  return manifest.releases.find((release) => release?.[key] === version) || null;
}

function buildReleaseAssetUrls(release, kind, manifestContext) {
  if (!release) {
    return [];
  }

  const urlKey = kind === 'graph' ? 'graphUrl' : 'schemaUrl';
  const pathKey = kind === 'graph' ? 'graphPath' : 'schemaPath';

  const urls = [];
  if (isHttpUrl(release?.[urlKey])) {
    urls.push(release[urlKey]);
  }

  const pathValue = release?.[pathKey];
  if (typeof pathValue === 'string' && pathValue.trim()) {
    if (isHttpUrl(pathValue)) {
      urls.push(pathValue);
    } else {
      const normalized = normalizeAssetPath(pathValue);
      if (normalized) {
        if (manifestContext?.sourceRootUrl) {
          urls.push(toAbsoluteUrl(manifestContext.sourceRootUrl, normalized));
        }

        if (manifestContext?.manifestUrl) {
          try {
            urls.push(new URL(pathValue, manifestContext.manifestUrl).toString());
          } catch {
            // ignored
          }
        }

        for (const source of REMOTE_MANIFEST_SOURCES) {
          urls.push(toAbsoluteUrl(source.rootUrl, normalized));
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

function buildReportCandidates(manifestContext, reportPaths) {
  const remoteUrls = [];
  const localPaths = [];

  for (const reportPath of reportPaths) {
    if (!reportPath) {
      continue;
    }

    if (isHttpUrl(reportPath)) {
      remoteUrls.push(reportPath);
      continue;
    }

    const normalized = normalizeAssetPath(reportPath);
    if (!normalized) {
      continue;
    }

    if (manifestContext?.sourceRootUrl) {
      remoteUrls.push(toAbsoluteUrl(manifestContext.sourceRootUrl, normalized));
    }

    if (manifestContext?.manifestUrl) {
      try {
        remoteUrls.push(new URL(reportPath, manifestContext.manifestUrl).toString());
      } catch {
        // ignored
      }
    }

    for (const source of REMOTE_MANIFEST_SOURCES) {
      remoteUrls.push(toAbsoluteUrl(source.rootUrl, normalized));
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

function resolveReleaseAsset(manifestContext, kind, requestedVersion) {
  const requested = sanitizeVersion(requestedVersion);
  const manifest = manifestContext?.manifest;
  const latestVersion = sanitizeVersion(
    kind === 'graph' ? manifest?.latestGraphVersion : manifest?.latestSchemaVersion
  );
  const effectiveVersion = requested || latestVersion || null;

  const release = effectiveVersion && manifest ? findReleaseByVersion(manifest, kind, effectiveVersion) : null;

  if (requested && manifest && !release) {
    return {
      error: `Requested ${kind} version ${requested} was not found in the release manifest`,
      status: 404,
    };
  }

  return {
    requestedVersion: requested || null,
    version: effectiveVersion,
    release,
    pathHint: release ? release[kind === 'graph' ? 'graphPath' : 'schemaPath'] || null : null,
    remoteUrls: buildReleaseAssetUrls(release, kind, manifestContext),
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

function decorateRelease(release, manifestContext) {
  return {
    ...release,
    graphUrl: buildReleaseAssetUrls(release, 'graph', manifestContext)[0] || null,
    schemaUrl: buildReleaseAssetUrls(release, 'schema', manifestContext)[0] || null,
  };
}

function computeGraphDiff(previousGraph, nextGraph) {
  const previousNodes = new Map((previousGraph.nodes ?? []).map((node) => [node?.data?.id, node]));
  const nextNodes = new Map((nextGraph.nodes ?? []).map((node) => [node?.data?.id, node]));

  const previousEdges = new Map((previousGraph.edges ?? []).map((edge) => [edge?.data?.id, edge]));
  const nextEdges = new Map((nextGraph.edges ?? []).map((edge) => [edge?.data?.id, edge]));

  const addedNodes = [];
  const removedNodes = [];
  const changedNodes = [];

  for (const [nodeId, node] of nextNodes.entries()) {
    if (!previousNodes.has(nodeId)) {
      addedNodes.push(nodeId);
      continue;
    }

    const previous = previousNodes.get(nodeId);
    const before = JSON.stringify(previous?.data ?? {});
    const after = JSON.stringify(node?.data ?? {});
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type,accept',
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
      try {
        const payload = await request.json();
        const compactPayload = JSON.stringify(payload);
        if (compactPayload.length > 8_000) {
          return jsonResponse({ error: 'Telemetry payload too large' }, 413, {
            'cache-control': 'no-store',
          });
        }

        const event = {
          ts: new Date().toISOString(),
          type: payload?.type || 'client-event',
          level: payload?.level || 'info',
          page: payload?.page || 'unknown',
          details: payload?.details || {},
          userAgent: request.headers.get('user-agent') || 'unknown',
        };

        console.log(`[telemetry] ${JSON.stringify(event)}`);
        return jsonResponse({ ok: true }, 202, { 'cache-control': 'no-store' });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Telemetry parse failed',
            message: String(error),
          },
          400,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/releases') {
      try {
        const manifestContext = await loadManifestContext(env, request.url);
        if (!manifestContext) {
          return jsonResponse(
            {
              channel: 'tensor-core',
              generatedAt: new Date().toISOString(),
              latestGraphVersion: null,
              latestSchemaVersion: null,
              releases: [],
              source: 'unavailable',
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
          releases: (manifestContext.manifest.releases || []).map((release) =>
            decorateRelease(release, manifestContext)
          ),
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Release manifest unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/version') {
      try {
        const manifestContext = await loadManifestContext(env, request.url);
        if (!manifestContext) {
          return jsonResponse(
            {
              latestGraphVersion: null,
              latestSchemaVersion: null,
              source: 'unavailable',
            },
            503,
            { 'cache-control': 'no-store' }
          );
        }

        return jsonResponse({
          latestGraphVersion: sanitizeVersion(manifestContext.manifest?.latestGraphVersion) || null,
          latestSchemaVersion: sanitizeVersion(manifestContext.manifest?.latestSchemaVersion) || null,
          generatedAt: manifestContext.manifest?.generatedAt || null,
          source: manifestContext.source,
          sourceName: manifestContext.sourceName,
          manifestUrl: manifestContext.manifestUrl,
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Version endpoint unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/metrics/latest') {
      try {
        const reportType = parseReportType(url.searchParams.get('type')) || 'math-assurance';
        const manifestContext = await loadManifestContext(env, request.url);
        const latestVersion = sanitizeVersion(manifestContext?.manifest?.latestGraphVersion) || null;

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
            },
            503,
            { 'cache-control': 'no-store' }
          );
        }

        const candidates = buildReportCandidates(manifestContext, reportPaths);
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
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Latest metrics unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/metrics/history') {
      try {
        const manifestContext = await loadManifestContext(env, request.url);
        const candidates = buildReportCandidates(manifestContext, [
          'releases/core/reports/history/math-assurance-history.json',
        ]);
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
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Metrics history unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/metrics/report') {
      try {
        const requestedVersion = sanitizeVersion(url.searchParams.get('version'));
        if (!requestedVersion) {
          return jsonResponse(
            {
              error: 'version query parameter is required',
            },
            400,
            { 'cache-control': 'no-store' }
          );
        }

        const reportType = parseReportType(url.searchParams.get('type')) || 'math-assurance';
        const manifestContext = await loadManifestContext(env, request.url);
        const candidates = buildReportCandidates(manifestContext, [
          `releases/core/reports/v${requestedVersion}/${reportType}.json`,
        ]);
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
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Version metrics unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/graph') {
      try {
        const manifestContext = await loadManifestContext(env, request.url);
        const asset = resolveReleaseAsset(manifestContext, 'graph', url.searchParams.get('version'));
        if (asset.error) {
          return jsonResponse({ error: asset.error }, asset.status, { 'cache-control': 'no-store' });
        }

        const loaded = await loadJsonByCandidates(env, request.url, asset.remoteUrls, asset.localPaths);
        const graph = unwrapGraphPayload(loaded.data);

        return jsonResponse({
          graph,
          stats: summarizeGraph(graph),
          requestedVersion: asset.requestedVersion,
          resolvedVersion: asset.version || graph.version || null,
          release: asset.release ? decorateRelease(asset.release, manifestContext) : null,
          sourcePath: asset.pathHint || loaded.source,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Graph data unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/schema') {
      try {
        const manifestContext = await loadManifestContext(env, request.url);
        const asset = resolveReleaseAsset(manifestContext, 'schema', url.searchParams.get('version'));
        if (asset.error) {
          return jsonResponse({ error: asset.error }, asset.status, { 'cache-control': 'no-store' });
        }

        const loaded = await loadJsonByCandidates(env, request.url, asset.remoteUrls, asset.localPaths);
        const schema = unwrapSchemaPayload(loaded.data);

        return jsonResponse({
          schema,
          requestedVersion: asset.requestedVersion,
          resolvedVersion: asset.version || null,
          release: asset.release ? decorateRelease(asset.release, manifestContext) : null,
          sourcePath: asset.pathHint || loaded.source,
          sourceUrl: loaded.sourceType === 'remote' ? loaded.source : null,
          sourceType: loaded.sourceType,
          manifestSource: manifestContext?.sourceName || null,
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Schema data unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    if (url.pathname === '/api/diff') {
      try {
        const fromVersion = sanitizeVersion(url.searchParams.get('from'));
        const toVersion = sanitizeVersion(url.searchParams.get('to'));

        if (!fromVersion || !toVersion) {
          return jsonResponse(
            { error: 'from and to query parameters are required versions' },
            400,
            { 'cache-control': 'no-store' }
          );
        }

        const manifestContext = await loadManifestContext(env, request.url);
        const fromAsset = resolveReleaseAsset(manifestContext, 'graph', fromVersion);
        const toAsset = resolveReleaseAsset(manifestContext, 'graph', toVersion);

        if (fromAsset.error || toAsset.error) {
          return jsonResponse(
            {
              error: fromAsset.error || toAsset.error,
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
            release: fromAsset.release ? decorateRelease(fromAsset.release, manifestContext) : null,
            sourceUrl: fromLoaded.sourceType === 'remote' ? fromLoaded.source : null,
          },
          to: {
            version: toAsset.version,
            release: toAsset.release ? decorateRelease(toAsset.release, manifestContext) : null,
            sourceUrl: toLoaded.sourceType === 'remote' ? toLoaded.source : null,
          },
          diff: computeGraphDiff(fromGraph, toGraph),
        });
      } catch (error) {
        return jsonResponse(
          {
            error: 'Diff computation unavailable',
            message: String(error),
          },
          500,
          { 'cache-control': 'no-store' }
        );
      }
    }

    return withNoStore(await env.STATIC_ASSETS.fetch(request));
  },
};
