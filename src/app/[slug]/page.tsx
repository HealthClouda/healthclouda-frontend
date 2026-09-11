import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { publicFetch } from '@/lib/api';
import { ENDPOINTS } from '@/lib/config';
import { isReservedPath } from '@/lib/router';
import { WellbeingCarousel } from '@/components/landing/WellbeingCarousel';
import { OrgContactForm } from '@/components/landing/OrgContactForm';
import type { Organization } from '@/types/auth';

// Design: design_handoff_prelogin — org landing (public but unlisted; noindex
// comes from the [slug] layout). Data-driven by GET /org/by-slug/<slug>/.
//
// Awaiting backend: the announcements list → backend#69 (no public endpoint
// yet — verified on prod AND local; the design's empty state ships now, real
// cards wire in when it lands). Clinic contact fields DO exist on by-slug
// (nullable) — null rows are simply hidden.
export default async function OrgLandingPage({
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

  // NOTE: no is_active check — the public by-slug response doesn't carry it
  // (suspended orgs are the backend's concern; verified live 2026-07-13).
  const signinHref = `/${slug}/signin`;

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-page"
      style={{
        background:
          "#f8faff url('/assets/images/Backgroud_flare.webp') no-repeat top center / cover",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] h-[70px] flex items-center justify-between gap-4 px-4 sm:px-8 bg-white/[0.97] backdrop-blur-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2.5">
          {/* Mark is 2:1 — natural aspect box (see fix/brand-assets) */}
          <Image
            src="/assets/images/HealthClouda-icon-tight.png"
            alt="HealthClouda"
            width={36}
            height={18}
            className="object-contain"
          />
          <a href="#home" className="font-heading text-[21px] font-extrabold text-ink tracking-[-0.02em]">
            HealthClouda
          </a>
        </div>
        <Link
          href={signinHref}
          className="font-heading text-[14.5px] font-semibold text-white bg-primary px-[22px] py-2.5 rounded-xl whitespace-nowrap shadow-btn-primary hover:bg-primary-dark transition-colors"
        >
          Sign In to Portal
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        id="home"
        className="min-h-[80vh] flex items-center justify-center px-6 sm:px-8 pt-[134px] pb-16 text-center [background:linear-gradient(135deg,#f8faff_0%,#ffffff_50%,#ebf3ff_100%)]"
      >
        <div className="max-w-[720px] flex flex-col items-center">
          <div className="flex items-center justify-center gap-6 mb-8">
            <Image
              src="/assets/images/HealthClouda-icon-tight.png"
              alt="HealthClouda"
              width={112}
              height={56}
              className="h-14 w-auto object-contain"
            />
            <span className="font-heading text-2xl font-bold text-gray-500">x</span>
            {org.logo_url ? (
              // Org logos are arbitrary remote URLs from the API — plain <img>
              // avoids next/image remote-domain config.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={`${org.name} logo`} className="h-[72px] w-auto object-contain" />
            ) : (
              <div className="h-[72px] w-[72px] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
                <span className="text-white text-3xl font-bold">{org.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <h1 className="font-heading text-[clamp(32px,4.5vw,51px)] font-bold leading-[1.3] text-ink mb-4">
            Welcome to <span className="text-primary">{org.name}</span> Health Portal
          </h1>
          <p className="font-body text-[17.5px] text-gray-700 leading-[1.7] mb-8">
            Your gateway to health services and information.
          </p>
          <Link
            href={signinHref}
            className="inline-block font-heading text-base font-semibold text-white bg-primary px-8 py-3.5 rounded-xl shadow-btn-primary hover:bg-primary-dark hover:shadow-[0_6px_20px_rgba(0,117,255,0.35)] transition-all"
          >
            Sign In to Portal
          </Link>
        </div>
      </section>

      {/* ── Health announcements ────────────────────────────── */}
      <section className="px-6 sm:px-16 py-20">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <h2 className="font-heading text-[clamp(24px,3vw,32px)] font-bold text-ink mb-2">
            Health Announcements
          </h2>
          <p className="font-body text-base text-gray-700 leading-[1.6]">
            Stay informed about the latest health activities and updates.
          </p>
        </div>
        {/* Empty state only until backend#69 ships the public announcements
            endpoint — then this becomes the design's 3-col card grid with
            urgency accents. (Stroke SVG, not the design's emoji — README
            decision 5.) */}
        <div className="text-center py-12 px-4 max-w-[1000px] mx-auto">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M9 12h6M9 16h6" />
          </svg>
          <h4 className="font-heading text-[18.5px] font-semibold text-gray-700 mb-1.5">
            No announcements right now
          </h4>
          <p className="font-body text-[14.5px] text-gray-500">
            Check back soon for updates from the Health Centre.
          </p>
        </div>
      </section>

      {/* ── Wellbeing carousel ──────────────────────────────── */}
      <section className="px-6 sm:px-16 pt-8 pb-12 bg-page">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <h2 className="font-heading text-[clamp(24px,3vw,32px)] font-bold text-ink mb-2">
            Your Wellbeing Matters...
          </h2>
          <p className="font-body text-base text-gray-700 leading-[1.6]">
            A quick dose of wellness inspiration to keep your mind and body in sync throughout the day.
          </p>
        </div>
        <WellbeingCarousel />
      </section>

      {/* ── Contact ─────────────────────────────────────────── */}
      <section id="contact-us" className="px-6 sm:px-16 py-20">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <h2 className="font-heading text-[clamp(24px,3vw,32px)] font-bold text-ink mb-2">
            Need Help or Medical Assistance?
          </h2>
          <p className="font-body text-base text-gray-700 leading-[1.6]">
            Reach out to your Health Centre — your message goes directly to them.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-12 max-w-[1000px] mx-auto">
          <div className="flex-1 basis-[340px] min-w-0 flex flex-col gap-7">
            <div>
              <h4 className="font-heading text-[17px] font-bold text-ink mb-1.5">
                {org.clinic_name ?? `${org.name} Health Centre`}
              </h4>
              {org.clinic_address && (
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6] mb-0.5">
                  {org.clinic_address}
                </p>
              )}
              {org.clinic_hours && (
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6] mb-0.5">
                  {org.clinic_hours}
                </p>
              )}
              {org.clinic_phone && (
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6] mb-0.5">
                  Phone: <a href={`tel:${org.clinic_phone}`}>{org.clinic_phone}</a>
                </p>
              )}
              {org.clinic_email && (
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6]">
                  Email: <a href={`mailto:${org.clinic_email}`} className="text-primary hover:text-primary-dark">{org.clinic_email}</a>
                </p>
              )}
              {!org.clinic_address && !org.clinic_hours && !org.clinic_phone && !org.clinic_email && (
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6]">
                  Contact details are available at the reception desk.
                </p>
              )}
            </div>
            <div>
              <h4 className="font-heading text-[17px] font-bold text-ink mb-1.5">Trouble signing in?</h4>
              <p className="font-body text-[14.5px] text-gray-700 leading-[1.6] mb-0.5">
                Visit the reception desk — staff will create or reset your login.
              </p>
              <p className="font-body text-[14.5px] text-gray-700 leading-[1.6]">
                Accounts cannot be created online.
              </p>
            </div>
            {org.emergency_phone && (
              <div>
                <h4 className="font-heading text-[17px] font-bold text-ink mb-1.5">Emergency Line</h4>
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6] mb-0.5">
                  In case of medical emergency, call immediately:
                </p>
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6] mb-0.5">
                  <a href={`tel:${org.emergency_phone}`} className="text-primary hover:text-primary-dark font-semibold">{org.emergency_phone}</a>
                </p>
                <p className="font-body text-[14.5px] text-gray-700 leading-[1.6]">Available 24/7</p>
              </div>
            )}
          </div>
          <div className="flex-1 basis-[360px] min-w-0 bg-white rounded-[20px] border border-hairline shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-8">
            <h4 className="font-heading text-[17.5px] font-bold text-ink mb-1.5">
              Message the Health Centre
            </h4>
            <p className="font-body text-[13.5px] text-gray-500 leading-[1.5] mb-[18px]">
              Sent straight to {org.name} — not to HealthClouda.
            </p>
            <OrgContactForm slug={slug} />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-footer text-hairline px-6 sm:px-16 pt-16 pb-8">
        <div className="grid sm:grid-cols-[2fr_1fr_1fr] gap-10 max-w-[1100px] mx-auto mb-8">
          <div>
            <h2 className="font-heading text-[22.5px] font-extrabold text-white mb-3">HealthClouda</h2>
            <p className="font-body text-[14.5px] text-slate-400 leading-[1.6]">
              Empowering African healthcare with secure, cloud-based EHR solutions.
            </p>
          </div>
          <div>
            <h4 className="font-heading text-[13.5px] font-bold uppercase tracking-[0.06em] text-white mb-4">
              Quick Links
            </h4>
            <div className="flex flex-col gap-2.5">
              <a href="#home" className="font-body text-[14.5px] text-slate-300 hover:text-white transition-colors">
                Home
              </a>
              <a href="#contact-us" className="font-body text-[14.5px] text-slate-300 hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-heading text-[13.5px] font-bold uppercase tracking-[0.06em] text-white mb-4">
              Follow Us
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                aria-label="LinkedIn"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-slate-300 hover:bg-primary hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X (Twitter)"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-slate-300 hover:bg-primary hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-[#2d2d4e] pt-6 text-center font-body text-[13px] text-slate-500 max-w-[1100px] mx-auto">
          © {new Date().getFullYear()} HealthClouda. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
