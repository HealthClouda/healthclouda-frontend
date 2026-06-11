'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { formatApiError } from '@/lib/api';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, {
    message: 'Passwords do not match',
    path: ['password2'],
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
  const otp = params.get('otp') ?? '';
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  async function onSubmit(data: FormData) {
    setServerError('');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, password: data.password, password2: data.password2 }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setServerError(formatApiError(json)); return; }
    router.push(orgSlug ? `/${orgSlug}/password-success` : '/password-success');
  }

  return (
    <AuthCard title="Set a new password" orgName={orgName} logo={orgLogo}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
          <PasswordInput
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <PasswordInput
            autoComplete="new-password"
            error={errors.password2?.message}
            {...register('password2')}
          />
        </div>

        {serverError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm(props: Props) {
  return <Suspense><Inner {...props} /></Suspense>;
}