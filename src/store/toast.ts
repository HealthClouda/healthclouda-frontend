import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  /** Order of arrival, so a panel can clear only the errors raised while it was open. */
  seq?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  seq: number;
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
  /** Remove error toasts that arrived after `seq` (SlidePanel calls this on close). */
  clearErrorsSince: (seq: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  seq: 0,
  add(message, type = 'info') {
    const id = crypto.randomUUID();
    // Errors stay until dismissed (WCAG 2.2.1, Toaster.tsx), so a repeat used
    // to stack beside its twin (w5-b6). A repeat replaces it instead.
    set((s) => ({
      seq: s.seq + 1,
      toasts: [
        ...s.toasts.filter((t) => !(t.message === message && t.type === type)),
        { id, message, type, seq: s.seq + 1 },
      ],
    }));
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  clearErrorsSince(seq) {
    set((s) => ({ toasts: s.toasts.filter((t) => !(t.type === 'error' && (t.seq ?? 0) > seq)) }));
  },
}));

// Convenience hook — use this everywhere instead of importing the store directly
export function useToast() {
  const add = useToastStore((s) => s.add);
  return {
    toast: {
      success: (msg: string) => add(msg, 'success'),
      error: (msg: string) => add(msg, 'error'),
      info: (msg: string) => add(msg, 'info'),
      warning: (msg: string) => add(msg, 'warning'),
    },
  };
}
