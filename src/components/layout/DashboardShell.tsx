'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { SmallScreenGate } from './SmallScreenGate';
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
   * Dashboard display name (e.g. "Super Admin") — renders the SmallScreenGate
   * below 768px instead of the shell. Applies to DASH-1..5 only; the patient
   * dashboard stays responsive and must omit this prop.
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

  return (
    <div className="h-screen">
      {smallScreenGateFor && <SmallScreenGate dashboardName={smallScreenGateFor} />}
      <div className={`h-screen bg-page overflow-hidden ${smallScreenGateFor ? 'hidden md:flex' : 'flex'}`}>
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