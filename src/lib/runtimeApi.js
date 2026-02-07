const BUILD_TIME_API_ORIGIN = import.meta.env.PUBLIC_TENSOR_API_ORIGIN
  ? String(import.meta.env.PUBLIC_TENSOR_API_ORIGIN).trim()
  : '';
const BUILD_TIME_USE_SAME_ORIGIN_API = String(
  import.meta.env.PUBLIC_TENSOR_USE_SAME_ORIGIN_API || ''
).toLowerCase() === 'true';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function resolveApiOrigins() {
  const configuredRuntimeOrigin =
    typeof window !== 'undefined' && typeof window.__TENSOR_API_ORIGIN === 'string'
      ? window.__TENSOR_API_ORIGIN.trim()
      : '';
  const runtimeUseSameOrigin =
    typeof window !== 'undefined' &&
    (window.__TENSOR_USE_SAME_ORIGIN_API === true ||
      String(window.__TENSOR_USE_SAME_ORIGIN_API || '').toLowerCase() === 'true');

  if (typeof window === 'undefined') {
    return unique([configuredRuntimeOrigin, BUILD_TIME_API_ORIGIN]);
  }

  const origins = unique([configuredRuntimeOrigin, BUILD_TIME_API_ORIGIN]);
  if (origins.length > 0) {
    return origins;
  }

  if (runtimeUseSameOrigin || BUILD_TIME_USE_SAME_ORIGIN_API) {
    return unique([window.location.origin]);
  }

  return [];
}

export async function fetchApiJson(path, init = {}) {
  const origins = resolveApiOrigins();
  if (origins.length === 0) {
    throw new Error(`No API origins configured for ${path}`);
  }
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
