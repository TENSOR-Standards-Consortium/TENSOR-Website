import { useEffect, useMemo, useState } from 'react';
import { fetchApiJson } from '../lib/runtimeApi';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;

function extractVersion(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.latestGraphVersion === 'string') {
    return payload.latestGraphVersion.trim();
  }

  return '';
}

export default function LiveVersionBadge({ fallbackVersion = '0.20250506' }) {
  const [state, setState] = useState({
    version: fallbackVersion,
    sourceName: 'local fallback',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadVersion() {
      try {
        const { data: payload, requestUrl } = await fetchApiJson('/api/version', {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        });
        const version = extractVersion(payload);
        if (!version) {
          throw new Error('Version payload missing latestGraphVersion');
        }

        if (!cancelled) {
          setState({
            version,
            sourceName: payload.sourceName || requestUrl || 'release manifest',
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
          }));
        }
      }
    }

    loadVersion();
    const timer = window.setInterval(loadVersion, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const label = useMemo(() => `Version ${state.version}`, [state.version]);
  const title = state.loading
    ? `Loading release version`
    : `Release version source: ${state.sourceName}`;

  return (
    <span className="btn version-label" title={title} aria-live="polite">
      {label}
    </span>
  );
}
