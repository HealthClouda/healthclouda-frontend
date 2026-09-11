'use client';

import { useState, useRef, useEffect } from 'react';
import type { User } from '@/types/auth';

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface DashboardHeaderProps {
  user: User;
  pageTitle?: string;
  notificationCount?: number;
  notifications?: Notification[];
  onMenuClick: () => void;
  onMarkAllRead?: () => void;
  dutyToggle?: React.ReactNode;
}

export function DashboardHeader({
  user,
  pageTitle,
  notificationCount = 0,
  notifications = [],
  onMenuClick,
  onMarkAllRead,
  dutyToggle,
}: DashboardHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex h-16 items-center gap-5 px-4 md:px-7 bg-white border-b border-border flex-shrink-0">
      {/* Left: mobile menu + portal title + org context badge */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-text-soft hover:text-ink p-1 flex-shrink-0"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {pageTitle && (
        <h1 className="text-[14.5px] font-bold text-ink whitespace-nowrap hidden sm:block">{pageTitle}</h1>
      )}
      {user.organization_name && (
        <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full bg-chip text-primary text-xs font-semibold truncate max-w-[220px]">
          {user.organization_name}
        </span>
      )}

      {/* Right: duty toggle + notifications */}
      <div className="flex items-center gap-2 ml-auto">
        {dutyToggle}

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center text-text-soft hover:bg-page rounded-lg transition-colors"
            aria-label={`${notificationCount} unread notifications`}
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 bg-danger text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-[350px] bg-white rounded-card border border-border shadow-[0_8px_40px_rgba(0,8,37,0.13)] z-10 overflow-hidden">
              <div className="flex items-center justify-between px-[18px] pt-3.5 pb-2.5 border-b border-border">
                <span className="text-[13.5px] font-bold text-ink">Notifications</span>
                {onMarkAllRead && notificationCount > 0 && (
                  <button
                    onClick={() => { onMarkAllRead(); setNotifOpen(false); }}
                    className="text-[11.5px] font-semibold text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-[12.5px] text-text-soft text-center py-8">You&apos;re all caught up</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`px-[18px] py-3 border-t border-row-hairline first:border-t-0 ${!n.read ? 'bg-chip/40' : ''}`}
                    >
                      <p className={`text-[12.5px] leading-snug ${!n.read ? 'font-semibold text-ink' : 'text-text-mid'}`}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
