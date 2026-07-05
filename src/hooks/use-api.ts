'use client';
import { useState, useEffect, useCallback } from 'react';
import { dataGet, dataAction } from '@/lib/client-api';
import type { Paginated } from '@/types/dashboard';

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
      setData(await dataGet<T>(path));
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
  return dataAction(path, method, data);
}

export interface PaginatedListState<T> {
  items: T[];
  count: number;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Paginated DRF list — owns the page state and builds the query string with
 * the REAL DRF params (`?page_size=` / `?page=`; `?limit=` is silently
 * ignored by PageNumberPagination — audit GLOBAL-1). Pair with
 * `<Pagination />` + `<ErrorState />` on every list page (PERF-1, UX-ERR-1).
 */
export function usePaginatedList<T>(
  endpoint: string | null,
  pageSize = 20,
): PaginatedListState<T> {
  const [page, setPage] = useState(1);
  let path: string | null = null;
  if (endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    path = `${endpoint}${sep}page_size=${pageSize}${page > 1 ? `&page=${page}` : ''}`;
  }
  const { data, loading, error, refetch } = useApi<Paginated<T> | T[]>(path);

  // Tolerate non-paginated (bare array) responses from hand-rolled APIViews.
  const items = Array.isArray(data) ? data : data?.results ?? [];
  const count = Array.isArray(data) ? data.length : data?.count ?? 0;

  return {
    items,
    count,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    loading,
    error,
    refetch,
  };
}
