'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { formatApiError } from '@/lib/api';

const schema = z.object({
  email: z.email({ message: 'Enter a valid email address' }),
});
type FormData = z.infer<typeof schema>;

interface Props {
  orgSlug?: string;
  orgName?: string;
  orgLogo?: string;
}

export function ForgotPasswordForm({ orgSlug, orgName, orgLogo }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setServerError(formatApiError(json)); return; }
    const next = orgSlug ? `/${orgSlug}/check-email` : '/check-email';
    router.push(`${next}?email=${encodeURIComponent(data.email)}`);
  }

  const backPath = orgSlug ? `/${orgSlug}/signin` : '/signin';

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a code to reset it."
      orgName={orgName}
      logo={orgLogo}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.email ? 'border-red-400' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
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
          {isSubmitting ? 'Sending…' : 'Send reset code'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href={backPath} className="text-blue-600 hover:underline">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}