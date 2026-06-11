import { notFound } from 'next/navigation';
import Link from 'next/link';
import { publicFetch } from '@/lib/api';
import { ENDPOINTS } from '@/lib/config';
import { isReservedPath } from '@/lib/router';
import type { Organization } from '@/types/auth';

export default async function OrgPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isReservedPath(slug)) return notFound();

  let org: Organization | null = null;
  try {
    org = await publicFetch<Organization>(ENDPOINTS.ORG_BY_SLUG(slug));
  } catch {
    return notFound();
  }

  if (!org.is_active) return notFound();

  const initial = org.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 flex flex-col">
      {/* Top nav */}
      <header className="px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          HealthClouda
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Org identity */}
          <div className="text-center mb-8">
            {org.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo}
                alt={org.name}
                className="w-20 h-20 rounded-2xl mx-auto mb-5 object-contain border border-gray-100 bg-white shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-md shadow-blue-200">
                <span className="text-white text-3xl font-bold">{initial}</span>
              </div>
            )}

            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
              Staff &amp; Patient Portal
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{org.name}</h1>
            <p className="text-sm text-gray-400">
              Sign in to access your secure healthcare portal.
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <Link
              href={`/${slug}/signin`}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-colors text-sm shadow-sm shadow-blue-200"
            >
              Sign in to your account
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">or</span>
              </div>
            </div>

            <Link
              href="/signin"
              className="flex items-center justify-center gap-2 w-full text-gray-600 hover:text-gray-900 font-medium py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
            >
              Personal patient portal
            </Link>
          </div>

          {/* Security note */}
          <p className="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Secured by HealthClouda · All data encrypted in transit
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 text-center border-t border-gray-100/60">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Powered by HealthClouda
        </Link>
      </footer>
    </div>
  );
}