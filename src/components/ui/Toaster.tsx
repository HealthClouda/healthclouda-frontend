'use client';

import { useEffect } from 'react';
import { useToastStore } from '@/store/toast';
import type { ToastItem, ToastType } from '@/store/toast';

const COLOURS: Record<ToastType, string> = {
  // success/warning use dedicated on-fill tokens — the badge-strength
  // success/warning tokens fail AA (3.30:1 / 3.19:1) under white text.
  success: 'bg-success-fill',
  error: 'bg-danger',
  warning: 'bg-warning-fill',
  info: 'bg-info',
};

const AUTO_DISMISS_MS = 2600;
// Error/warning toasts persist until manually dismissed — 2.6s is enough to
// read "Saved", not enough to read a failure and reach Dismiss on a keyboard
// (WCAG 2.2.1 Timing Adjustable).
const PERSISTENT: ToastType[] = ['error', 'warning'];

function ToastItem({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    if (PERSISTENT.includes(toast.type)) return;
    const t = setTimeout(() => remove(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, toast.type, remove]);

  return (
    <div
      className={`hc-toast-in flex items-center gap-2 ${COLOURS[toast.type]} text-white rounded-lg shadow-toast pl-4 pr-3 py-3 text-[13px] font-semibold`}
      role="alert"
    >
      <span className="flex-shrink-0 [&>svg]:w-[15px] [&>svg]:h-[15px]">
        {toast.type === 'success' && <CheckIcon />}
        {toast.type === 'error' && <XCircleIcon />}
        {toast.type === 'warning' && <WarnIcon />}
        {toast.type === 'info' && <InfoIcon />}
      </span>

      <p className="leading-snug">{toast.message}</p>

      <button
        onClick={() => remove(toast.id)}
        className="flex-shrink-0 text-white/70 hover:text-white transition-colors ml-1"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function XCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
