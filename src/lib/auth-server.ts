import { cache } from 'react';
import { redirect } from 'next/navigation';
import { serverFetch } from './server-fetch';
import { ENDPOINTS, ROLES, type Role } from './config';
import type { User } from '@/types/auth';

/**
 * Server-trusted identity — FLAG-001 / A5.
 *
 * ⚠️ Do NOT authorize from `hc_user`. That cookie is deliberately
 * `httpOnly: false` so the UI can show a name and role, which means the user
 * can edit it: `document.cookie = 'hc_user={"role":"DOCTOR",...}'`. Every
 * dashboard gate used to read it, so a tampered cookie rendered another role's
 * — or another organisation's — dashboard shell.
 *
 * The authoritative answer comes from the backend, keyed off the **httpOnly**
 * access token the browser cannot read. We ask `/auth/me/` rather than reading
 * the JWT's claims because the access token carries **no role and no
 * organisation** — verified against `api-dev` on 2026-08-28, the payload is
 * stock SimpleJWT:
 *
 *   { token_type, exp, iat, jti, user_id }
 *
 * If the backend ever adds `role` and `organization` claims, this is the one
 * function to change and the round trip disappears. Until then the trip is the
 * price of a server-trusted decision, and `cache()` keeps it to one per render
 * no matter how many components ask.
 */
type MeResponse = Omit<User, 'organization_slug' | 'organization_name'> & {
  organization?: { slug: string; name: string } | null;
};

export const getAuthorizedUser = cache(async (): Promise<User | null> => {
  const me = await serverFetch<MeResponse>(ENDPOINTS.ME);
  // `serverFetch` returns null on ANY failure (FLAG-005) — no token, 401, 500,
  // or a network blip. For an authorization gate every one of those must mean
  // DENY. Failing closed here is deliberate: the cost is a redirect to signin
  // during a backend wobble, and the alternative is trusting the cookie again.
  if (!me?.role) return null;
  return {
    ...me,
    organization_slug: me.organization?.slug,
    organization_name: me.organization?.name,
  };
});

/**
 * Gate a dashboard page on the server's answer, not the browser's.
 *
 * Checks two things, because FLAG-001 describes two different holes:
 *  1. **Role** — the escalation the flag names outright.
 *  2. **Tenant** — the route slug must be the user's own organisation. The old
 *     gates checked only the role, so a real doctor at `demo-clinic` could open
 *     `/other-clinic/doctor` and get that org's shell. That needed no tampering
 *     at all, just a typed URL, and multi-tenancy is the core constraint of
 *     this product (`CLAUDE.md` §1).
 *
 * Both failures redirect to the org's own signin rather than 404ing, so an
 * expired session and a wrong org look the same from outside — no probing which
 * org slugs exist.
 */
export async function requireDashboardUser(role: Role, slug?: string): Promise<User> {
  const user = await getAuthorizedUser();
  // Each portal has its OWN signin. Sending a superadmin to `/signin` strands
  // them on the patients-only portal, where the backend rejects staff — the
  // exact defect PR #84 fixed in `middleware.ts`, still live in this gate.
  const signin = slug
    ? `/${slug}/signin`
    : role === ROLES.SUPERADMIN
      ? '/superadmin/signin'
      : '/signin';

  if (!user || user.role !== role) redirect(signin);
  // SUPERADMIN belongs to no organisation, so it is called without a slug.
  if (slug && user.organization_slug !== slug) redirect(signin);

  return user;
}

export { ROLES };
