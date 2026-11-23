import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add(message, type = 'info') {
    const id = crypto.randomUUID();
    // Errors stay until dismissed (WCAG 2.2.1, Toaster.tsx), so without this
    // they stacked on repeat and outlived the fix (w5-b6). A repeat replaces
    // its twin; a success clears errors. Warnings stay: they still hold.
    set((s) => ({
      toasts: [
        ...s.toasts.filter((t) => !(t.message === message && t.type === type) && !(type === 'success' && t.type === 'error')),
        { id, message, type },
      ],
    }));
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
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