'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { authInputBase, authLabel } from './authStyles';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Left-adjacent stroke icon (rendered at 13px inset, icon-muted). */
  icon: ReactNode;
  error?: string;
}

// Labelled input with a left icon, per the design (label 16px above the field).
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, icon, error, className = '', ...props },
  ref,
) {
  return (
    <div>
      <label className={authLabel}>{label}</label>
      <div className="relative mt-4 flex items-center">
        <span className="pointer-events-none absolute left-[13px] flex text-[#b0b8c9]">{icon}</span>
        <input
          ref={ref}
          className={`${authInputBase} ${error ? 'border-red-400' : 'border-input-border'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-red-500">{error}</p>}
    </div>
  );
});
