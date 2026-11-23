'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { NavItem } from '@/components/layout/Sidebar';

// pushState fires no event, so the hook's own changes notify through this set.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}

const readHash = () => decodeURIComponent(window.location.hash.slice(1));

/**
 * The dashboard's current screen, kept in the address as `#<nav id>` so browser
 * Back/Forward move between screens and a reload stays on the same one. The first
 * nav item is the home screen and has no hash. An unknown or "Soon" id falls back
 * to home.
 */
export function useDashboardPage(nav: NavItem[]): [string, (page: string) => void] {
  const home = nav[0].id;
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  const page = nav.some((n) => n.id === hash && !n.soon) ? hash : home;

  const setPage = useCallback((next: string) => {
    if (next === page) return;
    const { pathname, search } = window.location;
    window.history.pushState(window.history.state, '', next === home ? pathname + search : `#${next}`);
    listeners.forEach((l) => l());
  }, [page, home]);

  return [page, setPage];
}
