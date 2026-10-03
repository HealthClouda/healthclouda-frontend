'use client';

import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/forms/AuthCard';
import { ShieldIcon } from '@/components/forms/AuthIcons';
import { ChangePasswordForm, passwordChangedMessage } from './ChangePasswordForm';
import { dataGet } from '@/lib/client-api';
import { ENDPOINTS, type Role } from '@/lib/config';
import { roleDashboardPath, signinPath } from '@/lib/router';
import { useToast } from '@/store/toast';

/**
 * FLAG-611 — where a user flagged `force_password_change` lands (the gate
 * and client-api send them here on the backend's 403 FORCE_PASSWORD_CHANGE).
 * Change-password is the one endpoint the flag does not block; once it
 * succeeds the flag is cleared, so `/auth/me/` answers again and says which
 * dashboard is theirs. The redirect uses the server's answer, never the
 * client-writable `hc_user` cookie (FLAG-001).
 */
export function ForcedPasswordChange() {
  const router = useRouter();
  const { toast } = useToast();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // The org is unknown here (/auth/me/ is refused while flagged); the
    // general portal redirects staff to their own org's sign-in.
    router.push(signinPath());
  }

  async function done(otherSessionsEnded: number) {
    toast.success(passwordChangedMessage(otherSessionsEnded));
    try {
      const me = await dataGet<{ role: Role; organization?: { slug: string } | null }>(ENDPOINTS.ME);
      router.replace(roleDashboardPath(me.role, me.organization?.slug));
    } catch {
      router.replace('/');
    }
  }

  return (
    <AuthCard
      icon={<ShieldIcon size={26} />}
      title="Choose a new password"
      subtitle="Your password was set for you by an administrator. Choose your own to continue."
      footer={
        // A shared ward PC: leaving must not require choosing a password first.
        <button
          type="button"
          onClick={() => void signOut()}
          className="font-heading text-sm font-bold text-primary hover:underline"
        >
          Sign out instead
        </button>
      }
    >
      <ChangePasswordForm idPrefix="forced-change-password" onChanged={(n) => void done(n)} />
    </AuthCard>
  );
}
