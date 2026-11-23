import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toast';

const add = (m: string, t?: 'success' | 'error' | 'info' | 'warning') => useToastStore.getState().add(m, t);
const toasts = () => useToastStore.getState().toasts;

beforeEach(() => useToastStore.setState({ toasts: [] }));

/**
 * w5-b6 walk (23 Nov): error toasts stay until dismissed on purpose (WCAG
 * 2.2.1, see Toaster.tsx), but nothing else ever removed them. Pressing Save
 * twice on an empty form stacked two identical errors, and both were still on
 * screen after the form was fixed and saved successfully.
 */
describe('toast store', () => {
  it('shows a repeated message once, not stacked', () => {
    add('Please fill in all required fields', 'error');
    add('Please fill in all required fields', 'error');
    expect(toasts()).toHaveLength(1);
  });

  it('clears outstanding errors once an action succeeds', () => {
    add('Please fill in all required fields', 'error');
    add('Organisation updated', 'success');
    expect(toasts().map((t) => t.type)).toEqual(['success']);
  });

  it('keeps warnings when an action succeeds: they carry information still true', () => {
    add('Awaiting doctor confirmation.', 'warning');
    add('Saved', 'success');
    expect(toasts().map((t) => t.type)).toEqual(['warning', 'success']);
  });
});
