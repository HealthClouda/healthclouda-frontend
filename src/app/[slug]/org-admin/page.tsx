import { requireDashboardUser } from '@/lib/auth-server';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { OrgAdminDashboard } from '@/components/dashboard/org-admin/OrgAdminDashboard';
import type { OrgAdminStats } from '@/types/dashboard';

export default async function OrgAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // FLAG-001: decided from /auth/me/ via the httpOnly token, never from
  // the client-writable `hc_user` cookie. Also asserts the route slug is this
  // user's own org — the old gate checked role only.
  const user = await requireDashboardUser(ROLES.ORG_ADMIN, slug);

  const stats = await serverFetch<OrgAdminStats>(ENDPOINTS.ORG_ADMIN_STATS);

  return <OrgAdminDashboard user={user} initialStats={stats} slug={slug} />;
}