import type { Metadata } from 'next';
import { AccessRequestRespond } from '@/components/access/AccessRequestRespond';

// Token-carrying patient consent page — never useful in a search index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccessRequestRespondPage() {
  return <AccessRequestRespond />;
}
