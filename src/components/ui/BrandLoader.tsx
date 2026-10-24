/**
 * The HealthClouda loader (stand-up w2-k3): the logo's cloud, with its
 * heartbeat line tracing through it like a monitor sweep.
 *
 * Use it for waits that have no shape yet: a page change (`src/app/loading.tsx`)
 * or a whole section before anything is on screen. Tables, stat cards and lists
 * keep their Shimmer skeletons, which hold the layout so nothing jumps when the
 * data lands.
 *
 * Accessibility:
 * - Announces itself as a `status` with `label`, unless `decorative`. Use
 *   `decorative` when visible text next to it already says what is loading, so
 *   a screen reader does not hear it twice.
 * - Under `prefers-reduced-motion` the sweep stops and the whole line is shown
 *   still (globals.css, `.hc-loader-*`).
 * - It fades in after a short delay, so a fast load does not flash it.
 *
 * No hooks, so it renders on the server too (`loading.tsx`).
 */

type Size = 'sm' | 'md' | 'lg';

const WIDTH: Record<Size, string> = { sm: 'w-10', md: 'w-[72px]', lg: 'w-28' };

// The ECG line, drawn inside the cloud (viewBox 0 0 120 76).
const TRACE = 'M16 52 H36 L41 42 L47 62 L55 20 L63 69 L69 45 L73 52 H104';

interface BrandLoaderProps {
  size?: Size;
  /** What a screen reader hears. Ignored when `decorative`. */
  label?: string;
  /** Hide from assistive tech: nearby visible text already says what is loading. */
  decorative?: boolean;
  className?: string;
}

export function BrandLoader({
  size = 'md',
  label = 'Loading…',
  decorative = false,
  className = '',
}: BrandLoaderProps) {
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'status' as const };

  return (
    <div className={`hc-loader inline-flex flex-col items-center ${className}`} {...a11y}>
      <svg viewBox="0 0 120 76" className={`${WIDTH[size]} h-auto text-primary`} aria-hidden="true" focusable="false">
        <g fill="currentColor">
          <rect x="8" y="40" width="104" height="32" rx="16" />
          <circle cx="38" cy="40" r="18" />
          <circle cx="66" cy="32" r="26" />
          <circle cx="92" cy="46" r="16" />
        </g>
        <g fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {/* The faint full line, and the bright pulse that sweeps along it. */}
          <path d={TRACE} className="hc-loader-track" />
          <path d={TRACE} pathLength={1} className="hc-loader-trace" data-testid="brand-loader-trace" />
        </g>
      </svg>
      {!decorative && <span className="sr-only">{label}</span>}
    </div>
  );
}
