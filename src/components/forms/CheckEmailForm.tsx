'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { OtpInput } from './OtpInput';
import { formatApiError } from '@/lib/api';

const schema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});
type FormData = z.infer<typeof schema>;

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
  const [resent, setResent] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { otp: '' } });

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

  async function resendCode() {
    if (!email) return;
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  const backPath = orgSlug ? `/${orgSlug}/forgot-password` : '/forgot-password';

  return (
    <AuthCard
      title="Check your email"
      subtitle={email ? `We sent a 6-digit code to ${email}` : 'Enter the code we sent to your email.'}
      orgName={orgName}
      logo={orgLogo}
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
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            {serverError}
          </div>
        )}
        {resent && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
            Code resent — check your inbox.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? 'Verifying…' : 'Verify code'}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500">
        <button type="button" onClick={resendCode} className="text-blue-600 hover:underline">
          Resend code
        </button>
        <Link href={backPath} className="hover:underline">Back</Link>
      </div>
    </AuthCard>
  );
}

export function CheckEmailForm(props: Props) {
  return <Suspense><Inner {...props} /></Suspense>;
}