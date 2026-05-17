import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMetricsHistoryChannel,
  fetchMetricsReportChannel,
  fetchReleaseManifest,
} from '../lib/frameworkDataApi';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const CHART_WIDTH = 980;
const CHART_HEIGHT = 260;
const CHART_PADDING = 26;

const TREND_FIELDS = [
  { key: 'overallScore', label: 'Overall', className: 'is-overall' },
  { key: 'coverageScore', label: 'Coverage', className: 'is-coverage' },
  { key: 'routingScore', label: 'Routing', className: 'is-routing' },
  { key: 'robustnessScore', label: 'Robustness', className: 'is-robustness' },
];

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPercent(value) {
  const number = asNumber(value);
  if (number === null) {
    return 'n/a';
  }
  return `${number.toFixed(1)}%`;
}

function normalizeReleasesPayload(payload) {
  if (!payload || !Array.isArray(payload.releases)) {
    return {
      latestGraphVersion: null,
      releases: [],
      sourceName: null,
    };
  }

  return {
    latestGraphVersion: payload.latestGraphVersion || null,
    releases: payload.releases,
    sourceName: payload.sourceName || payload.source || null,
  };
}

function normalizeHistoryPayload(payload) {
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

function normalizeReportPayload(payload) {
  const candidate =
    payload?.report && typeof payload.report === 'object'
      ? payload.report
      : payload && typeof payload === 'object'
        ? payload
        : null;

  if (!candidate) {
    return null;
  }

  if (candidate.summary && typeof candidate.summary === 'object') {
    return candidate;
  }

  if (Array.isArray(candidate.domains) || Array.isArray(candidate.dimensions)) {
    return candidate;
  }

  if (candidate.metrics && typeof candidate.metrics === 'object') {
    return candidate;
  }

  return null;
}

function resolveVersionTimestamp(row) {
  const releaseAt = Date.parse(row?.releasedAt || '');
  if (Number.isFinite(releaseAt)) {
    return releaseAt;
  }

  const generatedAt = Date.parse(row?.generatedAt || '');
  if (Number.isFinite(generatedAt)) {
    return generatedAt;
  }

  return 0;
}

function buildLinePoints(series, key) {
  if (!Array.isArray(series) || series.length === 0) {
    return '';
  }

  const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const divisor = Math.max(series.length - 1, 1);

  return series
    .map((row, index) => {
      const value = asNumber(row?.[key]);
      const score = value === null ? 0 : Math.max(0, Math.min(100, value));
      const x = CHART_PADDING + (innerWidth * index) / divisor;
      const y = CHART_HEIGHT - CHART_PADDING - (innerHeight * score) / 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatDateTime(value) {
  if (!value) {
    return 'unknown';
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return String(value);
  }

  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function collectArchetypes(domains) {
  const archetypes = new Set();
  for (const domain of domains || []) {
    for (const key of Object.keys(domain?.archetypes || {})) {
      archetypes.add(key);
    }
  }
  return Array.from(archetypes).sort((left, right) => left.localeCompare(right));
}

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r\n]/;

function escapeCsvCell(value) {
  const rawText = String(value ?? '');
  const text = CSV_FORMULA_PREFIX.test(rawText) ? `'${rawText}` : rawText;
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function downloadText(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function MetricsDashboard() {
  const trendSvgRef = useRef(null);

  const [baseState, setBaseState] = useState({
    loading: true,
    error: '',
    releases: [],
    history: [],
    latestVersion: '',
    sourceName: '',
  });
  const [selectedVersion, setSelectedVersion] = useState('');
  const [reportState, setReportState] = useState({
    loading: false,
    error: '',
    math: null,
    quality: null,
    coverage: null,
    sourceName: '',
  });
  const [pngExporting, setPngExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBase() {
      try {
        const [releaseResult, historyResult] = await Promise.all([
          fetchReleaseManifest({
            headers: { accept: 'application/json' },
            cache: 'no-store',
          }),
          fetchMetricsHistoryChannel({
            headers: { accept: 'application/json' },
            cache: 'no-store',
          }),
        ]);

        const normalizedRelease = normalizeReleasesPayload(releaseResult.data);
        const normalizedHistory = normalizeHistoryPayload(historyResult.data);
        const sortedReleases = [...normalizedRelease.releases].sort(
          (left, right) => resolveVersionTimestamp(right) - resolveVersionTimestamp(left)
        );
        const sortedHistory = [...(normalizedHistory.series || [])].sort(
          (left, right) => resolveVersionTimestamp(left) - resolveVersionTimestamp(right)
        );

        const fallbackLatestFromHistory =
          sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1]?.version || '' : '';
        const computedLatestVersion =
          normalizedRelease.latestGraphVersion || fallbackLatestFromHistory || sortedReleases[0]?.graphVersion || '';

        if (cancelled) {
          return;
        }

        setBaseState({
          loading: false,
          error: '',
          releases: sortedReleases,
          history: sortedHistory,
          latestVersion: computedLatestVersion,
          sourceName: normalizedRelease.sourceName || releaseResult.requestUrl || '',
        });

        setSelectedVersion((current) => {
          if (
            current &&
            sortedReleases.some((release) => release?.graphVersion === current) &&
            sortedHistory.some((row) => row?.version === current)
          ) {
            return current;
          }
          return computedLatestVersion;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setBaseState((previous) => ({
          ...previous,
          loading: false,
          error: String(error),
        }));
      }
    }

    loadBase();
    const timer = window.setInterval(loadBase, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedVersion) {
      return;
    }

    let cancelled = false;

    async function loadReports() {
      setReportState((previous) => ({
        ...previous,
        loading: true,
        error: '',
      }));

      const reportRequests = [
        fetchMetricsReportChannel(selectedVersion, 'math-assurance', {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        }),
        fetchMetricsReportChannel(selectedVersion, 'graph-quality', {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        }),
        fetchMetricsReportChannel(selectedVersion, 'coverage-matrix', {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        }),
      ];

      const [mathResult, qualityResult, coverageResult] = await Promise.allSettled(reportRequests);

      if (cancelled) {
        return;
      }

      if (mathResult.status !== 'fulfilled') {
        setReportState({
          loading: false,
          error: String(mathResult.reason),
          math: null,
          quality: null,
          coverage: null,
          sourceName: '',
        });
        return;
      }

      const mathReport = normalizeReportPayload(mathResult.value.data);
      const qualityReport =
        qualityResult.status === 'fulfilled' ? normalizeReportPayload(qualityResult.value.data) : null;
      const coverageReport =
        coverageResult.status === 'fulfilled' ? normalizeReportPayload(coverageResult.value.data) : null;

      if (!mathReport) {
        setReportState({
          loading: false,
          error: 'Metrics report payload missing summary data',
          math: null,
          quality: qualityReport,
          coverage: coverageReport,
          sourceName: '',
        });
        return;
      }

      setReportState({
        loading: false,
        error: '',
        math: mathReport,
        quality: qualityReport,
        coverage: coverageReport,
        sourceName: mathResult.value.requestUrl || '',
      });
    }

    loadReports();
    const timer = window.setInterval(loadReports, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedVersion]);

  const historyMap = useMemo(() => {
    const map = new Map();
    for (const row of baseState.history) {
      if (row?.version) {
        map.set(row.version, row);
      }
    }
    return map;
  }, [baseState.history]);

  const selectedHistoryRow = historyMap.get(selectedVersion) || null;
  const selectedHistoryIndex = baseState.history.findIndex((row) => row?.version === selectedVersion);
  const previousHistoryRow = selectedHistoryIndex > 0 ? baseState.history[selectedHistoryIndex - 1] : null;

  const trendLines = useMemo(() => {
    const lines = {};
    for (const field of TREND_FIELDS) {
      lines[field.key] = buildLinePoints(baseState.history, field.key);
    }
    return lines;
  }, [baseState.history]);

  const matrixDomains = reportState.coverage?.domains || [];
  const archetypeColumns = useMemo(() => collectArchetypes(matrixDomains), [matrixDomains]);
  const gateChecks = reportState.math?.monitoring?.publishGates?.gates || [];
  const failedGateChecks = gateChecks.filter((gate) => gate?.passed === false);
  const passedGateChecks = gateChecks.filter((gate) => gate?.passed === true);

  const overallDelta = useMemo(() => {
    const current = asNumber(selectedHistoryRow?.overallScore ?? reportState.math?.summary?.overallScore);
    const previous = asNumber(previousHistoryRow?.overallScore);
    if (current === null || previous === null) {
      return null;
    }
    return current - previous;
  }, [selectedHistoryRow, previousHistoryRow, reportState.math]);

  const exportHistoryCsv = () => {
    const rows = [
      [
        'version',
        'generatedAt',
        'overallScore',
        'coverageScore',
        'routingScore',
        'informationScore',
        'robustnessScore',
        'publishReady',
        'failedGateCount',
      ],
    ];

    for (const row of baseState.history) {
      rows.push([
        row?.version || '',
        row?.generatedAt || '',
        row?.overallScore ?? '',
        row?.coverageScore ?? '',
        row?.routingScore ?? '',
        row?.informationScore ?? '',
        row?.robustnessScore ?? '',
        row?.publishReady ?? '',
        row?.failedGateCount ?? '',
      ]);
    }

    downloadText('tensor-metrics-history.csv', toCsv(rows), 'text/csv;charset=utf-8');
  };

  const exportMatrixCsv = () => {
    if (matrixDomains.length === 0) {
      return;
    }

    const rows = [['version', selectedVersion || '']];
    rows.push(['domain', ...archetypeColumns]);

    for (const domain of matrixDomains) {
      rows.push([
        domain?.domain || 'Unknown',
        ...archetypeColumns.map((column) => domain?.archetypes?.[column] ?? 0),
      ]);
    }

    downloadText(`tensor-coverage-matrix-${selectedVersion || 'latest'}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  const exportGateCsv = () => {
    const rows = [['version', 'gateId', 'passed', 'metric', 'description', 'threshold', 'value']];

    for (const gate of gateChecks) {
      rows.push([
        selectedVersion || '',
        gate?.id || '',
        gate?.passed ?? '',
        gate?.metric || '',
        gate?.description || '',
        gate?.threshold ?? '',
        gate?.value ?? '',
      ]);
    }

    downloadText(`tensor-gates-${selectedVersion || 'latest'}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  const exportTrendPng = async () => {
    const svgElement = trendSvgRef.current;
    if (!svgElement || pngExporting) {
      return;
    }

    setPngExporting(true);
    try {
      const serialized = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.decoding = 'sync';

      const loaded = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      image.src = svgUrl;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = CHART_WIDTH;
      canvas.height = CHART_HEIGHT;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas context unavailable');
      }

      context.fillStyle = '#111315';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(svgUrl);

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) {
        throw new Error('PNG export failed');
      }

      const pngUrl = URL.createObjectURL(pngBlob);
      const anchor = document.createElement('a');
      anchor.href = pngUrl;
      anchor.download = `tensor-metrics-trend-${selectedVersion || 'latest'}.png`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(pngUrl);
    } catch {
      // Ignore export errors silently and keep dashboard operational.
    } finally {
      setPngExporting(false);
    }
  };

  if (baseState.loading) {
    return (
      <section className="metrics-dashboard container">
        <div className="metrics-dashboard-shell">
          <p className="metrics-state">Loading metrics index...</p>
        </div>
      </section>
    );
  }

  if (baseState.error) {
    return (
      <section className="metrics-dashboard container">
        <div className="metrics-dashboard-shell">
          <p className="metrics-state">Metrics index unavailable: {baseState.error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="metrics-dashboard container">
      <div className="metrics-dashboard-shell">
        <div className="metrics-dashboard-head">
          <p className="section-kicker">Framework Assurance</p>
          <h2>Release Quality & Coverage Dashboard</h2>
          <p>
            Tracks current and historical release quality from framework-generated assurance artifacts.
          </p>
        </div>

        <div className="metrics-dashboard-controls">
          <label htmlFor="metrics-version-select">Release version</label>
          <select
            id="metrics-version-select"
            value={selectedVersion}
            onChange={(event) => setSelectedVersion(event.target.value)}
          >
            {baseState.releases.map((release) => {
              const version = release?.graphVersion || '';
              return (
                <option key={release?.id || version} value={version}>
                  {release?.displayName || version}
                </option>
              );
            })}
          </select>
          <span className="metrics-dashboard-source">Source: {baseState.sourceName || 'release channel'}</span>
        </div>
        <div className="metrics-dashboard-export-row">
          <button
            type="button"
            className="metrics-export-btn"
            onClick={exportHistoryCsv}
            disabled={baseState.history.length === 0}
          >
            Export History CSV
          </button>
          <button
            type="button"
            className="metrics-export-btn"
            onClick={exportGateCsv}
            disabled={gateChecks.length === 0}
          >
            Export Gates CSV
          </button>
          <button
            type="button"
            className="metrics-export-btn"
            onClick={exportMatrixCsv}
            disabled={matrixDomains.length === 0}
          >
            Export Matrix CSV
          </button>
          <button
            type="button"
            className="metrics-export-btn"
            onClick={exportTrendPng}
            disabled={pngExporting || baseState.history.length === 0}
          >
            {pngExporting ? 'Exporting PNG...' : 'Export Trend PNG'}
          </button>
        </div>

        {reportState.loading ? <p className="metrics-state">Loading selected release reports...</p> : null}
        {reportState.error ? <p className="metrics-state">Selected release unavailable: {reportState.error}</p> : null}

        <div className="metrics-dashboard-kpis">
          <article className="metrics-kpi-card">
            <span>Overall</span>
            <strong>{formatPercent(reportState.math?.summary?.overallScore)}</strong>
            <p>{overallDelta === null ? 'No prior baseline' : `${overallDelta > 0 ? '+' : ''}${overallDelta.toFixed(2)} pts vs prior`}</p>
          </article>
          <article className="metrics-kpi-card">
            <span>Coverage</span>
            <strong>{formatPercent(reportState.math?.summary?.coverageScore)}</strong>
            <p>Domain/archetype completeness</p>
          </article>
          <article className="metrics-kpi-card">
            <span>Routing</span>
            <strong>{formatPercent(reportState.math?.summary?.routingScore)}</strong>
            <p>Deterministic decision integrity</p>
          </article>
          <article className="metrics-kpi-card">
            <span>Robustness</span>
            <strong>{formatPercent(reportState.math?.summary?.robustnessScore)}</strong>
            <p>Reachability under perturbation</p>
          </article>
        </div>

        <div className="metrics-dashboard-grid">
          <article className="metrics-block metrics-block-wide">
            <h3>Domain × Archetype Coverage Matrix</h3>
            <p className="metrics-block-meta">
              Source artifact: {reportState.sourceName || 'release report channel'}
            </p>
            <div className="metrics-table-wrap">
              <table className="metrics-table matrix-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    {archetypeColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixDomains.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, archetypeColumns.length + 1)}>
                        No coverage matrix artifact available for this release.
                      </td>
                    </tr>
                  ) : (
                    matrixDomains.map((domain) => (
                      <tr key={domain?.domain || 'domain'}>
                        <td>{domain?.domain || 'Unknown'}</td>
                        {archetypeColumns.map((column) => (
                          <td key={`${domain?.domain || 'domain'}-${column}`}>
                            {domain?.archetypes?.[column] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="metrics-block">
            <h3>Publish Gate Timeline</h3>
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Overall</th>
                  <th>Publish Ready</th>
                  <th>Failed Gates</th>
                </tr>
              </thead>
              <tbody>
                {baseState.history.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No timeline data available.</td>
                  </tr>
                ) : (
                  [...baseState.history].reverse().map((row) => (
                    <tr key={row?.version || row?.generatedAt}>
                      <td>{row?.version || 'n/a'}</td>
                      <td>{formatPercent(row?.overallScore)}</td>
                      <td>
                        {row?.publishReady === true
                          ? 'Yes'
                          : row?.publishReady === false
                            ? 'No'
                            : 'Pending'}
                      </td>
                      <td>{row?.failedGateCount ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>

          <article className="metrics-block">
            <h3>Selected Release Gate Results</h3>
            <p className="metrics-block-meta">
              Version {selectedVersion || 'n/a'} · generated {formatDateTime(reportState.math?.generatedAt)}
            </p>
            {gateChecks.length === 0 ? (
              <p className="metrics-block-meta">No gate detail artifact is available for this release.</p>
            ) : (
              <>
                <div className="metrics-gate-summary">
                  <span className="metrics-gate-pill">Total {gateChecks.length}</span>
                  <span className="metrics-gate-pill metrics-gate-pill-fail">Failed {failedGateChecks.length}</span>
                  <span className="metrics-gate-pill metrics-gate-pill-pass">Passed {passedGateChecks.length}</span>
                </div>

                {failedGateChecks.length > 0 ? (
                  <ul className="metrics-gate-list metrics-gate-list-fail">
                    {failedGateChecks.map((gate) => (
                      <li key={gate?.id || gate?.metric} className="metrics-gate-fail">
                        <strong>FAIL</strong>
                        <span>{gate?.id || gate?.metric || 'gate'}</span>
                        <em>{gate?.description || gate?.metric || 'No description'}</em>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="metrics-block-meta">No failing checks for this release.</p>
                )}

                {passedGateChecks.length > 0 ? (
                  <details className="metrics-gate-disclosure">
                    <summary>Show passing checks ({passedGateChecks.length})</summary>
                    <ul className="metrics-gate-list">
                      {passedGateChecks.map((gate) => (
                        <li key={gate?.id || gate?.metric} className="metrics-gate-pass">
                          <strong>PASS</strong>
                          <span>{gate?.id || gate?.metric || 'gate'}</span>
                          <em>{gate?.description || gate?.metric || 'No description'}</em>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </>
            )}
          </article>
        </div>

        <article className="metrics-trend-card">
          <div className="metrics-trend-head">
            <h3>Historical Trend</h3>
            <p>{baseState.history.length} releases in history</p>
          </div>
          <svg
            ref={trendSvgRef}
            className="metrics-trend-chart metrics-trend-chart-lg"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="Historical trend of overall, coverage, routing, and robustness scores"
          >
            <line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} />
            <line x1={CHART_PADDING} y1={CHART_PADDING} x2={CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} />
            {[0, 25, 50, 75, 100].map((value) => {
              const y = CHART_HEIGHT - CHART_PADDING - ((CHART_HEIGHT - CHART_PADDING * 2) * value) / 100;
              return <line key={value} className="metrics-gridline" x1={CHART_PADDING} y1={y} x2={CHART_WIDTH - CHART_PADDING} y2={y} />;
            })}
            {TREND_FIELDS.map((field) =>
              trendLines[field.key] ? (
                <polyline key={field.key} className={field.className} points={trendLines[field.key]} />
              ) : null
            )}
          </svg>
          <div className="metrics-trend-legend">
            {TREND_FIELDS.map((field) => (
              <span key={field.key} className={field.className}>
                {field.label}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
