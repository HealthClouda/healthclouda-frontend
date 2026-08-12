import type { NextConfig } from 'next';

// A2: `connect-src` is 'self' ONLY, and deliberately names no backend origin.
//
// The browser never calls the backend directly — all traffic goes through our
// own same-origin /api/data (reads) and /api/action (writes) proxies, which
// attach the JWT server-side. 'self' already covers that.
//
// Naming a backend here would also be wrong per-tier: dev, beta and production
// hit different API hosts, and this config is shared across all three builds.
// The previous value was the Railway host, which is now dead (HTTP 400
// DisallowedHost) — removed from the backend's ALLOWED_HOSTS on purpose because
// reaching it bypassed Cloudflare, sidestepping edge rate limiting and the
// security header the audit-logging fix depends on. It will not be restored.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;