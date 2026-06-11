'use client';

import { useEffect } from 'react';
import { useToastStore } from '@/store/toast';
import type { ToastItem, ToastType } from '@/store/toast';

const COLOURS: Record<ToastType, { bar: string; icon: string; bg: string }> = {
  success: { bar: 'bg-green-500',  icon: 'text-green-500',  bg: 'bg-white' },
  error:   { bar: 'bg-red-500',    icon: 'text-red-500',    bg: 'bg-white' },
  warning: { bar: 'bg-yellow-400', icon: 'text-yellow-500', bg: 'bg-white' },
  info:    { bar: 'bg-blue-500',   icon: 'text-blue-500',   bg: 'bg-white' },
};

const AUTO_DISMISS_MS = 4500;

function ToastItem({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  const { bar, icon, bg } = COLOURS[toast.type];

  useEffect(() => {
    const t = setTimeout(() => remove(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, remove]);

  return (
    <div
      className={`relative flex items-start gap-3 ${bg} rounded-xl shadow-lg border border-gray-100 p-4 pr-10 w-80 overflow-hidden`}
      role="alert"
    >
      {/* Colour bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar} rounded-l-xl`} />

      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${icon}`}>
        {toast.type === 'success' && <CheckIcon />}
        {toast.type === 'error' && <XCircleIcon />}
        {toast.type === 'warning' && <WarnIcon />}
        {toast.type === 'info' && <InfoIcon />}
      </div>

      <p className="text-sm text-gray-800 leading-snug">{toast.message}</p>

      <button
        onClick={() => remove(toast.id)}
        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}