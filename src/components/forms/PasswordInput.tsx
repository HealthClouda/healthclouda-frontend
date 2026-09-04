'use client';

import { useState, forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { authInputBase, authLabel } from './authStyles';
import { LockIcon, EyeIcon, EyeOffIcon } from './AuthIcons';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

// Password field per the design: left lock icon, right eye toggle, spec input styles.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, className = '', ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div>
        {label && <label className={authLabel}>{label}</label>}
        <div className={`relative flex items-center ${label ? 'mt-4' : ''}`}>
          <span className="pointer-events-none absolute left-[13px] flex text-[#b0b8c9]">
            <LockIcon />
          </span>
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={`${authInputBase} pr-11 ${error ? 'border-red-400' : 'border-input-border'} ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            className="absolute right-[13px] flex text-[#b0b8c9] transition-colors hover:text-[#6b7280]"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {error && <p className="mt-1.5 text-[13px] text-red-500">{error}</p>}
      </div>
    );
  },
);
