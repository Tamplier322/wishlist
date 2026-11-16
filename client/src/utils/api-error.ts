interface ApiErrorPayload {
  message?: unknown;
  code?: unknown;
}

function readPayload(error: unknown): ApiErrorPayload | null {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null) return data as ApiErrorPayload;
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = readPayload(error);
  if (data && typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): string | null {
  const data = readPayload(error);
  return data && typeof data.code === 'string' ? data.code : null;
}

export function isRateLimited(error: unknown): boolean {
  return getApiErrorCode(error) === 'RATE_LIMITED';
}
