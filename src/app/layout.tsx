import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HealthClouda',
  description: 'Multi-tenant EHR/EMR platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}