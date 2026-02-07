import { useEffect, useMemo, useState } from 'react';
import { fetchMetricsHistoryChannel, fetchMetricsLatestChannel } from '../lib/frameworkDataApi';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;

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

function normalizeLatestPayload(payload) {
  if (payload?.report?.summary) {
    return payload.report;
  }
  if (payload?.summary) {
    return payload;
  }
  return null;
}

function normalizeHistoryPayload(payload) {
  if (payload?.report && Array.isArray(payload.report.series)) {
    return payload.report;
  }
  if (Array.isArray(payload?.series)) {
    return payload;
  }
  return { series: [] };
}

export default function CompactMetricsWidget({ title = 'Latest Framework Metrics' }) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    latest: null,
    previous: null,
    version: null,
    source: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [latestResult, historyResult] = await Promise.all([
          fetchMetricsLatestChannel({
            headers: { accept: 'application/json' },
            cache: 'no-store',
          }),
          fetchMetricsHistoryChannel({
            headers: { accept: 'application/json' },
            cache: 'no-store',
          }),
        ]);

        const latestReport = normalizeLatestPayload(latestResult.data);
        const history = normalizeHistoryPayload(historyResult.data).series || [];
        const latestVersion = latestResult.data?.resolvedVersion || latestReport?.version || null;
        const latestIndex = history.findIndex((row) => row?.version === latestVersion);
        const previous = latestIndex > 0 ? history[latestIndex - 1] : null;

        if (!latestReport?.summary) {
          throw new Error('Metrics summary unavailable');
        }

        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          error: '',
          latest: latestReport.summary,
          previous,
          version: latestVersion,
          source: latestResult.data?.manifestSource || latestResult.requestUrl || '',
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState((previous) => ({
          ...previous,
          loading: false,
          error: String(error),
        }));
      }
    }

    load();
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const overallDelta = useMemo(() => {
    const current = asNumber(state.latest?.overallScore);
    const previous = asNumber(state.previous?.overallScore);
    if (current === null || previous === null) {
      return null;
    }
    return current - previous;
  }, [state.latest, state.previous]);

  return (
    <section className="compact-metrics-card">
      <p className="section-kicker">Release Telemetry</p>
      <h3>{title}</h3>
      {state.loading ? <p className="compact-metrics-state">Loading metrics...</p> : null}
      {!state.loading && state.error ? <p className="compact-metrics-state">Unavailable: {state.error}</p> : null}
      {!state.loading && !state.error ? (
        <div className="compact-metrics-grid">
          <div>
            <span>Version</span>
            <strong>{state.version || 'n/a'}</strong>
          </div>
          <div>
            <span>Overall</span>
            <strong>{formatPercent(state.latest?.overallScore)}</strong>
          </div>
          <div>
            <span>Coverage</span>
            <strong>{formatPercent(state.latest?.coverageScore)}</strong>
          </div>
          <div>
            <span>Routing</span>
            <strong>{formatPercent(state.latest?.routingScore)}</strong>
          </div>
          <div>
            <span>Robustness</span>
            <strong>{formatPercent(state.latest?.robustnessScore)}</strong>
          </div>
          <div>
            <span>Delta</span>
            <strong>
              {overallDelta === null
                ? 'n/a'
                : `${overallDelta > 0 ? '+' : ''}${overallDelta.toFixed(2)} pts`}
            </strong>
          </div>
        </div>
      ) : null}
      <p className="compact-metrics-meta">
        Source: {state.source || 'framework channel'} · <a href="/metrics/">Open full dashboard</a>
      </p>
    </section>
  );
}
