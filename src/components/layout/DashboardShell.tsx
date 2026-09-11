'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { SmallScreenGate } from './SmallScreenGate';
import { useWideViewport } from '@/hooks/use-wide-viewport';
import type { NavItem } from './Sidebar';
import type { Notification } from './DashboardHeader';
import type { User } from '@/types/auth';

export type { NavItem };

interface DashboardShellProps {
  navItems: NavItem[];
  activePage: string;
  onPageChange: (page: string) => void;
  user: User;
  children: React.ReactNode;
  pageTitle?: string;
  notificationCount?: number;
  notifications?: Notification[];
  onMarkAllRead?: () => void;
  dutyToggle?: React.ReactNode;
  /**
   * Dashboard display name (e.g. "Super Admin") — below 768px this dashboard
   * is not rendered at all and the SmallScreenGate notice is shown instead.
   * Applies to DASH-1..5 only; the patient dashboard stays responsive and must
   * omit this prop.
   *
   * 🔴 **Setting this is a PHI control (FLAG-203), not a layout preference.**
   * It used to be `hidden md:flex` — the children still mounted and still
   * fetched, so the records reached the phone and were merely invisible. They
   * are now genuinely not mounted. Do not "simplify" this back to a CSS class.
   */
  smallScreenGateFor?: string;
}

export function DashboardShell({
  navItems,
  activePage,
  onPageChange,
  user,
  children,
  pageTitle,
  notificationCount = 0,
  notifications = [],
  onMarkAllRead,
  dutyToggle,
  smallScreenGateFor,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const viewport = useWideViewport();

  // FLAG-203 — the gate decides whether this subtree MOUNTS, not how it looks.
  // `children` are React elements the caller already built, but React does not
  // invoke a component (or run its hooks, or fire its fetches) until it is
  // actually rendered — so returning early here is what stops the PHI requests.
  if (smallScreenGateFor && viewport !== 'wide') {
    // `narrow` is a measured answer, so tell the user why. `unknown` is not: it
    // is the server render and the first paint, before anything has measured a
    // viewport. Showing "you need a bigger screen" to a desktop user for one
    // frame would be both alarming and false, so that case gets a neutral
    // placeholder — and, crucially, still no dashboard.
    return viewport === 'narrow' ? (
      <SmallScreenGate dashboardName={smallScreenGateFor} />
    ) : (
      <div className="h-screen bg-page" aria-busy="true">
        <span className="sr-only">Loading dashboard</span>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <div className="h-screen bg-page overflow-hidden flex">
        <Sidebar
          navItems={navItems}
          activePage={activePage}
          onPageChange={(page) => {
            onPageChange(page);
            setSidebarOpen(false);
          }}
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DashboardHeader
            user={user}
            pageTitle={pageTitle}
            notificationCount={notificationCount}
            notifications={notifications}
            onMenuClick={() => setSidebarOpen(true)}
            onMarkAllRead={onMarkAllRead}
            dutyToggle={dutyToggle}
          />
          <main className="flex-1 overflow-y-auto p-4 md:px-7 md:py-[26px]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}