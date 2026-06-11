import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { DoctorDashboard } from '@/components/dashboard/doctor/DoctorDashboard';
import type { DoctorStats } from '@/types/dashboard';

export default async function DoctorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user || user.role !== ROLES.DOCTOR) redirect(`/${slug}/signin`);

  const stats = await serverFetch<DoctorStats>(ENDPOINTS.DOC_STATS);

  return <DoctorDashboard user={user} initialStats={stats} slug={slug} />;
}