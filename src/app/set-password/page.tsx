import type { Metadata } from 'next';
import { SetPasswordForm } from '@/components/forms/SetPasswordForm';

// Token-carrying invite page — never useful in a search index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
  return <SetPasswordForm />;
}
