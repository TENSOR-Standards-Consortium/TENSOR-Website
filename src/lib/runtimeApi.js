const FALLBACK_WORKER_ORIGIN = 'https://tensor-standards-consortium.org';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function resolveApiOrigins() {
  if (typeof window === 'undefined') {
    return [FALLBACK_WORKER_ORIGIN];
  }

  const configuredOrigin =
    typeof window.__TENSOR_API_ORIGIN === 'string' ? window.__TENSOR_API_ORIGIN.trim() : '';
  const currentOrigin = window.location.origin;

  return unique([configuredOrigin, currentOrigin, FALLBACK_WORKER_ORIGIN]);
}

export async function fetchApiJson(path, init = {}) {
  const origins = resolveApiOrigins();
  let lastError = null;

  for (const origin of origins) {
    const requestUrl = new URL(path, origin).toString();
    try {
      const response = await fetch(requestUrl, init);
      if (!response.ok) {
        throw new Error(`${requestUrl} returned ${response.status}`);
      }

      const data = await response.json();
      return {
        data,
        requestUrl,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`All API origins failed for ${path}`);
}
