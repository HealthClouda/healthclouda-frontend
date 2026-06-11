'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from '@/components/forms/AuthCard';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { PasswordStrengthMeter } from '@/components/forms/PasswordStrengthMeter';
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

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [tokenError, setTokenError] = useState('');
  const [serverError, setServerError] = useState('');
  const [validating, setValidating] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  useEffect(() => {
    if (!token) { setTokenError('Invalid or missing invite link.'); setValidating(false); return; }
    fetch(`/api/auth/setup-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail && data.detail !== 'Token is valid.') setTokenError(data.detail);
      })
      .catch(() => setTokenError('Unable to validate your invite link.'))
      .finally(() => setValidating(false));
  }, [token]);

  async function onSubmit(data: FormData) {
    setServerError('');
    const res = await fetch('/api/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: data.password, password2: data.password2 }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setServerError(formatApiError(json)); return; }
    router.push('/signin?setup=done');
  }

  if (validating) {
    return (
      <AuthCard title="Verifying your invite…">
        <div className="h-8 bg-gray-100 rounded animate-pulse" />
      </AuthCard>
    );
  }

  if (tokenError) {
    return (
      <AuthCard title="Invalid invite link">
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{tokenError}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set your password" subtitle="Choose a strong password to activate your account.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
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
          {isSubmitting ? 'Activating account…' : 'Activate account'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}