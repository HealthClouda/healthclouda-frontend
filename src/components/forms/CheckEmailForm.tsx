'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { OtpInput } from './OtpInput';
import { MailPlusIcon } from './AuthIcons';
import { authPrimaryBtn } from './authStyles';
import { formatApiError } from '@/lib/api';

const schema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});
type FormData = z.infer<typeof schema>;

const RESEND_SECONDS = 24;

interface Props {
  orgSlug?: string;
  orgName?: string;
  orgLogo?: string;
}

function Inner({ orgSlug, orgName, orgLogo }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [serverError, setServerError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { otp: '' } });

  const otp = watch('otp');

  // Resend cooldown ticker.
  useEffect(() => {
    if (countdown <= 0) return;
    const iv = setInterval(() => setCountdown((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(iv);
  }, [countdown]);

  async function onSubmit(data: FormData) {
    setServerError('');
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: data.otp }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setServerError(formatApiError(json, 'Invalid or expired code.')); return; }
    const next = orgSlug ? `/${orgSlug}/reset-password` : '/reset-password';
    router.push(`${next}?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(data.otp)}`);
  }

  const resendCode = useCallback(async () => {
    if (!email || countdown > 0) return;
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setCountdown(RESEND_SECONDS);
  }, [email, countdown]);

  const backPath = orgSlug ? `/${orgSlug}/forgot-password` : '/forgot-password';
  const mmss = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;

  return (
    <AuthCard
      icon={<MailPlusIcon size={28} />}
      title="Check your email"
      subtitle={
        <>
          We sent a code to{' '}
          <span className="font-heading text-[13.5px] font-semibold text-primary">{email || 'your email'}</span>
          <br />
          Enter the 6-digit code below.
        </>
      }
      orgName={orgName}
      orgLogo={orgLogo}
      backHref={backPath}
      backLabel="Back to Login"
      footer={
        <Link href={backPath} className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-primary hover:underline">
          ← Back
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Controller
          name="otp"
          control={control}
          render={({ field }) => (
            <OtpInput value={field.value} onChange={field.onChange} error={errors.otp?.message} />
          )}
        />

        {serverError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || otp.length !== 6} className={authPrimaryBtn}>
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <div className="mt-4 text-center text-[13.5px] text-[#6b7280]">
        Haven&apos;t got the email yet?{' '}
        {countdown > 0 ? (
          <span className="font-bold text-[#b0b8c9]">Resend email ({mmss})</span>
        ) : (
          <button type="button" onClick={resendCode} className="font-bold text-primary hover:underline">
            Resend email
          </button>
        )}
      </div>
    </AuthCard>
  );
}

export function CheckEmailForm(props: Props) {
  return <Suspense><Inner {...props} /></Suspense>;
}
