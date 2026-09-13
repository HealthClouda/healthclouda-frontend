'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordInput } from './PasswordInput';
import { TextField } from './TextField';
import { AuthCard } from './AuthCard';
import { MailIcon } from './AuthIcons';
import { authPrimaryBtn } from './authStyles';
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
    // Fall back to the portal's own slug — the backend login response may not
    // carry org info (enriched best-effort in the login route).
    const slug = user.organization_slug ?? orgSlug;
    // SUPERADMIN sits above organisations and PATIENT sits outside them, so
    // neither needs a slug (FLAG-210). Requiring one for patients is what made
    // this branch refuse a successful login: the backend returned 200, and we
    // showed "please use your organization portal" — advice a patient cannot
    // follow, because the general portal IS the patient portal.
    const isSlugless = user.role === 'SUPERADMIN' || user.role === 'PATIENT';
    if (!slug && !isSlugless) {
      setServerError('Signed in, but your organization could not be determined. Please use your organization portal.');
      return;
    }
    router.push(roleDashboardPath(user.role, slug));
  }

  const isOrg = loginType === 'org';
  const isAdmin = loginType === 'admin';
  const forgotPath = passwordFlowPath('forgot-password', orgSlug);

  // Heading — general/org/admin variants (design_handoff_prelogin screens 1–2).
  const title = isAdmin ? (
    'Superadmin sign in'
  ) : isOrg ? (
    <>
      Sign in to <span className="text-primary">{orgName}</span> HealthClouda
    </>
  ) : (
    'Login to HealthClouda'
  );
  const subtitle = isAdmin ? 'Administrator access only' : 'Access your healthcare dashboard';
  // Org identifier is email-only: the backend login accepts { email, password }
  // (no HealthClouda-ID identifier). The design's "Email / HealthClouda ID" label
  // is a known deviation until/unless a backend api-request adds HCL-ID login.
  const emailLabel = 'Email address';

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      titleClassName={isOrg ? 'text-[36px]' : 'text-[40px]'}
      orgName={isOrg ? orgName : undefined}
      orgLogo={isOrg ? orgLogo : undefined}
      backHref={isOrg && orgSlug ? `/${orgSlug}` : '/'}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-[18px]">
        <TextField
          label={emailLabel}
          icon={<MailIcon />}
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {!isAdmin && (
          <div className="flex items-center justify-between pt-1">
            {/* Remember me is UI-only for now — session length is set by the
                httpOnly cookie lifetime; persistent sessions are a later change. */}
            <label className="flex cursor-pointer items-center gap-[7px] text-sm text-[#374151]">
              <input type="checkbox" className="h-4 w-4 accent-primary" />
              <span>Remember me</span>
            </label>
            <Link href={forgotPath} className="font-heading text-sm font-bold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        {serverError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}
        {redirectMsg && (
          <div className="rounded-[10px] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {redirectMsg}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className={`${authPrimaryBtn} !mt-6`}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {!isAdmin && (
        <div className="mt-5">
          <p className="mb-[14px] text-center text-[13px] text-[#6b7280]">Don&apos;t have an account?</p>
          <div className="rounded-[10px] border border-[rgba(0,117,255,0.15)] bg-chip px-4 py-[14px]">
            <p className="text-center text-[12.5px] leading-[1.55] text-[#1a4b8c]">
              <strong>Notice:</strong> HealthClouda accounts cannot be created online. Please visit the
              reception desk at {isOrg ? 'your organisation clinic' : 'any registered clinic'} — admin staff
              will create your login.
            </p>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
