import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://healthclouda.vercel.app'),
  title: 'HealthClouda | Cloud-Based EHR Platform',
  description:
    'HealthClouda is a cloud-based electronic health record platform enabling seamless hospital-to-hospital medical record sharing across Africa.',
  openGraph: {
    type: 'website',
    siteName: 'HealthClouda',
    title: 'HealthClouda | Cloud-Based EHR Platform',
    description:
      'Secure, cloud-based EHR/EMR platform for hospitals and health facilities across Africa.',
    images: [{ url: '/assets/images/Hero_picture.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HealthClouda | Cloud-Based EHR Platform',
    description: 'Cloud-based EHR platform for African healthcare providers.',
    images: ['/assets/images/Hero_picture.png'],
  },
  icons: {
    icon: '/assets/images/HealthClouda-icon.png',
    apple: '/assets/images/HealthClouda-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}