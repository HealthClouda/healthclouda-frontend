import { requireDashboardUser } from '@/lib/auth-server';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { PatientDashboard } from '@/components/dashboard/patient/PatientDashboard';
import type { PatientDashboardData } from '@/types/dashboard';

export default async function PatientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // FLAG-001: decided from /auth/me/ via the httpOnly token, never from
  // the client-writable `hc_user` cookie. Also asserts the route slug is this
  // user's own org — the old gate checked role only.
  const user = await requireDashboardUser(ROLES.PATIENT, slug);

  const stats = await serverFetch<PatientDashboardData>(ENDPOINTS.PATIENT_DASHBOARD);

  return <PatientDashboard user={user} initialStats={stats} slug={slug} />;
}