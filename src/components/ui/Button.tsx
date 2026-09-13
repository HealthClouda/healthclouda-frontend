import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-primary hover:bg-primary-dark text-white shadow-btn disabled:opacity-50',
  secondary: 'bg-transparent border-[1.5px] border-border text-text-mid hover:border-primary hover:text-primary hover:bg-chip disabled:opacity-50',
  danger:    'bg-danger hover:bg-danger/90 text-white disabled:opacity-50',
  ghost:     'hover:bg-page text-text-soft hover:text-ink disabled:opacity-50',
  outline:   'border border-border hover:border-primary hover:text-primary text-text-mid disabled:opacity-50',
};

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${VARIANT[variant]} ${SIZE[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);