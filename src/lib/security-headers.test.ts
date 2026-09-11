import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config';

/**
 * A2 (sprint plan Tier 1) — stale host purge, with a regression guard.
 *
 * `healthclouda-backend-production.up.railway.app` is DEAD: it returns HTTP 400
 * `DisallowedHost` on every path. It was removed from the backend's ALLOWED_HOSTS
 * deliberately, because reaching it bypassed Cloudflare — sidestepping edge rate
 * limiting and the security header the audit-logging fix depends on. It will not
 * be restored.
 *
 * It survived here in the CSP `connect-src`. Runtime impact was low (the browser
 * only ever calls same-origin `/api/*`, which `'self'` already covers — the
 * constant was vestigial), but it mis-documented the contract seam in one of the
 * first places a new dev looks, and the sprint plan's tier verification requires
 * grepping the built output for `railway.app` and finding zero hits.
 *
 * This asserts it at the source, so the grep can never regress silently.
 */

async function getHeaders() {
  const headerRules = await nextConfig.headers!();
  return headerRules[0].headers;
}

function headerValue(headers: { key: string; value: string }[], key: string) {
  return headers.find(h => h.key === key)?.value ?? '';
}

describe('security headers (A2 — no stale backend host)', () => {
  it('carries a Content-Security-Policy', async () => {
    const csp = headerValue(await getHeaders(), 'Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
  });

  it('names NO railway host anywhere in the headers', async () => {
    const headers = await getHeaders();
    const all = headers.map(h => `${h.key}: ${h.value}`).join('\n');
    expect(all).not.toMatch(/railway\.app/);
  });

  it("restricts connect-src to 'self' — the browser never calls the backend directly", async () => {
    const csp = headerValue(await getHeaders(), 'Content-Security-Policy');
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src'));
    // All browser traffic goes through our own /api/data + /api/action proxies,
    // which attach the JWT server-side. A backend origin here would be both
    // useless and a per-tier value baked into a shared config.
    expect(connectSrc).toBe("connect-src 'self'");
  });

  it('still sets the frame-ancestors and HSTS protections', async () => {
    const headers = await getHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headerValue(headers, 'Strict-Transport-Security')).toContain('max-age=');
  });
});
