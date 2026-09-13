import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardShell } from './DashboardShell';
import type { User } from '@/types/auth';

/**
 * FLAG-203 — below 768px a staff dashboard must not MOUNT, not merely be hidden.
 *
 * The old gate was `hidden md:flex`. The children still mounted, still ran their
 * `useApi` calls, and the patient records still landed in the device's DOM —
 * `display: none` hides pixels, not data. These tests assert the thing the notice
 * has always claimed: that on a small screen the records are *not there*.
 *
 * The probe below stands in for `MyPatientsPage` / `EpisodesPage` / the rest:
 * every one of them fires a PHI fetch from a hook on mount, so "did this
 * component render" and "did we fetch patient data" are the same question.
 */

vi.mock('./Sidebar', () => ({ Sidebar: () => <nav data-testid="sidebar" /> }));
vi.mock('./DashboardHeader', () => ({ DashboardHeader: () => <header data-testid="header" /> }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span data-testid="logo">{alt}</span>,
}));

const USER = {
  id: 'u-1',
  email: 'doctor@demo.test',
  first_name: 'Emeka',
  last_name: 'Okafor',
  role: 'DOCTOR',
} as User;

/** Records that it mounted — i.e. that its PHI fetch would have fired. */
const phiFetch = vi.fn();
function PatientRecordsPanel() {
  phiFetch();
  return <div>Adaeze Nwosu — HCL-0001234</div>;
}

const realMatchMedia = window.matchMedia;

/** `null` = no matchMedia at all, the "we cannot measure" case. */
function setViewport(matches: boolean | null) {
  if (matches === null) {
    // @ts-expect-error deliberately removing it to test the unmeasurable case
    delete window.matchMedia;
    return;
  }
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderShell() {
  return render(
    <DashboardShell
      navItems={[]}
      activePage="patients"
      onPageChange={() => {}}
      user={USER}
      smallScreenGateFor="Doctor"
    >
      <PatientRecordsPanel />
    </DashboardShell>,
  );
}

beforeEach(() => phiFetch.mockClear());
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('FLAG-203 — a small screen must not receive the records', () => {
  it('does not mount the dashboard children below 768px', () => {
    setViewport(false); // narrow
    renderShell();

    // The real assertion: the panel never ran, so its PHI fetch never fired.
    expect(phiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Adaeze Nwosu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HCL-0001234/)).not.toBeInTheDocument();
  });

  it('shows the small-screen notice instead', () => {
    setViewport(false);
    renderShell();

    expect(screen.getByText(/needs a bigger screen/i)).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('fails closed when the viewport cannot be measured', () => {
    // No `matchMedia` — SSR, or a runtime that does not implement it. We do not
    // know the viewport, and "do not know" must never resolve to "show records".
    setViewport(null);
    renderShell();

    expect(phiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Adaeze Nwosu/)).not.toBeInTheDocument();
  });

  it('does not accuse a desktop user of having a small screen while measuring', () => {
    // The unmeasured first paint must be neutral: no dashboard, but also not the
    // "you need a bigger screen" notice, which would be false for most users.
    setViewport(null);
    renderShell();

    expect(screen.queryByText(/needs a bigger screen/i)).not.toBeInTheDocument();
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });
});

describe('FLAG-203 — the legitimate case still works', () => {
  it('mounts the dashboard at 768px and above', () => {
    setViewport(true); // wide
    renderShell();

    expect(phiFetch).toHaveBeenCalled();
    expect(screen.getByText(/Adaeze Nwosu/)).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.queryByText(/needs a bigger screen/i)).not.toBeInTheDocument();
  });

  it('leaves dashboards without the gate untouched at any width', () => {
    // DASH-6 Patient is deliberately responsive and omits `smallScreenGateFor`.
    setViewport(false); // narrow — must still render
    render(
      <DashboardShell navItems={[]} activePage="overview" onPageChange={() => {}} user={USER}>
        <PatientRecordsPanel />
      </DashboardShell>,
    );

    expect(phiFetch).toHaveBeenCalled();
    expect(screen.getByText(/Adaeze Nwosu/)).toBeInTheDocument();
  });
});
