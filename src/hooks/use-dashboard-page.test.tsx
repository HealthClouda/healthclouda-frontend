import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardPage } from './use-dashboard-page';
import type { NavItem } from '@/components/layout/Sidebar';

/**
 * Group 3 of the w5-b6 walk: every screen lived at one address, so browser Back
 * left the app, reload dropped you on Dashboard, and no screen could be linked.
 * Each screen now has its own `#id`, and Back/Forward move between screens.
 */
const NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: null },
  { id: 'users', label: 'Users', icon: null },
  { id: 'audit', label: 'Audit Logs', icon: null },
  { id: 'billing', label: 'Billing', icon: null, soon: true },
];

function goTo(hash: string) {
  window.history.replaceState(null, '', hash ? `/superadmin${hash}` : '/superadmin');
}

afterEach(() => goTo(''));

describe('useDashboardPage', () => {
  it('starts on the first nav item when the address has no screen', () => {
    goTo('');
    const { result } = renderHook(() => useDashboardPage(NAV));
    expect(result.current[0]).toBe('overview');
  });

  it('opens the screen named in the address (reload keeps you where you were)', () => {
    goTo('#users');
    const { result } = renderHook(() => useDashboardPage(NAV));
    expect(result.current[0]).toBe('users');
  });

  it('ignores an unknown screen and a "Soon" screen in the address', () => {
    goTo('#nope');
    expect(renderHook(() => useDashboardPage(NAV)).result.current[0]).toBe('overview');
    goTo('#billing');
    expect(renderHook(() => useDashboardPage(NAV)).result.current[0]).toBe('overview');
  });

  it('changing screen adds a history entry with the screen in the address', () => {
    goTo('');
    const before = window.history.length;
    const { result } = renderHook(() => useDashboardPage(NAV));
    act(() => result.current[1]('audit'));
    expect(result.current[0]).toBe('audit');
    expect(window.location.hash).toBe('#audit');
    expect(window.history.length).toBe(before + 1);
    // Back to the first screen drops the hash rather than writing #overview.
    act(() => result.current[1]('overview'));
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/superadmin');
  });

  it('re-picking the current screen adds no history entry', () => {
    goTo('#users');
    const before = window.history.length;
    const { result } = renderHook(() => useDashboardPage(NAV));
    act(() => result.current[1]('users'));
    expect(window.history.length).toBe(before);
  });

  it('browser Back/Forward (popstate) switches the screen', () => {
    goTo('#users');
    const { result } = renderHook(() => useDashboardPage(NAV));
    act(() => {
      goTo('#audit');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe('audit');
  });
});
