import type { ErrorResponse } from './types';

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const AUTH_STORAGE_KEY = 'll-auth';
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS === 'true';

export class ApiError extends Error {
  readonly body: ErrorResponse;
  constructor(body: ErrorResponse) {
    super(body.message);
    this.name = 'ApiError';
    this.body = body;
  }
  get status(): number { return this.body.status; }
  get code(): string { return this.body.code; }
}

export function readStoredAuth<T>(): T | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const token = readStoredAuth<{ token: string }>()?.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK',
      message: 'Cannot reach the LoanLens API. Is the backend running?',
      timestamp: new Date().toISOString(),
    });
  }

  if (res.status === 401 && token) {
    window.dispatchEvent(new Event('ll:unauthorized'));
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      (data as ErrorResponse | null) ?? {
        status: res.status,
        code: 'INTERNAL',
        message: res.statusText,
        timestamp: new Date().toISOString(),
      }
    );
  }
  return data as T;
}
