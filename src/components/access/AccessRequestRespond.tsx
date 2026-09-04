'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AccessRequestInfo } from '@/types/auth';

// Patient-facing access-request consent page (design auth canvas screens 9–10).
// Flow per the design README: on load GET the request details by token; a valid
// `action=accept|deny` URL param auto-submits; otherwise the patient chooses.
// The decision itself only ever happens via POST (backend FLAG-241 — GET is
// read-only so email-scanner prefetches can't mutate).
//
// GET  → { organization, patient_name, status, expired } (+ reason/requested_at
//        once backend #71 ships — rendered conditionally below)
// POST { token, action } → 200 { message } | 400 already-responded/expired

type Phase =
  | { name: 'loading' }
  | { name: 'invalid' }
  | { name: 'pending'; info: AccessRequestInfo }
  | { name: 'submitting'; info: AccessRequestInfo | null }
  | { name: 'approved'; org: string }
  | { name: 'denied'; org: string }
  | { name: 'already_approved'; org: string }
  | { name: 'already_denied'; org: string }
  | { name: 'expired' }
  | { name: 'error' };

// Map a fetched request to its display phase (shared by initial load and the
// re-GET after a rejected POST, so both always agree).
function phaseFromInfo(info: AccessRequestInfo): Phase {
  if (info.status === 'APPROVED') return { name: 'already_approved', org: info.organization };
  if (info.status === 'DENIED') return { name: 'already_denied', org: info.organization };
  if (info.expired) return { name: 'expired' };
  return { name: 'pending', info };
}

function formatRequestedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Stroke SVG icons lifted verbatim from the design (outcome chips) ──

function LockChipIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckChipIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XChipIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WarnChipIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ── Card scaffolding (480px pending card / 420px outcome cards) ──

function Card({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faff] px-5 py-12 font-body">
      <div
        className={`w-full ${wide ? 'max-w-[480px] px-9' : 'max-w-[420px] px-8'} rounded-[20px] border border-[rgba(0,117,255,0.1)] bg-white py-10 text-center shadow-card`}
      >
        {children}
        <div className="mt-7 text-xs text-[#9ca3af]">
          Powered by{' '}
          <Link href="/" className="font-bold hover:underline">
            HealthClouda
          </Link>
        </div>
      </div>
    </div>
  );
}

function Chip({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
      style={{ background: tint }}
    >
      {children}
    </div>
  );
}

function Outcome({ icon, tint, title, children }: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <Chip tint={tint}>{icon}</Chip>
      <h1 className="mb-2.5 font-heading text-xl font-bold text-ink">{title}</h1>
      <p className="text-[13.5px] leading-relaxed text-[#374151]">{children}</p>
    </Card>
  );
}

function Inner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const action = params.get('action');
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  // The auto-submit action is consumed once — a failed POST must not loop.
  const autoSubmitted = useRef(false);

  const submit = useCallback(
    async (chosen: 'accept' | 'deny', info: AccessRequestInfo | null) => {
      setPhase({ name: 'submitting', info });
      try {
        const res = await fetch('/api/access-request/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, action: chosen }),
        });
        if (res.ok) {
          const org = info?.organization ?? 'the organization';
          setPhase(chosen === 'accept' ? { name: 'approved', org } : { name: 'denied', org });
          return;
        }
        // Rejected (already responded / expired / invalid) — the GET is the
        // authority on which, so re-fetch rather than parsing message strings.
        const detail = await fetch(
          `/api/access-request/respond?token=${encodeURIComponent(token)}`,
        );
        if (detail.ok) setPhase(phaseFromInfo((await detail.json()) as AccessRequestInfo));
        else if (detail.status === 404 || detail.status === 400) setPhase({ name: 'invalid' });
        else setPhase({ name: 'error' });
      } catch {
        setPhase({ name: 'error' });
      }
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) { setPhase({ name: 'invalid' }); return; }
    setPhase({ name: 'loading' });
    try {
      const res = await fetch(`/api/access-request/respond?token=${encodeURIComponent(token)}`);
      if (res.status === 404 || res.status === 400) { setPhase({ name: 'invalid' }); return; }
      if (!res.ok) { setPhase({ name: 'error' }); return; }
      const info = (await res.json()) as AccessRequestInfo;
      const next = phaseFromInfo(info);
      if (
        next.name === 'pending' &&
        (action === 'accept' || action === 'deny') &&
        !autoSubmitted.current
      ) {
        autoSubmitted.current = true;
        void submit(action, info);
        return;
      }
      setPhase(next);
    } catch {
      setPhase({ name: 'error' });
    }
  }, [token, action, submit]);

  useEffect(() => { void load(); }, [load]);

  if (phase.name === 'loading' || phase.name === 'submitting') {
    return (
      <Card>
        <Chip tint="#ebf3ff">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#c7daff] border-t-primary" />
        </Chip>
        <h1 className="mb-2 font-heading text-[22px] font-bold text-ink">
          {phase.name === 'submitting' ? 'Recording your response…' : 'Loading request…'}
        </h1>
        <p className="text-sm leading-relaxed text-[#6b7280]">This will only take a moment.</p>
      </Card>
    );
  }

  if (phase.name === 'pending') {
    const { info } = phase;
    return (
      <Card wide>
        <Chip tint="#ebf3ff">
          <span className="text-primary"><LockChipIcon /></span>
        </Chip>
        <h1 className="mb-2 font-heading text-[22px] font-bold text-ink">Access Request</h1>
        <p className="mb-6 text-sm leading-relaxed text-[#6b7280]">
          An organization is requesting access to your medical records.
        </p>

        <div className="mb-6 flex flex-col gap-2.5 rounded-[10px] border border-[#e8edf5] bg-[#f9fafb] px-5 py-4 text-left">
          <div className="flex justify-between gap-4 text-[13.5px]">
            <span className="font-heading text-[12.5px] font-bold text-[#6b7280]">Organization</span>
            <span className="text-right font-medium text-ink">{info.organization}</span>
          </div>
          <div className="flex justify-between gap-4 text-[13.5px]">
            <span className="font-heading text-[12.5px] font-bold text-[#6b7280]">Patient</span>
            <span className="text-right font-medium text-ink">{info.patient_name}</span>
          </div>
          {info.reason && (
            <div className="flex flex-col gap-1 text-[13.5px]">
              <span className="font-heading text-[12.5px] font-bold text-[#6b7280]">Reason</span>
              <span className="font-medium leading-normal text-ink">{info.reason}</span>
            </div>
          )}
          {info.requested_at && (
            <div className="flex justify-between gap-4 text-[13.5px]">
              <span className="font-heading text-[12.5px] font-bold text-[#6b7280]">Requested</span>
              <span className="text-right font-medium text-ink">{formatRequestedAt(info.requested_at)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void submit('accept', info)}
            className="h-[46px] flex-1 rounded-[11px] bg-[#16a34a] font-heading text-sm font-semibold text-white transition-colors hover:bg-[#15803d]"
          >
            Approve Access
          </button>
          <button
            type="button"
            onClick={() => void submit('deny', info)}
            className="h-[46px] flex-1 rounded-[11px] bg-[#fee2e2] font-heading text-sm font-semibold text-[#dc2626] transition-colors hover:bg-[#dc2626] hover:text-white"
          >
            Deny Access
          </button>
        </div>
      </Card>
    );
  }

  if (phase.name === 'approved') {
    return (
      <Outcome icon={<CheckChipIcon />} tint="#dcfce7" title="Access Approved">
        You have granted <strong>{phase.org}</strong> access to your medical records.
      </Outcome>
    );
  }

  if (phase.name === 'denied') {
    return (
      <Outcome icon={<XChipIcon />} tint="#fee2e2" title="Access Denied">
        You have denied the access request from <strong>{phase.org}</strong>. Your records
        remain private.
      </Outcome>
    );
  }

  if (phase.name === 'already_approved') {
    return (
      <Outcome icon={<CheckChipIcon />} tint="#dcfce7" title="Already Approved">
        This access request from <strong>{phase.org}</strong> has already been approved. No
        further action is needed.
      </Outcome>
    );
  }

  if (phase.name === 'already_denied') {
    return (
      <Outcome icon={<XChipIcon />} tint="#fee2e2" title="Already Denied">
        This access request from <strong>{phase.org}</strong> has already been denied. Your
        records remain private.
      </Outcome>
    );
  }

  if (phase.name === 'expired') {
    return (
      <Outcome icon={<WarnChipIcon />} tint="#fef3c7" title="Link Expired">
        This access request link has expired. Please contact the organization for a new
        request.
      </Outcome>
    );
  }

  if (phase.name === 'invalid') {
    return (
      <Outcome icon={<XChipIcon />} tint="#fee2e2" title="Invalid Link">
        This link is invalid or incomplete. Please use the link exactly as it appears in
        your email.
      </Outcome>
    );
  }

  return (
    <Card>
      <Chip tint="#fef3c7"><WarnChipIcon /></Chip>
      <h1 className="mb-2.5 font-heading text-xl font-bold text-ink">Connection Error</h1>
      <p className="mb-6 text-[13.5px] leading-relaxed text-[#374151]">
        We couldn&apos;t reach the server. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => void load()}
        className="h-[46px] w-full rounded-[11px] bg-primary font-heading text-sm font-semibold text-white shadow-btn-primary transition-colors hover:bg-primary-dark"
      >
        Try Again
      </button>
    </Card>
  );
}

export function AccessRequestRespond() {
  return <Suspense><Inner /></Suspense>;
}
