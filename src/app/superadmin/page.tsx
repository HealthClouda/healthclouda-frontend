import { requireDashboardUser } from '@/lib/auth-server';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { SuperadminDashboard } from '@/components/dashboard/superadmin/SuperadminDashboard';
import type { SuperadminStats } from '@/types/dashboard';

export default async function SuperadminPage() {
  // FLAG-001: server-trusted, from /auth/me/ via the httpOnly token. No slug —
  // a superadmin belongs to no organisation, so there is no tenant to check.
  const user = await requireDashboardUser(ROLES.SUPERADMIN);

  const stats = await serverFetch<SuperadminStats>(ENDPOINTS.SA_STATS);

  return <SuperadminDashboard user={user} initialStats={stats} />;
}