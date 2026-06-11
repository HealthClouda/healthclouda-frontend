import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';
import { WellbeingCarousel } from '@/components/landing/WellbeingCarousel';
import { ContactForm } from '@/components/landing/ContactForm';

export const metadata: Metadata = {
  title: 'HealthClouda | Cloud-Based EHR Platform',
  description:
    'HealthClouda is a cloud-based electronic health record platform enabling seamless hospital-to-hospital medical record sharing across Africa. Secure, scalable, and compliant.',
};

// ─── Section: Hero ────────────────────────────────────────────────

function HeroSection() {
  return (
    <section id="home" className="pt-24 pb-16 md:pt-32 md:pb-24 px-6 overflow-hidden bg-gradient-to-b from-blue-50/50 to-white">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Cloud-Based EHR for African Healthcare
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Modern EHR Built for{' '}
            <span className="text-blue-600">Smarter Healthcare</span>
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
            Revolutionize healthcare delivery with our comprehensive Electronic Health Record system designed specifically for African healthcare providers. Secure, scalable, and compliant.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm shadow-md shadow-blue-200"
            >
              Login to Your Account
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="#contact-us"
              className="inline-flex items-center gap-2 text-gray-700 font-medium px-6 py-3.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm"
            >
              For Organisations
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-5">
            {['HIPAA & NDPR Compliant', 'Microsoft Azure', 'Multi-Tenant EHR'].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <div className="relative hidden lg:block">
          <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/60 via-indigo-50 to-white rounded-3xl -z-10" />
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-100 border border-blue-50" style={{ aspectRatio: '4/3' }}>
            <Image
              src="/assets/images/Hero_picture.png"
              alt="HealthClouda EHR platform in use at a healthcare facility"
              fill
              className="object-cover"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Features ────────────────────────────────────────────

const FEATURES = [
  {
    icon: '/assets/images/person_add.png',
    title: 'Patient Records',
    desc: 'Comprehensive electronic health records with secure patient data management and unique HealthClouda IDs.',
  },
  {
    icon: '/assets/images/science.png',
    title: 'Lab Integration',
    desc: 'Seamless laboratory test ordering, tracking, and result management across departments.',
  },
  {
    icon: '/assets/images/pill.png',
    title: 'Prescriptions',
    desc: 'Digital prescription management with integration for facility pharmacies and dispensing workflows.',
  },
  {
    icon: '/assets/images/chat_bubble.png',
    title: 'Secure Messaging',
    desc: 'HIPAA-compliant communication between nurses, doctors, labs, and pharmacists — all in one platform.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need for Modern Healthcare
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Comprehensive features designed for the future of African healthcare environments — built for the way your teams actually work.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                <Image src={f.icon} alt={f.title} width={28} height={28} className="object-contain" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section: One Platform ────────────────────────────────────────

function OnePlatformSection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-white rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative">
        {/* Text */}
        <div className="text-white">
          <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-3">
            One Platform
          </p>
          <h2 className="text-3xl font-bold mb-6 leading-tight">
            One Platform, Every Healthcare Role Covered
          </h2>
          <p className="text-blue-100 leading-relaxed mb-8">
            Our secure, user-friendly Electronic Health Record system is purpose-built for hospitals and health facilities looking to simplify documentation, enhance collaboration, and improve patient care. From doctors and nurses to receptionists and administrators — everyone has a role-specific dashboard.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {['Doctor Portal', 'Nurse Portal', 'Receptionist', 'Org Admin', 'Patient Portal', 'Super Admin'].map(role => (
              <div key={role} className="flex items-center gap-2 text-sm text-blue-100">
                <svg className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {role}
              </div>
            ))}
          </div>

          <Link
            href="/signin"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
          >
            Login to Your Account
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Image */}
        <div className="relative hidden lg:block">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '3/4' }}>
            <Image
              src="/assets/images/Female_doctor.jpg"
              alt="Doctor using HealthClouda EHR system"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Benefits ────────────────────────────────────────────

const BENEFITS = [
  {
    img: '/assets/images/BENEFIT_ONE.png',
    imgAlt: 'Streamlined patient workflow',
    title: 'Effortless Patient Workflows',
    body: 'Every clinic operates differently and HealthClouda adapts. You\'ll get smart, customizable clinical forms that reflect your exact workflow: registration, history taking, vitals, diagnostic notes and follow-ups — all shaped around how your team works. Faster onboarding, fewer errors, more time for care.',
    tag: 'Workflow',
    tagColor: 'bg-blue-100 text-blue-700',
  },
  {
    img: '/assets/images/Heart.png',
    imgAlt: 'Patient safety intelligence',
    title: 'Proactive Intelligence that Keeps Patients Safe',
    body: 'HealthClouda includes safety alerts for allergies, drug interactions, critical vitals, duplicate records, and follow-up reminders. When something looks off, the system prompts staff to double-check and intervene early — ensuring patients receive the right care at the right time.',
    tag: 'Safety',
    tagColor: 'bg-red-100 text-red-700',
    flipped: true,
  },
  {
    img: '/assets/images/noun-africa.png',
    imgAlt: 'Built for Africa',
    title: "Built for Africa's Realities",
    body: "HealthClouda doesn't just work in Africa — it's built for it. Full offline mode keeps work going during power or connectivity drops. Cost-effective for varying budgets, it scales from a single-practitioner clinic to a growing hospital. Intuitive design and optional local language support help every team member adopt it quickly.",
    tag: 'Africa-First',
    tagColor: 'bg-emerald-100 text-emerald-700',
  },
];

function BenefitsSection() {
  return (
    <section className="py-20 px-6 bg-gray-50/60">
      <div className="max-w-6xl mx-auto space-y-20">
        {BENEFITS.map((b, i) => (
          <div
            key={b.title}
            className={`grid lg:grid-cols-2 gap-12 items-center ${b.flipped ? 'lg:[direction:rtl]' : ''}`}
          >
            {/* Image */}
            <div className={b.flipped ? 'lg:[direction:ltr]' : ''}>
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-blue-50 shadow-sm border border-gray-100" style={{ aspectRatio: '4/3' }}>
                <Image
                  src={b.img}
                  alt={b.imgAlt}
                  fill
                  className="object-contain p-8"
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </div>
            </div>

            {/* Text */}
            <div className={b.flipped ? 'lg:[direction:ltr]' : ''}>
              <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full mb-4 ${b.tagColor}`}>
                {b.tag}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">{b.title}</h2>
              <p className="text-gray-500 leading-relaxed">{b.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section: Wellbeing ───────────────────────────────────────────

function WellbeingSection() {
  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 text-center mb-10">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Wellness</p>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Wellbeing Matters…</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Here's a quick dose of wellness inspiration to keep your mind and body in sync throughout the day.
        </p>
      </div>
      <WellbeingCarousel />
    </section>
  );
}

// ─── Section: About ───────────────────────────────────────────────

function AboutSection() {
  return (
    <section id="about-us" className="py-20 px-6 bg-gray-50/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">About</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Who We Are</h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            HealthClouda is a secure, cloud-based Electronic Health Record (EHR) and patient data platform designed to reduce long hospital queues and enable seamless, secure sharing of medical records between healthcare facilities in Nigeria and Sub-Saharan Africa.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
              <Image src="/assets/images/target.png" alt="Mission" width={24} height={24} className="object-contain" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-3">Our Mission</h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              To empower healthcare providers and patients through instant, reliable, and secure access to medical records — improving efficiency and saving lives across Africa.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center mb-5">
              <Image src="/assets/images/eye.png" alt="Vision" width={24} height={24} className="object-contain" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-3">Our Vision</h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              A cloud-based EHR platform built for seamless hospital-to-hospital record sharing in Nigeria and across Africa — solving long queues by improving data retrieval and care continuity.
            </p>
          </div>
        </div>

        {/* Problem & Solution */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">The Problem</span>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm">
              In many African healthcare facilities, patient records are still stored in paper files. Patients face repeated tests, long queues, and delays because their records are inaccessible — wasting time and delaying treatment.
            </p>
          </div>
          <div className="bg-blue-600 rounded-2xl p-7 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-300" />
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Our Solution</span>
            </div>
            <p className="text-blue-100 leading-relaxed text-sm">
              Built on Microsoft Azure Healthcare Cloud Services, HealthClouda delivers high performance, reliability, and compliance. With a unique HealthClouda ID, patient records are securely accessible from any registered facility — instantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Security ────────────────────────────────────────────

function SecuritySection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-emerald-100">
            <Image src="/assets/images/encrypted.png" alt="" width={14} height={14} className="object-contain" />
            Enterprise Security
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">HIPAA & NDPR Compliant</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Protecting sensitive patient health data with enterprise-grade security standards — built for both international compliance and Nigerian data protection regulations.
          </p>

          <ul className="space-y-4">
            {[
              { icon: '🔒', label: '256-bit SSL encryption', sub: 'All data encrypted in transit and at rest' },
              { icon: '👥', label: 'Role-based access control', sub: 'Every user sees only what they need to' },
              { icon: '📋', label: 'Comprehensive audit trails', sub: 'Every action logged and attributable' },
            ].map(item => (
              <li key={item.label} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{item.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Cloud architecture card */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Infrastructure</p>
              <h3 className="font-bold text-gray-900 text-xl">Cloud-Native Architecture</h3>
            </div>
            <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm">
              <Image src="/assets/images/cloud.png" alt="Cloud" width={28} height={28} className="object-contain" />
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Scalable, reliable, and always accessible. HealthClouda is built on Microsoft Azure to handle both small clinics and large multi-campus healthcare centers with ease.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: '99.9%', l: 'Uptime SLA' },
              { v: 'Azure', l: 'Cloud Provider' },
              { v: 'End-to-end', l: 'Encryption' },
              { v: 'Real-time', l: 'Sync & Backup' },
            ].map(s => (
              <div key={s.l} className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="font-bold text-gray-900 text-sm">{s.v}</p>
                <p className="text-gray-400 text-xs">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Contact ─────────────────────────────────────────────

function ContactSection() {
  return (
    <section id="contact-us" className="py-20 px-6 bg-gray-50/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Contact</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Get in Touch</h2>
          <p className="text-gray-500">Feel free to reach out for any enquiries or questions you might have.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                    <a href="mailto:hardeydamola20082@gmail.com" className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                      hardeydamola20082@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">For Healthcare Organisations</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Ready to bring HealthClouda to your facility? Send us a message and we'll get your organisation set up with a branded portal and your team onboarded.
              </p>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">Note for Staff & Patients</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Accounts cannot be created online. Visit reception at any registered clinic — admin staff will create your login.
                </p>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <h3 className="font-semibold text-gray-900 mb-6">Send us a Message</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: CTA Banner ──────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-14 text-center text-white">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-16 -right-16 w-72 h-72 bg-white rounded-full" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white rounded-full" />
          </div>
          <div className="relative">
            <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-4">
              Join hundreds of providers across Africa
            </p>
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Healthcare Practice?
            </h2>
            <p className="text-blue-100 mb-8 max-w-lg mx-auto">
              Join hundreds of healthcare providers across Africa who trust HealthClouda to manage their patient records, streamline operations, and deliver better care.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="#contact-us"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
              >
                Get Started Today
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 text-white font-medium px-6 py-3.5 rounded-xl border border-white/30 hover:bg-white/10 transition-colors text-sm"
              >
                Patient Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#1a1a2e] text-slate-400 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/assets/images/HealthClouda-icon.png"
                alt="HealthClouda"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-white text-lg">HealthClouda</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              Empowering African healthcare with secure, cloud-based EHR solutions for hospitals and health facilities of every size.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { href: '#about-us', label: 'About Us' },
                { href: '#features', label: 'Features' },
                { href: '#contact-us', label: 'Contact Us' },
                { href: '/signin', label: 'Patient Sign In' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Follow Us</h4>
            <div className="flex gap-3">
              {/* LinkedIn */}
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9 h-9 bg-white/10 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              {/* X / Twitter */}
              <a
                href="#"
                aria-label="X (Twitter)"
                className="w-9 h-9 bg-white/10 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <div className="mt-6">
              <p className="text-xs text-slate-500 mb-1">Powered by</p>
              <p className="text-sm font-medium text-slate-300">Microsoft Azure Healthcare</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© {year} HealthClouda. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>HIPAA Compliant</span>
            <span>·</span>
            <span>NDPR Compliant</span>
            <span>·</span>
            <span>256-bit SSL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <OnePlatformSection />
        <BenefitsSection />
        <WellbeingSection />
        <AboutSection />
        <SecuritySection />
        <ContactSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}