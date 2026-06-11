'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { roleLabel, fullName } from '@/lib/utils';
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
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-500 hover:text-gray-700 p-1"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {pageTitle && (
          <h1 className="text-base font-semibold text-gray-900 hidden sm:block">{pageTitle}</h1>
        )}
      </div>

      {/* Right: duty toggle + notifications + user */}
      <div className="flex items-center gap-2">
        {dutyToggle}

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={`${notificationCount} unread notifications`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {onMarkAllRead && notificationCount > 0 && (
                  <button
                    onClick={() => { onMarkAllRead(); setNotifOpen(false); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No notifications</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <p className={`text-sm ${!n.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <Avatar firstName={user.first_name} lastName={user.last_name} size="sm" />
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-900 leading-none">
              {fullName(user.first_name, user.last_name)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{roleLabel(user.role)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}