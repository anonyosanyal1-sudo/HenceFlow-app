import { supabase } from './supabase';

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  const token = await getToken();
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let message = `${method} ${path} → ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail ?? err.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown, params?: Record<string, string>) =>
    request<T>('POST', path, body, params),
  patch: <T>(path: string, body: unknown, params?: Record<string, string>) =>
    request<T>('PATCH', path, body, params),
  put: <T>(path: string, body: unknown, params?: Record<string, string>) =>
    request<T>('PUT', path, body, params),
  delete: <T>(path: string, params?: Record<string, string>) =>
    request<T>('DELETE', path, undefined, params),
};
