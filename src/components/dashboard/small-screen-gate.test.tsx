import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoctorDashboard } from './doctor/DoctorDashboard';
import { NurseDashboard } from './nurse/NurseDashboard';
import { OrgAdminDashboard } from './org-admin/OrgAdminDashboard';
import { ReceptionistDashboard } from './receptionist/ReceptionistDashboard';
import { SuperadminDashboard } from './superadmin/SuperadminDashboard';
import type { User } from '@/types/auth';

/**
 * FLAG-203 — the small-screen gate is a PHI control, and it is opt-in per
 * dashboard. Nothing defended that.
 *
 * 🪤 **Why this file exists.** Only the Nurse dashboard had a gate test, and it
 * asserted the wrong thing anyway. Measured before writing this: deleting
 * `smallScreenGateFor="Doctor"` from `DoctorDashboard` outright left the whole
 * suite green — **161/161 passing with a staff dashboard's PHI gate removed.**
 * The control is one prop, on five components, and four of them had nothing
 * asserting it at all.
 *
 * These tests are deliberately in their own file rather than in the five
 * dashboard test files: this is one invariant that happens to apply five times,
 * and keeping it together means the next dashboard is one line here rather than
 * a convention someone has to notice.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/dashboard',
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

vi.mock('@/lib/client-api', () => ({
  dataGet: vi.fn(() => Promise.resolve({ count: 0, results: [] })),
  dataAction: vi.fn(() => Promise.resolve({})),
  redirectToSignin: vi.fn(),
  ClientApiError: class ClientApiError extends Error {
    constructor(public status: number, public data: unknown, message: string) {
      super(message);
      this.name = 'ClientApiError';
    }
  },
}));

import { dataGet } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);

const USER = {
  id: 'u-1',
  email: 'staff@demo.test',
  first_name: 'Ngozi',
  last_name: 'Balogun',
  organization_slug: 'demo-clinic',
  is_on_duty: true,
} as unknown as User;

const realMatchMedia = window.matchMedia;

function setViewport(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/**
 * `initialStats` is deliberately non-null for every dashboard here. When it is
 * null the dashboard component fetches stats from a hook that sits ABOVE
 * `DashboardShell`, so the gate cannot stop it — a known residual recorded on
 * FLAG-203. These tests are about the children, which are where the
 * patient-level records live.
 */
const DASHBOARDS = [
  { name: 'Doctor', render: () => <DoctorDashboard user={USER} initialStats={{} as never} slug="demo-clinic" /> },
  { name: 'Nurse', render: () => <NurseDashboard user={USER} initialStats={{} as never} slug="demo-clinic" /> },
  { name: 'Organisation Admin', render: () => <OrgAdminDashboard user={USER} initialStats={{} as never} slug="demo-clinic" /> },
  { name: 'Receptionist', render: () => <ReceptionistDashboard user={USER} initialStats={{} as never} slug="demo-clinic" /> },
  { name: 'Super Admin', render: () => <SuperadminDashboard user={USER} initialStats={{} as never} /> },
] as const;

beforeEach(() => dataGetMock.mockClear());
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('FLAG-203 — every staff dashboard refuses to load on a small screen', () => {
  it.each(DASHBOARDS)('$name requests no data below 768px', ({ name, render: renderDashboard }) => {
    setViewport(false);
    render(renderDashboard());

    // The security property. Not "is the notice visible" — "did anything ask
    // the backend for records".
    expect(dataGetMock).not.toHaveBeenCalled();

    // And the user is told why, naming this dashboard rather than a generic page.
    expect(screen.getByText('This dashboard needs a bigger screen')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`the ${name} dashboard is designed for`, 'i'))).toBeInTheDocument();
  });

  it.each(DASHBOARDS)('$name still loads at 768px and above', ({ render: renderDashboard }) => {
    // Proves the assertion above is not vacuous — the gate is viewport-driven,
    // not simply always on. Without this pair, a component that rendered nothing
    // at any width would pass the security test perfectly.
    setViewport(true);
    render(renderDashboard());

    expect(screen.queryByText('This dashboard needs a bigger screen')).not.toBeInTheDocument();
  });
});

/**
 * The degraded path, bounded rather than assumed.
 *
 * When the server-side stats fetch failed, `initialStats` is null and the
 * dashboard falls back to a client fetch — from a hook that sits ABOVE
 * `DashboardShell`, so the gate cannot stop it (FLAG-203 residual).
 *
 * ⚠️ **This asserts a LIMIT, not the leak.** "One aggregate call still happens"
 * is not something to enshrine as correct; what is worth locking down is that it
 * can never grow into a patient-bearing call. Measured 2026-08-29: each
 * dashboard makes exactly one request here, always its own `dashboard/stats`
 * endpoint. If someone later moves a patient list above the shell, this fails.
 */
const PATIENT_BEARING = /patients|episodes|appointments|prescriptions|admissions|vitals|referrals|check-ins/;

describe('FLAG-203 residual — the degraded path stays aggregate-only', () => {
  it.each(DASHBOARDS)('$name asks for no patient-bearing endpoint below 768px', ({ name }) => {
    setViewport(false);
    const withoutStats: Record<string, React.ReactElement> = {
      'Doctor': <DoctorDashboard user={USER} initialStats={null} slug="demo-clinic" />,
      'Nurse': <NurseDashboard user={USER} initialStats={null} slug="demo-clinic" />,
      'Organisation Admin': <OrgAdminDashboard user={USER} initialStats={null} slug="demo-clinic" />,
      'Receptionist': <ReceptionistDashboard user={USER} initialStats={null} slug="demo-clinic" />,
      'Super Admin': <SuperadminDashboard user={USER} initialStats={null} />,
    };
    render(withoutStats[name]);

    const requested = dataGetMock.mock.calls.map((c) => String(c[0]));
    expect(requested.filter((p) => PATIENT_BEARING.test(p))).toEqual([]);
    // And the fallback stays a single aggregate call, not a page of them.
    expect(requested).toHaveLength(1);
    expect(requested[0]).toMatch(/dashboard/);
  });
});
