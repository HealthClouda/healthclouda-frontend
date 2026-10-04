import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SlidePanel } from './SlidePanel';
import { Toaster } from './Toaster';
import { useToastStore } from '@/store/toast';

/**
 * FLAG-062 — toasts sit bottom-right, exactly where a slide panel's footer
 * buttons are, and warning/error toasts stay until dismissed. On 28 Sep a
 * nurse's "Awaiting doctor confirmation" warning covered the next panel's
 * "Record outcome" button. While any panel is open the page is marked, and the
 * toaster (class `hc-toaster`) moves left of the 440px panel — see globals.css.
 */
afterEach(() => { cleanup(); useToastStore.setState({ toasts: [] }); });

describe('FLAG-062 — toasts never cover an open slide panel', () => {
  it('marks the page while a panel is open, and clears it when the panel closes', () => {
    const { rerender } = render(<SlidePanel open onClose={() => {}} title="A">x</SlidePanel>);
    expect(document.body.hasAttribute('data-panel-open')).toBe(true);
    rerender(<SlidePanel open={false} onClose={() => {}} title="A">x</SlidePanel>);
    expect(document.body.hasAttribute('data-panel-open')).toBe(false);
  });

  it('keeps the mark while a second panel is still open', () => {
    const { rerender } = render(<>
      <SlidePanel open onClose={() => {}} title="A">a</SlidePanel>
      <SlidePanel open onClose={() => {}} title="B">b</SlidePanel>
    </>);
    rerender(<>
      <SlidePanel open={false} onClose={() => {}} title="A">a</SlidePanel>
      <SlidePanel open onClose={() => {}} title="B">b</SlidePanel>
    </>);
    expect(document.body.hasAttribute('data-panel-open')).toBe(true);
  });

  it('the toaster carries the class the panel-open rule targets', () => {
    useToastStore.setState({ toasts: [{ id: 't1', type: 'warning', message: 'Awaiting doctor confirmation.' }] });
    const { container } = render(<Toaster />);
    expect(container.querySelector('.hc-toaster')).not.toBeNull();
  });
});
