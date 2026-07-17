'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthCard } from './AuthCard';
import { TextField } from './TextField';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter, passwordIsValid } from './PasswordStrengthMeter';
import { ShieldIcon, MailIcon, CircleXIcon } from './AuthIcons';
import { authPrimaryBtn } from './authStyles';
import { formatApiError } from '@/lib/api';
import type { SetupTokenInfo } from '@/types/auth';
import type { Role } from '@/lib/config';

// Same backend rule as reset-password (≥8, uppercase, digit, special).
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

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Super Admin',
  ORGANIZATION_ADMIN: 'Organization Admin',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  RECEPTIONIST: 'Receptionist',
  PATIENT: 'Patient',
};

function roleLabel(role: string): string {
  return (
    ROLE_LABELS[role as Role] ??
    role.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
}

type TokenState =
  | { phase: 'validating' }
  | { phase: 'valid'; info: SetupTokenInfo }
  | { phase: 'invalid'; message: string }
  | { phase: 'resent'; message: string };

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [tokenState, setTokenState] = useState<TokenState>({ phase: 'validating' });
  const [serverError, setServerError] = useState('');
  const [resending, setResending] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');
  const password2 = watch('password2', '');
  const canSubmit = passwordIsValid(password) && password === password2 && password2.length > 0;

  useEffect(() => {
    if (!token) {
      setTokenState({ phase: 'invalid', message: 'This invite link is missing its token. Use the link from your invitation email.' });
      return;
    }
    fetch(`/api/auth/setup-password?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.valid) setTokenState({ phase: 'valid', info: data as SetupTokenInfo });
        else setTokenState({ phase: 'invalid', message: formatApiError(data) });
      })
      .catch(() => setTokenState({ phase: 'invalid', message: 'Unable to validate your invite link. Check your connection and try again.' }));
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
    router.push('/signin');
  }

  // Expired-state self-service re-request (backend #68): always a generic 200,
  // so surface the backend's own message as the terminal state.
  async function requestNewLink() {
    setResending(true);
    try {
      const res = await fetch('/api/auth/setup-password/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.message) setTokenState({ phase: 'resent', message: json.message });
      else setTokenState({ phase: 'resent', message: 'If a matching account exists and has not been set up yet, a new setup link has been emailed.' });
    } catch {
      setResending(false);
      return;
    }
  }

  if (tokenState.phase === 'validating') {
    return (
      <AuthCard
        icon={<ShieldIcon size={26} />}
        title="Verifying your invite…"
        backHref="/signin"
        backLabel="Back to Login"
      >
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-[11px] bg-gray-100" />
          <div className="h-12 animate-pulse rounded-[11px] bg-gray-100" />
          <div className="h-12 animate-pulse rounded-[11px] bg-gray-100" />
        </div>
      </AuthCard>
    );
  }

  if (tokenState.phase === 'invalid' || tokenState.phase === 'resent') {
    const isResent = tokenState.phase === 'resent';
    return (
      <AuthCard
        icon={<CircleXIcon size={26} />}
        iconVariant="danger"
        title={isResent ? 'Check your email' : 'Invalid or expired link'}
        subtitle={tokenState.message}
        backHref="/signin"
        backLabel="Back to Login"
        footer={
          <Link href="/signin" className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-primary hover:underline">
            ← Back to Login
          </Link>
        }
      >
        {isResent ? (
          <p className="text-center text-sm leading-relaxed text-[#6b7280]">
            The link in the email is valid for 24 hours. If it does not arrive within a few
            minutes, check your spam folder or contact your administrator.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm leading-relaxed text-[#6b7280]">
              Setup links expire after 24 hours and can only be used once. If yours has
              expired, request a new one and we&apos;ll email it to you.
            </p>
            {token && (
              <button type="button" onClick={requestNewLink} disabled={resending} className={authPrimaryBtn}>
                {resending ? 'Requesting…' : 'Request a new link'}
              </button>
            )}
          </div>
        )}
      </AuthCard>
    );
  }

  const { info } = tokenState;
  const fullName = `${info.first_name} ${info.last_name}`.trim();

  return (
    <AuthCard
      icon={<ShieldIcon size={26} />}
      title={
        <>
          Welcome, <span className="text-primary">{fullName || info.email}</span>
        </>
      }
      subtitle={
        <>
          Your account{info.organization_name && (
            <> at <strong className="font-bold text-[#374151]">{info.organization_name}</strong></>
          )}{' '}
          has been created as <strong className="font-bold text-[#374151]">{roleLabel(info.role)}</strong>.
          Set a password to get started.
        </>
      }
      backHref="/signin"
      backLabel="Back to Login"
      footer={
        <Link href="/signin" className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-primary hover:underline">
          ← Back to Login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-[18px]">
        <TextField
          label="Email"
          icon={<MailIcon />}
          type="email"
          readOnly
          value={info.email}
          className="cursor-default opacity-70"
        />

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
            placeholder="Confirm your password"
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
          {isSubmitting ? 'Setting password…' : 'Set Password'}
        </button>
      </form>
    </AuthCard>
  );
}

export function SetPasswordForm() {
  return <Suspense><Inner /></Suspense>;
}
