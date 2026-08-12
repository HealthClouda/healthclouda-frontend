'use client';

import { useEffect, useRef } from 'react';

type IconColor = 'primary' | 'success' | 'warning' | 'danger' | 'purple';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: IconColor;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

const SIZE = {
  sm: 'max-w-[380px]',
  md: 'max-w-[420px]',
  lg: 'max-w-[460px]',
};

const ICON_COLOR: Record<IconColor, string> = {
  primary: 'bg-chip text-primary',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  purple: 'bg-purple-bg text-purple',
};

export function Modal({ open, onClose, title, description, icon, iconColor = 'primary', children, size = 'md', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Trap focus
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(0,8,37,0.35)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className={`hc-modal-in relative w-full ${SIZE[size]} bg-white rounded-card shadow-modal p-7 max-h-[90vh] overflow-y-auto focus:outline-none`}
      >
        {icon && (
          <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center mx-auto mb-3.5 [&>svg]:w-6 [&>svg]:h-6 ${ICON_COLOR[iconColor]}`}>
            {icon}
          </div>
        )}
        <h2 id="modal-title" className="font-body font-black text-base text-ink text-center">{title}</h2>
        {description && (
          <p id="modal-description" className="text-[12.5px] text-text-soft text-center mt-1.5">{description}</p>
        )}

        {children && <div className="mt-[18px]">{children}</div>}

        {footer && (
          <div className="flex gap-2.5 mt-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
