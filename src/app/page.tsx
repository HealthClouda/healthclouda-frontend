import Link from 'next/link';

// ─── Shared icon helpers ──────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">HealthClouda</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Patient Sign In
          </Link>
          <Link
            href="#contact"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            For Organisations
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Multi-Tenant EHR / EMR Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Healthcare management
            <span className="text-blue-600"> built for every role</span>
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
            Purpose-built dashboards for doctors, nurses, receptionists, and administrators — all under one secure, multi-tenant platform. Each organisation gets its own branded portal.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm shadow-sm shadow-blue-200"
            >
              Patient Portal
              <ArrowRightIcon />
            </Link>
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
            >
              For Organisations
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center gap-5">
            {[
              '6 Role Portals',
              'JWT + httpOnly Cookies',
              'Multi-Tenant Ready',
            ].map(badge => (
              <div key={badge} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {badge}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative hidden lg:block">
          {/* Glow */}
          <div className="absolute -inset-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl -z-10" />

          {/* Main card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
            {/* Header bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-md" />
                <span className="text-xs font-semibold text-gray-700">Doctor Dashboard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="text-[11px] text-emerald-600 font-semibold">On Duty</span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { v: '12', l: 'Episodes',  color: 'bg-blue-50 text-blue-600' },
                { v: '8',  l: 'Appts',     color: 'bg-indigo-50 text-indigo-600' },
                { v: '3',  l: 'Referrals', color: 'bg-amber-50 text-amber-600' },
              ].map(s => (
                <div key={s.l} className={`${s.color} rounded-xl p-2.5`}>
                  <div className="text-2xl font-bold">{s.v}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Patient rows */}
            <div className="space-y-1.5 mb-4">
              {[
                { name: 'Emma Wilson',   time: '09:00', status: 'Active',  dot: 'bg-blue-400' },
                { name: 'James Okafor', time: '10:30', status: 'Waiting', dot: 'bg-amber-400' },
                { name: 'Sara Ahmed',   time: '11:00', status: 'Done',    dot: 'bg-emerald-400' },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5 hover:bg-gray-100 transition-colors">
                  <span className={`w-1.5 h-6 rounded-full ${p.dot} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.time}</p>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">{p.status}</span>
                </div>
              ))}
            </div>

            {/* Mini nav hint */}
            <div className="border-t border-gray-50 pt-3 flex items-center gap-1">
              {['Overview', 'Patients', 'Episodes', 'Appts'].map((tab, i) => (
                <span key={tab} className={`text-[10px] font-semibold px-2 py-1 rounded-md ${i === 0 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{tab}</span>
              ))}
            </div>
          </div>

          {/* Floating badge — nurse */}
          <div className="absolute -bottom-4 -left-6 bg-white rounded-xl border border-gray-100 shadow-lg px-3 py-2 flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-900">Nurse Dashboard</p>
              <p className="text-[10px] text-gray-400">4 vitals pending</p>
            </div>
          </div>

          {/* Floating badge — receptionist */}
          <div className="absolute -top-4 -right-4 bg-white rounded-xl border border-gray-100 shadow-lg px-3 py-2 flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-900">Receptionist</p>
              <p className="text-[10px] text-emerald-600">6 checked in today</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: <UsersIcon />,
      color: 'bg-blue-50 text-blue-600 ring-blue-100',
      title: 'Role-Based Portals',
      desc: 'Six purpose-built dashboards — each tailored to how that role actually works. Doctors see episodes, nurses see vitals, receptionists see the queue.',
    },
    {
      icon: <BuildingIcon />,
      color: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
      title: 'Multi-Tenant Architecture',
      desc: 'Every organisation gets an isolated portal at /{slug} with its own branding, staff, and patient data. No cross-organisation data leakage — ever.',
    },
    {
      icon: <ShieldIcon />,
      color: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      title: 'Secure by Design',
      desc: 'JWT tokens stored in httpOnly cookies — never exposed to JavaScript. Per-request refresh, audit logs for every action, and strict CORS policies.',
    },
    {
      icon: <BoltIcon />,
      color: 'bg-amber-50 text-amber-600 ring-amber-100',
      title: 'Built for Real Workflows',
      desc: 'Duty toggles, doctor assignment queues, three-step OTP password reset, and inline referral tracking — the details that make day-to-day clinical work smoother.',
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Everything a healthcare platform needs
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Built from the ground up for multi-tenant EHR/EMR — not a generic CRUD app dressed up in medical language.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ring-1 ${f.color} [&>svg]:w-5 [&>svg]:h-5`}>
                {f.icon}
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

// ─── Role portals ─────────────────────────────────────────────────

function RolesSection() {
  const roles = [
    {
      label: 'Doctor',
      color: 'bg-blue-50 text-blue-700 ring-blue-100',
      dot: 'bg-blue-500',
      desc: 'Episodes, appointments, prescriptions, and referrals — all in one place.',
      portal: 'Doctor Portal',
    },
    {
      label: 'Nurse',
      color: 'bg-purple-50 text-purple-700 ring-purple-100',
      dot: 'bg-purple-500',
      desc: 'Vitals recording, ward overview, and patient assignments with duty tracking.',
      portal: 'Nurse Portal',
    },
    {
      label: 'Receptionist',
      color: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      dot: 'bg-emerald-500',
      desc: 'Check-in queue, doctor assignment, appointment scheduling, and referral triage.',
      portal: 'Reception Portal',
    },
    {
      label: 'Org Admin',
      color: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      dot: 'bg-indigo-500',
      desc: 'Staff management, patient records, ward occupancy, and access request control.',
      portal: 'Admin Portal',
    },
    {
      label: 'Patient',
      color: 'bg-teal-50 text-teal-700 ring-teal-100',
      dot: 'bg-teal-500',
      desc: 'View health records, upcoming appointments, and manage data access requests.',
      portal: 'Patient Portal',
    },
    {
      label: 'Superadmin',
      color: 'bg-slate-50 text-slate-700 ring-slate-100',
      dot: 'bg-slate-500',
      desc: 'Platform-wide oversight — organisations, users, audit logs, system health.',
      portal: 'Platform Admin',
    },
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">One platform, six portals</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Every role gets a dashboard designed around their specific workflow — not a generic view with most features hidden.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map(r => (
            <div key={r.label} className="group bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ring-1 ${r.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                  {r.portal}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{r.label}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      title: 'Register your organisation',
      desc: 'Get your organisation onboarded with a unique /{slug} portal. Your branded sign-in page goes live immediately.',
    },
    {
      n: '02',
      title: 'Onboard your team',
      desc: 'Invite staff via secure setup-password links. Roles are assigned in the Org Admin portal — no manual config needed.',
    },
    {
      n: '03',
      title: 'Start delivering care',
      desc: 'Doctors, nurses, and receptionists log in to their role-specific dashboards. Patient data stays isolated and secure.',
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50/60">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Up and running in three steps</h2>
          <p className="text-gray-500">No lengthy onboarding. No custom development required.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-6 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" />

          {steps.map(s => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-5 z-10 shadow-md shadow-blue-200">
                {s.n}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact / CTA ────────────────────────────────────────────────

function ContactSection() {
  return (
    <section id="contact" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl px-8 py-14 text-center text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-white/20">
              For Healthcare Organisations
            </div>

            <h2 className="text-3xl font-bold mb-4">
              Ready to bring your team onto HealthClouda?
            </h2>
            <p className="text-blue-100 mb-8 max-w-lg mx-auto">
              Contact us to get your organisation onboarded. We&apos;ll set up your portal, configure roles, and have your team ready to go.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="mailto:hardeydamola20082@gmail.com?subject=HealthClouda Organisation Access"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
              >
                Get in Touch
                <ArrowRightIcon />
              </a>
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 text-white font-medium px-6 py-3 rounded-xl border border-white/30 hover:bg-white/10 transition-colors text-sm"
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
  return (
    <footer className="border-t border-gray-100 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">HealthClouda</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <Link href="/signin" className="hover:text-gray-600 transition-colors">Patient Portal</Link>
          <Link href="/superadmin/signin" className="hover:text-gray-600 transition-colors">Admin</Link>
          <span>© {new Date().getFullYear()} HealthClouda</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <HowItWorksSection />
      <ContactSection />
      <Footer />
    </div>
  );
}