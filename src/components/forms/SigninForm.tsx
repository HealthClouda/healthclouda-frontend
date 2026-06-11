'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordInput } from './PasswordInput';
import { AuthCard } from './AuthCard';
import { roleDashboardPath, passwordFlowPath } from '@/lib/router';
import { formatApiError } from '@/lib/api';
import type { User } from '@/types/auth';

const schema = z.object({
  email: z.email({ message: 'Enter a valid email address' }),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

interface SigninFormProps {
  loginType: 'general' | 'org' | 'admin';
  orgSlug?: string;
  orgName?: string;
  orgLogo?: string;
}

export function SigninForm({ loginType, orgSlug, orgName, orgLogo }: SigninFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [redirectMsg, setRedirectMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    setRedirectMsg('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, loginType, orgSlug }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 429) {
      setServerError(json.detail ?? 'Too many attempts. Please wait and try again.');
      return;
    }

    if (res.status === 400 && json.org_slug) {
      // Staff account hitting the general portal — redirect with countdown
      let secs = 5;
      const msg = (n: number) =>
        `Staff accounts must sign in via their organisation portal. Redirecting in ${n}s…`;
      setRedirectMsg(msg(secs));
      const iv = setInterval(() => {
        secs--;
        if (secs <= 0) {
          clearInterval(iv);
          router.push(`/${json.org_slug}/signin`);
        } else {
          setRedirectMsg(msg(secs));
        }
      }, 1000);
      return;
    }

    if (!res.ok) {
      setServerError(formatApiError(json, 'Invalid email or password.'));
      return;
    }

    const user = json.user as User;
    router.push(roleDashboardPath(user.role, user.organization_slug));
  }

  const isOrg = loginType === 'org';
  const isAdmin = loginType === 'admin';
  const forgotPath = passwordFlowPath('forgot-password', orgSlug);

  const title = isAdmin ? 'Superadmin sign in' : isOrg ? 'Sign in' : 'Sign in to HealthClouda';
  const subtitle = isAdmin
    ? 'Administrator access only'
    : isOrg
    ? undefined
    : 'Patient portal';

  return (
    <AuthCard title={title} subtitle={subtitle} orgName={orgName} logo={orgLogo}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.email ? 'border-red-400' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <Link href={forgotPath} className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {serverError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            {serverError}
          </div>
        )}
        {redirectMsg && (
          <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg">
            {redirectMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {!isAdmin && (
        <p className="mt-6 text-center text-sm text-gray-500">
          {isOrg ? (
            <>
              Not your organisation?{' '}
              <Link href="/signin" className="text-blue-600 hover:underline">
                Patient portal
              </Link>
            </>
          ) : (
            <>
              Is your organisation on HealthClouda?{' '}
              <Link href="/#contact" className="text-blue-600 hover:underline">
                Get access
              </Link>
            </>
          )}
        </p>
      )}
    </AuthCard>
  );
}