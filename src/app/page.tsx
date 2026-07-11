import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/LandingNav';
import { ContactForm } from '@/components/landing/ContactForm';

// General landing — recreated pixel-per-spec from
// design_handoff_prelogin/designs/HealthClouda Landing.dc.html (batch 1).
// Desktop values match the design exactly; responsive collapses added for
// small screens (the design file is desktop-only).

export const metadata: Metadata = {
  title: 'HealthClouda | The Connective Infrastructure for African Healthcare',
  description:
    'HealthClouda links hospitals and clinics across Africa so your records and referrals move with you — securely, instantly. No repeated tests. No paper files. No starting over.',
};

const kicker = 'font-heading text-[13px] font-bold text-primary uppercase tracking-[0.1em]';
const h2 = 'font-heading text-3xl md:text-4xl font-[750] tracking-[-0.02em] text-ink leading-[1.25]';

function Check() {
  return <span className="text-primary font-bold">✓</span>;
}

// ─── Hero ─────────────────────────────────────────────────────────

function PortalMock() {
  return (
    <div className="relative max-w-[920px] mx-auto mt-14">
      <div className="border-[3px] border-primary rounded-[20px] overflow-hidden shadow-[0_24px_64px_rgba(0,117,255,0.18)] bg-white text-left">
        {/* Mock top bar */}
        <div className="flex items-center justify-between px-7 py-4 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <Image src="/assets/images/HealthClouda-icon-tight.png" alt="" width={26} height={26} className="object-contain" />
            <span className="font-heading text-[15px] font-extrabold text-ink">HealthClouda</span>
            <span className="font-heading text-[11.5px] font-bold text-primary-dark bg-chip px-2.5 py-1 rounded-full">Patient portal</span>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="w-2 h-2 bg-primary rounded-full" />
            <span className="w-[34px] h-[34px] bg-chip text-primary-dark rounded-full flex items-center justify-center font-heading text-[12.5px] font-extrabold">AO</span>
          </div>
        </div>
        {/* Mock body */}
        <div className="p-7 grid md:grid-cols-[1.35fr_1fr] gap-6 bg-page">
          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <h3 className="font-heading text-[21px] font-[750] text-ink mb-1">Good afternoon, Adaeze</h3>
              <p className="font-body text-[13.5px] text-gray-500">Your health, in one place — wherever you&apos;re treated.</p>
            </div>
            <div className="inline-flex items-center gap-2.5 bg-white border border-dashed border-primary/40 rounded-xl px-4 py-3 self-start">
              <span className="font-body text-xs text-gray-500 font-bold">Your HealthClouda ID</span>
              <span className="font-heading text-[13px] font-extrabold text-primary-dark tracking-[0.05em]">HCL-NG-DEMO-4Q2A</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: '1', label: 'Upcoming appointment', blue: false },
                { n: '2', label: 'Active prescriptions', blue: false },
                { n: '1', label: 'Active referral', blue: true },
              ].map(s => (
                <div key={s.label} className="bg-white border border-hairline rounded-[14px] px-4 py-3.5">
                  <p className={`font-heading text-xl font-extrabold ${s.blue ? 'text-primary' : 'text-ink'}`}>{s.n}</p>
                  <p className="font-body text-[11.5px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-hairline rounded-[14px] px-[18px] py-4 flex items-center justify-between gap-3.5">
              <div className="min-w-0">
                <p className="font-heading text-[13.5px] font-bold text-ink">
                  Referral · Ikeja Clinic <span className="text-primary">⟶</span> LUTH Cardiology
                </p>
                <p className="font-body text-xs text-gray-500 mt-1">Your records travelled with the referral — no paper needed.</p>
              </div>
              <span className="font-heading text-[11.5px] font-bold text-green-600 bg-green-50 border border-green-200 px-[11px] py-[5px] rounded-full whitespace-nowrap">Letter ready</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 min-w-0">
            <p className="font-heading text-xs font-bold text-gray-500 uppercase tracking-[0.07em]">Access requests</p>
            <div className="bg-white border border-hairline rounded-[14px] px-[18px] py-4 flex flex-col gap-3">
              <p className="font-body text-[13px] text-gray-700 leading-[1.55]">
                <span className="font-heading font-bold text-ink">St. Mary&apos;s Hospital</span> is requesting access to your medical records.
              </p>
              <div className="flex gap-2.5">
                <span className="font-heading text-[12.5px] font-bold text-white bg-primary px-[18px] py-2 rounded-[10px]">Grant</span>
                <span className="font-heading text-[12.5px] font-bold text-gray-700 bg-white border-[1.5px] border-hairline px-[18px] py-2 rounded-[10px]">Deny</span>
              </div>
            </div>
            <div className="bg-white border border-hairline rounded-[14px] px-[18px] py-4 flex flex-col gap-1.5">
              <p className="font-heading text-[12.5px] font-bold text-ink">Amoxicillin 500mg</p>
              <p className="font-body text-xs text-gray-500">3× daily · 5 days left · Dr. Okafor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative pt-[164px] px-6 md:px-8 pb-0 text-center overflow-hidden">
      {/* Blue flare background */}
      <div className="absolute -top-[180px] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] pointer-events-none [background:radial-gradient(ellipse_55%_45%_at_50%_40%,rgba(0,117,255,0.13)_0%,rgba(0,117,255,0.05)_45%,rgba(0,117,255,0)_75%)]" />
      <div className="absolute top-[320px] -left-[220px] w-[520px] h-[520px] pointer-events-none [background:radial-gradient(circle,rgba(0,117,255,0.07)_0%,rgba(0,117,255,0)_70%)]" />
      <div className="absolute top-[220px] -right-[240px] w-[560px] h-[560px] pointer-events-none [background:radial-gradient(circle,rgba(0,117,255,0.07)_0%,rgba(0,117,255,0)_70%)]" />

      <div className="relative max-w-[780px] mx-auto flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 bg-chip border border-primary/[0.22] text-primary-dark font-heading text-[12.5px] font-bold tracking-[0.04em] uppercase px-4 py-[7px] rounded-full">
          <span className="w-[7px] h-[7px] bg-primary rounded-full" />
          Healthcare&apos;s connective infrastructure
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl md:text-[58px] font-[750] leading-[1.16] tracking-[-0.025em] text-ink text-balance">
          One patient record.<br />Every facility, <span className="text-primary">connected.</span>
        </h1>
        <p className="font-body text-lg leading-[1.7] text-gray-700 max-w-[620px] text-pretty">
          HealthClouda links hospitals and clinics across Africa so your records and referrals move with you — securely, instantly. No repeated tests. No paper files. No starting over.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5 mt-1.5">
          <Link
            href="/signin"
            className="font-heading inline-flex items-center gap-2 px-[30px] py-3.5 bg-primary text-white rounded-xl text-[15.5px] font-semibold shadow-[0_4px_16px_rgba(0,117,255,0.3)] hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,117,255,0.35)] transition-all"
          >
            Patient sign in
          </Link>
          <a
            href="#network"
            className="font-heading inline-flex items-center gap-2 px-[26px] py-3.5 bg-white text-ink border-[1.5px] border-hairline rounded-xl text-[15.5px] font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            See how it works
          </a>
        </div>
        <p className="font-body text-[13px] text-gray-500">
          Patient accounts are created at any registered HealthClouda facility — not online.
        </p>
        <div className="flex flex-wrap justify-center gap-7 mt-1">
          {['HIPAA & NDPR compliant', 'Secure cloud infrastructure', 'You control access'].map(t => (
            <div key={t} className="flex items-center gap-[7px] font-body text-[13px] text-gray-500 font-bold">
              <Check /> {t}
            </div>
          ))}
        </div>
      </div>

      <PortalMock />
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'One ID, created once',
    body: 'A patient registers at any connected facility and receives a unique HealthClouda ID. Their record starts here — and follows them everywhere.',
    chip: <span className="tracking-[0.06em]">HCL-NG-DEMO-4Q2A</span>,
  },
  {
    n: '02',
    title: 'Refer in one click',
    body: 'A doctor refers the patient to a specialist or another hospital. The referral letter, history, vitals and prescriptions transfer securely with it.',
    chip: (
      <span className="flex items-center gap-2.5">
        <span>Ikeja Clinic</span><span className="text-primary">⟶</span><span>LUTH Cardiology</span>
      </span>
    ),
  },
  {
    n: '03',
    title: 'Care continues instantly',
    body: "The receiving team sees the full picture before the patient arrives — with the patient's consent controlling exactly who sees what.",
    chip: (
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-600 rounded-full" />Access granted by patient
      </span>
    ),
  },
];

function NetworkSection() {
  return (
    <section id="network" className="px-6 md:px-8 pt-[110px] pb-[100px] max-w-[1140px] mx-auto">
      <div className="text-center max-w-[640px] mx-auto mb-14 flex flex-col gap-3.5">
        <p className={kicker}>How it works</p>
        <h2 className={h2}>Records that travel with the patient</h2>
        <p className="font-body text-base text-gray-500 leading-[1.65]">
          Most EHRs stop at the hospital door. HealthClouda is the network between facilities — the referral, the records and the results arrive before the patient does.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {STEPS.map(s => (
          <div
            key={s.n}
            className="relative bg-white border-[1.5px] border-hairline rounded-[20px] px-7 py-8 flex flex-col gap-3.5 shadow-[0_2px_8px_rgba(0,8,37,0.05)] hover:border-primary hover:shadow-[0_8px_24px_rgba(0,117,255,0.13)] hover:-translate-y-1 transition-all"
          >
            <div className="font-heading text-[13px] font-extrabold text-primary bg-chip w-10 h-10 rounded-xl flex items-center justify-center">{s.n}</div>
            <h3 className="font-heading text-lg font-bold text-ink">{s.title}</h3>
            <p className="font-body text-[14.5px] text-gray-500 leading-[1.65]">{s.body}</p>
            <div className="mt-auto font-heading text-[12.5px] font-bold text-primary-dark bg-page border border-dashed border-primary/35 rounded-[10px] px-3.5 py-2.5">
              {s.chip}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '/assets/images/person_add.png',
    title: 'Unified patient records',
    desc: 'Complete history, vitals, episodes and admissions under one HealthClouda ID — accessible at any connected facility.',
  },
  {
    icon: '/assets/images/chat_bubble.png',
    title: 'Referrals & transfers',
    desc: 'Hospital-to-hospital referrals with generated referral letters, incoming queues and doctor notifications.',
  },
  {
    icon: '/assets/images/pill.png',
    title: 'Prescriptions',
    desc: 'Digital prescribing that follows the patient — visible to the pharmacy, the next doctor and the patient themselves.',
  },
  {
    icon: '/assets/images/science.png',
    title: 'Wards, beds & admissions',
    desc: 'Live ward occupancy, admissions and emergency beds — visible to the roles that need them.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="px-6 md:px-8 py-[90px] bg-white border-y border-hairline">
      <div className="max-w-[1140px] mx-auto">
        <div className="text-center max-w-[620px] mx-auto mb-[52px] flex flex-col gap-3.5">
          <p className={kicker}>Features</p>
          <h2 className={h2}>Everything a connected facility needs</h2>
          <p className="font-body text-base text-gray-500 leading-[1.65]">
            Role-specific tools for every person in the building — designed around how care actually flows.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-white border-[1.5px] border-primary rounded-[20px] px-[22px] py-7 text-center flex flex-col items-center gap-3 shadow-[0_2px_8px_rgba(0,117,255,0.08)] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,117,255,0.15)] transition-all"
            >
              <div className="w-[52px] h-[52px] bg-chip rounded-[14px] flex items-center justify-center">
                <Image src={f.icon} alt="" width={26} height={26} className="object-contain" />
              </div>
              <h3 className="font-heading text-base font-bold text-ink">{f.title}</h3>
              <p className="font-body text-[13.5px] text-gray-500 leading-[1.6]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── One platform ─────────────────────────────────────────────────

const ROLES = ['Doctor portal', 'Nurse portal', 'Receptionist desk', 'Patient portal', 'Organisation admin', 'Platform admin'];

function OnePlatformSection() {
  return (
    <section className="px-6 md:px-8 py-[100px] max-w-[1140px] mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-[72px] items-center">
      <div className="flex flex-col gap-5">
        <p className={kicker}>One platform</p>
        <h2 className="font-heading text-3xl md:text-[34px] font-[750] tracking-[-0.02em] text-ink leading-[1.25]">
          Every role in the building, on the same page
        </h2>
        <p className="font-body text-base text-gray-700 leading-[1.7]">
          From the receptionist checking a patient in to the doctor closing an episode, everyone works from one live record. No transcription between systems, no lost paper — and administrators see the whole facility at a glance.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-1">
          {ROLES.map(r => (
            <div key={r} className="flex items-center gap-2.5 font-body text-[14.5px] text-gray-700 font-bold">
              <Check /> {r}
            </div>
          ))}
        </div>
        <div>
          <a
            href="#contact"
            className="font-heading inline-flex mt-2 px-[26px] py-[13px] bg-primary text-white rounded-xl text-[15px] font-semibold shadow-[0_4px_16px_rgba(0,117,255,0.3)] hover:bg-primary-dark hover:-translate-y-0.5 transition-all"
          >
            Request a walkthrough
          </a>
        </div>
      </div>
      <div className="rounded-[20px] overflow-hidden shadow-[0_4px_24px_rgba(0,117,255,0.12)] max-h-[520px]">
        <Image
          src="/assets/images/Female_doctor.jpg"
          alt="Doctor using HealthClouda"
          width={800}
          height={1000}
          className="w-full h-full object-cover block"
          sizes="(min-width: 1024px) 45vw, 100vw"
        />
      </div>
    </section>
  );
}

// ─── Benefits ─────────────────────────────────────────────────────

const BENEFITS = [
  {
    img: '/assets/images/BENEFIT_ONE.png',
    alt: 'Adaptable clinical workflows',
    tag: 'Workflow',
    title: 'Effortless patient workflows',
    body: 'Every clinic operates differently — HealthClouda adapts. Registration, history taking, vitals, diagnostic notes and follow-ups shape themselves around how your team already works. Faster onboarding, fewer errors, more time for care.',
    maxH: 280,
    flipped: false,
  },
  {
    img: '/assets/images/Heart.png',
    alt: 'Patient safety alerts',
    tag: 'Safety',
    title: 'Intelligence that keeps patients safe',
    body: 'Safety alerts for allergies, drug interactions, critical vitals, duplicate records and missed follow-ups. When something looks off, the system prompts staff to double-check and intervene early — the right care at the right time.',
    maxH: 240,
    flipped: true,
  },
  {
    img: '/assets/images/noun-africa.png',
    alt: 'Built for Africa',
    tag: 'Africa-first',
    title: "Built for Africa's realities",
    body: 'Full offline mode keeps work going through power and connectivity drops. Priced for varying budgets, it scales from a single-practitioner clinic to a multi-campus hospital — with intuitive design your team adopts in days, not months.',
    maxH: 240,
    flipped: false,
  },
];

function BenefitsSection() {
  return (
    <section className="px-6 md:px-8 pt-10 pb-[100px] max-w-[1050px] mx-auto flex flex-col gap-[88px]">
      {BENEFITS.map(b => {
        const img = (
          <div className="bg-[linear-gradient(160deg,#ebf3ff_0%,#f8faff_100%)] border border-hairline rounded-[20px] p-9 flex items-center justify-center">
            <Image src={b.img} alt={b.alt} width={600} height={b.maxH} className="w-full object-contain" style={{ maxHeight: b.maxH }} />
          </div>
        );
        const copy = (
          <div className="flex flex-col gap-3.5">
            <span className="font-heading self-start text-xs font-bold text-primary-dark bg-chip px-3.5 py-1.5 rounded-full tracking-[0.04em] uppercase">{b.tag}</span>
            <h2 className="font-heading text-[27px] font-[750] tracking-[-0.02em] text-ink leading-[1.3]">{b.title}</h2>
            <p className="font-body text-[15.5px] text-gray-700 leading-[1.7]">{b.body}</p>
          </div>
        );
        return (
          <div
            key={b.title}
            className={`grid lg:gap-16 gap-8 items-center ${b.flipped ? 'lg:grid-cols-[58fr_42fr]' : 'lg:grid-cols-[42fr_58fr]'}`}
          >
            {b.flipped ? <>{copy}{img}</> : <>{img}{copy}</>}
          </div>
        );
      })}
    </section>
  );
}

// ─── About ────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section id="about" className="px-6 md:px-8 py-[100px] bg-primary/[0.055]">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center max-w-[720px] mx-auto mb-[52px] flex flex-col gap-3.5">
          <p className={kicker}>About</p>
          <h2 className={h2}>Who we are</h2>
          <p className="font-body text-base text-gray-700 leading-[1.75]">
            HealthClouda is the connective infrastructure for healthcare in Nigeria and Sub-Saharan Africa — a secure, cloud-based platform that ends long queues and paper files by letting medical records move safely between the facilities that care for a patient.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {[
            {
              icon: '/assets/images/target.png',
              title: 'Our mission',
              body: "To digitize patient records and build Africa's referral infrastructure — so no referral ever travels on paper again, and every provider treats with the patient's full history in hand.",
            },
            {
              icon: '/assets/images/eye.png',
              title: 'Our vision',
              body: 'A continent where every hospital and clinic is connected — where any patient can be referred anywhere and their history is one consented request away.',
            },
          ].map(c => (
            <div key={c.title} className="bg-white rounded-[20px] border-t-8 border-primary px-[30px] py-[34px] flex flex-col items-center text-center gap-3.5 shadow-[0_2px_8px_rgba(0,8,37,0.06)]">
              <div className="w-[52px] h-[52px] bg-chip rounded-[14px] flex items-center justify-center">
                <Image src={c.icon} alt="" width={28} height={28} className="object-contain" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">{c.title}</h3>
              <p className="font-body text-[14.5px] text-gray-700 leading-[1.65]">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white rounded-[20px] px-[30px] py-[34px] shadow-[0_2px_8px_rgba(0,8,37,0.06)] flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] bg-amber-100 rounded-xl flex items-center justify-center font-heading text-lg font-extrabold text-amber-700">✕</div>
              <p className="font-heading text-xs font-bold text-amber-700 uppercase tracking-[0.08em]">The problem</p>
            </div>
            <p className="font-body text-[14.5px] text-gray-700 leading-[1.7]">
              In many hospitals, patient records still live in paper files. And even facilities that have gone digital hit a wall at their own front door — they can&apos;t refer out. Referral letters are still printed, carried by hand and lost, so every new facility means repeated tests and starting over.
            </p>
          </div>
          <div className="bg-primary rounded-[20px] px-[30px] py-[34px] shadow-[0_4px_24px_rgba(0,117,255,0.25)] flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] bg-white/[0.16] rounded-xl flex items-center justify-center font-heading text-lg font-extrabold text-white">✓</div>
              <p className="font-heading text-xs font-bold text-blue-200 uppercase tracking-[0.08em]">Our solution</p>
            </div>
            <p className="font-body text-[14.5px] text-chip leading-[1.7]">
              We fix both. HealthClouda digitizes the record, then connects the facility: one HealthClouda ID per patient, digital referrals between registered facilities, and records that arrive before the patient does — always with the patient&apos;s consent.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────

const SECURITY_ITEMS = [
  { title: 'Patient-consented access', sub: 'Facilities request access; patients grant or deny it — every request logged.' },
  { title: '256-bit encryption', sub: 'All data encrypted in transit and at rest, end to end.' },
  { title: 'Role-based access control', sub: 'Every user sees only what their role requires — nothing more.' },
  { title: 'Complete audit trails', sub: 'Every view, edit and transfer is logged and attributable.' },
];

function SecuritySection() {
  return (
    <section id="security" className="px-6 md:px-8 py-[100px] max-w-[1140px] mx-auto grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-[72px] items-center">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Image src="/assets/images/encrypted.png" alt="" width={24} height={24} className="object-contain" />
          <span className="font-heading text-[13px] font-bold text-primary uppercase tracking-[0.08em]">Enterprise security</span>
        </div>
        <h2 className="font-heading text-3xl md:text-[34px] font-[750] tracking-[-0.02em] text-ink leading-[1.25]">
          Patient data, protected at every hop
        </h2>
        <p className="font-body text-base text-gray-700 leading-[1.7]">
          Records that move between facilities demand a higher bar. HealthClouda is built to HIPAA and NDPR standards, with the patient in control of who sees their data.
        </p>
        <div className="flex flex-col gap-3.5 mt-1.5">
          {SECURITY_ITEMS.map(i => (
            <div key={i.title} className="flex items-start gap-3">
              <span className="text-primary font-bold text-[15px] leading-[1.5]">✓</span>
              <div>
                <p className="font-heading text-[15px] font-bold text-ink">{i.title}</p>
                <p className="font-body text-[13.5px] text-gray-500 mt-0.5 leading-[1.55]">{i.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-[1.5px] border-hairline rounded-[20px] p-9 flex flex-col gap-5 shadow-[0_2px_8px_rgba(0,8,37,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-bold text-primary uppercase tracking-[0.08em] mb-1">Infrastructure</p>
            <h3 className="font-heading text-xl font-bold text-ink">Cloud-native architecture</h3>
          </div>
          <div className="w-14 h-14 bg-chip rounded-2xl flex items-center justify-center flex-shrink-0">
            <Image src="/assets/images/cloud.png" alt="" width={28} height={28} className="object-contain" />
          </div>
        </div>
        <p className="font-body text-sm text-gray-500 leading-[1.65]">
          Built on secure, modern cloud infrastructure to serve everything from a single clinic to a multi-campus hospital network — reliably, at African scale.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: '99.9%', l: 'Uptime target' },
            { v: 'Cloud-native', l: 'Infrastructure' },
            { v: 'Offline-first', l: 'Keeps working' },
            { v: 'Real-time', l: 'Sync & backup' },
          ].map(s => (
            <div key={s.l} className="bg-page border border-hairline rounded-xl px-4 py-3.5">
              <p className="font-heading text-[15px] font-extrabold text-ink">{s.v}</p>
              <p className="font-body text-xs text-gray-500 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section id="contact" className="px-6 md:px-8 py-[100px] bg-panel">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center max-w-[560px] mx-auto mb-12 flex flex-col gap-3.5">
          <p className={kicker}>Contact</p>
          <h2 className={h2}>Bring your facility onto the network</h2>
          <p className="font-body text-base text-gray-700 leading-[1.65]">
            Tell us about your organisation and we&apos;ll set you up with a branded portal and onboard your team.
          </p>
        </div>

        <div className="grid lg:grid-cols-[2fr_3fr] gap-8 items-start">
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-hairline rounded-[20px] p-7 flex flex-col gap-2 shadow-[0_2px_8px_rgba(0,8,37,0.05)]">
              <h4 className="font-heading text-[15px] font-bold text-ink">Email us</h4>
              <a href="mailto:hello@healthclouda.ng" className="font-body text-[14.5px] text-primary font-bold hover:text-primary-dark">hello@healthclouda.ng</a>
              <p className="font-body text-[13px] text-gray-500 leading-[1.6]">We respond within one business day.</p>
            </div>
            <div className="bg-white border border-hairline rounded-[20px] p-7 flex flex-col gap-2 shadow-[0_2px_8px_rgba(0,8,37,0.05)]">
              <h4 className="font-heading text-[15px] font-bold text-ink">Staff &amp; patients</h4>
              <p className="font-body text-[13.5px] text-gray-700 leading-[1.65]">
                Accounts can&apos;t be created online. Visit the reception desk at any registered facility — admin staff will create your login.
              </p>
            </div>
          </div>

          <div className="bg-white border border-hairline rounded-[20px] p-6 sm:p-9 shadow-[0_4px_24px_rgba(0,117,255,0.1)] flex flex-col gap-4">
            <h4 className="font-heading text-[17px] font-bold text-ink mb-1">Send us a message</h4>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA banner ───────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="bg-primary px-6 md:px-8 py-[88px] text-center">
      <div className="max-w-[640px] mx-auto flex flex-col items-center gap-[18px]">
        <h2 className="font-heading text-3xl md:text-[34px] font-[750] tracking-[-0.02em] text-white leading-[1.25]">
          Ready to connect your facility?
        </h2>
        <p className="font-body text-base text-white/[0.88] leading-[1.65]">
          Join the growing network of hospitals and clinics across Africa sharing records securely on HealthClouda.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5 mt-2">
          <a
            href="#contact"
            className="font-heading px-[30px] py-3.5 bg-white text-primary rounded-xl text-[15.5px] font-bold hover:bg-chip hover:scale-[1.03] transition-all"
          >
            Get started today
          </a>
          <Link
            href="/signin"
            className="font-heading px-[26px] py-3.5 bg-transparent text-white border-[1.5px] border-white/45 rounded-xl text-[15.5px] font-semibold hover:bg-white/[0.12] transition-colors"
          >
            Patient sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-footer px-6 md:px-14 pt-16 pb-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-11">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <Image src="/assets/images/HealthClouda-icon-tight.png" alt="" width={30} height={30} className="object-contain invert" />
              <span className="font-heading text-[19px] font-extrabold text-white">HealthClouda</span>
            </div>
            <p className="font-body text-[13.5px] text-slate-400 leading-[1.65] max-w-[280px]">
              The connective infrastructure for African healthcare — secure, cloud-based records that move with the patient.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-[0.08em] text-slate-400 mb-1">Platform</h4>
            <a href="#network" className="font-body text-[13.5px] text-slate-300 hover:text-white transition-colors">How it works</a>
            <a href="#features" className="font-body text-[13.5px] text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#security" className="font-body text-[13.5px] text-slate-300 hover:text-white transition-colors">Security</a>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-[0.08em] text-slate-400 mb-1">Company</h4>
            <a href="#about" className="font-body text-[13.5px] text-slate-300 hover:text-white transition-colors">About us</a>
            <a href="#contact" className="font-body text-[13.5px] text-slate-300 hover:text-white transition-colors">Contact</a>
            <Link href="/signin" className="font-body text-[13.5px] text-slate-300 hover:text-white transition-colors">Patient sign in</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-[0.08em] text-slate-400 mb-1">Compliance</h4>
            <span className="font-body text-[13.5px] text-slate-300">HIPAA compliant</span>
            <span className="font-body text-[13.5px] text-slate-300">NDPR compliant</span>
            <span className="font-body text-[13.5px] text-slate-300">256-bit SSL</span>
          </div>
        </div>
        <div className="border-t border-[#2d2d4e] pt-[22px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-[12.5px] text-slate-500">© {new Date().getFullYear()} HealthClouda. All rights reserved.</p>
          <p className="font-body text-[12.5px] text-slate-500">Built for African healthcare</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-page font-body text-ink overflow-x-hidden">
      <LandingNav />
      <main>
        <HeroSection />
        <NetworkSection />
        <FeaturesSection />
        <OnePlatformSection />
        <BenefitsSection />
        <AboutSection />
        <SecuritySection />
        <ContactSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
