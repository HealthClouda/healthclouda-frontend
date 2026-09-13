import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROLES, type Role } from '@/lib/config';

/**
 * T3 — the role-gate and tenant-isolation matrix.
 *
 * `BETA_READINESS.md` Tier 1 item 4 calls this "the most important gate suite"
 * and asks for **every role × every dashboard**. `dashboard-gate.test.tsx`
 * (shipped with #99) proves the property on **DOCTOR only** — one page of six.
 * A control demonstrated on one of six surfaces is not the same claim as a
 * control, and the five unproven ones are five separate `requireDashboardUser`
 * call sites that could each have been wired wrong independently.
 *
 * ⚠️ **Why this is a matrix rather than more hand-written cases.** FLAG-221 is
 * the repeated finding in this repo that a green test can say nothing about the
 * property it appears to protect. The defence here is that the expectation is
 * *derived* from the page under test rather than typed next to it: no case can
 * be quietly written to assert what the code already does, because no case is
 * written individually at all.
 *
 * 🔑 **Every denial below is ALSO a tampered-cookie denial.** The `hc_user`
 * mock is rebuilt per case to claim exactly the role and org the page wants —
 * the best forgery a browser can produce, since `hc_user` is deliberately
 * `httpOnly: false`. So a passing denial says the gate ignored a
 * *correct-looking* cookie, which is the actual FLAG-001 threat, not merely
 * that it ignored a malformed one.
 *
 * **Proven able to fail:** see `docs/T3-SABOTAGE.md`. A control that has never
 * failed is indistinguishable from a control that cannot.
 */

const redirectMock = vi.fn((path: string) => {
  // Next's redirect() throws to halt rendering. Emulating that is load-bearing:
  // without it a page that redirects could still fall through and return
  // markup, and the test would pass on a gate that leaks the shell anyway.
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

/** The forged cookie for the case currently running. Set by `attempt()`. */
let cookieClaim = '';
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'hc_user' ? { value: cookieClaim } : { value: 'a-real-access-token' },
  }),
}));

const serverFetchMock = vi.fn();
vi.mock('@/lib/server-fetch', () => ({ serverFetch: (p: string) => serverFetchMock(p) }));

// ── The six dashboards, and what each one's gate is supposed to assert ───────

type Page = {
  /** Human name, used in test titles. */
  name: string;
  /** The one role `requireDashboardUser` is called with. */
  role: Role;
  /** Slug-scoped pages take `params`; `/superadmin` and `/patient` do not. */
  slugged: boolean;
  /** Where a denial must land — each portal has its OWN signin (PR #84). */
  signin: (slug: string) => string;
  load: () => Promise<{ default: unknown }>;
};

const PAGES: Page[] = [
  {
    name: 'doctor', role: ROLES.DOCTOR, slugged: true,
    signin: (s) => `/${s}/signin`,
    load: () => import('./[slug]/doctor/page'),
  },
  {
    name: 'nurse', role: ROLES.NURSE, slugged: true,
    signin: (s) => `/${s}/signin`,
    load: () => import('./[slug]/nurse/page'),
  },
  {
    name: 'org-admin', role: ROLES.ORG_ADMIN, slugged: true,
    signin: (s) => `/${s}/signin`,
    load: () => import('./[slug]/org-admin/page'),
  },
  {
    name: 'receptionist', role: ROLES.RECEPTIONIST, slugged: true,
    signin: (s) => `/${s}/signin`,
    load: () => import('./[slug]/receptionist/page'),
  },
  {
    // A superadmin belongs to no organisation, so there is no tenant to check —
    // and sending them to `/signin` would strand them on the patients-only
    // portal, where the backend rejects staff outright.
    name: 'superadmin', role: ROLES.SUPERADMIN, slugged: false,
    signin: () => '/superadmin/signin',
    load: () => import('./superadmin/page'),
  },
  {
    // FLAG-210: slug-less by design — records move WITH the patient, so a
    // patient belongs to no single org.
    name: 'patient', role: ROLES.PATIENT, slugged: false,
    signin: () => '/signin',
    load: () => import('./patient/page'),
  },
];

const ALL_ROLES: Role[] = Object.values(ROLES);

const OWN = 'demo-clinic';
const OTHER = 'other-clinic';

/** What `/auth/me/` says — the only source the gate is allowed to trust. */
const ME = (role: Role, slug: string | null) => ({
  id: 'u-1', email: 'someone@demo.test', first_name: 'Ada', last_name: 'Obi',
  role,
  organization: slug ? { id: 'o-1', name: 'Demo Clinic', slug } : null,
});

beforeEach(() => {
  redirectMock.mockClear();
  serverFetchMock.mockReset();
});

/**
 * Run one page's gate against one server answer, with `hc_user` forged to claim
 * whatever that page wants. Returns the promise so a caller can assert on
 * either outcome.
 */
function attempt(page: Page, opts: { me: unknown; slug?: string }) {
  cookieClaim = encodeURIComponent(JSON.stringify({
    id: 'u-1', email: 'someone@demo.test', first_name: 'Ada', last_name: 'Obi',
    role: page.role,
    organization_slug: opts.slug ?? OWN,
  }));
  serverFetchMock.mockImplementation((path: string) =>
    Promise.resolve(path === '/auth/me/' ? opts.me : {}),
  );
  return page.load().then(({ default: Component }) =>
    page.slugged
      ? (Component as (p: { params: Promise<{ slug: string }> }) => Promise<unknown>)({
          params: Promise.resolve({ slug: opts.slug ?? OWN }),
        })
      : (Component as () => Promise<unknown>)(),
  );
}

// ── 1. Role escalation — every wrong role on every dashboard ────────────────

describe('T3 · role gate — every wrong role on every dashboard', () => {
  for (const page of PAGES) {
    for (const wrong of ALL_ROLES.filter((r) => r !== page.role)) {
      it(`${page.name}: denies ${wrong} (cookie forged as ${page.role})`, async () => {
        // The wrong-role user is otherwise entirely legitimate: real token, real
        // session, member of the org in the URL. Only the role is not this
        // page's role — which is the realistic escalation, not an attacker with
        // no session at all.
        await expect(
          attempt(page, { me: ME(wrong, page.slugged ? OWN : null) }),
        ).rejects.toThrow(`REDIRECT:${page.signin(OWN)}`);
      });
    }
  }
});

// ── 2. Tenant isolation — the cross-org walk that needs no tampering ────────

describe('T3 · tenant isolation — a real user of one org cannot open another org', () => {
  for (const page of PAGES.filter((p) => p.slugged)) {
    it(`${page.name}: denies a real ${page.role} of ${OWN} at /${OTHER}`, async () => {
      // Nothing is forged in the meaningful sense here — this is a legitimate
      // member of staff typing another org's slug into the address bar. It is
      // the cheapest possible attack on a multi-tenant system and it requires
      // no tooling at all.
      await expect(
        attempt(page, { me: ME(page.role, OWN), slug: OTHER }),
      ).rejects.toThrow(`REDIRECT:${page.signin(OTHER)}`);
    });

    it(`${page.name}: denies a ${page.role} whose /auth/me/ carries no organisation`, async () => {
      // `organization: null` is a real state on this backend (it is the correct
      // answer for a patient, FLAG-210), so `organization_slug` is `undefined`
      // here. `undefined !== slug` denies — but that is the gate incidentally
      // doing the right thing, so it is worth pinning: a future refactor that
      // reads "no org" as "any org" fails here.
      await expect(
        attempt(page, { me: ME(page.role, null), slug: OWN }),
      ).rejects.toThrow(`REDIRECT:${page.signin(OWN)}`);
    });
  }

  for (const page of PAGES.filter((p) => !p.slugged)) {
    it(`${page.name}: is slug-less by design, so org membership grants nothing`, async () => {
      // Guards the inverse mistake: a slug-less page must gate on role alone and
      // must not start passing because the user happens to belong to some org.
      await expect(
        attempt(page, { me: ME(ROLES.DOCTOR, OWN) }),
      ).rejects.toThrow(`REDIRECT:${page.signin(OWN)}`);
    });
  }
});

// ── 3. Fail closed — every non-answer is a denial ───────────────────────────

describe('T3 · fail closed — an unconfirmable session is denied, never assumed', () => {
  // `serverFetch` returns null on ANY failure (FLAG-005): no token, a 401, a
  // 500, a network blip. For an authorization gate every one of those must mean
  // DENY. The cost of failing closed is a redirect during a backend wobble; the
  // cost of failing open is another org's dashboard shell.
  for (const page of PAGES) {
    it(`${page.name}: denies when /auth/me/ returns null`, async () => {
      await expect(attempt(page, { me: null })).rejects.toThrow(
        `REDIRECT:${page.signin(OWN)}`,
      );
    });

    it(`${page.name}: denies when /auth/me/ answers without a role`, async () => {
      // A 200 with a body carrying no `role` — a partial serializer, a proxy
      // error page, a shape change. `if (!me?.role) return null` covers it, and
      // this pins that a truthy-but-roleless answer is not treated as identity.
      await expect(
        attempt(page, { me: { id: 'u-1', email: 'someone@demo.test' } }),
      ).rejects.toThrow(`REDIRECT:${page.signin(OWN)}`);
    });
  }
});

// ── 4. The legitimate case — the gate must not be a brick ──────────────────

describe('T3 · the legitimate case still renders on all six dashboards', () => {
  // Without these, every assertion above is satisfiable by a gate that denies
  // everyone — which is the failure mode a deny-only suite cannot see.
  for (const page of PAGES) {
    it(`${page.name}: renders for a real ${page.role}`, async () => {
      const el = await attempt(page, {
        me: ME(page.role, page.slugged ? OWN : null),
      });
      expect(redirectMock).not.toHaveBeenCalled();
      expect(el).toBeTruthy();
    });
  }
});
