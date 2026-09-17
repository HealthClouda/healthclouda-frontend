'use client';

import { useEffect, useRef } from 'react';
import { sessionExpiryCodeFrom } from '@/lib/session-expiry-code';
import { endSessionAndRedirect } from '@/lib/client-api';

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

    async function sendHeartbeat() {
      let res: Response;
      try {
        res = await fetch('/api/auth/heartbeat', { method: 'POST' });
      } catch {
        // Network blip — the next real interaction tries again. Nothing to
        // act on; a heartbeat that never arrived is not evidence the session
        // is over.
        return;
      }
      if (res.status !== 401) return;
      const body = await res.json().catch(() => null);
      const code = sessionExpiryCodeFrom(body);
      // An ORDINARY 401 here (e.g. the hourly access-token rotation, not an
      // expired session) is deliberately left alone: the next real data call
      // goes through `client-api.ts`'s own refresh-and-retry, which already
      // owns that path. Only an already-lapsed session is acted on here —
      // and per the contract, never by retrying.
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
