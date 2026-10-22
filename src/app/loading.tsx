import { BrandLoader } from '@/components/ui/BrandLoader';

// Shown while a page's server work runs (e.g. a dashboard awaiting its stats
// after sign-in). Before this file existed the old page stayed on screen with no
// sign that anything was happening. Stand-up w2-k3.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <BrandLoader size="lg" />
    </div>
  );
}
