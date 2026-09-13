import type { Metadata } from 'next';

// Org portals are public but unlisted (design README, decision 1):
// no links from the general landing, never indexed — facilities distribute
// their link themselves. Applies to every route under /[slug]/.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return children;
}
