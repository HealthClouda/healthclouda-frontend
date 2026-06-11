import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { SuperadminDashboard } from '@/components/dashboard/superadmin/SuperadminDashboard';
import type { SuperadminStats } from '@/types/dashboard';

export default async function SuperadminPage() {
  const user = await getUser();
  if (!user || user.role !== ROLES.SUPERADMIN) redirect('/signin');

  const stats = await serverFetch<SuperadminStats>(ENDPOINTS.SA_STATS);

  return <SuperadminDashboard user={user} initialStats={stats} />;
}