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

// Not decoded: nav ids are plain ASCII, and decoding a garbled link (`#%E0%A4%A`) throws.
const readHash = () => window.location.hash.slice(1);

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
    // Compare with the live address, not the rendered page: a double click runs
    // before the re-render, and a bad `#billing` must still clear on Home.
    const target = next === home ? '' : next;
    if (readHash() === target) return;
    const { pathname, search } = window.location;
    // `null`, not the current state: Next.js only records the new URL (and so
    // keeps it on its own later address writes) when the state isn't its own.
    window.history.pushState(null, '', target ? `#${target}` : pathname + search);
    listeners.forEach((l) => l());
  }, [home]);

  return [page, setPage];
}
