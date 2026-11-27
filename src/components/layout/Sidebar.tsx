'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { ChangePasswordForm, passwordChangedMessage } from '@/components/account/ChangePasswordForm';
import { useToast } from '@/store/toast';
import { Avatar } from '@/components/ui/Avatar';
import { signinPath } from '@/lib/router';
import { DASHBOARD_MIN_WIDTH } from '@/hooks/use-wide-viewport';
import type { User } from '@/types/auth';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** Uppercase section label rendered above this item. Starts a new group. */
  section?: string;
  /** Not built yet: left out of the sidebar (w5-b6 group 3: inert buttons were noise). */
  soon?: boolean;
}

/** localStorage key for the desktop sidebar's collapsed state ('1' / '0'). */
export const SIDEBAR_COLLAPSED_KEY = 'hc.sidebar.collapsed';

// Storage can throw (Safari "Block all cookies", locked-down browsers): fall back
// to expanded, and keep a toggle that lasts until the page reloads.
function readCollapsed(): boolean {
  try { return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
}
function saveCollapsed(value: boolean) {
  try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0'); } catch { /* not remembered */ }
}

/** Drops "Soon" items; a section a dropped item opened moves to the next shown item. */
function visibleItems(items: NavItem[]): NavItem[] {
  let carried: string | undefined;
  const out: NavItem[] = [];
  for (const item of items) {
    if (item.soon) { carried = item.section ?? carried; continue; }
    out.push(carried && !item.section ? { ...item, section: carried } : item);
    carried = undefined;
  }
  return out;
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
  const { toast } = useToast();
  // FLAG-611: every dashboard renders this sidebar, so Change password lives
  // here once instead of six times.
  const [changingPassword, setChangingPassword] = useState(false);
  // Desktop only: the phone drawer always shows labels, so it never changes
  // width while it slides. No matchMedia (tests) counts as desktop: this only
  // sizes the sidebar; the FLAG-203 gate is useWideViewport, which stays strict.
  const [collapsed, setCollapsed] = useState(false);
  const [desktop, setDesktop] = useState(false);
  // Read before the first paint, so a saved "collapsed" never shows wide and
  // then shrinks. Not in useState: the server render can't see storage.
  useLayoutEffect(() => {
    setCollapsed(readCollapsed());
    if (typeof window.matchMedia !== 'function') { setDesktop(true); return; }
    const query = window.matchMedia(`(min-width: ${DASHBOARD_MIN_WIDTH}px)`);
    setDesktop(query.matches);
    const onChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  // The width animates only after that first paint, never on load.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const slim = collapsed && desktop;
  // The toggle moves (brand row ↔ top of the icon column), so focus follows it.
  const toggleRef = useRef<HTMLButtonElement>(null);
  const refocusToggle = useRef(false);
  useEffect(() => {
    if (!refocusToggle.current) return;
    refocusToggle.current = false;
    toggleRef.current?.focus();
  }, [slim]);
  function toggleCollapsed() {
    saveCollapsed(!slim);
    refocusToggle.current = true;
    setCollapsed(!slim);
  }
  const toggleButton = (
    <button
      ref={toggleRef}
      onClick={toggleCollapsed}
      aria-label={slim ? 'Expand sidebar' : 'Collapse sidebar'}
      title={slim ? 'Expand sidebar' : 'Collapse sidebar'}
      className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-text-soft hover:text-ink hover:bg-page transition-colors"
    >
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M9 4v16" />
        <path strokeLinecap="round" strokeLinejoin="round" d={slim ? 'M13 10l2 2-2 2' : 'M15 10l-2 2 2 2'} />
      </svg>
    </button>
  );

  const signedInAs = [`${user.first_name} ${user.last_name}`, user.organization_name].filter(Boolean).join(', ');

  // One request per click-through, and a visible "Signing out…" while it runs (w5-b6 group 4a).
  // Not reset on success: the next page replaces this one.
  const [signingOut, setSigningOut] = useState(false);
  const signingOutRef = useRef(false);
  async function handleLogout() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    let ok = false;
    try {
      ok = (await fetch('/api/auth/logout', { method: 'POST' })).ok;
    } catch { /* network failure: handled as not ok */ }
    if (!ok) {
      // Unlock so the user can try again, rather than land on sign-in still signed in.
      signingOutRef.current = false;
      setSigningOut(false);
      toast.error('Could not sign you out. Please try again.');
      return;
    }
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
        data-collapsed={slim}
        className={`
          fixed md:relative inset-y-0 left-0 z-30
          ${slim ? 'w-[68px]' : 'w-[230px]'} flex flex-col bg-white border-r border-border
          ${animate ? 'transition-[transform,width] duration-300 ease-in-out' : ''}
          md:translate-x-0 md:flex
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className={`flex h-16 items-center gap-2.5 border-b border-border flex-shrink-0 ${slim ? 'justify-center' : 'pl-5 pr-3'}`}>
          {/* Collapsed: the brand mark stays, the name hides, and the toggle heads the icon column. */}
          <Image src="/assets/images/HealthClouda-icon-tight.png" alt="" width={44} height={22} className="w-11 h-[22px] object-contain" />
          {!slim && (
            <>
              <span className="flex-1 min-w-0 truncate font-body font-black text-base text-ink">HealthClouda</span>
              {toggleButton}
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3.5 px-3 space-y-0.5">
          {slim && <div className="flex justify-center pb-1.5">{toggleButton}</div>}
          {visibleItems(navItems).map((item) => {
            const active = activePage === item.id;
            const showSection = item.section && item.section !== lastSection;
            if (showSection) lastSection = item.section;

            return (
              <div key={item.id}>
                {showSection && !slim && (
                  <span className="block px-3 pt-3.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-nav-muted first:pt-1.5">
                    {item.section}
                  </span>
                )}
                {showSection && slim && <hr className="mx-2 my-2 border-border" />}
                <button
                  onClick={() => onPageChange(item.id)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={slim ? item.label + (item.badge ? `, ${item.badge} new` : '') : undefined}
                  title={slim ? item.label : undefined}
                  className={`relative w-full flex items-center gap-2.5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors text-left
                    ${slim ? 'justify-center px-0' : 'px-3'}
                    ${active ? 'bg-chip text-primary' : 'text-text-mid hover:bg-page'}`}
                >
                  <span className={`flex-shrink-0 [&>svg]:w-[17px] [&>svg]:h-[17px] ${active ? 'text-primary' : 'text-text-soft'}`}>
                    {item.icon}
                  </span>
                  {!slim && <span className="flex-1">{item.label}</span>}
                  {item.badge != null && item.badge > 0 && (
                    <span className={`bg-primary text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                      ${slim ? 'absolute -top-0.5 right-0.5 text-[10px] leading-none py-[3px] min-w-[18px]' : ''}`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* User info, then the account actions on their own row (FLAG-068):
            sharing one 230px row with two buttons left the name ~1px wide. */}
        {slim ? (
          <div className="py-3 border-t border-border flex-shrink-0 flex flex-col items-center gap-1">
            <span
              role="img"
              aria-label={`Signed in as ${signedInAs}`}
              title={signedInAs}
            >
              <Avatar firstName={user.first_name} lastName={user.last_name} size="md" />
            </span>
            <button
              onClick={() => setChangingPassword(true)}
              aria-label="Change password"
              title="Change password"
              className="flex items-center justify-center w-11 h-11 rounded-md text-text-soft hover:text-ink hover:bg-chip transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path strokeLinecap="round" d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              aria-disabled={signingOut || undefined}
              aria-label={signingOut ? 'Signing out…' : 'Sign out'}
              title={signingOut ? 'Signing out…' : 'Sign out'}
              className="flex items-center justify-center w-11 h-11 rounded-md text-text-soft hover:text-danger hover:bg-danger-bg transition-colors aria-disabled:opacity-60 aria-disabled:cursor-wait"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
            </button>
          </div>
        ) : (
          <div className="px-4 pt-3.5 pb-2.5 border-t border-border flex-shrink-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Avatar firstName={user.first_name} lastName={user.last_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-ink truncate">
                  {user.first_name} {user.last_name}
                </p>
                {user.organization_name && (
                  <p className="text-[10.5px] text-text-soft truncate">{user.organization_name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 -mx-2">
              <button
                onClick={() => setChangingPassword(true)}
                className="flex items-center min-h-11 px-2 rounded-md text-text-soft hover:text-ink hover:bg-chip transition-colors"
              >
                <span className="text-[11px] font-semibold whitespace-nowrap">Change password</span>
              </button>

              <button
                onClick={handleLogout}
                aria-disabled={signingOut || undefined}
                className="flex items-center gap-1.5 min-h-11 px-2 rounded-md text-text-soft hover:text-danger hover:bg-danger-bg transition-colors aria-disabled:opacity-60 aria-disabled:cursor-wait"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span className="text-[11px] font-semibold">{signingOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      <SlidePanel open={changingPassword} onClose={() => setChangingPassword(false)} title="Change password">
        {/* Mounted only while open (SlidePanel returns null when closed), so
            no typed password survives a close. */}
        <ChangePasswordForm
          onCancel={() => setChangingPassword(false)}
          onChanged={(n) => {
            toast.success(passwordChangedMessage(n));
            setChangingPassword(false);
          }}
        />
      </SlidePanel>
    </>
  );
}
