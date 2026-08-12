import { initials } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<AvatarSize, { wrapper: string; text: string }> = {
  sm: { wrapper: 'w-7 h-7',  text: 'text-xs' },
  md: { wrapper: 'w-9 h-9',  text: 'text-sm' },
  lg: { wrapper: 'w-11 h-11', text: 'text-base' },
  xl: { wrapper: 'w-14 h-14', text: 'text-lg' },
};

// Deterministic colour from a string — same name always gets same colour.
// Exact palette per design_handoff_dashboards/README.md.
const COLOURS = ['#0075ff', '#7c3aed', '#16a34a', '#d97706', '#0891b2', '#dc2626'];

function colourFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return COLOURS[hash % COLOURS.length];
}

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ firstName, lastName, src, size = 'md', className = '' }: AvatarProps) {
  const { wrapper, text } = SIZE[size];
  const abbr = initials(firstName, lastName);
  const colour = colourFor(`${firstName}${lastName}`);

  if (src) {
    return (
      <img
        src={src}
        alt={abbr}
        className={`${wrapper} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: colour }}
      className={`${wrapper} rounded-full flex items-center justify-center text-white font-semibold ${text} flex-shrink-0 ${className}`}
    >
      {abbr}
    </div>
  );
}