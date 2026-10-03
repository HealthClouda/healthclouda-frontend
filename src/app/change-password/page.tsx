import type { Metadata } from 'next';
import { ForcedPasswordChange } from '@/components/account/ForcedPasswordChange';

// FLAG-611. Guarded by middleware like a dashboard (a live session is
// required); the backend itself refuses the change without one.
export const metadata: Metadata = {
  title: 'Change password',
  robots: { index: false, follow: false },
};

export default function ChangePasswordPage() {
  return <ForcedPasswordChange />;
}
