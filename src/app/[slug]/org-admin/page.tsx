import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { OrgAdminDashboard } from '@/components/dashboard/org-admin/OrgAdminDashboard';
import type { OrgAdminStats } from '@/types/dashboard';

export default async function OrgAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user || user.role !== ROLES.ORG_ADMIN) redirect(`/${slug}/signin`);

  const stats = await serverFetch<OrgAdminStats>(ENDPOINTS.ORG_ADMIN_STATS);

  return <OrgAdminDashboard user={user} initialStats={stats} slug={slug} />;
}