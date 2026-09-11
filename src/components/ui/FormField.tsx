export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 mb-4">
      <span className="text-xs font-semibold text-text-mid">{label}</span>
      {children}
    </label>
  );
}

// Shared input/select styling for SlidePanel forms across dashboards.
export const formInputClass = 'h-[42px] border-[1.5px] border-border rounded-lg px-3.5 text-[13px] text-ink bg-page outline-none w-full focus:border-primary focus:bg-white transition-colors';
