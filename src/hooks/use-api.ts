'use client';
import { useState, useEffect, useCallback } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!path) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/data?path=${encodeURIComponent(path)}`);
      if (res.status === 401) { window.location.href = '/signin'; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

export async function apiAction(
  path: string,
  method = 'POST',
  data?: unknown,
): Promise<unknown> {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, data }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const r = result as Record<string, unknown> | null;
    throw new Error(String(r?.detail ?? r?.error ?? `HTTP ${res.status}`));
  }
  return result;
}