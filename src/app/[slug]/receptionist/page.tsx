import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { ReceptionistDashboard } from '@/components/dashboard/receptionist/ReceptionistDashboard';
import type { ReceptionistStats } from '@/types/dashboard';

export default async function ReceptionistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user || user.role !== ROLES.RECEPTIONIST) redirect(`/${slug}/signin`);

  const stats = await serverFetch<ReceptionistStats>(ENDPOINTS.REC_STATS);

  return <ReceptionistDashboard user={user} initialStats={stats} slug={slug} />;
}