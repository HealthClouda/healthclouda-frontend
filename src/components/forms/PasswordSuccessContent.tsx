'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from './AuthCard';

interface Props {
  orgSlug?: string;
  orgName?: string;
  orgLogo?: string;
}

export function PasswordSuccessContent({ orgSlug, orgName, orgLogo }: Props) {
  const router = useRouter();
  const [secs, setSecs] = useState(5);
  const signinPath = orgSlug ? `/${orgSlug}/signin` : '/signin';

  useEffect(() => {
    const iv = setInterval(() => {
      setSecs((n) => {
        if (n <= 1) { clearInterval(iv); router.push(signinPath); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [router, signinPath]);

  return (
    <AuthCard title="Password updated" orgName={orgName} logo={orgLogo}>
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-600 text-sm">Your password has been reset successfully.</p>
        <p className="text-gray-400 text-sm">Redirecting to sign in in {secs}s…</p>
        <Link href={signinPath} className="text-blue-600 text-sm hover:underline">Sign in now</Link>
      </div>
    </AuthCard>
  );
}