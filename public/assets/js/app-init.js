(function initTensorClient() {
  const MAX_EVENTS = 32;
  let sentCount = 0;

  function canSend() {
    return sentCount < MAX_EVENTS;
  }

  function sendTelemetry(type, details, level) {
    if (!canSend()) {
      return;
    }

    sentCount += 1;

    fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type,
        level: level || 'info',
        page: window.location.pathname,
        details: details || {},
      }),
      keepalive: true,
    }).catch(function noop() {
      return null;
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', function onLoad() {
      navigator.serviceWorker.register('/sw.js').catch(function onError(error) {
        sendTelemetry('service-worker-register-failed', { message: String(error) }, 'warn');
      });
    });
  }

  function bindGlobalErrorEvents() {
    window.addEventListener('error', function onError(event) {
      sendTelemetry(
        'window-error',
        {
          message: event.message || 'Unknown error',
          file: event.filename || null,
          line: event.lineno || null,
          column: event.colno || null,
        },
        'error'
      );
    });

    window.addEventListener('unhandledrejection', function onRejection(event) {
      sendTelemetry(
        'unhandled-rejection',
        {
          reason: String(event.reason || 'Unknown rejection'),
        },
        'error'
      );
    });
  }

  function bindWebVitals() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    var lcpValue = 0;
    var clsValue = 0;

    try {
      var lcpObserver = new PerformanceObserver(function onEntry(entryList) {
        var entries = entryList.getEntries();
        var lastEntry = entries[entries.length - 1];
        if (lastEntry && typeof lastEntry.startTime === 'number') {
          lcpValue = Math.max(lcpValue, Math.round(lastEntry.startTime));
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {
      // ignored
    }

    try {
      var clsObserver = new PerformanceObserver(function onEntry(entryList) {
        entryList.getEntries().forEach(function each(entry) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') {
            clsValue += entry.value;
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (_) {
      // ignored
    }

    function flushVitals() {
      sendTelemetry('web-vitals', {
        lcp: lcpValue,
        cls: Number(clsValue.toFixed(4)),
      });
    }

    document.addEventListener('visibilitychange', function onVisibility() {
      if (document.visibilityState === 'hidden') {
        flushVitals();
      }
    });

    window.addEventListener('pagehide', flushVitals);
  }

  function sendPageView() {
    sendTelemetry('page-view', {
      path: window.location.pathname,
      referrer: document.referrer || null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  }

  function bindTrackedCtaClicks() {
    document.addEventListener('click', function onClick(event) {
      var target = event.target;
      if (!target || !(target instanceof Element)) {
        return;
      }

      var anchor = target.closest('a[data-telemetry-event]');
      if (!anchor) {
        return;
      }

      sendTelemetry('cta-click', {
        eventName: anchor.getAttribute('data-telemetry-event') || 'unknown',
        location: anchor.getAttribute('data-telemetry-location') || window.location.pathname,
        href: anchor.getAttribute('href') || null,
        label: anchor.textContent ? anchor.textContent.trim() : null,
      });
    });
  }

  window.__tensorTelemetry = {
    send: sendTelemetry,
  };

  registerServiceWorker();
  bindGlobalErrorEvents();
  bindWebVitals();
  bindTrackedCtaClicks();
  sendPageView();
})();
