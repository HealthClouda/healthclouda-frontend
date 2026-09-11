import Image from 'next/image';
import Link from 'next/link';

// 404 per the design auth canvas (screen 8): auth-shell background with the
// brand-only nav (no back button, no card) and a centered 404 block.
export default function NotFound() {
  return (
    <div
      className="relative min-h-screen overflow-hidden font-body"
      style={{
        background:
          "url('/assets/images/Backgroud_flare.webp') no-repeat center / cover, linear-gradient(145deg, #f4f8ff 0%, #ffffff 50%, #eef4ff 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -left-24 -top-20 h-[420px] w-[420px] rounded-full opacity-35 blur-[80px]"
        style={{ background: '#c7daff' }}
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-16 h-[340px] w-[340px] rounded-full opacity-35 blur-[80px]"
        style={{ background: '#bdd4ff' }}
      />

      <nav className="absolute inset-x-0 top-0 z-[2] flex h-16 items-center border-b border-[rgba(0,117,255,0.08)] bg-white/95 px-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/assets/images/HealthClouda-icon-tight.png"
            alt="HealthClouda"
            width={48}
            height={24}
            className="h-6 w-auto object-contain"
          />
          <span className="font-heading text-[21px] font-bold text-ink">HealthClouda</span>
        </Link>
      </nav>

      <div className="relative z-[1] flex flex-col items-center px-5 pb-12 pt-40 text-center">
        <div className="font-heading text-[110px] font-extrabold leading-none tracking-[-4px] text-primary">
          404
        </div>
        <h1 className="mb-2 mt-[18px] font-heading text-[26px] font-bold text-ink">
          Page not found
        </h1>
        <p className="mb-7 max-w-[420px] text-[15px] leading-relaxed text-[#6b7280]">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-[11px] bg-primary px-8 font-heading text-[15px] font-semibold text-white shadow-btn-primary transition-colors hover:bg-primary-dark"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
