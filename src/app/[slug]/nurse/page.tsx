import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { NurseDashboard } from '@/components/dashboard/nurse/NurseDashboard';
import type { NurseStats } from '@/types/dashboard';

export default async function NursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user || user.role !== ROLES.NURSE) redirect(`/${slug}/signin`);

  const stats = await serverFetch<NurseStats>(ENDPOINTS.NURSE_STATS);

  return <NurseDashboard user={user} initialStats={stats} slug={slug} />;
}