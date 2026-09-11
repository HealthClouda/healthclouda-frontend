'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PasswordSuccessContent } from '@/components/forms/PasswordSuccessContent';

function Inner() {
  const params = useSearchParams();
  const slug = params.get('org') ?? undefined;
  return <PasswordSuccessContent orgSlug={slug} />;
}

export default function PasswordSuccessPage() {
  return <Suspense><Inner /></Suspense>;
}