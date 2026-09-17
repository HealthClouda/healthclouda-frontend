'use client';

import { useEffect, useRef } from 'react';
import { sessionExpiryCodeFrom } from '@/lib/session-expiry-code';
import { endSessionAndRedirect, refreshSession } from '@/lib/client-api';

/** At most one heartbeat every ~60s, however many interactions fire in between. */
export const HEARTBEAT_THROTTLE_MS = 60_000;

/**
 * What counts as "a person is at the keyboard" — keystrokes and clicks/taps.
 * `pointerdown` covers mouse, touch and pen in one listener (`click` alone
 * would miss drags/long-presses that never fire a click).
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['keydown', 'pointerdown'];

/**
 * Build 5 / FLAG-044 — sends `POST /auth/me/heartbeat/` ONLY in response to
 * real interaction, throttled to at most once per ~60s.
 *
 * ⛔ **Never on a timer, on focus, or on `visibilitychange` alone.** A doctor
 * logs in Monday and walks away; today that login lasts all week. A
 * timer-driven ping (or a focus/visibility one — a browser tab left open and
 * focused needs neither typing nor clicking) would keep that abandoned ward
 * computer signed in forever, recreating the exact threat this build exists
 * to close. `use-heartbeat.test.ts` proves this holds: with zero interaction,
 * zero heartbeats fire, however much (simulated) time passes — asserted
 * against a version of this hook that pings on a timer, which the test must
 * fail against before it is trusted.
 *
 * Mounted once, in `DashboardShell` — the one component every dashboard
 * (staff and patient) renders through, so one listener covers every
 * authenticated screen rather than needing six copies.
 */
export function useHeartbeat(): void {
  const lastSentAt = useRef(0);

  useEffect(() => {
    function onActivity() {
      const now = Date.now();
      if (now - lastSentAt.current < HEARTBEAT_THROTTLE_MS) return;
      lastSentAt.current = now;
      void sendHeartbeat();
    }

    async function postHeartbeat(): Promise<Response | null> {
      try {
        return await fetch('/api/auth/heartbeat', { method: 'POST' });
      } catch {
        // Network blip — the next real interaction tries again. A heartbeat
        // that never arrived is not evidence the session is over.
        return null;
      }
    }

    async function sendHeartbeat() {
      let res = await postHeartbeat();
      if (!res || res.status !== 401) return;

      let body = await res.json().catch(() => null);
      let code = sessionExpiryCodeFrom(body);
      if (code) {
        void endSessionAndRedirect(code);
        return;
      }

      // ORDINARY 401 — no code. The access cookie's maxAge equals the access
      // token's hour (FLAG-026), so it lapses on a perfectly healthy session.
      // We cannot leave this to "the next real data call": a clinician typing
      // a long consultation note or filling a vitals form makes NO data call
      // for minutes at a time. Every heartbeat after the hour would fail
      // silently, the backend would judge the session idle, and the first
      // thing they'd see is being signed out on Submit — losing what they
      // typed, while they were active the whole time.
      //
      // So: refresh ONCE through client-api's single-flight promise and retry
      // the heartbeat. It must be that shared promise — a second, independent
      // refresh races the client's own, and the backend rotates + blacklists
      // refresh tokens, so the loser of that race is logged out.
      const refreshed = await refreshSession();
      if (!refreshed.ok) {
        // The refresh itself reported a lapsed session — act on that code.
        // Any other failure is left to the next real data call, which owns
        // the ordinary refresh-and-retry path.
        if (refreshed.code) void endSessionAndRedirect(refreshed.code);
        return;
      }

      res = await postHeartbeat();
      if (!res || res.status !== 401) return;
      body = await res.json().catch(() => null);
      code = sessionExpiryCodeFrom(body);
      // Retry exactly once. A second 401 is not retried again — that would be
      // the refresh loop this build exists to avoid.
      if (code) void endSessionAndRedirect(code);
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, []);
}
