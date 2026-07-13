import Image from 'next/image';
import Link from 'next/link';

// Shared auth-screen shell (design_handoff_prelogin auth canvas): flare + gradient
// background with two blurred blobs, 64px white top nav (brand left / outlined
// back-button right), centered heading block (optional 56px icon chip + H1 + sub),
// and a 700px white card. Themed by org context — one component for both modes.
interface AuthCardProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Heading size override; defaults to 32px. */
  titleClassName?: string;
  /** Optional heading icon (omit on the sign-in screens, which have no chip). */
  icon?: React.ReactNode;
  iconVariant?: 'chip' | 'success';
  /** Org context — swaps the nav brand to the org logo + name. */
  orgName?: string;
  orgLogo?: string;
  /** Nav back-button target + label. */
  backHref?: string;
  backLabel?: string;
  /** Optional content rendered below the card (e.g. a back-to-login link). */
  footer?: React.ReactNode;
}

export function AuthCard({
  children,
  title,
  subtitle,
  titleClassName = 'text-[32px]',
  icon,
  iconVariant = 'chip',
  orgName,
  orgLogo,
  backHref = '/',
  backLabel = 'Back to Home',
  footer,
}: AuthCardProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden font-body"
      style={{
        background:
          "url('/assets/images/Backgroud_flare.webp') no-repeat center / cover, linear-gradient(145deg, #f4f8ff 0%, #ffffff 50%, #eef4ff 100%)",
      }}
    >
      {/* Blurred accent blobs */}
      <div
        className="pointer-events-none absolute -left-24 -top-20 h-[420px] w-[420px] rounded-full opacity-35 blur-[80px]"
        style={{ background: '#c7daff' }}
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-16 h-[340px] w-[340px] rounded-full opacity-35 blur-[80px]"
        style={{ background: '#bdd4ff' }}
      />

      {/* Top nav */}
      <nav className="absolute inset-x-0 top-0 z-[2] flex h-16 items-center justify-between gap-4 border-b border-[rgba(0,117,255,0.08)] bg-white/95 px-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          {orgName ? (
            <>
              {orgLogo && (
                // Org logos are arbitrary remote URLs from the API — plain <img>
                // avoids next/image remote-domain config.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={orgLogo} alt="" className="h-8 w-auto object-contain" />
              )}
              <span className="font-heading text-[19px] font-bold text-ink">{orgName}</span>
            </>
          ) : (
            <>
              <Image
                src="/assets/images/HealthClouda-icon-tight.png"
                alt="HealthClouda"
                width={48}
                height={24}
                className="h-6 w-auto object-contain"
              />
              <span className="font-heading text-[21px] font-bold text-ink">HealthClouda</span>
            </>
          )}
        </div>
        <Link
          href={backHref}
          className="whitespace-nowrap rounded-lg border border-primary px-4 py-1.5 font-heading text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          ← {backLabel}
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-[1] flex flex-col items-center gap-6 px-5 pb-12 pt-28">
        <div className="max-w-[480px] text-center">
          {icon &&
            (iconVariant === 'success' ? (
              <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-chip">
                {icon}
              </div>
            ) : (
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-chip text-primary">
                {icon}
              </div>
            ))}
          <h1 className={`font-heading font-bold leading-[1.3] text-ink ${titleClassName}`}>{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-[#6b7280]">{subtitle}</p>}
        </div>

        <div className="w-full max-w-[700px] rounded-[20px] border border-[rgba(0,117,255,0.1)] bg-white px-8 py-9 shadow-card">
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
}
