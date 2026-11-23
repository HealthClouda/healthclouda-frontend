export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 mb-4">
      <span className="text-xs font-semibold text-text-mid">{label}</span>
      {children}
    </label>
  );
}

// The look, shared; the size, per use. Never append a size to formInputClass
// (`${formInputClass} h-9 w-auto`): between two conflicting Tailwind classes the
// stylesheet order wins, not the class order, so `h-[42px] w-full` won and
// every table filter rendered full width (w5-b6). Use formFilterClass.
const fieldLook = 'border-[1.5px] border-border rounded-lg px-3.5 text-ink bg-page outline-none focus:border-primary focus:bg-white transition-colors';

// Shared input/select styling for SlidePanel forms across dashboards.
export const formInputClass = `h-[42px] w-full text-[13px] ${fieldLook}`;

// Table-toolbar filters: 36px, sized to content (add w-auto / w-56 at the call).
export const formFilterClass = `h-9 text-[12.5px] ${fieldLook}`;
