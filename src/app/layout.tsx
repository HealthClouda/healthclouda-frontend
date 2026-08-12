import type { Metadata } from 'next';
import { Inter, Lato } from 'next/font/google';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Design system (design_handoff_prelogin): Inter = headings/labels/buttons,
// Lato = body copy on pre-login pages. Dashboards stay on Inter.
const lato = Lato({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-lato' });

export const metadata: Metadata = {
  // A2: per-tier, not a hardcoded host. Only affects canonical/OpenGraph URLs,
  // so a wrong value mislabels shared links rather than breaking the app — the
  // apex marketing domain is the right default when the var is unset.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://healthclouda.com'),
  title: 'HealthClouda | The Connective Infrastructure for African Healthcare',
  description:
    'HealthClouda links hospitals and clinics across Africa so records and referrals move with the patient — securely, instantly. No repeated tests. No paper files.',
  openGraph: {
    type: 'website',
    siteName: 'HealthClouda',
    title: 'HealthClouda | The Connective Infrastructure for African Healthcare',
    description:
      'One patient record. Every facility, connected. Secure, cloud-based records that move with the patient.',
    images: [{ url: '/assets/images/Hero_picture.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HealthClouda | The Connective Infrastructure for African Healthcare',
    description: 'One patient record. Every facility, connected.',
    images: ['/assets/images/Hero_picture.png'],
  },
  // Favicon + apple-touch icon come from src/app/icon.png and
  // src/app/apple-icon.png (App Router file conventions) — square renders,
  // unlike the 2:1 icon-tight mark which browsers squashed in the tab.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lato.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}