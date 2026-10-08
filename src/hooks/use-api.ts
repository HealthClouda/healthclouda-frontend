'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { dataGet, dataAction } from '@/lib/client-api';
import { useLiveTick } from './use-live-updates';
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

  // FLAG-073 (#188 review): counts the loads a person or the page asked for.
  // A load only lands if no newer one has started since, so a background
  // refetch already in flight when someone saves and refetches can never put
  // the pre-save snapshot back on screen.
  const foregroundSeq = useRef(0);

  const fetchData = useCallback(async () => {
    const seq = ++foregroundSeq.current;
    if (!path) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const fresh = await dataGet<T>(path);
      if (seq === foregroundSeq.current) setData(fresh);
    } catch (e) {
      if (seq === foregroundSeq.current) setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (seq === foregroundSeq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // FLAG-073 — live updates. When the organisation's data changes, refetch in
  // the background: no loading state (the list stays on screen instead of
  // flashing a skeleton every 30s), and a failure keeps what is already shown
  // rather than replacing it with an error nobody asked for. Marked background
  // so it never counts as the person being active.
  const tick = useLiveTick();
  const lastTick = useRef(tick);
  useEffect(() => {
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    if (!path) return;
    let cancelled = false;
    const startedAfter = foregroundSeq.current;
    dataGet<T>(path, { background: true })
      .then((fresh) => {
        // Superseded: an ordinary load started after this one did.
        if (cancelled || foregroundSeq.current !== startedAfter) return;
        setData(fresh);
        setError(null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tick, path]);

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

  // FLAG-073 (#188 review): a person's refetch is never run silently, even
  // when a live tick lands in the same render; its error must show.
  const forceForeground = useRef(false);
  const refetch = useCallback(() => {
    forceForeground.current = true;
    setReloads((n) => n + 1);
  }, []);

  // FLAG-073 — a live update reloads silently (see `useApi`): no loading
  // state, background-marked requests, and a failure keeps the current list.
  const tick = useLiveTick();
  const lastTick = useRef(tick);
  const silent = useRef(false);
  // True while an ordinary (loading-state) load is in flight. A live tick that
  // cancels one must finish its job and clear `loading`, or the page sits on
  // its skeleton for good (#188 review: every later tick is silent too).
  const foregroundPending = useRef(false);
  useEffect(() => {
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    silent.current = true;
    setReloads((n) => n + 1);
  }, [tick]);

  useEffect(() => {
    if (!endpoint) {
      foregroundPending.current = false;
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const isSilent = silent.current && !forceForeground.current && !foregroundPending.current;
    silent.current = false;
    forceForeground.current = false;
    if (!isSilent) foregroundPending.current = true;
    const opts = isSilent ? { background: true } : undefined;
    const get = (path: string) =>
      opts ? dataGet<Paginated<T> | T[]>(path, opts) : dataGet<Paginated<T> | T[]>(path);

    void (async () => {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }
      try {
        const first = await get(endpoint);
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
            get(`${endpoint}${sep}page=${i + 2}`),
          ),
        );
        if (cancelled) return;

        setData([
          ...firstPage,
          ...rest.flatMap((r) => (Array.isArray(r) ? r : r.results ?? [])),
        ]);
      } catch (e) {
        if (cancelled || isSilent) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled && !isSilent) {
          foregroundPending.current = false;
          setLoading(false);
        }
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
