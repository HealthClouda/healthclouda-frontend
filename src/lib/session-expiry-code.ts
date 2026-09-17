/**
 * Build 5 / FLAG-044 — the two codes the backend sends on a 401 once a session
 * has already lapsed (idle > 15 minutes, or > 12 hours since sign-in).
 *
 * ⚠️ Deliberately has NO import of `window`, `lib/router`, or anything else
 * that is unsafe on the edge runtime — `middleware.ts` imports this file
 * directly (see its own comment on why it cannot import from `lib/router`).
 * The client-only follow-up (clear cookies, redirect with a message) lives in
 * `client-api.ts` instead, which already runs client-side only.
 */

export type SessionExpiryCode = 'SESSION_IDLE_EXPIRED' | 'SESSION_MAX_AGE_EXPIRED';

const CODES: ReadonlySet<string> = new Set<SessionExpiryCode>([
  'SESSION_IDLE_EXPIRED',
  'SESSION_MAX_AGE_EXPIRED',
]);

/**
 * Pulls the session-expiry code off a 401 body, or `null` for an ORDINARY 401
 * (wrong password on a fresh request, a 401 with no `code` at all, or a
 * `code` this build does not recognise). An ordinary 401 keeps today's
 * refresh-and-retry behaviour untouched — only these two codes short-circuit it.
 */
export function sessionExpiryCodeFrom(data: unknown): SessionExpiryCode | null {
  const code = (data as { code?: unknown } | null)?.code;
  return typeof code === 'string' && CODES.has(code) ? (code as SessionExpiryCode) : null;
}

/** The query-string value carried to the signin page — never the raw backend code. */
export const SESSION_EXPIRY_REASON: Record<SessionExpiryCode, string> = {
  SESSION_IDLE_EXPIRED: 'idle',
  SESSION_MAX_AGE_EXPIRED: 'max_age',
};

/** Plain-language copy for the signin page, keyed by the `?reason=` value above. */
export const SESSION_EXPIRY_MESSAGES: Record<string, string> = {
  idle: 'You were signed out after 15 minutes of inactivity.',
  max_age: 'Your 12-hour session ended — please sign in again.',
};
