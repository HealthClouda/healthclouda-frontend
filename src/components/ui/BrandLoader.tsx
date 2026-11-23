/**
 * The HealthClouda loader (stand-up w2-k3, redrawn in w5-b6): our real logo
 * beating like a heart, with a blue pulse running along its ECG line. The two
 * beats land as the pulse crosses the deep spike and the tall peak, and the
 * pulse's glow flares on the same beats (timings in globals.css, `.hc-loader-*`).
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
 * - Under `prefers-reduced-motion` the beat and the pulse stop: the logo, still.
 * - It fades in after a short delay, so a fast load does not flash it.
 *
 * No hooks, so it renders on the server too (`loading.tsx`).
 */

type Size = 'sm' | 'md' | 'lg';

const WIDTH: Record<Size, string> = { sm: 'w-10', md: 'w-[72px]', lg: 'w-28' };

const LOGO = '/assets/images/HealthClouda-icon-tight.png';

// The centre of the ECG line cut out of the logo, in the PNG's own pixels
// (341x171), traced from the image.
const TRACE = 'M44 89.5 H78 L84 101 L98 67 L115 166 L132 45 L153 104 L166 73 L174 91.5 H252';

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
      <svg viewBox="0 0 341 171" className={`hc-loader-logo ${WIDTH[size]} h-auto overflow-visible`} aria-hidden="true" focusable="false">
        <image href={LOGO} width="341" height="171" />
        <path
          d={TRACE}
          pathLength={1}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hc-loader-trace"
          data-testid="brand-loader-trace"
        />
      </svg>
      {!decorative && <span className="sr-only">{label}</span>}
    </div>
  );
}
