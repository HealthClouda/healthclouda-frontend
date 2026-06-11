import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { PatientDashboard } from '@/components/dashboard/patient/PatientDashboard';
import type { PatientDashboardData } from '@/types/dashboard';

export default async function PatientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user || user.role !== ROLES.PATIENT) redirect(`/${slug}/signin`);

  const stats = await serverFetch<PatientDashboardData>(ENDPOINTS.PATIENT_DASHBOARD);

  return <PatientDashboard user={user} initialStats={stats} slug={slug} />;
}