import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(`API error ${status}`);
    this.name = 'ApiError';
  }
}

export function formatApiError(data: unknown, fallback = 'Something went wrong.'): string {
  if (!data || typeof data !== 'object') return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === 'string') return obj.detail;
  const messages: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'org_slug' || key === 'redirect_url') continue;
    if (Array.isArray(val)) messages.push(...val.map(String));
    else if (typeof val === 'string') messages.push(val);
  }
  return messages.length > 0 ? messages.join(' ') : fallback;
}

// Unauthenticated requests — login, org branding, contact form
export async function publicFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}