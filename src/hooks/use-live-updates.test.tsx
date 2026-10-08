import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { useLiveUpdatesPoll, LiveUpdatesContext, LIVE_POLL_MS, withLiveBadges } from './use-live-updates';
import { useApi, useAllPages } from './use-api';
import { BACKGROUND_HEADER, ENDPOINTS } from '@/lib/config';
import type { NavItem } from '@/components/layout/Sidebar';

/**
 * FLAG-073 — live updates.
 *
 * The load-bearing promise is the same one `use-heartbeat.test.tsx` guards:
 * a timer must never keep an unattended session alive. The poll here DOES run
 * on a timer, so every request it causes (the poll, the silent list refetch,
 * and any token refresh they trigger) must carry the background header, which
 * the backend (FLAG-625) does not count as activity. These tests stub `fetch`
 * and run the real `client-api.ts`, so the header is checked on the wire.
 */

type Call = { url: string; headers: Record<string, string> };

let calls: Call[];
let updates: { changed_at: string | null; unread_notifications: number; counts: Record<string, number> };
let listStatus = 200;

function headersOf(init?: RequestInit): Record<string, string> {
  return (init?.headers as Record<string, string> | undefined) ?? {};
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

function Probe({ enabled = true }: { enabled?: boolean }) {
  const live = useLiveUpdatesPoll(enabled);
  return (
    <LiveUpdatesContext.Provider value={live}>
      <span data-testid="tick">{live.tick}</span>
      <List />
    </LiveUpdatesContext.Provider>
  );
}

function List() {
  const { data, loading } = useApi<{ n: number }>('/ward/admissions/');
  return <span data-testid="list">{loading ? 'loading' : `n=${data?.n ?? '?'}`}</span>;
}

const pollCalls = () => calls.filter((c) => c.url.includes(encodeURIComponent(ENDPOINTS.STAFF_UPDATES)));
const listCalls = () => calls.filter((c) => c.url.includes(encodeURIComponent('/ward/admissions/')));

describe('useLiveUpdatesPoll', () => {
  let listN: number;

  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    calls = [];
    listN = 1;
    listStatus = 200;
    updates = { changed_at: '2026-10-07T10:00:00Z', unread_notifications: 0, counts: { admission_requests: 2 } };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, headers: headersOf(init) });
        if (url.includes(encodeURIComponent(ENDPOINTS.STAFF_UPDATES))) {
          return new Response(JSON.stringify(updates), { status: 200 });
        }
        if (url === '/api/auth/refresh') return new Response('{}', { status: 200 });
        return new Response(JSON.stringify({ n: listN }), { status: listStatus });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('every request it makes is marked background, however long the tab sits untouched', async () => {
    render(<Probe />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    updates = { ...updates, changed_at: '2026-10-07T10:05:00Z' };
    await act(() => vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 10));

    expect(pollCalls().length).toBeGreaterThanOrEqual(10);
    // The silent refetch the change triggered is background too. Only the
    // list's first load, which the page made when it opened, is not.
    const [firstLoad, ...refetches] = listCalls();
    expect(firstLoad.headers[BACKGROUND_HEADER]).toBeUndefined();
    expect(refetches.length).toBe(1);
    for (const c of [...pollCalls(), ...refetches]) expect(c.headers[BACKGROUND_HEADER]).toBe('1');
    // And nothing a timer did reached the heartbeat.
    expect(calls.some((c) => c.url.includes('heartbeat'))).toBe(false);
  });

  it('the first answer is the baseline: the lists just loaded, so nothing refetches', async () => {
    render(<Probe />);
    await act(() => vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 3));
    expect(screen.getByTestId('tick').textContent).toBe('0');
    expect(listCalls()).toHaveLength(1);
  });

  it('when something changes, the list refreshes in place with no loading state', async () => {
    render(<Probe />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByTestId('list').textContent).toBe('n=1');

    listN = 2;
    updates = { ...updates, changed_at: '2026-10-07T10:01:00Z' };
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(screen.getByTestId('list').textContent ?? ''));
    observer.observe(screen.getByTestId('list'), { childList: true, characterData: true, subtree: true });
    await act(() => vi.advanceTimersByTimeAsync(LIVE_POLL_MS));
    observer.disconnect();

    expect(screen.getByTestId('tick').textContent).toBe('1');
    expect(screen.getByTestId('list').textContent).toBe('n=2');
    expect(seen).not.toContain('loading');
  });

  it('a failed background refetch keeps what is on screen', async () => {
    render(<Probe />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    listStatus = 500;
    updates = { ...updates, changed_at: '2026-10-07T10:02:00Z' };
    await act(() => vi.advanceTimersByTimeAsync(LIVE_POLL_MS));
    expect(screen.getByTestId('list').textContent).toBe('n=1');
  });

  it('does not poll a hidden tab, and catches up as soon as it is shown', async () => {
    setVisibility('hidden');
    render(<Probe />);
    await act(() => vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 5));
    expect(pollCalls()).toHaveLength(0);

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(pollCalls()).toHaveLength(1);
  });

  it('does nothing at all when disabled (patients, superadmin, the small-screen gate)', async () => {
    render(<Probe enabled={false} />);
    await act(() => vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 5));
    expect(pollCalls()).toHaveLength(0);
  });

  it('a token refresh a poll triggers is marked background too', async () => {
    let first = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, headers: headersOf(init) });
        if (url === '/api/auth/refresh') return new Response('{}', { status: 200 });
        if (url.includes(encodeURIComponent(ENDPOINTS.STAFF_UPDATES)) && first) {
          first = false;
          return new Response('{}', { status: 401 });
        }
        return new Response(JSON.stringify(updates), { status: 200 });
      }),
    );
    render(<Probe />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    const refresh = calls.find((c) => c.url === '/api/auth/refresh');
    expect(refresh?.headers[BACKGROUND_HEADER]).toBe('1');
  });
});

describe('withLiveBadges', () => {
  const nav = (ids: string[]): NavItem[] => ids.map((id) => ({ id, label: id, icon: null }));

  it('puts each count on the page that lists those rows', () => {
    const doctor = withLiveBadges(nav(['overview', 'queue', 'admissions']), 'DOCTOR', {
      queue_waiting: 3, reviews_mine: 1, reviews_unassigned: 2,
    });
    expect(doctor.map((i) => i.badge)).toEqual([undefined, 3, 3]);

    const nurse = withLiveBadges(nav(['requests']), 'NURSE', { admission_requests: 4 });
    expect(nurse[0].badge).toBe(4);
  });

  it('never overrides a badge the dashboard set itself, and leaves other roles alone', () => {
    const items: NavItem[] = [{ id: 'queue', label: 'Queue', icon: null, badge: 9 }];
    expect(withLiveBadges(items, 'DOCTOR', { queue_waiting: 1 })[0].badge).toBe(9);
    expect(withLiveBadges(nav(['overview']), 'PATIENT', {})).toEqual(nav(['overview']));
  });
});

/**
 * #188 review (Qeeyat): races between a live tick and an ordinary load.
 * Each was found with a probe against the first version of this PR.
 */
describe('live ticks racing ordinary loads', () => {
  function deferred<T>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function respond(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status });
  }

  it('useAllPages: a tick during the first load still ends with loading cleared', async () => {
    const pending: ReturnType<typeof deferred<Response>>[] = [];
    vi.stubGlobal('fetch', vi.fn(() => {
      const d = deferred<Response>();
      pending.push(d);
      return d.promise;
    }));

    function AllPages() {
      const { data, loading } = useAllPages<{ id: string }>('/x/');
      return <p data-testid="all">{loading ? 'LOADING' : 'READY'} {JSON.stringify(data)}</p>;
    }
    const { rerender } = render(
      <LiveUpdatesContext.Provider value={{ tick: 0, counts: {}, unreadNotifications: 0 }}><AllPages /></LiveUpdatesContext.Provider>,
    );
    await act(async () => {});
    rerender(
      <LiveUpdatesContext.Provider value={{ tick: 1, counts: {}, unreadNotifications: 0 }}><AllPages /></LiveUpdatesContext.Provider>,
    );
    await act(async () => {});
    // Resolve every request made so far (the cancelled first load and its replacement).
    await act(async () => {
      for (const d of pending) d.resolve(respond({ count: 1, next: null, previous: null, results: [{ id: 'fresh' }] }));
    });

    expect(screen.getByTestId('all').textContent).toBe('READY [{"id":"fresh"}]');
  });

  it('useApi: a background refetch that lands after a newer ordinary load is ignored', async () => {
    const pending: { url: string; d: ReturnType<typeof deferred<Response>> }[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const d = deferred<Response>();
      pending.push({ url, d });
      return d.promise;
    }));

    let refetch: () => void = () => {};
    function One() {
      const state = useApi<{ v: string }>('/y/');
      refetch = state.refetch;
      return <p data-testid="one">{state.data?.v ?? '-'}</p>;
    }
    const wrap = (tick: number) => (
      <LiveUpdatesContext.Provider value={{ tick, counts: {}, unreadNotifications: 0 }}><One /></LiveUpdatesContext.Provider>
    );
    const { rerender } = render(wrap(0));
    await act(async () => { pending[0].d.resolve(respond({ v: 'first' })); });

    rerender(wrap(1)); // background refetch starts: pending[1]
    await act(async () => { refetch(); }); // the person saves and refetches: pending[2]
    await act(async () => { pending[2].d.resolve(respond({ v: 'after-save' })); });
    await act(async () => { pending[1].d.resolve(respond({ v: 'stale-before-save' })); });

    expect(screen.getByTestId('one').textContent).toBe('after-save');
  });
});
