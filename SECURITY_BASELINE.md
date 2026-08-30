# Security Baseline — HealthClouda Frontend

> **A7 (sprint plan Tier 1).** The security floor this frontend must hold before real patient data
> arrives, what is actually in place today, and what knowingly is not.
>
> **Scope: this repo only.** The backend authorises every request and has its own baseline; nothing
> here replaces it. **This document covers the layer the user's browser touches.**
>
> **Status:** first written **2026-08-28** by @Bastoh, six days before the beta org onboards with real
> PHI on **3 Sep 2026**. Every "verified" line was measured against the live `dev` tier on that date —
> not read from config. **Re-verify at each promotion:** a control that holds on `dev` is not
> automatically true on `beta`.

---

## 1. What we are protecting, and from what

**The asset is patient records (PHI) belonging to multiple organisations that share one system.**

Two failure modes matter above all others here, because they are the ones this codebase can cause on
its own:

1. **Cross-tenant leakage** — one organisation seeing another's patients. Multi-tenancy is the core
   product constraint (`CLAUDE.md` §1); org slugs in URLs, three login portals and org-scoped API
   paths all exist to enforce it.
2. **Client-trusted authorisation** — the browser deciding what the user may see. A browser is
   attacker-controlled. Anything it asserts is a claim, never a fact.

Out of scope: backend authorisation, database security, and infrastructure below Vercel/Cloudflare.

---

## 2. Controls in place — with evidence

Measured **2026-08-28** against `https://dev.healthclouda.com`, which serves `develop` against
`api-dev`.

### 2.1 Session and tokens

| Control | State | Evidence |
|---|---|---|
| JWTs never reach JavaScript | ✅ | `hc_access_token` / `hc_refresh_token` are `HttpOnly` |
| Cookies are HTTPS-only | ✅ | `Secure` on all three |
| Cross-site request protection | ✅ | `SameSite=strict` on all three |
| **Cookies are host-only** | ✅ | **No `Domain=` attribute on any cookie** — a session minted on `dev.` is never sent to `beta.` or the apex. This is A3, and it is the single control holding tier isolation at the layer that carries the JWT |
| Access token lifetime | ✅ | 1 hour, matching DRF's default |
| Refresh rotation survives | ✅ | SimpleJWT rotates **and blacklists**; the single-flight refresh in `client-api.ts` is load-bearing — concurrent refreshes log the user out |

Verify with:

```bash
curl -sS -D - -o /dev/null -X POST https://dev.healthclouda.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"...","loginType":"org","orgSlug":"demo-clinic"}' \
  | grep -i set-cookie
```

🔴 **The thing to look for is the absence of one attribute:** no `Domain=`. If a cookie ever carries
`Domain=.healthclouda.com`, tier isolation breaks for every environment at once. There is deliberately
**no `COOKIE_DOMAIN` variable** — see `.env.example`.

### 2.2 Network boundary

| Control | State | Notes |
|---|---|---|
| Browser never calls the backend directly | ✅ | All traffic goes through same-origin `/api/data` (reads) and `/api/action` (writes), which attach the JWT server-side |
| CSP `connect-src` | ✅ | `'self'` only — names no backend origin, which is also correct per-tier |
| No dead hosts in the bundle | ✅ | Deployed chunks grepped for `railway.app` → **0 hits** (A2) |
| One build, one tier | ✅ | `NEXT_PUBLIC_API_URL` is baked at build time and **fails the build when unset** (A4, `config.ts:33`) — no localhost fallback in a deployed build |

### 2.3 HTTP headers — served live

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
                         style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:;
                         font-src 'self'; connect-src 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Powered-By: (absent - poweredByHeader: false)
```

`Referrer-Policy` matters more than it looks: patient identifiers appear in URLs, and
`strict-origin-when-cross-origin` stops those paths leaking to third parties in `Referer`.

⚠️ **`script-src` carries `'unsafe-inline'` and `'unsafe-eval'` — see FLAG-019.** That removes most of
the protection CSP exists to give.

### 2.4 Authorisation

| Control | State | Notes |
|---|---|---|
| Server enforces every read and write | ✅ | DRF authorises server-side; a lying client still gets 403s |
| Dashboard gates decide server-side | 🟡 **fixed, unmerged** | PR #99 — gates resolve identity from `/auth/me/` via the httpOnly token instead of the client-writable `hc_user` cookie (FLAG-001) |
| Route slug checked against the user's org | 🟡 **fixed, unmerged** | Same PR. Before it, a real doctor could open another org's dashboard shell **by typing a URL** — no tampering required |
| `hc_user` is display-only | 🟡 **fixed, unmerged** | Annotated at its definition and at `getUser()` |

🔴 **Until #99 merges, authorisation on this frontend is still decided from a cookie the user can
edit.** It is the highest-value merge on the board for this baseline.

---

## 3. Known gaps

Ordered by what they cost when PHI is real. Each maps to a flag — **this document prioritises them,
it does not duplicate them.**

### Tier 1 — beta-blocking

| Gap | Flag | Why it blocks |
|---|---|---|
| Authorisation decided client-side | **FLAG-001** | 🟡 Fixed in **#99**; blocking only until merged |
| Patient sign-in impossible | **FLAG-210** | 🟡 Fixed in **#100**. Not a leak — an outage for an entire role |
| **PHI renders into the DOM below 768px** | **FLAG-203** | `SmallScreenGate` is **CSS-only**: the dashboard still mounts, still fetches, and the records still land in the document. A phone shows a polite notice with patient data behind it. **The most serious unfixed item in this document** |
| Production is stale and un-redeployable | **FLAG-018** | The apex serves a **13 July** build predating A2/A3/A4 — none of §2's controls are guaranteed on it. Decided: apex = marketing + patient portal against `api-beta`; execute **31 Aug** |
| Deployment protection off | **FLAG-017** | Outer layer only, but beta carries PHI. Decided: re-enable at beta stand-up, testers invited first |

### Tier 2 — before the beta window closes

| Gap | Flag | Note |
|---|---|---|
| CSP allows `unsafe-inline` / `unsafe-eval` | **FLAG-019** | Removes most of CSP's XSS value on the very pages that render PHI |
| Login rate limiter is per-instance memory | **FLAG-007** | Ineffective across serverless instances — closer to *absent* than *weak*. Matters more while deployment protection is off |
| Failures indistinguishable from empty | **FLAG-005** | `serverFetch` returns `null` for 401, 500 and network errors alike, and logs nothing. **Production incidents would be invisible during hypercare** |
| No CI, no lint | **FLAG-006** | Every check here is manual. Nothing mechanically prevents any control above from regressing |
| 7 high-severity dependency advisories | **FLAG-200** | Unreviewed |

### Accepted, with reasons

| Decision | Why it is acceptable | Revisit |
|---|---|---|
| The API schema is world-readable | Shapes and enums, no data. It also removes "blocked on credentials" as a reason to guess a contract | — |
| `dev.` is publicly reachable | Synthetic data only, and login-gated. Enables backend UAT and design verification | Beta stand-up (FLAG-017) |
| **The repository is public** | Frontend source only; no secrets committed, `.env*` ignored | ⚠️ **Never actually decided** — `CLAUDE.md` §3 assumed the opposite was true. Worth confirming deliberately rather than by default |

---

## 4. Re-verification checklist

Run at every promotion. **A control verified on one tier says nothing about another.**

- [ ] Sign in, inspect `Set-Cookie`: `HttpOnly`, `Secure`, `SameSite=strict`, **no `Domain=`**
- [ ] `curl -sI <host>` → all six headers from §2.3 present
- [ ] Grep the deployed JS for `railway.app` → 0 hits
- [ ] Build with `NEXT_PUBLIC_API_URL` unset → **the build fails**, never falls back
- [ ] Signed in as a role in org A, request org B's dashboard path → redirected, not rendered
- [ ] Tamper `hc_user` to another role → redirected, not rendered
- [ ] Log out, press Back → no PHI from cache or bfcache
- [ ] Load a dashboard below 768px → **check whether records are in the DOM** (FLAG-203)
- [ ] Trigger a real invite email from that tier → the link lands on **that tier's** frontend

---

## 5. How this document is meant to be used

It is a **floor, not a checklist to admire.** Three rules:

1. **Evidence over configuration.** "The header is in `next.config.ts`" is not evidence; a `curl`
   against the deployment is. Two gaps above were found precisely because config and reality
   disagreed.
2. **A gap written down is a plan; a gap not written down is the actual problem.** Anything found and
   not fixed goes into `CODEBASE_FLAGS.md` in the same PR, and the serious ones get a row here.
3. **Update this in the PR that changes a control**, not afterwards. A stale baseline is worse than no
   baseline, because it gets trusted.

**Owner:** @Bastoh · **Last verified against a live deployment:** 2026-08-28 (`dev` tier).
