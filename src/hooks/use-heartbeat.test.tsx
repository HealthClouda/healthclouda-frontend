import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { useHeartbeat, HEARTBEAT_THROTTLE_MS } from './use-heartbeat';

/**
 * Build 5 / FLAG-044 — the one test in this build that matters most.
 *
 * A doctor logs in Monday and walks away; today that login lasts all week.
 * A heartbeat that fires on ANY schedule (a `setInterval`, a `focus` or
 * `visibilitychange` listener) would keep that abandoned session alive
 * forever, recreating the exact threat the 15-minute idle cap exists to
 * close. So the load-bearing assertion here is not "the heartbeat works" —
 * it is "the heartbeat does NOTHING without a real person at the keyboard".
 *
 * `TimerBasedHeartbeatProbe` below is a deliberately-wrong decoy — the bug
 * this file exists to catch. The first test proves the "zero heartbeats with
 * no interaction" assertion is capable of failing (RED) by running it
 * against the decoy; every test after that runs the same shape of assertion
 * against the real hook and must be GREEN.
 */

vi.mock('@/lib/client-api', () => ({
  endSessionAndRedirect: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue({ ok: true }),
}));

function HeartbeatProbe() {
  useHeartbeat();
  return null;
}

/** The bug this build must not reintroduce: pings on a timer, not on interaction. */
function TimerBasedHeartbeatProbe() {
  useEffect(() => {
    const id = setInterval(() => {
      void fetch('/api/auth/heartbeat', { method: 'POST' });
    }, HEARTBEAT_THROTTLE_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}

describe('useHeartbeat', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('RED CONTROL: a timer-based ping DOES fire with zero interaction — proves the assertion below can fail', async () => {
    render(<TimerBasedHeartbeatProbe />);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_THROTTLE_MS * 3);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('sends ZERO heartbeats with no interaction, however much time passes', async () => {
    render(<HeartbeatProbe />);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_THROTTLE_MS * 10);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends exactly one heartbeat for a burst of interaction inside the throttle window', async () => {
    render(<HeartbeatProbe />);
    window.dispatchEvent(new Event('keydown'));
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/heartbeat', { method: 'POST' });
  });

  it('throttles to once per ~60s — a second interaction inside the window sends nothing more', async () => {
    render(<HeartbeatProbe />);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(HEARTBEAT_THROTTLE_MS / 2);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a new heartbeat once the throttle window has elapsed and interaction resumes', async () => {
    render(<HeartbeatProbe />);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(HEARTBEAT_THROTTLE_MS + 1);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ends the session and redirects on SESSION_IDLE_EXPIRED, and does not retry', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'expired', code: 'SESSION_IDLE_EXPIRED' }), { status: 401 }),
    );
    render(<HeartbeatProbe />);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);

    const { endSessionAndRedirect } = await import('@/lib/client-api');
    expect(endSessionAndRedirect).toHaveBeenCalledWith('SESSION_IDLE_EXPIRED');
    expect(fetchMock).toHaveBeenCalledTimes(1); // never attempts a refresh/retry
  });

  it('ends the session on SESSION_MAX_AGE_EXPIRED too', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'expired', code: 'SESSION_MAX_AGE_EXPIRED' }), { status: 401 }),
    );
    render(<HeartbeatProbe />);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);

    const { endSessionAndRedirect } = await import('@/lib/client-api');
    expect(endSessionAndRedirect).toHaveBeenCalledWith('SESSION_MAX_AGE_EXPIRED');
  });

  it('an ORDINARY 401 (no code) is left alone — no redirect from here', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: 'token expired' }), { status: 401 }));
    render(<HeartbeatProbe />);
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(0);

    const { endSessionAndRedirect } = await import('@/lib/client-api');
    expect(endSessionAndRedirect).not.toHaveBeenCalled();
  });

  // ── Ordinary 401: the hourly access-token lapse ──────────────────────────
  //
  // The access cookie's maxAge equals the access token's hour (FLAG-026), so
  // it lapses on a perfectly healthy session. A clinician typing a long note
  // makes no data call for minutes, so nothing else refreshes for them. If
  // the heartbeat just gave up here, the backend would judge the session idle
  // and sign them out on Submit, losing what they typed — while they were
  // active throughout. Raised by @Qeeyat reviewing #155.
  it('refreshes ONCE and retries the heartbeat when the access cookie has lapsed (ordinary 401, no code)', async () => {
    const { refreshSession } = await import('@/lib/client-api');
    const { endSessionAndRedirect } = await import('@/lib/client-api');
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    render(<HeartbeatProbe />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // original + one retry
    expect(endSessionAndRedirect).not.toHaveBeenCalled();
  });

  it('does not retry a second time — a retry loop is the thing being avoided', async () => {
    const { refreshSession } = await import('@/lib/client-api');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    render(<HeartbeatProbe />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // never a third
  });

  it('acts on a lapsed-session code reported by the refresh itself', async () => {
    const { refreshSession, endSessionAndRedirect } = await import('@/lib/client-api');
    vi.mocked(refreshSession).mockResolvedValueOnce({ ok: false, code: 'SESSION_IDLE_EXPIRED' });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    render(<HeartbeatProbe />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await vi.advanceTimersByTimeAsync(0);

    expect(endSessionAndRedirect).toHaveBeenCalledWith('SESSION_IDLE_EXPIRED');
    expect(fetchMock).toHaveBeenCalledTimes(1); // not retried
  });
});
