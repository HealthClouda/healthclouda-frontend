'use client';

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className = 'w-[260px]' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder [&>svg]:w-[14px] [&>svg]:h-[14px]">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full bg-white border-[1.5px] border-border rounded-lg pl-8 pr-3 text-[12.5px] text-ink outline-none focus:border-primary"
      />
    </div>
  );
}
