'use client';

import { useRef } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
}

// OTP entry per the design (design_handoff_prelogin): 52×56 boxes, 11px radius;
// filled = blue border + white bg, empty = faint border + #fafbff, focus = blue
// border + 3px ring.
export function OtpInput({ value, onChange, length = 6, error }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  function handleChange(i: number, char: string) {
    const d = char.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join(''));
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted.padEnd(length, '').slice(0, length));
      refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
    e.preventDefault();
  }

  return (
    <div>
      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`h-14 w-[52px] rounded-[11px] border-[1.5px] text-center font-heading text-[22px] font-bold text-ink outline-none transition-colors focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,117,255,0.09)] ${
              error
                ? 'border-red-400 bg-white'
                : digit
                ? 'border-primary bg-white'
                : 'border-input-border bg-input-bg'
            }`}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-center text-[13px] text-red-500">{error}</p>}
    </div>
  );
}
