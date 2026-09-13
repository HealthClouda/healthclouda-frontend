import { notFound } from 'next/navigation';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';
import { publicFetch } from '@/lib/api';
import { ENDPOINTS } from '@/lib/config';
import { isReservedPath } from '@/lib/router';
import type { Organization } from '@/types/auth';

export default async function OrgResetPasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isReservedPath(slug)) return notFound();
  let org: Organization | null = null;
  try { org = await publicFetch<Organization>(ENDPOINTS.ORG_BY_SLUG(slug)); } catch { return notFound(); }
  return <ResetPasswordForm orgSlug={slug} orgName={org.name} orgLogo={org.logo_url ?? undefined} />;
}