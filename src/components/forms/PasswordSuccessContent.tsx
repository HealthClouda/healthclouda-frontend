'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard } from './AuthCard';
import { CheckIcon } from './AuthIcons';
import { authPrimaryBtn } from './authStyles';

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
    <AuthCard
      icon={<CheckIcon size={34} />}
      iconVariant="success"
      title="Password reset"
      subtitle={
        <>
          Congratulations! Your password has been
          <br />
          changed. Click continue to login.
        </>
      }
      orgName={orgName}
      orgLogo={orgLogo}
      backHref={signinPath}
      backLabel="Back to Login"
    >
      <button type="button" onClick={() => router.push(signinPath)} className={authPrimaryBtn}>
        Continue <span className="ml-[5px] text-[12.5px] opacity-75">({secs})</span>
      </button>
    </AuthCard>
  );
}
