'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { TextField } from './TextField';
import { MailIcon, LockIcon } from './AuthIcons';
import { authPrimaryBtn } from './authStyles';
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
  const placeholder = orgSlug ? `e.g. user@${orgSlug}.com` : 'Enter your email';

  return (
    <AuthCard
      icon={<LockIcon size={26} />}
      title="Forgot password?"
      subtitle="Please enter your email to reset the password"
      orgName={orgName}
      orgLogo={orgLogo}
      backHref={backPath}
      backLabel="Back to Login"
      footer={
        <Link href={backPath} className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-primary hover:underline">
          ← Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <TextField
          label="Your Email"
          icon={<MailIcon />}
          type="email"
          autoComplete="email"
          placeholder={placeholder}
          error={errors.email?.message}
          {...register('email')}
        />

        {serverError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className={authPrimaryBtn}>
          {isSubmitting ? 'Sending…' : 'Reset Password'}
        </button>
      </form>
    </AuthCard>
  );
}
