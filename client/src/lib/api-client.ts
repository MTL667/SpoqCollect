let tokenAccessor: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokenAccessor(fn: () => string | null) {
  tokenAccessor = fn;
}

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenAccessor?.();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }

  const json = await res.json();

  if (!res.ok) {
    const errBody = json as { error?: { code?: string; message?: string } };
    throw new Error(errBody.error?.message ?? 'Request failed');
  }

  return (json as { data: T }).data;
}
