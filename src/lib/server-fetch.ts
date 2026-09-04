import { getAccessToken } from './auth';
import { API_BASE_URL } from './config';

/**
 * Why a request failed. `status` is null for failures that never got a response.
 *
 * `no_token` is a normal state, not an incident: a logged-out visitor hitting a
 * server-rendered route has no cookie. It is deliberately NOT logged, or every
 * anonymous page view would produce an error line.
 */
export type ServerFetchFailure = {
  ok: false;
  status: number | null;
  reason: 'no_token' | 'unauthorized' | 'forbidden' | 'not_found' | 'server' | 'network' | 'malformed';
};

export type ServerFetchResult<T> = { ok: true; data: T } | ServerFetchFailure;

function reasonFor(status: number): ServerFetchFailure['reason'] {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return 'server';
}

/**
 * Log a failure with enough to act on and nothing that must not be logged.
 *
 * 🔴 Deliberately logs the STATUS and the PATH only — never the response body
 * and never the token. Bodies from this API carry patient data, and a log line
 * is exactly the wrong place for it. The path can contain a patient id, which is
 * why `Referrer-Policy` is set the way it is; inside our own server logs that is
 * acceptable, a full record is not.
 */
function logFailure(endpoint: string, f: ServerFetchFailure) {
  if (f.reason === 'no_token') return;
  console.error(
    `[serverFetch] ${f.reason} status=${f.status ?? 'none'} path=${endpoint}`,
  );
}

/**
 * Fetch from the backend on the server, reporting WHY it failed — FLAG-005 / E7.
 *
 * The original `serverFetch` turned auth errors, 500s, network failures and
 * malformed JSON all into `null`, indistinguishable from "no data", and logged
 * nothing. A production incident therefore looked like an empty dashboard with
 * no signal anywhere — which during hypercare means nobody finds out from us.
 *
 * Prefer this over `serverFetch` in new code: it lets a caller render an error
 * state instead of an empty one, which is the third clause of FLAG-005.
 */
export async function serverFetchResult<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ServerFetchResult<T>> {
  const token = await getAccessToken();
  if (!token) return { ok: false, status: null, reason: 'no_token' };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string> | undefined),
      },
      cache: 'no-store',
    });
  } catch {
    // DNS, TLS, timeout, connection refused — no response ever arrived. This is
    // the case most worth seeing in a log: it usually means the tier is
    // misconfigured or the backend is down, not that a user did something.
    const failure: ServerFetchFailure = { ok: false, status: null, reason: 'network' };
    logFailure(endpoint, failure);
    return failure;
  }

  if (!res.ok) {
    const failure: ServerFetchFailure = { ok: false, status: res.status, reason: reasonFor(res.status) };
    logFailure(endpoint, failure);
    return failure;
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    // A 200 whose body is not JSON. Usually an HTML error page from a proxy or
    // edge, which is precisely the failure that used to look like "no data".
    const failure: ServerFetchFailure = { ok: false, status: res.status, reason: 'malformed' };
    logFailure(endpoint, failure);
    return failure;
  }
}

/**
 * Back-compatible wrapper: the data, or `null` for any failure.
 *
 * ⚠️ Kept deliberately, and its contract is unchanged. `requireDashboardUser()`
 * (FLAG-001) treats `null` as DENY, which is the correct fail-closed behaviour
 * for an authorization gate — this change adds signal, it does not move that
 * goalpost. Existing callers keep working and now get logging for free.
 *
 * New code that can show the user something better should call
 * `serverFetchResult` and branch on `ok`.
 */
export async function serverFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> {
  const res = await serverFetchResult<T>(endpoint, options);
  return res.ok ? res.data : null;
}
