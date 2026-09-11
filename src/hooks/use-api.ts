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

/**
 * Fetch EVERY page of a DRF list and return the flattened result.
 *
 * For views that must show a COMPLETE set rather than a page at a time — the
 * ward board being the case that prompted this: beds are grouped by ward, so a
 * pager would fragment one ward's beds across pages, and a nurse reading a
 * partial bed list has no way to tell it is partial. `useApi` + `.results`
 * silently rendered only the first 20 beds; invisible against 7 seeded beds,
 * wrong at any real hospital.
 *
 * ⚠️ Use this deliberately, not by default. It is N requests, and
 * `usePaginatedList` remains right for anything a user can page through.
 *
 * Mechanics, and why they look like the thing the comment above warns against:
 * we cannot follow DRF's `next` URL, because it is an absolute backend URL and
 * the browser only ever talks to our own proxy (CLAUDE.md §5). So the page
 * count is derived from `count` and the size of page ONE. That is safe in a
 * way deriving from an arbitrary page is not — the warning on
 * `usePaginatedList` is about partial pages yielding phantom pages, and page 1
 * is only ever partial when it is the ONLY page, which this handles first.
 * Deriving the size from the response also sidesteps FLAG-013 entirely: we
 * never send the ignored `page_size`, and we never trust `next` to tell us it
 * was honoured.
 *
 * Pages 2..n go out in parallel; `maxPages` is a runaway guard, and hitting it
 * surfaces an error rather than quietly truncating — silently-partial data is
 * the exact bug this hook exists to prevent.
 */
export function useAllPages<T>(endpoint: string | null, maxPages = 50): ApiState<T[]> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  const refetch = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    if (!endpoint) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const first = await dataGet<Paginated<T> | T[]>(endpoint);
        if (cancelled) return;

        // Tolerate hand-rolled APIViews that return a bare array.
        if (Array.isArray(first)) {
          setData(first);
          return;
        }

        const firstPage = first.results ?? [];
        const count = first.count ?? firstPage.length;
        // Single page (including a partial one) — nothing further to fetch.
        if (firstPage.length === 0 || count <= firstPage.length) {
          setData(firstPage);
          return;
        }

        const totalPages = Math.ceil(count / firstPage.length);
        if (totalPages > maxPages) {
          setError(
            `This list has ${count} items, more than this view can load at once. ` +
              'Showing nothing rather than a partial list — please report this.',
          );
          setData(null);
          return;
        }

        const sep = endpoint.includes('?') ? '&' : '?';
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            dataGet<Paginated<T> | T[]>(`${endpoint}${sep}page=${i + 2}`),
          ),
        );
        if (cancelled) return;

        setData([
          ...firstPage,
          ...rest.flatMap((r) => (Array.isArray(r) ? r : r.results ?? [])),
        ]);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint, maxPages, reloads]);

  return { data, loading, error, refetch };
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
 * Paginated DRF list — owns the page state and builds the query string.
 * Pair with `<Pagination />` + `<ErrorState />` on every list page
 * (PERF-1, UX-ERR-1).
 *
 * ⚠️ `?page=` is real. **`?page_size=` is NOT** — this comment used to call
 * both "the REAL DRF params", which is wrong and was the most copied-from
 * statement of it in the codebase. Measured against `api-dev` 2026-08-19
 * (FLAG-013): the server ignores `page_size` and returns its own page of 20.
 * `?limit=` is likewise ignored (audit GLOBAL-1).
 *
 * The `pageSize` default of 20 therefore happens to MATCH the server rather
 * than control it. Footers and page counts are correct by coincidence, not by
 * contract — if the backend retunes `PAGE_SIZE`, every list in the app starts
 * mis-paginating with nothing failing loudly.
 *
 * 🪤 The response hides this: the `next` URL echoes `page_size` back while
 * ignoring it (`?page=2&page_size=5`), so eyeballing a response concludes the
 * param works. Check `results.length`, never `next`.
 *
 * Removing the dead param and deriving the page count from `next`/`previous`
 * is tracked in FLAG-013. Do NOT derive it from the current page's
 * `results.length` — a partial last page yields phantom pages.
 */
export function usePaginatedList<T>(
  endpoint: string | null,
  pageSize = 20,
): PaginatedListState<T> {
  const [page, setPage] = useState(1);

  // Reset to page 1 when the endpoint itself changes (a search term, a filter),
  // adjusting state during render rather than in an effect. An effect fires
  // AFTER the render that already built `?…&page=3`, so the stale request goes
  // out, DRF answers 404 "Invalid page", and whether the user sees the error
  // state comes down to which response resolves last. This re-renders before
  // committing, so the bad request is never made at all.
  const [lastEndpoint, setLastEndpoint] = useState(endpoint);
  if (endpoint !== lastEndpoint) {
    setLastEndpoint(endpoint);
    setPage(1);
  }
  const effectivePage = endpoint === lastEndpoint ? page : 1;

  let path: string | null = null;
  if (endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    path = `${endpoint}${sep}page_size=${pageSize}${effectivePage > 1 ? `&page=${effectivePage}` : ''}`;
  }
  const { data, loading, error, refetch } = useApi<Paginated<T> | T[]>(path);

  // Tolerate non-paginated (bare array) responses from hand-rolled APIViews.
  const items = Array.isArray(data) ? data : data?.results ?? [];
  const count = Array.isArray(data) ? data.length : data?.count ?? 0;

  return {
    items,
    count,
    page: effectivePage,
    setPage,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    loading,
    error,
    refetch,
  };
}
