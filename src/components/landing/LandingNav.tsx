'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Design: design_handoff_prelogin — fixed 68px white nav, blur, hairline
// shadow, anchor links, outlined "For organisations" + primary "Sign in".
const NAV_LINKS = [
  { href: '#network', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#security', label: 'Security' },
  { href: '#contact', label: 'Contact' },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const scrollTo = (href: string) => {
    setOpen(false);
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] h-[68px] flex items-center justify-between gap-4 px-4 md:px-[clamp(16px,3vw,56px)] bg-white/[0.97] backdrop-blur-[10px] shadow-[0_1px_6px_rgba(0,8,37,0.07)]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Image
            src="/assets/images/HealthClouda-icon-tight.png"
            alt="HealthClouda"
            width={34}
            height={34}
            className="object-contain"
          />
          <a href="#home" className="font-heading text-[19px] font-extrabold text-ink tracking-[-0.02em] whitespace-nowrap">
            HealthClouda
          </a>
        </div>

        {/* Anchor links */}
        <div className="hidden lg:flex items-center gap-[clamp(14px,2.4vw,40px)] min-w-0">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="font-heading text-sm font-semibold text-gray-700 hover:text-primary whitespace-nowrap transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden lg:flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => scrollTo('#contact')}
            className="font-heading text-[13.5px] font-semibold text-primary px-[clamp(10px,1.4vw,18px)] py-[9px] border-[1.5px] border-primary rounded-xl whitespace-nowrap hover:bg-chip hover:text-primary-dark transition-colors"
          >
            For organisations
          </button>
          <Link
            href="/signin"
            className="font-heading text-[13.5px] font-semibold text-white bg-primary px-[clamp(12px,1.6vw,20px)] py-[9px] rounded-xl shadow-btn-primary whitespace-nowrap hover:bg-primary-dark transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-[1001] bg-black/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 z-[1002] h-full w-72 bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-[68px] border-b border-hairline">
          <span className="font-heading font-bold text-ink">Menu</span>
          <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-1">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="w-full text-left px-4 py-3 font-heading text-sm font-semibold text-gray-700 hover:bg-page rounded-lg transition-colors"
            >
              {link.label}
            </button>
          ))}
          <hr className="my-3 border-hairline" />
          <button
            onClick={() => scrollTo('#contact')}
            className="w-full text-center py-3 font-heading text-sm font-semibold text-primary border-[1.5px] border-primary rounded-xl hover:bg-chip transition-colors"
          >
            For organisations
          </button>
          <Link
            href="/signin"
            onClick={() => setOpen(false)}
            className="block text-center py-3 mt-2 font-heading text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}
