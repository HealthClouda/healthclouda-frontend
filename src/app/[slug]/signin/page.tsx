import { notFound } from 'next/navigation';
import { SigninForm } from '@/components/forms/SigninForm';
import { publicFetch } from '@/lib/api';
import { ENDPOINTS } from '@/lib/config';
import { isReservedPath } from '@/lib/router';
import type { Organization } from '@/types/auth';

export default async function OrgSigninPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isReservedPath(slug)) return notFound();

  let org: Organization | null = null;
  try {
    org = await publicFetch<Organization>(ENDPOINTS.ORG_BY_SLUG(slug));
  } catch {
    return notFound();
  }

  return (
    <SigninForm
      loginType="org"
      orgSlug={slug}
      orgName={org.name}
      orgLogo={org.logo_url ?? undefined}
    />
  );
}