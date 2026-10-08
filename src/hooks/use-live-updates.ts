'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ClientApiError, dataGet } from '@/lib/client-api';
import { ENDPOINTS, type Role } from '@/lib/config';
import type { NavItem } from '@/components/layout/Sidebar';

/** How often an open, visible staff dashboard asks whether anything changed. */
export const LIVE_POLL_MS = 30_000;

/** `GET /auth/me/updates/` (backend FLAG-625). Counts only, no patient details. */
export interface LiveUpdatesResponse {
  changed_at: string | null;
  unread_notifications: number;
  counts: Record<string, number>;
}

export interface LiveUpdates {
  /**
   * Goes up by one each time the organisation's data changes. `useApi`,
   * `usePaginatedList` and `useAllPages` refetch silently when it moves.
   */
  tick: number;
  counts: Record<string, number>;
  unreadNotifications: number;
}

const NOTHING_YET: LiveUpdates = { tick: 0, counts: {}, unreadNotifications: 0 };

/**
 * Default value outside a staff `DashboardShell`: the tick never moves, so the
 * data hooks behave exactly as they did before FLAG-073 everywhere else.
 */
export const LiveUpdatesContext = createContext<LiveUpdates>(NOTHING_YET);

/** The refetch signal the data hooks subscribe to. */
export function useLiveTick(): number {
  return useContext(LiveUpdatesContext).tick;
}

/** The staff roles with an organisation, the only ones the endpoint answers. */
export const LIVE_UPDATE_ROLES: ReadonlySet<Role> = new Set<Role>([
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'ORGANIZATION_ADMIN',
]);

/**
 * FLAG-073 — keeps a staff dashboard current without a reload.
 *
 * Every 30s, while the tab is visible, asks the backend for counts and a
 * `changed_at`. When `changed_at` moves, `tick` goes up and every mounted list
 * refetches in the background (no loading shimmer).
 *
 * ⛔ Every request here is a **background** request (`dataGet(..., { background:
 * true })`). The backend does not count it as activity, so this timer cannot do
 * what `use-heartbeat.ts` forbids: keep an abandoned ward computer signed in, or
 * keep a doctor who walked away on duty. An idle session is still refused, and
 * `client-api.ts` then signs the tab out with the reason, which also takes the
 * records off an unattended screen sooner than before.
 *
 * Polls again as soon as the tab becomes visible, and not at all while it is
 * hidden: a background tab has nobody to show the update to.
 */
export function useLiveUpdatesPoll(enabled: boolean): LiveUpdates {
  const [state, setState] = useState<LiveUpdates>(NOTHING_YET);
  // `undefined` = no answer yet. The first answer is the baseline, not a change:
  // the lists on screen were just fetched, refetching them would be waste.
  const lastChangedAt = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stopped = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (cancelled || stopped || inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const res = await dataGet<LiveUpdatesResponse>(ENDPOINTS.STAFF_UPDATES, { background: true });
        if (cancelled) return;
        const changed =
          lastChangedAt.current !== undefined && res.changed_at !== lastChangedAt.current;
        lastChangedAt.current = res.changed_at;
        setState((prev) => ({
          tick: changed ? prev.tick + 1 : prev.tick,
          counts: res.counts ?? {},
          unreadNotifications: res.unread_notifications ?? 0,
        }));
      } catch (e) {
        // 401: `client-api.ts` has already refreshed, or is signing the tab
        // out. 403: this account cannot use the endpoint. Either way, asking
        // again every 30s achieves nothing. Anything else (a network blip)
        // is retried on the next tick.
        if (e instanceof ClientApiError && (e.status === 401 || e.status === 403)) stopped = true;
      } finally {
        inFlight = false;
      }
      if (!cancelled && !stopped) timer = setTimeout(() => void poll(), LIVE_POLL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void poll();
    }

    void poll();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled]);

  return state;
}

/**
 * Which sidebar item each count belongs on. Each count is defined on the
 * backend exactly as that page filters its list, so a badge never disagrees
 * with the page it points at.
 */
const NAV_BADGES: Partial<Record<Role, Record<string, (c: Record<string, number>) => number>>> = {
  DOCTOR: {
    queue: (c) => c.queue_waiting ?? 0,
    // The Admissions page shows both review lists: mine and nobody's.
    admissions: (c) => (c.reviews_mine ?? 0) + (c.reviews_unassigned ?? 0),
  },
  NURSE: {
    requests: (c) => c.admission_requests ?? 0,
  },
  RECEPTIONIST: {
    checkins: (c) => c.queue_waiting ?? 0,
  },
  ORGANIZATION_ADMIN: {
    duplicates: (c) => c.duplicates_flagged ?? 0,
    referrals: (c) => c.referrals_pending ?? 0,
  },
};

/** A badge a dashboard set itself wins; otherwise the live count, if any. */
export function withLiveBadges(navItems: NavItem[], role: Role, counts: Record<string, number>): NavItem[] {
  const forRole = NAV_BADGES[role];
  if (!forRole) return navItems;
  return navItems.map((item) => {
    const count = forRole[item.id];
    if (!count || item.badge != null) return item;
    return { ...item, badge: count(counts) };
  });
}
