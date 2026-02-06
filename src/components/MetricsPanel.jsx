import { useEffect, useMemo, useState } from 'react';
import { fetchApiJson } from '../lib/runtimeApi';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const HISTORY_LIMIT = 16;
const CHART_WIDTH = 720;
const CHART_HEIGHT = 220;
const CHART_PADDING = 20;

const SCORE_FIELDS = [
  { key: 'coverageScore', label: 'Coverage' },
  { key: 'routingScore', label: 'Routing' },
  { key: 'informationScore', label: 'Information' },
  { key: 'robustnessScore', label: 'Robustness' },
];

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatScore(value) {
  const numeric = asNumber(value);
  if (numeric === null) {
    return 'n/a';
  }

  return `${numeric.toFixed(1)}%`;
}

function formatDelta(value) {
  const numeric = asNumber(value);
  if (numeric === null) {
    return 'n/a';
  }

  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(2)} pts`;
}

function toTimelineValue(row) {
  const time = Date.parse(row?.generatedAt || '');
  return Number.isFinite(time) ? time : null;
}

function normalizeSeries(series) {
  if (!Array.isArray(series)) {
    return [];
  }

  const copy = series.filter((row) => row && typeof row === 'object');
  copy.sort((left, right) => {
    const leftTime = toTimelineValue(left);
    const rightTime = toTimelineValue(right);

    if (leftTime === null && rightTime === null) {
      return String(left?.version || '').localeCompare(String(right?.version || ''));
    }
    if (leftTime === null) {
      return -1;
    }
    if (rightTime === null) {
      return 1;
    }
    return leftTime - rightTime;
  });

  return copy;
}

function createTrendPolyline(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return '';
  }

  const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const divisor = Math.max(series.length - 1, 1);

  return series
    .map((row, index) => {
      const score = Math.max(0, Math.min(100, asNumber(row?.overallScore) ?? 0));
      const x = CHART_PADDING + (innerWidth * index) / divisor;
      const y = CHART_HEIGHT - CHART_PADDING - (innerHeight * score) / 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildMetricRow(latest, previous, key, label) {
  const value = asNumber(latest?.[key]);
  const previousValue = asNumber(previous?.[key]);
  const delta = value !== null && previousValue !== null ? value - previousValue : null;

  return {
    key,
    label,
    value,
    delta,
  };
}

function extractLatestFromPayload(payload) {
  const report = payload?.report || {};
  const summary = report?.summary || {};
  const resolvedVersion = payload?.resolvedVersion || report?.version || null;
  const generatedAt = report?.generatedAt || payload?.generatedAt || null;

  return {
    version: resolvedVersion,
    generatedAt,
    overallScore: asNumber(summary.overallScore),
    coverageScore: asNumber(summary.coverageScore),
    routingScore: asNumber(summary.routingScore),
    informationScore: asNumber(summary.informationScore),
    robustnessScore: asNumber(summary.robustnessScore),
    publishReady: report?.publishReady ?? null,
  };
}

function extractLatestFromSeries(series, fallbackVersion) {
  const latest = [...series]
    .reverse()
    .find((row) => (fallbackVersion ? row?.version === fallbackVersion : true));
  if (!latest) {
    return null;
  }

  return {
    version: latest.version || null,
    generatedAt: latest.generatedAt || null,
    overallScore: asNumber(latest.overallScore),
    coverageScore: asNumber(latest.coverageScore),
    routingScore: asNumber(latest.routingScore),
    informationScore: asNumber(latest.informationScore),
    robustnessScore: asNumber(latest.robustnessScore),
    publishReady: latest.publishReady ?? null,
  };
}

function formatTimestamp(value) {
  if (!value) {
    return 'unknown';
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return new Date(parsed).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MetricsPanel() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    latest: null,
    previous: null,
    history: [],
    manifestSource: '',
    sourceType: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      try {
        const [latestResult, historyResult] = await Promise.all([
          fetchApiJson('/api/metrics/latest', {
            headers: { accept: 'application/json' },
            cache: 'no-store',
          }),
          fetchApiJson('/api/metrics/history', {
            headers: { accept: 'application/json' },
            cache: 'no-store',
          }),
        ]);

        const latestPayload = latestResult.data;
        const historyPayload = historyResult.data;

        const historySeries = normalizeSeries(historyPayload?.report?.series || []).slice(-HISTORY_LIMIT);
        const latestFromSummary = extractLatestFromPayload(latestPayload);
        const latestFromSeries = extractLatestFromSeries(historySeries, latestFromSummary.version);
        const latest = latestFromSeries || latestFromSummary;

        if (!latest?.version) {
          throw new Error('Metrics payload did not include a release version');
        }

        const latestIndex = historySeries.findIndex((row) => row?.version === latest.version);
        const previous =
          latestIndex > 0
            ? historySeries[latestIndex - 1]
            : historySeries.length > 1
              ? historySeries[historySeries.length - 2]
              : null;

        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            latest,
            previous,
            history: historySeries,
            manifestSource:
              latestPayload?.manifestSource ||
              historyPayload?.manifestSource ||
              latestResult.requestUrl ||
              '',
            sourceType: latestPayload?.sourceType || historyPayload?.sourceType || 'remote',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: String(error),
          }));
        }
      }
    }

    loadMetrics();
    const timer = window.setInterval(loadMetrics, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const trendPoints = useMemo(() => createTrendPolyline(state.history), [state.history]);
  const metricRows = useMemo(() => {
    if (!state.latest) {
      return [];
    }

    return SCORE_FIELDS.map((field) =>
      buildMetricRow(state.latest, state.previous, field.key, field.label)
    );
  }, [state.latest, state.previous]);

  const overallDelta = useMemo(() => {
    const current = asNumber(state.latest?.overallScore);
    const previous = asNumber(state.previous?.overallScore);
    if (current === null || previous === null) {
      return null;
    }
    return current - previous;
  }, [state.latest, state.previous]);

  if (state.loading) {
    return (
      <section className="metrics-section container" aria-live="polite">
        <div className="metrics-shell">
          <p className="metrics-state">Loading live framework metrics…</p>
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="metrics-section container" aria-live="polite">
        <div className="metrics-shell">
          <p className="metrics-state">Metrics feed unavailable: {state.error}</p>
        </div>
      </section>
    );
  }

  if (!state.latest) {
    return (
      <section className="metrics-section container" aria-live="polite">
        <div className="metrics-shell">
          <p className="metrics-state">Metrics feed returned no data.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="metrics-section container" aria-live="polite">
      <div className="metrics-shell">
        <div className="metrics-heading">
          <p className="section-kicker">Release Telemetry</p>
          <h3>Always-updated quality trend across framework releases</h3>
          <p>
            Latest release <strong>{state.latest.version}</strong> · updated {formatTimestamp(state.latest.generatedAt)}
          </p>
        </div>

        <div className="metrics-kpi-grid">
          <article className="metrics-kpi-card">
            <span>Overall Score</span>
            <strong>{formatScore(state.latest.overallScore)}</strong>
            <p>{overallDelta === null ? 'No prior baseline yet' : `${formatDelta(overallDelta)} vs prior`}</p>
          </article>
          <article className="metrics-kpi-card">
            <span>Coverage</span>
            <strong>{formatScore(state.latest.coverageScore)}</strong>
            <p>Domain/archetype coverage quality</p>
          </article>
          <article className="metrics-kpi-card">
            <span>Routing</span>
            <strong>{formatScore(state.latest.routingScore)}</strong>
            <p>Deterministic branch integrity</p>
          </article>
          <article className="metrics-kpi-card">
            <span>Robustness</span>
            <strong>{formatScore(state.latest.robustnessScore)}</strong>
            <p>Reachability under perturbation</p>
          </article>
        </div>

        <div className="metrics-trend-card">
          <div className="metrics-trend-head">
            <h4>Overall Score Trend</h4>
            <p>{state.history.length} releases tracked</p>
          </div>
          <svg
            className="metrics-trend-chart"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="Overall quality score trend by release version"
          >
            <line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} />
            <line x1={CHART_PADDING} y1={CHART_PADDING} x2={CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} />
            {[0, 25, 50, 75, 100].map((value) => {
              const y = CHART_HEIGHT - CHART_PADDING - ((CHART_HEIGHT - CHART_PADDING * 2) * value) / 100;
              return <line key={value} className="metrics-gridline" x1={CHART_PADDING} y1={y} x2={CHART_WIDTH - CHART_PADDING} y2={y} />;
            })}
            {trendPoints ? <polyline points={trendPoints} /> : null}
            {state.history.map((row, index) => {
              const divisor = Math.max(state.history.length - 1, 1);
              const x = CHART_PADDING + ((CHART_WIDTH - CHART_PADDING * 2) * index) / divisor;
              const score = Math.max(0, Math.min(100, asNumber(row?.overallScore) ?? 0));
              const y = CHART_HEIGHT - CHART_PADDING - ((CHART_HEIGHT - CHART_PADDING * 2) * score) / 100;
              const title = `${row?.version || 'unknown'}: ${formatScore(row?.overallScore)}`;
              return (
                <circle key={`${row?.version || 'release'}-${index}`} cx={x} cy={y} r="4">
                  <title>{title}</title>
                </circle>
              );
            })}
          </svg>
          <div className="metrics-trend-labels" aria-hidden="true">
            {state.history.map((row, index) => (
              <span key={`${row?.version || 'release'}-${index}`}>{row?.version || '?'}</span>
            ))}
          </div>
        </div>

        <div className="metrics-row-grid">
          <article className="metrics-breakdown-card">
            <h4>Latest Score Breakdown</h4>
            <ul>
              {metricRows.map((row) => (
                <li key={row.key}>
                  <div className="metrics-row-head">
                    <span>{row.label}</span>
                    <strong>{formatScore(row.value)}</strong>
                    <em>{formatDelta(row.delta)}</em>
                  </div>
                  <div className="metrics-row-bar">
                    <span style={{ width: `${Math.max(0, Math.min(100, row.value ?? 0))}%` }}></span>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="metrics-release-card">
            <h4>Recent Releases</h4>
            <ul>
              {[...state.history].reverse().slice(0, 6).map((row) => (
                <li key={row?.version || `release-${row?.generatedAt || ''}`}>
                  <strong>{row?.version || 'unknown'}</strong>
                  <span>{formatScore(row?.overallScore)}</span>
                  <em>{row?.publishReady === true ? 'Publish ready' : row?.publishReady === false ? 'Not ready' : 'Reviewing'}</em>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="metrics-footnote">
          Source: {state.manifestSource || 'framework release channel'} ({state.sourceType || 'remote'})
        </p>
      </div>
    </section>
  );
}
