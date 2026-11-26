import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { Sidebar, SIDEBAR_COLLAPSED_KEY, type NavItem } from './Sidebar';
import type { User } from '@/types/auth';

/**
 * Group 3 of the w5-b6 walk: the sidebar was a fixed 230px with no way to
 * collapse it, "Soon" items were buttons that did nothing, and on a 582px-tall
 * window Settings sat behind a second scrollbar.
 */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/image', () => ({ default: () => <span data-testid="logo" /> }));

const USER = { id: 'u1', email: 'a@demo.test', first_name: 'Sade', last_name: 'Admin', role: 'SUPERADMIN' } as User;
const NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: <svg />, section: 'Main' },
  { id: 'users', label: 'Users', icon: <svg /> },
  { id: 'records', label: 'Records', icon: <svg />, section: 'Platform', soon: true },
  { id: 'messages', label: 'Messages', icon: <svg /> },
  { id: 'settings', label: 'Settings', icon: <svg />, section: 'System', soon: true },
];

const renderSidebar = () =>
  render(<Sidebar navItems={NAV} activePage="overview" onPageChange={() => {}} user={USER} isOpen={false} onClose={() => {}} />);

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

const realMatchMedia = window.matchMedia;
function setViewport(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide, media: query, addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}
afterEach(() => { window.matchMedia = realMatchMedia; });

describe('Sidebar', () => {
  it('leaves out "Soon" items, and keeps the section they opened for the next item', () => {
    renderSidebar();
    const nav = screen.getByRole('navigation');
    expect(within(nav).queryByRole('button', { name: /records/i })).toBeNull();
    expect(within(nav).queryByRole('button', { name: /settings/i })).toBeNull();
    expect(within(nav).queryByText('Soon')).toBeNull();
    // Messages sat under "Platform" only because Records opened that section.
    expect(within(nav).getByText('Platform')).toBeInTheDocument();
    expect(within(nav).queryByText('System')).toBeNull();
    expect(within(nav).getByRole('button', { name: 'Messages' })).toBeInTheDocument();
  });

  it('collapses to icons, keeps every item named, and remembers the choice', () => {
    const { unmount } = renderSidebar();
    const aside = screen.getByRole('complementary');
    expect(aside.dataset.collapsed).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(aside.dataset.collapsed).toBe('true');
    // Labels are gone from view but each button still has its name (and a tooltip).
    const users = screen.getByRole('button', { name: 'Users' });
    expect(users).toHaveAttribute('title', 'Users');
    expect(screen.queryByText('Platform')).toBeNull();
    // The brand mark stays; only the name hides. The expand button heads the icon column.
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.queryByText('HealthClouda')).toBeNull();
    expect(within(screen.getByRole('navigation')).getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('1');

    unmount();
    renderSidebar();
    expect(screen.getByRole('complementary').dataset.collapsed).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByRole('complementary').dataset.collapsed).toBe('false');
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('0');
  });

  // Review of #229.
  it('still works when the browser blocks storage, instead of crashing the dashboard', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    renderSidebar();
    const aside = screen.getByRole('complementary');
    expect(aside.dataset.collapsed).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(aside.dataset.collapsed).toBe('true');
  });

  it('does not animate the width on load, so a saved "collapsed" never shrinks into place', async () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1');
    renderSidebar();
    const aside = screen.getByRole('complementary');
    expect(aside.dataset.collapsed).toBe('true');
    expect(aside.className).not.toMatch(/duration-300/);
    await waitFor(() => expect(aside.className).toMatch(/duration-300/));
  });

  it('keeps keyboard focus on the toggle when it moves', () => {
    renderSidebar();
    const collapse = screen.getByRole('button', { name: 'Collapse sidebar' });
    collapse.focus();
    fireEvent.click(collapse);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand sidebar' }));
    fireEvent.click(document.activeElement!);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Collapse sidebar' }));
  });

  it('shows the phone drawer with labels even when "collapsed" was saved on desktop', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1');
    setViewport(false);
    renderSidebar();
    expect(screen.getByRole('complementary').dataset.collapsed).toBe('false');
    expect(screen.getByText('HealthClouda')).toBeInTheDocument();
  });

  it('names who is signed in, and where, when collapsed', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1');
    render(<Sidebar navItems={NAV} activePage="overview" onPageChange={() => {}}
      user={{ ...USER, organization_name: 'Demo Clinic' } as User} isOpen={false} onClose={() => {}} />);
    expect(screen.getByRole('img', { name: 'Signed in as Sade Admin, Demo Clinic' })).toBeInTheDocument();
  });
});
