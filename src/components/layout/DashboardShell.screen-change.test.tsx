import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardShell } from './DashboardShell';
import type { User } from '@/types/auth';

/**
 * Group 3 of the w5-b6 walk: a new screen opened at the old screen's scroll
 * position, and keyboard focus stayed on the sidebar button. Changing screen
 * now scrolls the content to the top and moves focus to the content area, so
 * the next Tab starts at the top of the new screen. The stand-in screen uses an
 * h2 title like the real ones (no dashboard screen has an h1; the browser walk
 * of #228 caught the first version looking for one).
 */
vi.mock('./Sidebar', () => ({ Sidebar: () => <nav data-testid="sidebar" /> }));
vi.mock('./DashboardHeader', () => ({ DashboardHeader: () => <header data-testid="header" /> }));

const USER = { id: 'u-1', email: 'p@demo.test', first_name: 'A', last_name: 'B', role: 'PATIENT' } as User;

function shell(page: string) {
  return (
    <DashboardShell navItems={[]} activePage={page} onPageChange={() => {}} user={USER}>
      <h2>{page} title</h2>
    </DashboardShell>
  );
}

describe('DashboardShell screen change', () => {
  it('scrolls to the top and focuses the content area, but not on first load', () => {
    const { rerender } = render(shell('overview'));
    const main = screen.getByRole('main');
    // First load: focus stays where the browser put it (no jump on sign-in).
    expect(document.activeElement).toBe(document.body);
    main.scrollTop = 400;
    rerender(shell('users'));
    expect(main.scrollTop).toBe(0);
    expect(document.activeElement).toBe(main);
  });
});
