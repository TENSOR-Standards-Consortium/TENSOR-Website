import { useEffect, useMemo, useState } from 'react';
import { fetchReleaseManifest } from '../lib/frameworkDataApi';

function normalizeReleasesPayload(payload) {
  if (!payload || !Array.isArray(payload.releases)) {
    return {
      sourceName: null,
      releases: [],
    };
  }

  return {
    sourceName: payload.sourceName || payload.source || null,
    releases: payload.releases,
  };
}

function formatDate(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value || 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(timestamp));
}

export default function ReleaseFeed({ kind = 'graph' }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    sourceName: null,
    releases: [],
  });

  const label = kind === 'schema' ? 'Schema' : 'Graph';

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data: payload, requestUrl } = await fetchReleaseManifest({
          headers: {
            accept: 'application/json',
          },
        });
        const normalized = normalizeReleasesPayload(payload);

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: null,
          sourceName: normalized.sourceName || requestUrl,
          releases: normalized.releases,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        }));
      }
    };

    load();
    const timer = window.setInterval(load, 4 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const sortedReleases = useMemo(() => {
    return [...state.releases].sort((left, right) => {
      const leftTime = new Date(left?.releasedAt || 0).getTime();
      const rightTime = new Date(right?.releasedAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [state.releases]);

  if (state.loading) {
    return <p className="release-feed-state">Loading live release index...</p>;
  }

  if (state.error) {
    return <p className="release-feed-state">Release index unavailable: {state.error}</p>;
  }

  if (sortedReleases.length === 0) {
    return <p className="release-feed-state">No releases were published in the channel yet.</p>;
  }

  return (
    <div className="release-feed">
      <p className="release-feed-meta">
        Source: {state.sourceName || 'Unknown'} · auto-refreshes every 4 minutes
      </p>

      <ul className="release-feed-list">
        {sortedReleases.map((release) => {
          const version = kind === 'schema' ? release.schemaVersion : release.graphVersion;
          const url = kind === 'schema' ? release.schemaUrl || release.schemaPath : release.graphUrl || release.graphPath;

          return (
            <li key={`${release.id}-${kind}`} className="release-feed-item">
              <div>
                <strong>{release.displayName || release.id}</strong>
                <p>{label} version {version || 'unknown'} · Released {formatDate(release.releasedAt)}</p>
              </div>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Open {label}
                </a>
              ) : (
                <span>Link unavailable</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
