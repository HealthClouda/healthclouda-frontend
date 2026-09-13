'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { signinPath } from '@/lib/router';
import type { User } from '@/types/auth';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** Uppercase section label rendered above this item. Starts a new group. */
  section?: string;
  /** Renders a muted "Soon" chip and disables the item. */
  soon?: boolean;
}

interface SidebarProps {
  navItems: NavItem[];
  activePage: string;
  onPageChange: (page: string) => void;
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ navItems, activePage, onPageChange, user, isOpen, onClose }: SidebarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Staff should land back on their org portal, not the patient portal
    router.push(signinPath(user.organization_slug, user.role));
    router.refresh();
  }

  let lastSection: string | undefined;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-30
          w-[230px] flex flex-col bg-white border-r border-border
          transition-transform duration-300 ease-in-out
          md:translate-x-0 md:flex
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-border flex-shrink-0">
          <Image src="/assets/images/HealthClouda-icon-tight.png" alt="" width={44} height={22} className="w-11 h-[22px] object-contain" />
          <span className="font-body font-black text-base text-ink">HealthClouda</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3.5 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = activePage === item.id;
            const showSection = item.section && item.section !== lastSection;
            if (showSection) lastSection = item.section;

            return (
              <div key={item.id}>
                {showSection && (
                  <span className="block px-3 pt-3.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-nav-muted first:pt-1.5">
                    {item.section}
                  </span>
                )}
                <button
                  onClick={() => !item.soon && onPageChange(item.id)}
                  disabled={item.soon}
                  aria-disabled={item.soon}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors text-left
                    ${item.soon
                      ? 'text-text-mid opacity-60 cursor-default'
                      : active
                        ? 'bg-chip text-primary'
                        : 'text-text-mid hover:bg-page'
                    }`}
                >
                  <span className={`flex-shrink-0 [&>svg]:w-[17px] [&>svg]:h-[17px] ${active && !item.soon ? 'text-primary' : 'text-text-soft'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.soon ? (
                    <span className="text-[9.5px] font-bold text-text-soft bg-row-hairline rounded-full px-2 py-0.5">
                      Soon
                    </span>
                  ) : item.badge != null && item.badge > 0 && (
                    <span className="bg-primary text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-t border-border flex-shrink-0">
          <Avatar firstName={user.first_name} lastName={user.last_name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-ink truncate">
              {user.first_name} {user.last_name}
            </p>
            {user.organization_name && (
              <p className="text-[10.5px] text-text-soft truncate">{user.organization_name}</p>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex-shrink-0 flex items-center gap-1.5 min-h-11 px-2.5 rounded-md text-text-soft hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span className="text-[11px] font-semibold">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
