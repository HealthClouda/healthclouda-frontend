'use client';

import { useEffect } from 'react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SlidePanel({ open, onClose, title, subtitle, children, footer }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-[rgba(0,8,37,0.35)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="hc-panel-in fixed right-0 top-0 bottom-0 z-30 w-full max-w-[440px] bg-white shadow-panel flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-text-soft mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-text-soft hover:text-danger hover:bg-danger-bg rounded-md p-1 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-2.5 px-6 py-[18px] border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
