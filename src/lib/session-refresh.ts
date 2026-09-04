import { API_BASE_URL, ENDPOINTS } from './config';

/**
 * The one place that trades a refresh token for a new pair — FLAG-001 / A5.
 *
 * Two callers need this and they must not drift apart:
 *  - `POST /api/auth/refresh` — the client's single-flight recovery after a 401
 *    on `/api/data` (`client-api.ts`).
 *  - `middleware.ts` — server-side resume, so a server-rendered dashboard page
 *    has a usable access token *before* `requireDashboardUser()` asks
 *    `/auth/me/` who the visitor is.
 *
 * ⚠️ SimpleJWT **rotates and blacklists**: the `refresh` in the response is a
 * new token and the one we sent is now dead. Whoever calls this MUST persist
 * `refresh` when it comes back, or the next refresh presents a blacklisted
 * token and the user is logged out (`CLAUDE.md` §5).
 */
export type RefreshOutcome =
  /** New pair. `refresh` is absent only if the backend has rotation disabled. */
  | { ok: true; access: string; refresh?: string }
  /** The backend refused the token: expired, blacklisted, or malformed. The session is over. */
  | { ok: false; reason: 'rejected' }
  /** No answer at all — DNS, TLS, timeout, connection refused. Says nothing about the session. */
  | { ok: false; reason: 'unreachable' };

/**
 * The distinction between `rejected` and `unreachable` is the whole point of
 * this return type. A rejected token means sign the user out; an unreachable
 * backend means keep their cookies and try again, because destroying a live
 * seven-day session over one network blip is the worse failure.
 */
export async function refreshSessionTokens(refreshToken: string): Promise<RefreshOutcome> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ENDPOINTS.REFRESH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, reason: 'unreachable' };
  }

  if (!res.ok) return { ok: false, reason: 'rejected' };

  try {
    const { access, refresh } = (await res.json()) as { access?: string; refresh?: string };
    // A 200 with no access token is not a usable session. Treat it as a refusal
    // rather than handing an `undefined` token to the next request.
    if (!access) return { ok: false, reason: 'rejected' };
    return { ok: true, access, refresh };
  } catch {
    return { ok: false, reason: 'rejected' };
  }
}
