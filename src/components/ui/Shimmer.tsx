// Base animation class shared by all shimmer variants
const base = 'animate-pulse bg-gray-200 rounded';

export function ShimmerLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 ${base} ${className}`} />;
}

export function ShimmerCircle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }[size];
  return <div className={`${s} rounded-full ${base}`} />;
}

// Generic stat card shimmer — used on dashboard overview sections
export function ShimmerCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <ShimmerLine className="w-1/3" />
      <ShimmerLine className="w-1/2 h-7" />
      <ShimmerLine className="w-2/3 h-3" />
    </div>
  );
}

// Table row shimmer — pass count for number of rows
export function ShimmerRows({ count = 5, cols = 4 }: { count?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <ShimmerLine
              key={j}
              className={`flex-1 ${j === 0 ? 'max-w-[120px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// List item shimmer — for patient/staff lists
export function ShimmerListItem() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100">
      <ShimmerCircle />
      <div className="flex-1 space-y-2">
        <ShimmerLine className="w-1/3" />
        <ShimmerLine className="w-1/2 h-3" />
      </div>
      <ShimmerLine className="w-16 h-6 rounded-full" />
    </div>
  );
}

export function ShimmerList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerListItem key={i} />
      ))}
    </div>
  );
}