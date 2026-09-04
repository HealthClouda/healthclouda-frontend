import Image from 'next/image';

interface SmallScreenGateProps {
  /** e.g. "Super Admin", "Nurse" — used in the notice copy. */
  dashboardName: string;
}

/**
 * Below 768px, staff/admin dashboards show only this notice instead of the
 * shell (design_handoff_dashboards/README.md). Applies to DASH-1..5 — the
 * patient dashboard (DASH-6) stays responsive and must not use this.
 *
 * ⚠️ **No `md:hidden` here, deliberately (FLAG-203).** This used to carry its own
 * breakpoint class while `DashboardShell` carried the mirror-image one, so two
 * mechanisms decided the same thing and both were CSS — which is why the
 * dashboard stayed mounted underneath. `DashboardShell` now decides in JS
 * whether this renders at all, and it is the only thing that decides.
 */
export function SmallScreenGate({ dashboardName }: SmallScreenGateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-page text-center p-8">
      <Image src="/assets/images/HealthClouda-icon-tight.png" alt="HealthClouda" width={64} height={32} className="w-16 h-8 object-contain" />
      <div className="w-14 h-14 rounded-card bg-chip text-primary flex items-center justify-center">
        <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <p className="font-body font-black text-lg text-ink">This dashboard needs a bigger screen</p>
      <p className="text-[13.5px] text-text-soft max-w-[300px] leading-relaxed">
        The {dashboardName} dashboard is designed for tablets, laptops and desktops. Please sign in
        from a device with a larger screen.
      </p>
    </div>
  );
}
