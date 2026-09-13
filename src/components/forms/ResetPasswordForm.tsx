'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter, passwordIsValid } from './PasswordStrengthMeter';
import { ShieldIcon } from './AuthIcons';
import { authPrimaryBtn } from './authStyles';
import { formatApiError } from '@/lib/api';

// Enforce the backend rule (≥8, uppercase, digit, special) client-side too.
const schema = z
  .object({
    password: z.string().refine(passwordIsValid, {
      message: 'Password must be 8+ characters with an uppercase letter, a number, and a special character',
    }),
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
  const password2 = watch('password2', '');
  const canSubmit = passwordIsValid(password) && password === password2 && password2.length > 0;

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

  const backPath = orgSlug ? `/${orgSlug}/signin` : '/signin';

  return (
    <AuthCard
      icon={<ShieldIcon size={26} />}
      title="Set a new password"
      subtitle="Create a new password. Ensure it differs from previous ones for security."
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
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-[18px]">
        <div>
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <div>
          <PasswordInput
            label="Confirm Password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={errors.password2?.message}
            {...register('password2')}
          />
          {password2.length > 0 && (
            <div className={`mt-1.5 text-[12.5px] ${password === password2 ? 'text-[#16a34a]' : 'text-red-500'}`}>
              {password === password2 ? 'Passwords match ✓' : 'Passwords do not match'}
            </div>
          )}
        </div>

        {serverError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || !canSubmit} className={`${authPrimaryBtn} !mt-6`}>
          {isSubmitting ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm(props: Props) {
  return <Suspense><Inner {...props} /></Suspense>;
}
