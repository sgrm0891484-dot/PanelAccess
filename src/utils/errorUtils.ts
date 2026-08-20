/**
 * Safe Error Extraction Utility
 * Guarantees a human-readable string is always returned.
 * Prevents '[object Object]' from ever being rendered in the UI.
 */

export function extractErrorMessage(error: unknown, defaultFallback: string = 'Unable to authenticate at this time'): string {
  if (error === null || error === undefined) {
    return defaultFallback;
  }

  // 1. If error is already a string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed || trimmed === '[object Object]' || trimmed === '[object Response]') {
      return defaultFallback;
    }
    // Attempt JSON parse in case server returned a stringified JSON payload
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractErrorMessage(parsed, defaultFallback);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  // 2. If error is an Error instance
  if (error instanceof Error) {
    const msg = error.message ? error.message.trim() : '';
    if (msg && msg !== '[object Object]' && msg !== '[object Response]') {
      // Check if message is JSON string
      if (msg.startsWith('{') && msg.endsWith('}')) {
        try {
          const parsed = JSON.parse(msg);
          return extractErrorMessage(parsed, defaultFallback);
        } catch {
          return msg;
        }
      }
      return msg;
    }
    // Check if error has attached data property (like ApiError)
    if ('data' in error && (error as any).data) {
      return extractErrorMessage((error as any).data, defaultFallback);
    }
  }

  // 3. If error is an object (API JSON error response, axios error, fetch error, etc.)
  if (typeof error === 'object') {
    const obj = error as Record<string, any>;

    // Case: { message: "..." }
    if (typeof obj.message === 'string' && obj.message.trim() && obj.message !== '[object Object]') {
      return obj.message.trim();
    }

    // Case: { error: "..." }
    if (typeof obj.error === 'string' && obj.error.trim() && obj.error !== '[object Object]') {
      return obj.error.trim();
    }

    // Case: { error: { message: "..." } } or nested error object
    if (obj.error && typeof obj.error === 'object') {
      const nested = extractErrorMessage(obj.error, '');
      if (nested && nested !== defaultFallback) {
        return nested;
      }
    }

    // Case: { data: { message: "..." } } or { data: { error: "..." } }
    if (obj.data && typeof obj.data === 'object') {
      const nestedData = extractErrorMessage(obj.data, '');
      if (nestedData && nestedData !== defaultFallback) {
        return nestedData;
      }
    }

    // Case: { errors: [ { message: "..." } ] }
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const firstErr = obj.errors[0];
      const nestedArr = extractErrorMessage(firstErr, '');
      if (nestedArr && nestedArr !== defaultFallback) {
        return nestedArr;
      }
    }

    // Case: { error_description: "..." }
    if (typeof obj.error_description === 'string' && obj.error_description.trim()) {
      return obj.error_description.trim();
    }

    // Case: { statusText: "..." }
    if (typeof obj.statusText === 'string' && obj.statusText.trim()) {
      return obj.statusText.trim();
    }
  }

  return defaultFallback;
}
