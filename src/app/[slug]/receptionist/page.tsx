import { requireDashboardUser } from '@/lib/auth-server';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { ReceptionistDashboard } from '@/components/dashboard/receptionist/ReceptionistDashboard';
import type { ReceptionistStats } from '@/types/dashboard';

export default async function ReceptionistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // FLAG-001: decided from /auth/me/ via the httpOnly token, never from
  // the client-writable `hc_user` cookie. Also asserts the route slug is this
  // user's own org — the old gate checked role only.
  const user = await requireDashboardUser(ROLES.RECEPTIONIST, slug);

  const stats = await serverFetch<ReceptionistStats>(ENDPOINTS.REC_STATS);

  return <ReceptionistDashboard user={user} initialStats={stats} slug={slug} />;
}