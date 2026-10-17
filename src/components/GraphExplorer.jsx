import currentDataset from '../../public/dataset/current.json';
import { artifactDigest, datasetArtifact } from '../lib/datasetArtifact.mjs';
import { studioPositions, studioNeighborhoodPositions } from '../lib/studioLayout.mjs';
import { questionLabel, compactQuestionLabel } from '../lib/displayLabels.mjs';
import { useEffect, useRef } from 'react';
import { checkLayerBase, checkLegacyGraphStructure, mergeLegacyGraphWithLayers } from '../lib/legacyGraph.mjs';
import { resolveApiOrigins } from '../lib/runtimeApi';
import {
  buildFrameworkAssetUrls,
  fetchMetricsHistoryChannel,
  fetchMetricsReportChannel,
  fetchReleaseManifest,
  isTrustedReleaseUrl,
} from '../lib/frameworkDataApi';

const DEFAULT_DECISIONS = ['yes', 'no', 'unknown'];
const DEFAULT_GRAPH_VERSION = currentDataset.graphVersion;
const DEFAULT_SCHEMA_VERSION = currentDataset.graphSchemaVersion;

const VERSION_PATTERN = /^\d+\.\d{8}[a-z]?$/;

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeVersion(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  if (!VERSION_PATTERN.test(normalized)) {
    return '';
  }

  return normalized;
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

function getNodeData(node) {
  if (!isRecord(node)) {
    return {};
  }

  if (isRecord(node.data)) {
    return node.data;
  }

  return node;
}

function getEdgeData(edge) {
  if (!isRecord(edge)) {
    return {};
  }

  if (isRecord(edge.data)) {
    return edge.data;
  }

  return edge;
}

function normalizeNodeEntry(node) {
  if (isRecord(node) && isRecord(node.data)) {
    return {
      ...node,
      data: {
        ...node.data,
      },
    };
  }

  return {
    data: {
      ...getNodeData(node),
    },
  };
}

function normalizeEdgeEntry(edge) {
  if (isRecord(edge) && isRecord(edge.data)) {
    return {
      ...edge,
      data: {
        ...edge.data,
      },
    };
  }

  return {
    data: {
      ...getEdgeData(edge),
    },
  };
}

function normalizeGraphForExplorer(graph) {
  if (!isRecord(graph)) {
    return graph;
  }

  return {
    ...graph,
    nodes: Array.isArray(graph.nodes) ? graph.nodes.map((node) => normalizeNodeEntry(node)) : [],
    edges: Array.isArray(graph.edges) ? graph.edges.map((edge) => normalizeEdgeEntry(edge)) : [],
  };
}

function normalizeGraphPayload(payload) {
  if (payload && Array.isArray(payload.nodes) && Array.isArray(payload.edges)) {
    return {
      graph: normalizeGraphForExplorer(payload),
      meta: null,
      version: payload.version || null,
      sourcePath: null,
      release: null,
    };
  }

  if (payload?.graph && Array.isArray(payload.graph.nodes) && Array.isArray(payload.graph.edges)) {
    return {
      graph: normalizeGraphForExplorer(payload.graph),
      meta: payload.stats || null,
      version: payload.resolvedVersion || payload.graph.version || null,
      sourcePath: payload.sourcePath || null,
      release: payload.release || null,
    };
  }

  throw new Error('Invalid graph payload shape');
}

function normalizeSchemaPayload(payload) {
  if (payload && payload.$schema) {
    const idMatch = String(payload.$id || '').match(/v(\d+\.\d{8}[a-z]?)/);
    return {
      schema: payload,
      version:
        sanitizeVersion(payload?.properties?.schemaVersion?.default || '') ||
        (idMatch ? idMatch[1] : null),
      sourcePath: null,
      release: null,
    };
  }

  if (payload?.schema && payload.schema.$schema) {
    const idMatch = String(payload.schema.$id || '').match(/v(\d+\.\d{8}[a-z]?)/);
    return {
      schema: payload.schema,
      version: payload.resolvedVersion || (idMatch ? idMatch[1] : null),
      sourcePath: payload.sourcePath || null,
      release: payload.release || null,
    };
  }

  return null;
}

function normalizeReleasesPayload(payload) {
  if (payload && Array.isArray(payload.releases)) {
    const releases = payload.releases.map((release) => {
      if (!release || typeof release !== 'object') {
        return release;
      }

      const graphPath = sanitizeAssetPath(release.graphPath);
      const schemaPath = sanitizeAssetPath(release.schemaPath);
      const graphUrl =
        (isTrustedReleaseUrl(release.graphUrl || '') ? release.graphUrl : null) ||
        buildFrameworkAssetUrls(graphPath)[0] ||
        null;
      const schemaUrl =
        (isTrustedReleaseUrl(release.schemaUrl || '') ? release.schemaUrl : null) ||
        buildFrameworkAssetUrls(schemaPath)[0] ||
        null;

      return {
        ...release,
        graphPath: graphPath || release.graphPath || null,
        schemaPath: schemaPath || release.schemaPath || null,
        graphUrl,
        schemaUrl,
      };
    });

    return {
      ...payload,
      releases,
    };
  }

  return {
    channel: 'tensor-core',
    generatedAt: null,
    latestGraphVersion: null,
    latestSchemaVersion: null,
    releases: [],
  };
}

function normalizeLayerPayload(payload, fallbackName = 'Custom Layer') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Layer payload must be a JSON object');
  }

  const parseLayer = (raw, index) => {
    if (!Array.isArray(raw?.nodes) || !Array.isArray(raw?.edges)) {
      throw new Error('Layer requires nodes[] and edges[] arrays');
    }
    const nodes = raw.nodes.map((node) => normalizeNodeEntry(node));
    const edges = raw.edges.map((edge) => normalizeEdgeEntry(edge));

    const meta = raw?.metadata || {};
    const name = raw?.name || meta?.name || `${fallbackName} ${index + 1}`;
    const owner = raw?.owner || meta?.owner || 'Organization';
    const layerType = raw?.type || meta?.type || 'business';

    return {
      id: raw?.id || meta?.id || `${slugify(name)}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name,
      owner,
      type: layerType,
      description: raw?.description || meta?.description || '',
      nodes,
      edges,
      enabled: meta?.enabled !== false,
      source: meta?.source || 'Imported',
    };
  };

  if (payload?.format === 'tensor-layer-pack.v1' && Array.isArray(payload.layers)) {
    return payload.layers.map((layer, index) => parseLayer(layer, index));
  }

  if (payload.layer && typeof payload.layer === 'object') {
    return [parseLayer(payload.layer, 0)];
  }

  if (Array.isArray(payload.nodes) && Array.isArray(payload.edges)) {
    return [parseLayer(payload, 0)];
  }

  throw new Error('Unsupported layer payload. Expected layer, layers[], or nodes/edges.');
}

function slugify(value) {
  return String(value || 'layer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function getCategories(graph) {
  const categories = new Set();

  for (const node of graph.nodes) {
    const data = getNodeData(node);
    categories.add(data.category || 'Uncategorized');
  }

  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

function computeGraphDiff(previousGraph, nextGraph) {
  const previousNodes = new Map(
    (previousGraph?.nodes || []).map((node) => [getNodeData(node)?.id, node]).filter(([id]) => Boolean(id))
  );
  const nextNodes = new Map(
    (nextGraph?.nodes || []).map((node) => [getNodeData(node)?.id, node]).filter(([id]) => Boolean(id))
  );

  const previousEdges = new Map(
    (previousGraph?.edges || []).map((edge) => [getEdgeData(edge)?.id, edge]).filter(([id]) => Boolean(id))
  );
  const nextEdges = new Map(
    (nextGraph?.edges || []).map((edge) => [getEdgeData(edge)?.id, edge]).filter(([id]) => Boolean(id))
  );

  const addedNodes = [];
  const removedNodes = [];
  const changedNodes = [];

  for (const [nodeId, node] of nextNodes.entries()) {
    if (!previousNodes.has(nodeId)) {
      addedNodes.push(nodeId);
      continue;
    }

    const previousNode = previousNodes.get(nodeId);
    const before = JSON.stringify(getNodeData(previousNode) || {});
    const after = JSON.stringify(getNodeData(node) || {});
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

function buildDiffSummaryText(diff) {
  if (!diff) {
    return 'No baseline release available for diff.';
  }

  return [
    `+${diff.addedNodes.length} nodes`,
    `-${diff.removedNodes.length} nodes`,
    `~${diff.changedNodes.length} nodes changed`,
    `+${diff.addedEdges.length} edges`,
    `-${diff.removedEdges.length} edges`,
  ].join(' · ');
}

function normalizeMetricsHistoryPayload(payload) {
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

function normalizeMetricsReportPayload(payload) {
  if (payload?.report && payload.report.summary) {
    return payload.report;
  }

  if (payload?.summary) {
    return payload;
  }

  return null;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'n/a';
  }

  return `${number.toFixed(1)}%`;
}

function formatDelta(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'n/a';
  }

  const prefix = number > 0 ? '+' : '';
  return `${prefix}${number.toFixed(2)} pts`;
}

function makeDownload(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function fetchJsonWithFallback(sources) {
  const expandedSources = [];
  const apiOrigins = resolveApiOrigins();

  for (const source of sources) {
    if (!source?.url) {
      continue;
    }

    if (source.url.startsWith('/api/')) {
      for (const origin of apiOrigins) {
        expandedSources.push({
          url: new URL(source.url, origin).toString(),
          label: `${source.label} (${new URL(origin).host})`,
        });
      }
      continue;
    }

    const rawUrl = String(source.url || '').trim();
    const normalizedUrl =
      rawUrl && !rawUrl.startsWith('/') && !/^https?:\/\//i.test(rawUrl) ? `/${rawUrl}` : rawUrl;
    const isAbsoluteHttpUrl = /^https?:\/\//i.test(normalizedUrl);
    if (isAbsoluteHttpUrl && !isTrustedReleaseUrl(normalizedUrl)) {
      continue;
    }

    const assetPath = normalizedUrl.replace(/^\/+/, '');
    const remoteFrameworkUrls =
      normalizedUrl.startsWith('/releases/') || normalizedUrl.startsWith('releases/')
        ? buildFrameworkAssetUrls(assetPath)
        : [];

    expandedSources.push({
      ...source,
      url: normalizedUrl,
    });
    for (const remoteUrl of remoteFrameworkUrls) {
      expandedSources.push({
        ...source,
        url: remoteUrl,
        label: `${source.label} (${new URL(remoteUrl).host})`,
      });
    }
  }

  let lastError = null;

  for (const source of expandedSources) {
    if (!source?.url) {
      continue;
    }

    try {
      const response = await fetch(source.url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`${source.label} returned ${response.status}`);
      }

      const data = await response.json();
      return {
        data,
        source: source.label,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No sources available');
}

async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}

function sortReleasesByDate(releases) {
  return [...releases].sort((left, right) => {
    const leftTime = new Date(left?.releasedAt || 0).getTime();
    const rightTime = new Date(right?.releasedAt || 0).getTime();
    return leftTime - rightTime;
  });
}

export default function GraphExplorer() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const css = getComputedStyle(root);
    const token = (name) => css.getPropertyValue(name).trim();
    const CATEGORY_COLORS = Object.fromEntries(['Application', 'Cloud', 'Email', 'File', 'Host', 'Identity', 'Network', 'Uncategorized'].map((name) => [name, token(`--domain-${name.toLowerCase()}`)]));
    const DECISION_COLORS = { yes: token('--accent-success'), no: token('--accent-danger'), unknown: token('--accent-warning') };

    const q = (selector) => root.querySelector(selector);
    const qa = (selector) => Array.from(root.querySelectorAll(selector));

    const selectors = {
      dataSource: q('#data-source-pill'),
      schemaStatus: q('#schema-pill'),
      stats: q('#stats-pill'),
      timeline: q('#timeline-pill'),
      metrics: q('#metrics-pill'),
      graphVersionSelect: q('#graph-version-select'),
      schemaVersionSelect: q('#schema-version-select'),
      loadVersionsBtn: q('#load-versions-btn'),
      releaseNotes: q('#release-notes'),
      diffSummary: q('#diff-summary'),
      metricsVersion: q('#metrics-version'),
      metricsOverall: q('#metrics-overall'),
      metricsCoverage: q('#metrics-coverage'),
      metricsRouting: q('#metrics-routing'),
      metricsRobustness: q('#metrics-robustness'),
      metricsDelta: q('#metrics-delta'),
      metricsPublish: q('#metrics-publish'),
      metricsGates: q('#metrics-gates'),
      layerList: q('#layer-list'),
      layerEmpty: q('#layer-empty'),
      importGraphBtn: q('#import-graph-btn'),
      importSchemaBtn: q('#import-schema-btn'),
      importLayerBtn: q('#import-layer-btn'),
      exportCoreBtn: q('#export-core-btn'),
      exportMergedBtn: q('#export-merged-btn'),
      exportLayersBtn: q('#export-layers-btn'),
      graphImportInput: q('#graph-import-input'),
      schemaImportInput: q('#schema-import-input'),
      layerImportInput: q('#layer-import-input'),
      searchInput: q('#search-input'),
      searchResults: q('#studio-results'), searchCount:q('#studio-result-count'), resultPrevious:q('#studio-results-previous'),resultNext:q('#studio-results-next'), detailHeading:q('#studio-selection-heading'), backResults:q('#studio-back-results'), showMap:q('#studio-show-map'),
      layoutSelect: q('#layout-select'),
      decisionFilters: qa("#decision-filters input[type='checkbox']"),
      categoryFilters: q('#category-filters'),
      resetFiltersBtn: q('#reset-filters-btn'),
      fitGraphBtn: q('#fit-graph-btn'),
      toggleFocusBtn: q('#toggle-focus-btn'),
      totalNodes: q('#total-nodes'),
      visibleNodes: q('#visible-nodes'),
      totalEdges: q('#total-edges'),
      visibleEdges: q('#visible-edges'),
      canvas: q('#graph-canvas'),
      canvasEmpty: q('#canvas-empty'),
      detailEmpty: q('#detail-empty'),
      detailNode: q('#detail-node'),
      detailId: q('#detail-id'),
      detailCategory: q('#detail-category'),
      detailLabel: q('#detail-label'),
      detailText: q('#detail-text'),
      detailOutgoing: q('#detail-outgoing'),
      detailIncoming: q('#detail-incoming'),
    };

    const state = {
      baseGraph: null,
      mergedGraph: null,
      schema: null,
      cy: null,
      selectedNodeId: null,
      focusMode: false,
      searchTerm: '',
      resultPage:0,
      activeCategories: new Set(),
      activeDecisions: new Set(DEFAULT_DECISIONS),
      graphMeta: null,
      layers: [],
      releaseManifest: null,
      releasesSorted: [],
      graphVersionToRelease: new Map(),
      schemaVersionToRelease: new Map(),
      metricsByVersion: new Map(),
      metricsHistory: [],
      activeGraphVersion: null,
      activeSchemaVersion: null,
      destroyed: false,
    };

    const setPill = (element, text, statusClass = '') => {
      if (!element) {
        return;
      }

      element.textContent = text;
      element.classList.remove('is-good', 'is-warn', 'is-bad');
      if (statusClass) {
        element.classList.add(statusClass);
      }
    };

    const resetMetricsDetails = (message = 'Load a release version to view historical structural metrics.') => {
      if (selectors.metricsVersion) {
        selectors.metricsVersion.textContent = 'n/a';
      }
      if (selectors.metricsOverall) {
        selectors.metricsOverall.textContent = 'n/a';
      }
      if (selectors.metricsCoverage) {
        selectors.metricsCoverage.textContent = 'n/a';
      }
      if (selectors.metricsRouting) {
        selectors.metricsRouting.textContent = 'n/a';
      }
      if (selectors.metricsRobustness) {
        selectors.metricsRobustness.textContent = 'n/a';
      }
      if (selectors.metricsDelta) {
        selectors.metricsDelta.textContent = 'n/a';
      }
      if (selectors.metricsPublish) {
        selectors.metricsPublish.textContent = message;
      }
      if (selectors.metricsGates) {
        selectors.metricsGates.innerHTML = '';
        const fallback = document.createElement('li');
        fallback.className = 'metrics-gate-fallback';
        fallback.textContent = message;
        selectors.metricsGates.append(fallback);
      }
    };

    const renderMetricsDetails = (graphVersion, metricsReport, historyRow, previousHistoryRow) => {
      const summary = metricsReport?.summary || {};
      const gateState = metricsReport?.monitoring?.publishGates || {};
      const gates = Array.isArray(gateState.gates) ? gateState.gates : [];
      const failedGates = gates.filter((gate) => gate?.passed === false);
      const passedGates = gates.filter((gate) => gate?.passed === true);
      const overallScore = Number(summary.overallScore);
      const previousOverallScore = Number(previousHistoryRow?.overallScore);
      const deltaScore =
        Number.isFinite(overallScore) && Number.isFinite(previousOverallScore)
          ? overallScore - previousOverallScore
          : null;

      selectors.metricsVersion.textContent = graphVersion || 'n/a';
      selectors.metricsOverall.textContent = formatPercent(summary.overallScore);
      selectors.metricsCoverage.textContent = formatPercent(summary.coverageScore);
      selectors.metricsRouting.textContent = formatPercent(summary.routingScore);
      selectors.metricsRobustness.textContent = formatPercent(summary.robustnessScore);
      selectors.metricsDelta.textContent =
        deltaScore === null ? 'No prior baseline' : formatDelta(deltaScore);

      const publishReadyFromHistory = historyRow?.publishReady;
      const publishReady =
        typeof publishReadyFromHistory === 'boolean' ? publishReadyFromHistory : gateState.allPassed;

      if (publishReady === true) {
        selectors.metricsPublish.textContent = 'Historical structural gates passed';
      } else if (publishReady === false) {
        selectors.metricsPublish.textContent = 'Historical structural gates failed';
      } else {
        selectors.metricsPublish.textContent = 'Historical structural gates unavailable';
      }

      selectors.metricsGates.innerHTML = '';
      if (gates.length === 0) {
        const fallback = document.createElement('li');
        fallback.className = 'metrics-gate-fallback';
        fallback.textContent = 'No gate report available for this version.';
        selectors.metricsGates.append(fallback);
        return;
      }

      const summaryItem = document.createElement('li');
      summaryItem.className = 'metrics-gate-summary-item';
      summaryItem.textContent = `Failed ${failedGates.length} · Passed ${passedGates.length} · Total ${gates.length}`;
      selectors.metricsGates.append(summaryItem);

      if (failedGates.length === 0) {
        const allPass = document.createElement('li');
        allPass.className = 'metrics-gate-pass';
        allPass.textContent = 'All gate checks are passing for this release.';
        selectors.metricsGates.append(allPass);
      }

      for (const gate of failedGates) {
        const item = document.createElement('li');
        item.className = 'metrics-gate-fail';
        const gateId = gate.id || 'gate';
        const gateLabel = gate.description || gate.metric || 'Gate check';
        item.textContent = `FAIL · ${gateId} · ${gateLabel}`;
        selectors.metricsGates.append(item);
      }

      if (passedGates.length > 0) {
        const rollupItem = document.createElement('li');
        rollupItem.className = 'metrics-gate-rollup';

        const details = document.createElement('details');
        const summaryElement = document.createElement('summary');
        summaryElement.textContent = `Show passing checks (${passedGates.length})`;
        details.append(summaryElement);

        const list = document.createElement('ul');
        list.className = 'metrics-gate-rollup-list';

        for (const gate of passedGates) {
          const passItem = document.createElement('li');
          const gateId = gate.id || 'gate';
          const gateLabel = gate.description || gate.metric || 'Gate check';
          passItem.textContent = `PASS · ${gateId} · ${gateLabel}`;
          list.append(passItem);
        }

        details.append(list);
        rollupItem.append(details);
        selectors.metricsGates.append(rollupItem);
      }
    };

    const clearSelectionDetails = () => {
      selectors.detailNode.classList.add('is-hidden');
      selectors.detailEmpty.classList.remove('is-hidden');
      selectors.detailOutgoing.innerHTML = '';
      selectors.detailIncoming.innerHTML = '';
      selectors.toggleFocusBtn.disabled=true;
    };

    const clearFocusMode = () => {
      if (!state.cy) {
        return;
      }
      state.cy.elements().removeClass('is-dimmed is-context-hidden');
    };

    const applyFocusMode = () => {
      if (!state.cy || !state.selectedNodeId) {
        return;
      }

      const node = state.cy.getElementById(state.selectedNodeId);
      if (node.empty()) {
        return;
      }

      const neighborhood = node.closedNeighborhood();
      state.cy.elements().removeClass('is-dimmed is-context-hidden');
      state.cy.elements().not(neighborhood).addClass('is-context-hidden');
      const positions=studioNeighborhoodPositions(neighborhood.nodes().map(node=>node.data()),state.selectedNodeId);
      neighborhood.nodes().positions(node=>positions.get(node.id()));
      state.cy.fit(neighborhood,40);
    };

    const buildDetailList = (listElement, edges, direction) => {
      listElement.innerHTML = '';

      if (edges.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'detail-item';
        empty.textContent = 'None';
        listElement.append(empty);
        return;
      }

      for (const edge of edges) {
        const relatedId = direction === 'out' ? edge.data('target') : edge.data('source');
        const relatedNode = state.cy.getElementById(relatedId);
        if (relatedNode.empty()) {
          continue;
        }

        const relatedLabel = questionLabel(relatedNode.data());
        const relatedText = relatedNode.data('text') || '';

        const item = document.createElement('li');
        item.className = 'detail-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `${edge.data('decision').toUpperCase()} -> ${relatedLabel}`;
        button.dataset.targetNodeId = relatedId;
        button.addEventListener('click', () => {
          state.selectedNodeId = relatedId;
          const node = state.cy.getElementById(relatedId);
          state.cy.$('node').unselect();
          node.select();
          state.cy.animate({
            center: { eles: node },
            duration: 300,
          });
          applyFilters();
          renderSelectionDetails();
        });

        const text = document.createElement('p');
        text.textContent = relatedText;

        item.append(button, text);
        listElement.append(item);
      }
    };

    const renderSelectionDetails = () => {
      if (!state.cy || !state.selectedNodeId) {
        clearSelectionDetails();
        return;
      }

      const node = state.cy.getElementById(state.selectedNodeId);
      if (node.empty()) {
        clearSelectionDetails();
        return;
      }

      selectors.detailNode.classList.remove('is-hidden');
      selectors.detailEmpty.classList.add('is-hidden');

      selectors.toggleFocusBtn.disabled=false;
      selectors.detailId.textContent = node.id();
      selectors.detailCategory.textContent = node.data('category') || 'Uncategorized';
      selectors.detailLabel.textContent = node.data('originalLabel') || questionLabel(node.data());
      selectors.detailText.textContent = node.data('text') || '';

      buildDetailList(selectors.detailOutgoing, node.outgoers('edge').toArray(), 'out');
      buildDetailList(selectors.detailIncoming, node.incomers('edge').toArray(), 'in');
    };

    const updateCanvasEmptyState = () => {
      const visibleNodeCount = state.cy.nodes().filter((node) => !node.hasClass('is-hidden')&&!node.hasClass('is-context-hidden')).length;
      selectors.canvasEmpty.classList.toggle('is-hidden', visibleNodeCount > 0);
    };

    const updateStats = () => {
      if (!state.mergedGraph || !state.cy) {
        return;
      }

      const visibleNodeCount = state.cy.nodes().filter((node) => !node.hasClass('is-hidden')&&!node.hasClass('is-context-hidden')).length;
      const visibleEdgeCount = state.cy.edges().filter((edge) => !edge.hasClass('is-hidden')&&!edge.hasClass('is-context-hidden')&&[edge.source(),edge.target()].every(node=>!node.hasClass('is-hidden')&&!node.hasClass('is-context-hidden'))).length;
      const activeLayers = state.layers.filter((layer) => layer.enabled).length;

      selectors.totalNodes.textContent = String(state.mergedGraph.nodes.length);
      selectors.totalEdges.textContent = String(state.mergedGraph.edges.length);
      selectors.visibleNodes.textContent = String(visibleNodeCount);
      selectors.visibleEdges.textContent = String(visibleEdgeCount);

      const versionTag = state.activeGraphVersion ? `Graph ${state.activeGraphVersion}` : 'Graph custom';
      const layerTag = activeLayers > 0 ? `${activeLayers} active layer${activeLayers === 1 ? '' : 's'}` : 'base graph only';
      setPill(selectors.stats, `${versionTag} · ${layerTag}`, 'is-good');
    };

    const applyFilters = () => {
      if (!state.cy) {
        return;
      }

      const lowerSearch = state.searchTerm.trim().toLowerCase();
      const visibleNodeIds = new Set();

      state.cy.nodes().forEach((node) => {
        const category = node.data('category');
        const inCategory = state.activeCategories.has(category);

        const searchable = `${node.id()} ${node.data('label')} ${node.data('text')}`.toLowerCase();
        const matchesSearch = !lowerSearch || searchable.includes(lowerSearch);

        const showNode = inCategory && (state.focusMode&&state.selectedNodeId || matchesSearch);
        node.toggleClass('is-hidden', !showNode);

        if (showNode) {
          visibleNodeIds.add(node.id());
        }
      });

      state.cy.edges().forEach((edge) => {
        const decisionAllowed = state.activeDecisions.has(edge.data('decision'));
        const endpointsVisible =
          visibleNodeIds.has(edge.data('source')) && visibleNodeIds.has(edge.data('target'));

        edge.toggleClass('is-hidden', !(decisionAllowed && endpointsVisible));
      });

      if (state.selectedNodeId) {
        const selectedNode = state.cy.getElementById(state.selectedNodeId);
        if (selectedNode.empty() || selectedNode.hasClass('is-hidden')) {
          state.selectedNodeId = null;
          state.focusMode = false;
          selectors.toggleFocusBtn.textContent = 'Focus Selection';
          clearFocusMode();
          renderSelectionDetails();
        }
      }

      if (state.focusMode && state.selectedNodeId) {
        applyFocusMode();
      } else {
        clearFocusMode();
      }

      selectors.toggleFocusBtn.textContent=state.focusMode?'Clear focus':'Focus selection';
      q('#studio-map-caption').textContent=state.focusMode?'Linked questions surround the selected question. Position is a display aid; only arrows assert routes.':'Domain and stage groups organize the overview. Select a question to read its local routes. Only arrows assert routes.';
      updateStats();
      updateCanvasEmptyState();
      renderSearchResults();
    };

    const runLayout = (name) => {
      if (!state.cy) {
        return;
      }

      if(name==='preset'){const positions=studioPositions(state.mergedGraph.nodes.map(getNodeData));state.cy.nodes().positions(node=>positions.get(node.id()));state.cy.fit(state.cy.elements(':visible'),40);return;}
      const base = {
        name,
        animate: true,
        fit: true,
        padding: 38,
      };

      const layoutOptions = {
        cose: {
          ...base,
          nodeRepulsion: 12000,
          idealEdgeLength: 110,
        },
        breadthfirst: {
          ...base,
          directed: true,
          spacingFactor: 1.1,
        },
        concentric: {
          ...base,
          spacingFactor: 0.95,
          avoidOverlap: true,
        },
      };

      state.cy.layout(layoutOptions[name] || layoutOptions.cose).run();
    };

    const createCategoryButtons = (categories) => {
      selectors.categoryFilters.innerHTML = '';

      if (state.activeCategories.size === 0) {
        for (const category of categories) {
          state.activeCategories.add(category);
        }
      }

      for (const category of categories) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chip';
        button.textContent = category;
        button.dataset.category = category;
        button.style.borderColor = CATEGORY_COLORS[category] || token('--line-strong');

        if (state.activeCategories.has(category)) {
          button.classList.add('is-active');
        }

        button.addEventListener('click', () => {
          if (state.activeCategories.has(category)) {
            state.activeCategories.delete(category);
            button.classList.remove('is-active');
          } else {
            state.activeCategories.add(category);
            button.classList.add('is-active');
          }

          applyFilters();
        });

        selectors.categoryFilters.append(button);
      }
    };

    const mapGraphElements = (graph) => {
      const nodes = graph.nodes.map((node) => {
        const nodeData = getNodeData(node);
        const category = nodeData.category || 'Uncategorized';
        const label = questionLabel(nodeData);

        return {
          data: {
            ...nodeData,
            category,
            label,
            displayLabel:compactQuestionLabel({...nodeData,title:nodeData.label},64),
            originalLabel:nodeData.label,
            color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Uncategorized,
          },
        };
      });

      const edges = graph.edges.map((edge) => {
        const edgeData = getEdgeData(edge);
        const decision = edgeData.decision || 'unknown';
        return {
          data: {
            ...edgeData,
            decision,
            color: DECISION_COLORS[decision] || DECISION_COLORS.unknown,
          },
        };
      });

      return {
        nodes,
        edges,
      };
    };

    const createCy = (graph, cytoscape) => {
      if (state.cy) {
        state.cy.destroy();
      }

      const elements = mapGraphElements(graph);
      const positions=studioPositions(graph.nodes.map(getNodeData));
      elements.nodes.forEach(node=>{node.position=positions.get(node.data.id);});

      state.cy = cytoscape({
        container: selectors.canvas,
        elements: [...elements.nodes, ...elements.edges],
        layout: {
          name: 'preset',
          animate: false,
          fit: true,
          padding: 42,
          nodeRepulsion: 12000,
          idealEdgeLength: 110,
        },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': token('--bg-input'),
              color: token('--text-primary'),
              label: 'data(displayLabel)',
              'font-size': 14,
              'min-zoomed-font-size': 9,
              'font-family': 'Inter, system-ui, sans-serif',
              'text-wrap': 'wrap',
              'text-max-width': 155,
              'text-valign': 'center',
              'text-halign': 'center',
              'border-width': 1.4,
              'border-color': 'data(color)',
              width: 175,
              height: 70,
              shape:'roundrectangle',
              'overlay-opacity': 0,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1.9,
              'line-color': 'data(color)',
              'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 0.8,
              opacity: 0.82,
              label: 'data(decision)',
              'min-zoomed-font-size':9,
              'font-size': 8,
              color: token('--text-primary'),
              'text-background-color': token('--bg-app'),
              'text-background-opacity': 0.7,
              'text-background-padding': 1,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': token('--accent-primary'),
              'text-outline-width': 1,
              'text-outline-color': token('--bg-app'),
            },
          },
          {
            selector: '.is-hidden, .is-context-hidden',
            style: {
              display: 'none',
            },
          },
          {
            selector: '.is-dimmed',
            style: {
              opacity: 0.08,
            },
          },
        ],
        minZoom: 0.05,
        maxZoom: 2.5,
        userZoomingEnabled:false,
      });

      state.cy.on('tap', 'node', (event) => {
        const node = event.target;
        state.selectedNodeId = node.id();
        state.focusMode=true;
        applyFilters();
        renderSelectionDetails();
      });

      state.cy.on('tap', (event) => {
        if (event.target !== state.cy) {
          return;
        }

        state.selectedNodeId = null;
        state.focusMode = false;
        selectors.toggleFocusBtn.textContent = 'Focus Selection';
        clearFocusMode();applyFilters();runLayout(selectors.layoutSelect.value);
        renderSelectionDetails();
      });
    };

    const refreshLayerList = () => {
      selectors.layerList.innerHTML = '';

      if (state.layers.length === 0) {
        selectors.layerEmpty.classList.remove('is-hidden');
        return;
      }

      selectors.layerEmpty.classList.add('is-hidden');

      for (const layer of state.layers) {
        const item = document.createElement('div');
        item.className = 'layer-item';

        const topRow = document.createElement('div');
        topRow.className = 'layer-item-top';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'layer-toggle';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.enabled;
        checkbox.addEventListener('change', () => {
          layer.enabled = checkbox.checked;
          rebuildMergedGraphAndRender();
        });

        const title = document.createElement('span');
        title.textContent = layer.name;

        toggleLabel.append(checkbox, title);

        const actions = document.createElement('div');
        actions.className = 'layer-actions';

        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.className = 'layer-action-btn';
        exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', () => {
          makeDownload(`${slugify(layer.name)}.layer.json`, {
            format: 'tensor-layer.v1',
            layer: {
              metadata: {
                name: layer.name,
                owner: layer.owner,
                type: layer.type,
                description: layer.description,
                source: layer.source,
              },
              nodes: layer.nodes,
              edges: layer.edges,
            },
          });
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'layer-action-btn is-danger';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          state.layers = state.layers.filter((candidate) => candidate.id !== layer.id);
          refreshLayerList();
          rebuildMergedGraphAndRender();
        });

        actions.append(exportBtn, removeBtn);
        topRow.append(toggleLabel, actions);

        const meta = document.createElement('p');
        meta.className = 'layer-meta';
        meta.textContent = `${layer.owner} · ${layer.type} · ${layer.nodes.length} nodes / ${layer.edges.length} edges`;

        item.append(topRow, meta);
        selectors.layerList.append(item);
      }
    };

    const updateReleaseNotes = (graphVersion) => {
      selectors.releaseNotes.innerHTML = '';
      const release = state.graphVersionToRelease.get(graphVersion);

      if (!release || !Array.isArray(release.notes) || release.notes.length === 0) {
        const fallback = document.createElement('li');
        fallback.textContent = 'No release notes available for this version.';
        selectors.releaseNotes.append(fallback);
        return;
      }

      for (const note of release.notes) {
        const item = document.createElement('li');
        item.textContent = note;
        selectors.releaseNotes.append(item);
      }
    };

    const updateVersionSelectors = (preserveSelection = false) => {
      const previousGraphSelection = selectors.graphVersionSelect.value;
      const previousSchemaSelection = selectors.schemaVersionSelect.value;

      const graphVersions = [];
      const schemaVersions = [];

      for (const release of [...state.releasesSorted].reverse()) {
        if (release.graphVersion && !graphVersions.includes(release.graphVersion)) {
          graphVersions.push(release.graphVersion);
        }
        if (release.schemaVersion && !schemaVersions.includes(release.schemaVersion)) {
          schemaVersions.push(release.schemaVersion);
        }
      }

      if (graphVersions.length === 0) {
        graphVersions.push(DEFAULT_GRAPH_VERSION);
      }

      if (schemaVersions.length === 0) {
        schemaVersions.push(DEFAULT_SCHEMA_VERSION);
      }

      selectors.graphVersionSelect.innerHTML = '';
      selectors.schemaVersionSelect.innerHTML = '';

      for (const version of graphVersions) {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = version;
        selectors.graphVersionSelect.append(option);
      }

      for (const version of schemaVersions) {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = version;
        selectors.schemaVersionSelect.append(option);
      }

      const latestGraphVersion = sanitizeVersion(state.releaseManifest?.latestGraphVersion) || graphVersions[0];
      const latestSchemaVersion = sanitizeVersion(state.releaseManifest?.latestSchemaVersion) || schemaVersions[0];

      const graphSelection =
        preserveSelection && graphVersions.includes(previousGraphSelection)
          ? previousGraphSelection
          : graphVersions.includes(latestGraphVersion)
            ? latestGraphVersion
            : graphVersions[0];
      const schemaSelection =
        preserveSelection && schemaVersions.includes(previousSchemaSelection)
          ? previousSchemaSelection
          : schemaVersions.includes(latestSchemaVersion)
            ? latestSchemaVersion
            : schemaVersions[0];

      selectors.graphVersionSelect.value = graphSelection;
      selectors.schemaVersionSelect.value = schemaSelection;
    };

    const validateAndSetSchemaStatus = () => {
      const validation = checkLegacyGraphStructure(state.mergedGraph || state.baseGraph, state.schema);
      const firstError = validation.errors[0]?.message;
      setPill(selectors.schemaStatus, validation.valid
        ? 'Graph structural checks passed · full schema not checked'
        : `Structural warning: ${firstError}`, validation.valid ? 'is-warn' : 'is-bad');
      selectors.schemaStatus.title = validation.scope;
    };

    const exportCheckedGraph = (filename, graph) => {
      const result = checkLegacyGraphStructure(graph, state.schema);
      if (!result.valid) {
        setPill(selectors.schemaStatus, `Export blocked: ${result.errors[0].message}`, 'is-bad');
        return;
      }
      makeDownload(filename, graph);
    };

    const rebuildMergedGraphAndRender = async () => {
      if (!state.baseGraph) {
        return;
      }

      state.mergedGraph = mergeLegacyGraphWithLayers(state.baseGraph, state.layers);
      const categories = getCategories(state.mergedGraph);

      const previousCategories = new Set(state.activeCategories);
      state.activeCategories.clear();
      for (const category of categories) {
        if (previousCategories.size === 0 || previousCategories.has(category)) {
          state.activeCategories.add(category);
        }
      }

      if (state.activeCategories.size === 0) {
        for (const category of categories) {
          state.activeCategories.add(category);
        }
      }

      createCategoryButtons(categories);
      refreshLayerList();

      const cytoscapeModule = await import('cytoscape');
      const cytoscape = cytoscapeModule.default;

      if (state.destroyed || typeof cytoscape !== 'function') {
        throw new Error('Graph renderer unavailable (Cytoscape not loaded)');
      }

      createCy(state.mergedGraph, cytoscape);
      validateAndSetSchemaStatus();
      applyFilters();
      renderSelectionDetails();
    };

    const loadReleaseManifest = async (preserveSelection = false) => {
      // One active public source. Historical releases belong to the archive.
      state.releaseManifest = { latestGraphVersion: DEFAULT_GRAPH_VERSION, latestSchemaVersion: DEFAULT_SCHEMA_VERSION, releases: [] };
      state.releasesSorted = [];
      state.graphVersionToRelease.clear(); state.schemaVersionToRelease.clear();
      updateVersionSelectors(preserveSelection);
    };

    const fetchGraphForVersion = async () => {
      const response = await fetch(currentDataset.graph, { credentials: 'omit', redirect: 'error' });
      if (!response.ok) throw new Error(`Current public graph unavailable (${response.status})`);
      const bytes = await datasetArtifact(response,currentDataset.files.find(file=>file.publicPath===currentDataset.graph));
      const graph = JSON.parse(new TextDecoder().decode(bytes));
      if (graph.version !== currentDataset.graphVersion || graph.nodes.length !== currentDataset.counts.questions || graph.edges.length !== currentDataset.counts.routes) throw new Error('Current public graph differs from its dataset inventory');
      return { ...normalizeGraphPayload(graph), artifactSha256: currentDataset.files.find(file=>file.publicPath===currentDataset.graph).sha256 };
    };

    const fetchSchemaForVersion = async () => {
      const response = await fetch(currentDataset.graphSchema, { credentials: 'omit', redirect: 'error' });
      if (!response.ok) throw new Error(`Graph schema unavailable (${response.status})`);
      const bytes = await datasetArtifact(response,currentDataset.files.find(file=>file.publicPath===currentDataset.graphSchema));
      return normalizeSchemaPayload(JSON.parse(new TextDecoder().decode(bytes)));
    };

    const loadMetricsHistory = async () => {
      const historyResult = await fetchMetricsHistoryChannel({
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      const normalizedHistory = normalizeMetricsHistoryPayload(historyResult.data);
      const series = Array.isArray(normalizedHistory.series) ? [...normalizedHistory.series] : [];
      series.sort((left, right) => {
        const leftTime = new Date(left?.generatedAt || 0).getTime();
        const rightTime = new Date(right?.generatedAt || 0).getTime();
        return leftTime - rightTime;
      });

      state.metricsHistory = series;
    };

    const fetchMetricsForVersion = async (graphVersion) => {
      const normalizedVersion = sanitizeVersion(graphVersion);
      if (!normalizedVersion) {
        return null;
      }

      if (state.metricsByVersion.has(normalizedVersion)) {
        return state.metricsByVersion.get(normalizedVersion);
      }

      const reportResult = await fetchMetricsReportChannel(normalizedVersion, 'math-assurance', {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      const report = normalizeMetricsReportPayload(reportResult.data);
      if (!report) {
        throw new Error(`Metrics payload unavailable for ${normalizedVersion}`);
      }

      state.metricsByVersion.set(normalizedVersion, report);
      return report;
    };

    const updateVersionMetrics = async (graphVersion) => {
      const normalizedVersion = sanitizeVersion(graphVersion);
      if (!normalizedVersion) {
        setPill(selectors.metrics, 'Imported graph metrics unavailable', 'is-warn');
        resetMetricsDetails('Imported graph versions do not map to release metrics.');
        return;
      }

      const report = await fetchMetricsForVersion(normalizedVersion);
      const historyIndex = state.metricsHistory.findIndex((row) => row?.version === normalizedVersion);
      const historyRow = historyIndex >= 0 ? state.metricsHistory[historyIndex] : null;
      const previousHistoryRow = historyIndex > 0 ? state.metricsHistory[historyIndex - 1] : null;

      renderMetricsDetails(normalizedVersion, report, historyRow, previousHistoryRow);

      const overallScore = Number(report?.summary?.overallScore);
      const previousOverallScore = Number(previousHistoryRow?.overallScore);
      const deltaScore =
        Number.isFinite(overallScore) && Number.isFinite(previousOverallScore)
          ? overallScore - previousOverallScore
          : null;
      const gateState = report?.monitoring?.publishGates || {};

      const pillParts = [`Structural metrics ${formatPercent(overallScore)}`];
      if (deltaScore !== null) {
        pillParts.push(formatDelta(deltaScore));
      }

      setPill(selectors.metrics, pillParts.join(' · '), gateState.allPassed === true ? 'is-good' : 'is-warn');
    };

    const updateTimelineDiff = async (graphVersion) => {
      const releaseIndex = state.releasesSorted.findIndex((release) => release.graphVersion === graphVersion);
      const currentRelease = releaseIndex >= 0 ? state.releasesSorted[releaseIndex] : null;
      const previousRelease = releaseIndex > 0 ? state.releasesSorted[releaseIndex - 1] : null;

      if (!currentRelease || !previousRelease) {
        setPill(selectors.timeline, 'No prior release for timeline diff', 'is-warn');
        selectors.diffSummary.textContent = 'This graph version has no earlier baseline in the release channel.';
        return;
      }

      try {
        const diffResult = await fetchJsonWithFallback([
          {
            url: `/api/diff?from=${encodeURIComponent(previousRelease.graphVersion)}&to=${encodeURIComponent(currentRelease.graphVersion)}`,
            label: 'Worker API diff',
          },
          {
            url: previousRelease.graphUrl || previousRelease.graphPath,
            label: `Previous graph ${previousRelease.graphVersion}`,
          },
        ]);

        let diff = diffResult.data?.diff || null;

        if (!diff && (previousRelease.graphUrl || previousRelease.graphPath)) {
          const previousGraphRaw = await fetchJsonWithFallback([
            {
              url: previousRelease.graphUrl || previousRelease.graphPath,
              label: `Previous graph ${previousRelease.graphVersion}`,
            },
          ]);
          const previousGraph = normalizeGraphPayload(previousGraphRaw.data).graph;
          diff = computeGraphDiff(previousGraph, state.baseGraph);
        }

        if (!diff) {
          setPill(selectors.timeline, 'Timeline diff unavailable', 'is-warn');
          selectors.diffSummary.textContent = 'Could not compute release diff.';
          return;
        }

        const summaryText = buildDiffSummaryText(diff);
        setPill(
          selectors.timeline,
          `Release diff ${previousRelease.graphVersion} -> ${currentRelease.graphVersion}`,
          'is-good'
        );
        selectors.diffSummary.textContent = summaryText;
      } catch {
        setPill(selectors.timeline, 'Timeline diff unavailable', 'is-warn');
        selectors.diffSummary.textContent = 'Could not load previous release graph for comparison.';
      }
    };

    const loadVersions = async (graphVersion, schemaVersion) => {
      setPill(selectors.dataSource, 'Loading graph version...', 'is-warn');
      setPill(selectors.schemaStatus, 'Loading schema version...', 'is-warn');

      const normalizedGraphVersion = sanitizeVersion(graphVersion) || DEFAULT_GRAPH_VERSION;
      const normalizedSchemaVersion = sanitizeVersion(schemaVersion) || DEFAULT_SCHEMA_VERSION;

      const graphPayload = await fetchGraphForVersion(normalizedGraphVersion);
      const schemaPayload = await fetchSchemaForVersion(normalizedSchemaVersion);

      rootRef.current.dataset.datasetId = currentDataset.id;
      state.baseGraph = graphPayload.graph;
      state.baseGraphDigest = graphPayload.artifactSha256;
      state.graphMeta = graphPayload.meta;
      state.schema = schemaPayload.schema;
      state.activeGraphVersion = graphPayload.version || normalizedGraphVersion;
      state.activeSchemaVersion = schemaPayload.version || normalizedSchemaVersion;

      selectors.graphVersionSelect.value = normalizedGraphVersion;
      selectors.schemaVersionSelect.value = normalizedSchemaVersion;

      const datasetNote = document.createElement('li');
      datasetNote.textContent = 'The same current public graph, evidence criteria and profiles used by the Atlas and review package.';
      selectors.releaseNotes.replaceChildren(datasetNote);
      selectors.diffSummary.textContent = 'Current public dataset. Original releases and their metrics remain in the historical archive.';
      setPill(selectors.timeline, 'Current public dataset', 'is-good');
      setPill(selectors.metrics, 'Item-level review available', 'is-good');
      resetMetricsDetails('Historical scores do not describe this current candidate.');

      const sourceParts = [];
      sourceParts.push(`Graph ${state.activeGraphVersion}`);
      sourceParts.push(`Schema ${state.activeSchemaVersion}`);
      if (graphPayload.release?.displayName) {
        sourceParts.push(graphPayload.release.displayName);
      }
      setPill(selectors.dataSource, sourceParts.join(' · '), 'is-good');

      await rebuildMergedGraphAndRender();
    };

    const importGraphFromFile = async (file) => {
      const payload = await readJsonFile(file);
      const normalized = normalizeGraphPayload(payload);
      const digest = await artifactDigest(await file.arrayBuffer());

      delete rootRef.current.dataset.datasetId;
      state.baseGraph = normalized.graph;
      state.baseGraphDigest = digest;
      state.graphMeta = normalized.meta;
      state.activeGraphVersion = `import:${file.name}`;

      setPill(selectors.dataSource, `Imported graph: ${file.name}`, 'is-good');
      setPill(selectors.timeline, 'Imported graph (no release diff)', 'is-warn');
      selectors.diffSummary.textContent = 'Release diff is available only for known release versions.';
      updateReleaseNotes('');
      setPill(selectors.metrics, 'Imported graph metrics unavailable', 'is-warn');
      resetMetricsDetails('Imported graph versions do not map to release metrics.');

      await rebuildMergedGraphAndRender();
    };

    const importSchemaFromFile = async (file) => {
      const payload = await readJsonFile(file);
      const normalized = normalizeSchemaPayload(payload);

      if (!normalized) {
        throw new Error('Invalid schema payload shape');
      }

      state.schema = normalized.schema;
      state.activeSchemaVersion = `import:${file.name}`;
      setPill(selectors.schemaStatus, `Imported schema: ${file.name}`, 'is-good');
      validateAndSetSchemaStatus();
    };

    const appendLayers = async (payload, label) => {
      checkLayerBase(payload,state.baseGraph,state.baseGraphDigest);
      const parsedLayers = normalizeLayerPayload(payload, label.replace(/\.json$/i, ''));

      const nextLayers = [...state.layers, ...parsedLayers];
      // Check mergeability before mutating the UI state so a malformed layer can be retried.
      mergeLegacyGraphWithLayers(state.baseGraph, nextLayers);
      state.layers = nextLayers;
      setPill(selectors.stats, `Imported ${parsedLayers.length} layer(s) from ${label}`, 'is-good');
      await rebuildMergedGraphAndRender();
    };

    const importLayerFromFile = async (file) => appendLayers(await readJsonFile(file), file.name);

    const selectResult=(id)=>{
      if(!state.cy||state.cy.getElementById(id).empty())return;
      state.selectedNodeId=id;state.focusMode=true;state.cy.nodes().unselect();state.cy.getElementById(id).select();applyFilters();renderSelectionDetails();
      selectors.detailHeading.focus();selectors.detailHeading.scrollIntoView({block:'start',behavior:'instant'});
    };
    const renderSearchResults=()=>{
      if(!state.mergedGraph)return;
      const term=state.searchTerm.trim().toLowerCase();
      const matches=state.mergedGraph.nodes.map(getNodeData).filter(n=>state.activeCategories.has(n.category)&&`${n.id} ${n.label} ${n.text}`.toLowerCase().includes(term));
      state.resultPage=Math.min(state.resultPage,Math.max(0,Math.ceil(matches.length/12)-1));
      selectors.searchCount.textContent=matches.length?`${matches.length} questions · ${state.resultPage*12+1}–${Math.min(matches.length,(state.resultPage+1)*12)} shown`:'No matching questions. Try another phrase or reset the filters.';
      selectors.searchResults.replaceChildren();
      for(const n of matches.slice(state.resultPage*12,(state.resultPage+1)*12)){
        const li=document.createElement('li'),button=document.createElement('button'),name=document.createElement('span'),meta=document.createElement('small');
        button.type='button';button.title=questionLabel(n);button.setAttribute('aria-pressed',String(state.selectedNodeId===n.id));button.dataset.questionId=n.id;
        name.textContent=compactQuestionLabel({...n,title:n.label},75);button.setAttribute('aria-label',`${n.category}: ${questionLabel(n)} · ${n.archetype||'Additional question'}`);meta.textContent=`${n.category} · ${n.archetype||'Additional question'}`;
        button.append(name,meta);button.addEventListener('click',()=>selectResult(n.id));li.append(button);selectors.searchResults.append(li);
      }
      selectors.resultPrevious.disabled=state.resultPage===0;selectors.resultNext.disabled=(state.resultPage+1)*12>=matches.length;
    };
    const bindControls = () => {
      q('#studio-import-layer-shortcut').addEventListener('click',()=>selectors.layerImportInput.click());
      q('#studio-zoom-in').addEventListener('click',()=>{if(state.cy)state.cy.zoom({level:state.cy.zoom()*1.5,renderedPosition:{x:state.cy.width()/2,y:state.cy.height()/2}});});
      q('#studio-zoom-out').addEventListener('click',()=>{if(state.cy)state.cy.zoom({level:state.cy.zoom()/1.5,renderedPosition:{x:state.cy.width()/2,y:state.cy.height()/2}});});
      q('#studio-whole').addEventListener('click',()=>selectors.resetFiltersBtn.click());
      selectors.resultPrevious.addEventListener('click',()=>{state.resultPage--;renderSearchResults();selectors.searchResults.querySelector('button')?.focus();});
      selectors.resultNext.addEventListener('click',()=>{state.resultPage++;renderSearchResults();selectors.searchResults.querySelector('button')?.focus();});
      selectors.searchInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();selectors.searchResults.querySelector('button')?.click();}});
      selectors.backResults.addEventListener('click',()=>{selectors.searchInput.focus();selectors.searchInput.scrollIntoView({block:'center',behavior:'instant'});});
      selectors.showMap.addEventListener('click',()=>{selectors.canvas.focus();selectors.canvas.scrollIntoView({block:'center',behavior:'instant'});});
      selectors.searchInput.addEventListener('input', (event) => {
        state.searchTerm = event.target.value;state.resultPage=0;state.focusMode=false;
        applyFilters();
        if(!state.searchTerm.trim())runLayout(selectors.layoutSelect.value);
        else {const nodes=state.cy?.nodes().filter(n=>!n.hasClass('is-hidden'));if(nodes?.length)state.cy.fit(nodes,46);}
      });

      selectors.layoutSelect.addEventListener('change', (event) => {
        runLayout(event.target.value);
      });

      selectors.decisionFilters.forEach((checkbox) => {
        checkbox.addEventListener('change', (event) => {
          const { checked, value } = event.target;
          if (checked) {
            state.activeDecisions.add(value);
          } else {
            state.activeDecisions.delete(value);
          }
          applyFilters();
        });
      });

      selectors.resetFiltersBtn.addEventListener('click', () => {
        state.searchTerm = '';
        selectors.searchInput.value = '';state.resultPage=0;

        state.activeDecisions = new Set(DEFAULT_DECISIONS);
        selectors.decisionFilters.forEach((checkbox) => {
          checkbox.checked = true;
        });

        state.activeCategories = new Set();
        selectors.categoryFilters.querySelectorAll('.chip').forEach((button) => {
          state.activeCategories.add(button.dataset.category);
          button.classList.add('is-active');
        });

        state.focusMode = false;
        selectors.toggleFocusBtn.textContent = 'Focus Selection';
        clearFocusMode();
        applyFilters();
        runLayout(selectors.layoutSelect.value);
      });

      selectors.fitGraphBtn.addEventListener('click', () => {
        if (!state.cy) {
          return;
        }

        const visibleNodes = state.cy.nodes().filter((node) => !node.hasClass('is-hidden')&&!node.hasClass('is-context-hidden'));
        if (visibleNodes.length > 0) {
          state.cy.fit(visibleNodes, 46);
        }
      });

      selectors.toggleFocusBtn.addEventListener('click', () => {
        if (!state.selectedNodeId) {
          return;
        }

        state.focusMode = !state.focusMode;
        selectors.toggleFocusBtn.textContent = state.focusMode ? 'Unfocus Selection' : 'Focus Selection';

        applyFilters();
        if(!state.focusMode)runLayout(selectors.layoutSelect.value);
      });

      selectors.loadVersionsBtn.addEventListener('click', async () => {
        try {
          await loadVersions(selectors.graphVersionSelect.value, selectors.schemaVersionSelect.value);
        } catch (error) {
          setPill(selectors.dataSource, 'Version load failed', 'is-bad');
          setPill(selectors.schemaStatus, `Schema load failed: ${error.message}`, 'is-bad');
          setPill(selectors.metrics, `Metrics load failed: ${error.message}`, 'is-warn');
          resetMetricsDetails(`Metrics unavailable: ${error.message}`);
        }
      });

      selectors.importGraphBtn.addEventListener('click', () => {
        selectors.graphImportInput.click();
      });

      selectors.importSchemaBtn.addEventListener('click', () => {
        selectors.schemaImportInput.click();
      });

      selectors.importLayerBtn.addEventListener('click', () => {
        selectors.layerImportInput.click();
      });

      selectors.graphImportInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
          return;
        }

        try {
          await importGraphFromFile(file);
        } catch (error) {
          setPill(selectors.dataSource, `Graph import failed: ${error.message}`, 'is-bad');
        }
      });

      selectors.schemaImportInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
          return;
        }

        try {
          await importSchemaFromFile(file);
        } catch (error) {
          setPill(selectors.schemaStatus, `Schema import failed: ${error.message}`, 'is-bad');
        }
      });

      selectors.layerImportInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
          return;
        }

        try {
          await importLayerFromFile(file);
        } catch (error) {
          setPill(selectors.stats, `Layer import failed: ${error.message}`, 'is-bad');
        }
      });

      selectors.exportCoreBtn.addEventListener('click', () => {
        if (!state.baseGraph) {
          return;
        }

        exportCheckedGraph(`tensor-core-${state.activeGraphVersion || 'custom'}.json`, state.baseGraph);
      });

      selectors.exportMergedBtn.addEventListener('click', () => {
        if (!state.mergedGraph) {
          return;
        }

        exportCheckedGraph(`tensor-merged-${Date.now()}.json`, state.mergedGraph);
      });

      selectors.exportLayersBtn.addEventListener('click', () => {
        makeDownload(`tensor-layers-${Date.now()}.json`, {
          format: 'tensor-layer-pack.v1',
          generatedAt: new Date().toISOString(),
          baseGraphVersion: state.baseGraph.version,
          baseGraphSha256: state.baseGraphDigest,
          baseSchemaVersion: state.activeSchemaVersion,
          layers: state.layers.map((layer) => ({
            metadata: {
              id: layer.id,
              name: layer.name,
              owner: layer.owner,
              type: layer.type,
              description: layer.description,
              source: layer.source,
              enabled: layer.enabled,
            },
            nodes: layer.nodes,
            edges: layer.edges,
          })),
        });
      });
    };

    let releasePollTimer = null;

    const init = async () => {
      try {
        setPill(selectors.dataSource, 'Loading release manifest...', 'is-warn');
        setPill(selectors.schemaStatus, 'Waiting for schema selection...', 'is-warn');
        setPill(selectors.stats, 'Preparing graph stats...', 'is-warn');
        setPill(selectors.timeline, 'Preparing release timeline...', 'is-warn');
        setPill(selectors.metrics, 'Preparing structural metrics...', 'is-warn');
        resetMetricsDetails('Loading release metrics...');

        await loadReleaseManifest();

        if (state.destroyed) {
          return;
        }

        bindControls();

        const params = new URL(window.location.href).searchParams;
        const requestedVersion = sanitizeVersion(params.get('graph'));
        if (requestedVersion && requestedVersion !== DEFAULT_GRAPH_VERSION) { window.location.replace('/archives/0.20260206e/'); return; }
        await loadVersions(DEFAULT_GRAPH_VERSION, DEFAULT_SCHEMA_VERSION);
        // Only the explicit example link loads these public, non-executing fixtures.
        if (params.get('example') === 'cloud-layers') {
          try {
            const response = await fetch('/examples/layers/cloud-investigation.layers.json', { credentials: 'omit', redirect: 'error' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (state.destroyed) return;
            const bytes = await datasetArtifact(response,currentDataset.files.find(file=>file.publicPath==='/examples/layers/cloud-investigation.layers.json'));
            await appendLayers(JSON.parse(new TextDecoder().decode(bytes)), 'Cloud layer example');
          } catch (error) {
            setPill(selectors.stats, `Example layers unavailable: ${error.message}. Local layer import remains available.`, 'is-warn');
          }
        }
        const requestedNode = params.get('node');
        const node = requestedNode && state.cy?.getElementById(requestedNode);
        if (node && node.length) {
          state.selectedNodeId = node.id();
          node.select();
          state.focusMode = true;
          selectors.toggleFocusBtn.textContent = 'Clear Focus';
          applyFocusMode();
          renderSelectionDetails();
          state.cy.fit(node.closedNeighborhood(), 45);
        }


      } catch (error) {
        setPill(selectors.dataSource, 'Graph load failed', 'is-bad');
        setPill(selectors.schemaStatus, 'Structural check skipped', 'is-warn');
        setPill(selectors.stats, 'Explorer unavailable', 'is-bad');
        setPill(selectors.timeline, 'Timeline unavailable', 'is-warn');
        setPill(selectors.metrics, 'Metrics unavailable', 'is-warn');
        selectors.canvasEmpty.classList.remove('is-hidden');
        selectors.canvasEmpty.textContent = `Failed to initialize explorer: ${error.message}`;
      }
    };

    init();

    return () => {
      state.destroyed = true;
      if (releasePollTimer) {
        window.clearInterval(releasePollTimer);
      }
      if (state.cy) {
        state.cy.destroy();
      }
    };
  }, []);

  return (
    <div ref={rootRef}>
      <div className="studio-status-row">
        <span className="status-pill" id="data-source-pill">Loading data source...</span>
        <span className="status-pill" id="schema-pill">Checking graph structure...</span>
        <span className="status-pill" id="stats-pill">Preparing graph stats...</span>
        <span className="status-pill" id="timeline-pill">Loading timeline...</span>
        <span className="status-pill" id="metrics-pill">Loading structural metrics...</span>
      </div>

      <div className="studio-grid">
        <aside className="tensor-panel studio-panel controls-panel">
          <h2>Find and inspect</h2>

          <label className="studio-field" htmlFor="search-input">Find a question</label>
          <input id="search-input" type="search" placeholder="Search by ID, label, or text" />

          <p id="studio-result-count" role="status">Loading questions…</p><ol id="studio-results" className="studio-results" aria-label="Matching questions"></ol><div className="studio-results-pages"><button className="btn btn-secondary" id="studio-results-previous" disabled>Previous results</button><button className="btn btn-secondary" id="studio-results-next" disabled>Next results</button></div>
          <details className="studio-layer-controls">
            <summary>Vendor and company layers</summary><p className="studio-field">Layer pack</p>
          <div id="layer-empty" className="detail-empty">No custom layers loaded. The layering example is available from the guide.</div>
          <div id="layer-list" className="layer-list"></div>
            <button className="btn btn-secondary" type="button" id="studio-import-layer-shortcut">Add a layer</button>
          </details>
          <details className="studio-advanced">
          <summary>Import, export and display settings</summary><p className="studio-field">Current public source</p>
          <div className="version-grid">
            <label htmlFor="graph-version-select">Graph version</label>
            <select id="graph-version-select"></select>

            <label htmlFor="schema-version-select">Schema version</label>
            <select id="schema-version-select"></select>
          </div>

          <div className="button-row button-row-single">
            <button className="btn btn-secondary" type="button" id="load-versions-btn">Reload current dataset</button>
          </div>

          <p className="studio-field">Import and export</p>
          <div className="button-row">
            <button className="btn btn-secondary" type="button" id="import-graph-btn">Import Graph</button>
            <button className="btn btn-secondary" type="button" id="import-schema-btn">Import Schema</button>
          </div>
          <div className="button-row">
            <button className="btn btn-secondary" type="button" id="import-layer-btn">Import Layer</button>
            <button className="btn btn-secondary" type="button" id="export-layers-btn">Export Layers</button>
          </div>
          <div className="button-row">
            <button className="btn btn-secondary" type="button" id="export-core-btn">Export base graph</button>
            <button className="btn btn-secondary" type="button" id="export-merged-btn">Export Merged Graph</button>
          </div>

          <input id="graph-import-input" type="file" accept="application/json,.json" className="is-hidden" />
          <input id="schema-import-input" type="file" accept="application/json,.json" className="is-hidden" />
          <input id="layer-import-input" type="file" accept="application/json,.json" className="is-hidden" />

          <label className="studio-field" htmlFor="layout-select">Layout</label>
          <select id="layout-select" defaultValue="preset">
            <option value="preset">Domain and stage atlas</option><option value="cose">Organic clusters</option>
            <option value="breadthfirst">Tiered (Breadth First)</option>
            <option value="concentric">Concentric</option>
          </select>

          <p className="studio-field">Decision Paths</p>
          <div className="toggle-row" id="decision-filters">
            <label><input type="checkbox" value="yes" defaultChecked /> yes</label>
            <label><input type="checkbox" value="no" defaultChecked /> no</label>
            <label><input type="checkbox" value="unknown" defaultChecked /> unknown</label>
          </div>

          <p className="studio-field">Categories</p>
          <div id="category-filters" className="chip-grid" aria-label="Category filters"></div>

          <div className="button-row">
            <button className="btn btn-secondary" type="button" id="reset-filters-btn">Reset Filters</button>
          </div>
          </details>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Nodes</span>
              <strong id="total-nodes">-</strong>
            </div>
            <div className="stat-card">
              <span>Visible Nodes</span>
              <strong id="visible-nodes">-</strong>
            </div>
            <div className="stat-card">
              <span>Total Edges</span>
              <strong id="total-edges">-</strong>
            </div>
            <div className="stat-card">
              <span>Visible Edges</span>
              <strong id="visible-edges">-</strong>
            </div>
          </div>

        </aside>

        <section className="tensor-panel studio-canvas" aria-label="Graph canvas">
          <div className="studio-camera" role="group" aria-label="Studio map controls"><button className="btn btn-secondary" id="studio-whole">All questions</button><button className="btn btn-secondary" id="fit-graph-btn">Fit Graph</button><button className="btn btn-secondary" id="toggle-focus-btn" disabled>Focus Selection</button><button className="btn btn-secondary" id="studio-zoom-in" aria-label="Zoom in">+</button><button className="btn btn-secondary" id="studio-zoom-out" aria-label="Zoom out">−</button></div><p className="studio-map-caption" id="studio-map-caption">Domain and stage groups organize the overview. Select a question to read its local routes. Only arrows assert routes.</p><div id="graph-canvas" className="graph-canvas" tabIndex={-1} role="img" aria-label="Graph overview. Use the matching question list to select and inspect questions with a keyboard."></div>
          <div className="canvas-empty is-hidden" id="canvas-empty">
            No questions match the current filters.
          </div>
        </section>

        <aside className="tensor-panel studio-panel details-panel">
          <h2>Dataset and selection details</h2>
          <p className="detail-kv detail-text" id="diff-summary">
            Current dataset details appear after loading the graph.
          </p>

          <div className="detail-section">
            <h3>Current dataset</h3>
            <ul id="release-notes" className="release-notes"></ul>
          </div>

          <div className="detail-section" hidden>
            <h3>Historical metrics</h3>
            <p className="detail-empty">Historical structural diagnostics for this graph release.</p>
            <div className="metrics-mini-grid">
              <p className="detail-kv"><span>Version</span><strong id="metrics-version">n/a</strong></p>
              <p className="detail-kv"><span>Overall</span><strong id="metrics-overall">n/a</strong></p>
              <p className="detail-kv"><span>Structural Coverage</span><strong id="metrics-coverage">n/a</strong></p>
              <p className="detail-kv"><span>Routing</span><strong id="metrics-routing">n/a</strong></p>
              <p className="detail-kv"><span>Robustness</span><strong id="metrics-robustness">n/a</strong></p>
              <p className="detail-kv"><span>Delta vs Prior</span><strong id="metrics-delta">n/a</strong></p>
            </div>
            <p className="detail-kv detail-text" id="metrics-publish">Load a release version to view historical structural metrics.</p>
            <ul id="metrics-gates" className="release-notes"></ul>
          </div>

          <h2 id="studio-selection-heading" tabIndex={-1}>Selected question</h2><div className="cta-group"><button className="btn btn-secondary" id="studio-back-results">Back to search results</button><button className="btn btn-secondary" id="studio-show-map">Show on map</button></div>
          <div id="detail-empty" className="detail-empty">
            Select a node in the graph to inspect metadata and outgoing/incoming branches.
          </div>
          <div id="detail-node" className="is-hidden">
            <details><summary>Exact question identity</summary><p className="detail-kv"><span>ID</span><strong id="detail-id"></strong></p></details>
            <p className="detail-kv"><span>Category</span><strong id="detail-category"></strong></p>
            <p className="detail-kv"><span>Label</span><strong id="detail-label"></strong></p>
            <p className="detail-kv detail-text" id="detail-text"></p>

            <div className="detail-section">
              <h3>Outgoing Branches</h3>
              <ul id="detail-outgoing"></ul>
            </div>

            <div className="detail-section">
              <h3>Incoming Branches</h3>
              <ul id="detail-incoming"></ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
